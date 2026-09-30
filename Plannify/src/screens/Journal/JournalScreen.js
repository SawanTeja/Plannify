import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  LayoutAnimation,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT ENHANCED MODAL
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { useAlert } from "../../context/AlertContext";
import { EmptyState, FloatingActionButton } from "../../components/common";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getData, storeData } from "../../utils/storageHelper";
import { uploadToCloudinary } from "../../utils/cloudinaryHelper";
import { ApiService } from "../../services/ApiService";
import JournalModal from "./JournalModal";
import { getMonthName } from "./JournalUtils";
import getStyles from "./JournalScreen.styles";

const JournalScreen = () => {
  const { colors, theme, syncNow, lastRefreshed, user, isPremium } = useContext(AppContext);
  const { showAlert } = useAlert();
  const styles = useThemedStyles(getStyles);

  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;

  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Navigation & View States
  const [viewMode, setViewMode] = useState("list"); // list, compact, month
  const [selectedMonthData, setSelectedMonthData] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const [selectedFilterTag, setSelectedFilterTag] = useState("All");
  const [availableTags, setAvailableTags] = useState([
    "Travel",
    "Study",
    "Food",
    "Work",
  ]);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when sync completes with new data
  useEffect(() => {
    if (lastRefreshed) {
      console.log('🔄 Journal: Reloading after sync...');
      loadData();
    }
  }, [lastRefreshed]);

  // Prefetch images for entries with 'downloading' status
  const entriesStatusKey = entries.map((e) => `${e.id}_${e.uploadStatus}`).join(',');

  useEffect(() => {
    const prefetchImages = async () => {
      const downloadingEntries = entries.filter(
        (e) => e.uploadStatus === 'downloading' && e.image && e.image.includes('cloudinary.com')
      );

      if (downloadingEntries.length === 0) return;

      console.log(`📥 Prefetching ${downloadingEntries.length} images...`);

      for (const entry of downloadingEntries) {
        try {
          // Prefetch the image using Image.prefetch (React Native built-in)
          await Image.prefetch(entry.image);
          console.log('✅ Image prefetched:', entry.image);

          // Mark as complete
          setEntries((prev) => {
            const updated = prev.map((e) =>
              e.id === entry.id ? { ...e, uploadStatus: 'complete' } : e
            );
            storeData('journal_data', updated);
            return updated;
          });
        } catch (error) {
          console.error('❌ Failed to prefetch image:', error);
          // Keep as downloading, will retry on next render
        }
      }
    };

    prefetchImages();
  }, [entriesStatusKey, entries]);

  useEffect(() => {
    const backAction = () => {
      if (detailEntry) {
        setDetailEntry(null);
        return true;
      }
      if (selectedMonthData) {
        setSelectedMonthData(null);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [selectedMonthData, detailEntry]);

  const loadData = async () => {
    try {
      const journalData = await getData("journal_data");
      const tagsData = await getData("user_tags");

      if (journalData && Array.isArray(journalData)) {
        // Filter out deleted entries and entries without valid id
        const validEntries = journalData.filter(
          (item) => item && item.id != null && !item.isDeleted,
        );
        setEntries(validEntries);
      }
      if (tagsData) setAvailableTags(tagsData);
    } catch (e) {
      console.error("Failed to load journal data", e);
    }
  };

  const handleSaveEntry = async (entryData) => {
    let savedEntry = null;
    let updatedEntries = [];

    if (entryData.id) {
      // Editing existing entry
      updatedEntries = entries.map((e) =>
        e.id === entryData.id ? { ...e, ...entryData, updatedAt: new Date().toISOString() } : e,
      );
      savedEntry = updatedEntries.find(e => e.id === entryData.id);
      if (detailEntry && detailEntry.id === entryData.id) {
        setDetailEntry({ ...detailEntry, ...entryData });
      }
    } else {
      // New entry
      savedEntry = {
        ...entryData,
        id: Date.now(),
        _id: `journal_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };
      updatedEntries = [savedEntry, ...entries];
    }

    // Save immediately with local image
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setEntries(updatedEntries);
    await storeData("journal_data", updatedEntries);
    setModalVisible(false);
    setEntryToEdit(null);

    if (savedEntry && savedEntry.uploadStatus === 'pending' && savedEntry.image && user?.idToken) {

      if (!isPremium) {
        console.log('⚠️ User is NOT Premium. Skipping cloud upload.');
        setEntries(prevEntries => {
          const newEntries = prevEntries.map(e =>
            e.id === savedEntry.id
              ? { ...e, uploadStatus: 'local' }
              : e
          );
          storeData("journal_data", newEntries);
          return newEntries;
        });
        return;
      }

      console.log('📤 Starting background upload for entry:', savedEntry.id);

      try {
        const cloudUrl = await uploadToCloudinary(savedEntry.image);
        console.log('✅ Background upload complete:', cloudUrl);

        // Update entry with cloud URL
        setEntries(prevEntries => {
          const newEntries = prevEntries.map(e =>
            e.id === savedEntry.id
              ? { ...e, image: cloudUrl, uploadStatus: 'complete', updatedAt: new Date().toISOString() }
              : e
          );
          // Save and sync
          storeData("journal_data", newEntries).then(() => {
            syncNow();
          });
          return newEntries;
        });
      } catch (error) {
        console.error('❌ Background upload failed:', error);
        // Mark as failed but keep local image
        setEntries(prevEntries => {
          const newEntries = prevEntries.map(e =>
            e.id === savedEntry.id
              ? { ...e, uploadStatus: 'failed' }
              : e
          );
          storeData("journal_data", newEntries);
          return newEntries;
        });
      }
    } else {
      // No upload needed, just sync
      syncNow();
    }
  };

  const handleDelete = (id) => {
    if (detailEntry && detailEntry.id === id) setDetailEntry(null);

    // Find the entry to get its _id for backend
    const entryToDelete = entries.find(e => e.id === id);

    showAlert("Delete", "Delete this memory? This will also remove the image from cloud storage.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

          // 1. Mark as deleted locally (soft delete for sync)
          const updated = entries.map(e =>
            e.id === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e
          );
          // Filter out deleted for UI but keep in storage for sync
          setEntries(updated.filter(e => !e.isDeleted));
          await storeData("journal_data", updated);

          // 2. Call backend to delete from Cloudinary and mark as deleted
          if (user?.idToken && entryToDelete?._id) {
            try {
              console.log('🗑️ Calling backend to delete:', entryToDelete._id);
              const result = await ApiService.deleteJournal(user.idToken, entryToDelete._id);
              console.log('✅ Backend delete result:', result);
            } catch (error) {
              console.error('❌ Backend delete failed:', error);
              // Entry is still marked as deleted locally, will sync later
            }
          }

          // 3. Sync to propagate deletion to other devices
          syncNow();
        },
      },
    ]);
  };

  // --- VIEW LOGIC ---
  const getFilteredEntries = (sourceData) => {
    if (!sourceData) return [];
    return sourceData.filter((entry) => {
      if (selectedFilterTag === "All") return true;
      return entry.tags && entry.tags.includes(selectedFilterTag);
    });
  };

  const getGroupedByMonth = () => {
    const sortedEntries = [...entries].sort(
      (a, b) => (b.timestamp || b.id) - (a.timestamp || a.id),
    );
    const groups = {};
    sortedEntries.forEach((entry) => {
      const ts = entry.timestamp || entry.id;
      const date = new Date(ts);
      const key = `${date.getMonth()}-${date.getFullYear()}`;
      if (!groups[key]) {
        groups[key] = {
          monthIndex: date.getMonth(),
          year: date.getFullYear(),
          previewImages: [],
          count: 0,
          data: [],
        };
      }
      groups[key].data.push(entry);
      groups[key].count++;
      if (entry.image && groups[key].previewImages.length < 3) {
        groups[key].previewImages.push(entry.image);
      }
    });
    return Object.values(groups).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.monthIndex - a.monthIndex;
    });
  };

  // --- RENDERERS ---
  const renderJournalCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => setDetailEntry(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.9}
      style={styles.card}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialCommunityIcons
              name="text-box-outline"
              size={40}
              color={colors.textMuted}
            />
          </View>
        )}
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        {/* Upload/Download status dot indicator */}
        {item.uploadStatus && (
          <View style={[
            styles.statusDot,
            {
              backgroundColor:
                item.uploadStatus === 'complete' ? '#22C55E' :  // Green
                  item.uploadStatus === 'failed' ? '#EF4444' :    // Red
                    item.uploadStatus === 'downloading' ? '#FBBF24' : // Yellow
                      '#F97316' // Orange (pending upload)
            }
          ]}>
            {item.uploadStatus === 'pending' && (
              <MaterialCommunityIcons name="cloud-upload" size={10} color="#fff" />
            )}
            {item.uploadStatus === 'downloading' && (
              <MaterialCommunityIcons name="cloud-download" size={10} color="#fff" />
            )}
            {item.uploadStatus === 'complete' && (
              <MaterialCommunityIcons name="check" size={10} color="#fff" />
            )}
            {item.uploadStatus === 'failed' && (
              <MaterialCommunityIcons name="alert" size={10} color="#fff" />
            )}
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.rowBetween}>
          <Text
            style={styles.topicText}
            numberOfLines={1}
          >
            {item.topic || "Untitled Memory"}
          </Text>
          {item.mood && <Text style={{ fontSize: 20 }}>{item.mood}</Text>}
        </View>

        {item.location && (
          <View style={styles.rowStart}>
            <MaterialCommunityIcons
              name="map-marker"
              size={12}
              color={colors.textSecondary}
            />
            <Text
              style={styles.locText}
              numberOfLines={1}
            >
              {item.location}
            </Text>
          </View>
        )}

        <View style={styles.tagRow}>
          {item.tags &&
            item.tags.slice(0, 3).map((t, i) => (
              <Text key={i} style={styles.miniTag}>
                #{t}
              </Text>
            ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCompactRow = ({ item }) => (
    <TouchableOpacity
      style={styles.compactRow}
      onPress={() => setDetailEntry(item)}
      activeOpacity={0.7}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.compactImage} />
      ) : (
        <View style={styles.compactImage}>
          <MaterialCommunityIcons
            name="text"
            size={20}
            color={colors.textMuted}
          />
        </View>
      )}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={styles.compactDate}>
          {item.date}
        </Text>
        <Text
          style={styles.compactTopic}
          numberOfLines={1}
        >
          {item.topic || "Untitled"}
        </Text>
      </View>
      {item.mood && <Text style={{ fontSize: 24 }}>{item.mood}</Text>}
    </TouchableOpacity>
  );

  const renderMonthFolder = ({ item }) => {
    const folderColors = [
      "#4F46E5", // Preserved Primary (Indigo)
      "#EC4899", // Preserved Secondary (Pink)
      "#06B6D4", // Preserved Accent (Cyan)
      "#F59E0B", // Preserved Warning (Amber)
      "#10B981", // Preserved Success (Emerald)
      "#8e44ad",
      "#e67e22",
      "#2ecc71",
      "#3498db",
      "#9b59b6",
      "#34495e",
      "#16a085",
    ];
    const bg = folderColors[item.monthIndex % folderColors.length];

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSelectedFilterTag("All");
          setSelectedMonthData(item);
        }}
        style={[styles.folderCard, { backgroundColor: bg }]}
      >
        <View style={styles.folderContent}>
          <Text style={styles.folderTitle}>
            {`${getMonthName(item.monthIndex)} '${item.year.toString().slice(2)}`}
          </Text>
          <Text style={styles.folderCount}>{item.count} Memories</Text>
        </View>
        <View style={styles.folderPreview}>
          {item.previewImages.slice(0, 3).map((uri, idx) => (
            <Image
              key={idx}
              source={{ uri }}
              style={[
                styles.folderThumb,
                {
                  transform: [{ rotate: `${(idx - 1) * 10}deg` }],
                  left: idx * 15,
                  zIndex: idx,
                },
              ]}
            />
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          Journal
        </Text>

        <View style={styles.viewToggle}>
          {["list", "compact", "month"].map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setViewMode(mode);
                setSelectedMonthData(null);
              }}
              style={[
                styles.toggleBtn,
                viewMode === mode && styles.toggleBtnActive,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  mode === "list"
                    ? "view-grid"
                    : mode === "compact"
                      ? "view-list"
                      : "folder-open"
                }
                size={20}
                color={viewMode === mode ? colors.white : colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterListContent}
        >
          {["All", ...availableTags].map((tag, idx) => {
            const isActive = selectedFilterTag === tag;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedFilterTag(tag)}
                style={[
                  styles.filterChip,
                  isActive
                    ? styles.filterChipActive
                    : styles.filterChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {selectedMonthData && (
          <View style={styles.subHeader}>
            <TouchableOpacity
              onPress={() => setSelectedMonthData(null)}
              style={styles.subHeaderBack}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backText}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={styles.subTitle}>
              {getMonthName(selectedMonthData.monthIndex)}{" "}
              {selectedMonthData.year}
            </Text>
          </View>
        )}

        <FlatList
          data={
            viewMode === "month" && !selectedMonthData
              ? getGroupedByMonth()
              : getFilteredEntries(
                selectedMonthData ? selectedMonthData.data : entries,
              )
          }
          keyExtractor={(item) =>
            (item._id || item.id || `${item.monthIndex}-${item.year}` || Math.random()).toString()
          }
          contentContainerStyle={{
            paddingBottom: tabBarHeight + 20,
            paddingHorizontal: 20,
          }}
          renderItem={({ item }) => {
            if (viewMode === "month" && !selectedMonthData)
              return renderMonthFolder({ item });
            if (viewMode === "compact") return renderCompactRow({ item });
            return renderJournalCard({ item });
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notebook-outline"
              title="No memories found"
              subtitle="Start recording your daily thoughts and memories!"
              actionLabel="Write Entry"
              onActionPress={() => {
                setEntryToEdit(null);
                setModalVisible(true);
              }}
            />
          }
        />
      </View>

      <FloatingActionButton
        bottom={tabBarHeight + 20}
        onPress={() => {
          setEntryToEdit(null);
          setModalVisible(true);
        }}
      />

      <JournalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveEntry}
        existingTags={availableTags}
        onAddCustomTag={(tag) => setAvailableTags([...availableTags, tag])}
        initialData={entryToEdit}
      />

      {/* FULL SCREEN IMAGE MODAL */}
      <Modal
        isVisible={!!fullScreenImage}
        onBackdropPress={() => setFullScreenImage(null)}
        onSwipeComplete={() => setFullScreenImage(null)}
        swipeDirection={["down", "up", "left", "right"]}
        style={{ margin: 0 }}
        backdropOpacity={1}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullScreenImage(null)}
          >
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
            />
          )}
        </View>
      </Modal>

      {/* Detail Modal Overlay - NOW SWIPEABLE */}
      {detailEntry && (
        <Modal
          isVisible={true}
          onSwipeComplete={() => setDetailEntry(null)}
          swipeDirection={["down"]}
          onBackdropPress={() => setDetailEntry(null)}
          style={styles.detailModal}
          backdropOpacity={0.8}
          propagateSwipe={true}
        >
          <View style={styles.detailCard}>
            {/* Drag Handle for Detail View */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView>
              {detailEntry.image && (
                <TouchableOpacity onPress={() => setFullScreenImage(detailEntry.image)} activeOpacity={0.9}>
                  <Image
                    source={{ uri: detailEntry.image }}
                    style={styles.detailImage}
                  />
                </TouchableOpacity>
              )}
              <View style={styles.detailBody}>
                <View style={styles.rowBetween}>
                  <Text style={styles.detailDate}>
                    {detailEntry.date}
                  </Text>
                  {detailEntry.mood && (
                    <Text style={{ fontSize: 28 }}>{detailEntry.mood}</Text>
                  )}
                </View>

                <Text style={styles.detailTitle}>
                  {detailEntry.topic}
                </Text>

                {detailEntry.location && (
                  <View style={styles.detailLocRow}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.detailLocText}>
                      {detailEntry.location}
                    </Text>
                  </View>
                )}

                <View style={styles.detailTagsRow}>
                  {detailEntry.tags &&
                    detailEntry.tags.map((t, i) => (
                      <View
                        key={i}
                        style={styles.detailTagBadge}
                      >
                        <Text style={styles.detailTagText}>
                          #{t}
                        </Text>
                      </View>
                    ))}
                </View>

                <Text style={styles.detailText}>
                  {detailEntry.text}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeDetailBtn}
              onPress={() => setDetailEntry(null)}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editDetailBtn}
              onPress={() => {
                setEntryToEdit(detailEntry);
                setDetailEntry(null);
                setModalVisible(true);
              }}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default JournalScreen;
