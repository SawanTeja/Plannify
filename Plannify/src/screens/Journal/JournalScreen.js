import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  LayoutAnimation,
  // Modal, // REMOVED Standard Modal
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
// 1. IMPORT ENHANCED MODAL
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { useAlert } from "../../context/AlertContext";
import { getData, storeData } from "../../utils/storageHelper";
import { uploadToCloudinary } from "../../utils/cloudinaryHelper";
import { ApiService } from "../../services/ApiService";
import JournalModal from "./JournalModal";
import { getMonthName } from "./JournalUtils";

// Enable Layout Animation 
// if (
//   Platform.OS === "android" &&
//   UIManager.setLayoutAnimationEnabledExperimental
// ) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

const { width, height } = Dimensions.get("window");

const JournalScreen = () => {
  const { colors, theme, syncNow, lastRefreshed, user, isPremium } = useContext(AppContext);
  const { showAlert } = useAlert();

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
  useEffect(() => {
    const prefetchImages = async () => {
      const downloadingEntries = entries.filter(
        e => e.uploadStatus === 'downloading' && e.image && e.image.includes('cloudinary.com')
      );
      
      if (downloadingEntries.length === 0) return;
      
      console.log(`📥 Prefetching ${downloadingEntries.length} images...`);
      
      for (const entry of downloadingEntries) {
        try {
          // Prefetch the image using Image.prefetch (React Native built-in)
          await Image.prefetch(entry.image);
          console.log('✅ Image prefetched:', entry.image);
          
          // Mark as complete
          setEntries(prev => {
            const updated = prev.map(e =>
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
  }, [entries.map(e => e.id + e.uploadStatus).join(',')]);

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

    // If upload is pending AND USER IS LOGGED IN, handle background upload
    // CHANGED: Only upload if user is PREMIUM
    if (savedEntry && savedEntry.uploadStatus === 'pending' && savedEntry.image && user?.idToken) {
      
      if (!isPremium) {
          console.log('⚠️ User is NOT Premium. Skipping cloud upload.');
          // We keep the local image but mark upload as 'skipped' or just leave it local?
          // Let's mark it as 'local_only' or just don't try to upload. 
          // If we leave it as 'pending', it might try again? 
          // Let's just NOT trigger the upload logic.
          // ideally we update the status so it doesn't look like it's pending forever.
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

  // --- DYNAMIC STYLES ---
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    headerText: { color: colors.textPrimary },
    subText: { color: colors.textSecondary },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: colors.shadow,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    modalContent: { backgroundColor: colors.surface },
    fab: { backgroundColor: colors.primary, shadowColor: colors.primary },
    dragHandle: { backgroundColor: colors.border },
  };

  // --- RENDERERS ---
  const renderJournalCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => setDetailEntry(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.9}
      style={[styles.card, dynamicStyles.card]}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.placeholderImage,
              { backgroundColor: colors.surfaceHighlight },
            ]}
          >
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
            { backgroundColor: 
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
            style={[styles.topicText, dynamicStyles.headerText]}
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
              style={[styles.locText, dynamicStyles.subText]}
              numberOfLines={1}
            >
              {item.location}
            </Text>
          </View>
        )}

        <View style={styles.tagRow}>
          {item.tags &&
            item.tags.slice(0, 3).map((t, i) => (
              <Text key={i} style={[styles.miniTag, { color: colors.primary }]}>
                #{t}
              </Text>
            ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCompactRow = ({ item }) => (
    <TouchableOpacity
      style={[styles.compactRow, dynamicStyles.card]}
      onPress={() => setDetailEntry(item)}
      activeOpacity={0.7}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.compactImage} />
      ) : (
        <View
          style={[
            styles.compactImage,
            { backgroundColor: colors.surfaceHighlight },
          ]}
        >
          <MaterialCommunityIcons
            name="text"
            size={20}
            color={colors.textMuted}
          />
        </View>
      )}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={[styles.compactDate, dynamicStyles.subText]}>
          {item.date}
        </Text>
        <Text
          style={[styles.compactTopic, dynamicStyles.headerText]}
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
            {getMonthName(item.monthIndex)} '{item.year.toString().substr(2)}
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
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, dynamicStyles.headerText]}>
          Journal
        </Text>

        <View
          style={[
            styles.viewToggle,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
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
                viewMode === mode && { backgroundColor: colors.primary },
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
          contentContainerStyle={{ paddingRight: 20 }}
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
                    ? dynamicStyles.chipActive
                    : dynamicStyles.chipInactive,
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isActive ? colors.white : colors.textSecondary,
                  }}
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
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "bold",
                  marginLeft: 5,
                }}
              >
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.subTitle, dynamicStyles.headerText]}>
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
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <MaterialCommunityIcons
                name="notebook-outline"
                size={50}
                color={colors.textMuted}
              />
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>
                No memories found.
              </Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity
        style={[styles.fab, dynamicStyles.fab, { bottom: tabBarHeight + 20 }]}
        onPress={() => {
          setEntryToEdit(null);
          setModalVisible(true);
        }}
      >
        <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
      </TouchableOpacity>

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
        <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
          <TouchableOpacity 
            style={{ position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
            onPress={() => setFullScreenImage(null)}
          >
             <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {fullScreenImage && (
             <Image 
               source={{ uri: fullScreenImage }} 
               style={{ width: "100%", height: "100%", resizeMode: "contain" }} 
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
          <View style={[styles.detailCard, dynamicStyles.modalContent]}>
            {/* Drag Handle for Detail View */}
            <View style={styles.dragHandleContainer}>
              <View style={[styles.dragHandle, dynamicStyles.dragHandle]} />
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
                  <Text style={[styles.detailDate, dynamicStyles.subText]}>
                    {detailEntry.date}
                  </Text>
                  {detailEntry.mood && (
                    <Text style={{ fontSize: 28 }}>{detailEntry.mood}</Text>
                  )}
                </View>

                <Text style={[styles.detailTitle, dynamicStyles.headerText]}>
                  {detailEntry.topic}
                </Text>

                {detailEntry.location && (
                  <View style={[styles.rowStart, { marginVertical: 10 }]}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        marginLeft: 5,
                      }}
                    >
                      {detailEntry.location}
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginVertical: 10,
                  }}
                >
                  {detailEntry.tags &&
                    detailEntry.tags.map((t, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor: colors.surfaceHighlight,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontSize: 12,
                          }}
                        >
                          #{t}
                        </Text>
                      </View>
                    ))}
                </View>

                <Text style={[styles.detailText, dynamicStyles.headerText]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold" },

  viewToggle: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 5,
  },
  toggleBtn: {
    padding: 8,
    borderRadius: 12,
  },

  filterContainer: { marginBottom: 20, paddingHorizontal: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },

  // Card View
  card: {
    borderRadius: 20,
    marginBottom: 16, // Reduced margin
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // FIX: Reduced Height for "smaller" cards
  imageContainer: {
    height: 140, 
    width: "100%",
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dateBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dateText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  statusDot: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  cardContent: { padding: 15 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowStart: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  topicText: { fontSize: 18, fontWeight: "bold", flex: 1 },
  locText: { fontSize: 12, marginLeft: 4 },
  tagRow: { flexDirection: "row", marginTop: 8, gap: 10 },
  miniTag: { fontSize: 12, fontWeight: "600" },

  // Compact View
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 }, // Added shadow
    shadowOpacity: 0.2, // Added shadow
    shadowRadius: 8, // Added shadow
    elevation: 4, // Added shadow
  },
  compactImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  compactDate: { fontSize: 10, marginBottom: 2 },
  compactTopic: { fontSize: 16, fontWeight: "600" },

  // Month Folder View
  folderCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    height: 140,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000", // Added shadow
    shadowOffset: { width: 0, height: 4 }, // Added shadow
    shadowOpacity: 0.3, // Added shadow
    shadowRadius: 8, // Added shadow
    elevation: 5, // Added shadow
  },
  folderContent: { flex: 1, justifyContent: "space-between" },
  folderTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  folderCount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "bold",
  },
  folderPreview: { width: 100, height: "100%", position: "relative" },
  folderThumb: {
    width: 60,
    height: 70,
    borderRadius: 10,
    position: "absolute",
    top: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  subTitle: { fontSize: 20, fontWeight: "bold" },

  // FAB
  fab: {
    position: "absolute",
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  // Detail Modal Styles
  detailModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%", // Increased fixed height for sheet feel
    overflow: "hidden",
    width: "100%",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },
  detailImage: {
    width: "100%",
    height: 350, 
    resizeMode: "cover",
  },
  detailBody: { padding: 25, paddingBottom: 60 },
  detailDate: { fontSize: 14, fontWeight: "600", opacity: 0.7 },
  detailTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  detailText: { fontSize: 18, lineHeight: 28, opacity: 0.9 }, // Larger text
  closeDetailBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 20,
  },
  editDetailBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 30,
    elevation: 5,
  },
});

export default JournalScreen;
