import { useContext, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";
import JournalModal from "./JournalModal";
import { getMonthColor, getMonthName } from "./JournalUtils";

const { width, height } = Dimensions.get("window");

const JournalScreen = () => {
  const { theme } = useContext(AppContext);
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Navigation & View States
  // viewMode options: 'list' (cards), 'compact' (rows), 'month' (folders)
  const [viewMode, setViewMode] = useState("list");
  const [selectedMonthData, setSelectedMonthData] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [entryToEdit, setEntryToEdit] = useState(null);

  const [selectedFilterTag, setSelectedFilterTag] = useState("All");
  const [availableTags, setAvailableTags] = useState([
    "Travel",
    "Study",
    "Food",
    "Work",
  ]);

  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  useEffect(() => {
    loadData();
  }, []);

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
        const validEntries = journalData.filter(
          (item) => item && item.id != null,
        );
        setEntries(validEntries);
      }
      if (tagsData) setAvailableTags(tagsData);
    } catch (e) {
      console.error("Failed to load journal data", e);
    }
  };

  // --- DELETE TAG LOGIC ---
  const handleDeleteTag = (tagToDelete) => {
    Alert.alert(
      "Delete Tag",
      `Are you sure you want to delete "${tagToDelete}"?`,
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const newTags = availableTags.filter((t) => t !== tagToDelete);
            setAvailableTags(newTags);
            await storeData("user_tags", newTags);

            if (selectedFilterTag === tagToDelete) {
              setSelectedFilterTag("All");
            }
          },
        },
      ],
    );
  };

  const handleSaveEntry = async (entryData) => {
    let updatedEntries = [];

    if (entryData.id) {
      // Update existing
      updatedEntries = entries.map((e) =>
        e.id === entryData.id ? { ...e, ...entryData } : e,
      );
      if (detailEntry && detailEntry.id === entryData.id) {
        setDetailEntry({ ...detailEntry, ...entryData });
      }
    } else {
      // Create new
      const newEntry = {
        ...entryData,
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
      };
      updatedEntries = [newEntry, ...entries];
    }

    setEntries(updatedEntries);
    await storeData("journal_data", updatedEntries);

    setModalVisible(false);
    setEntryToEdit(null);
  };

  const startEdit = (entry) => {
    setEntryToEdit(entry);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEntryToEdit(null);
  };

  const handleDelete = (id) => {
    if (detailEntry && detailEntry.id === id) setDetailEntry(null);

    Alert.alert("Delete", "Delete this memory?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = entries.filter((e) => e.id !== id);
          setEntries(updated);
          await storeData("journal_data", updated);

          if (selectedMonthData) {
            const updatedMonthData = {
              ...selectedMonthData,
              data: updated.filter((e) => {
                const d = new Date(e.timestamp || e.id);
                return (
                  d.getMonth() === selectedMonthData.monthIndex &&
                  d.getFullYear() === selectedMonthData.year
                );
              }),
            };
            setSelectedMonthData(updatedMonthData);
          }
        },
      },
    ]);
  };

  const handleAddCustomTag = async (newTag) => {
    if (!availableTags.includes(newTag)) {
      const updatedTags = [...availableTags, newTag];
      setAvailableTags(updatedTags);
      await storeData("user_tags", updatedTags);
    }
  };

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
      if (!ts) return;
      const date = new Date(ts);
      if (isNaN(date.getTime())) return;

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

  // 1. CARD VIEW (Existing)
  const renderJournalCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => setDetailEntry(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.card}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.cardTagsContainer}>
            {item.tags.slice(0, 2).map((t, i) => (
              <View key={i} style={styles.cardTag}>
                <Text style={styles.cardTagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {item.image && (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        )}

        <View style={styles.cardContent}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={[styles.topicText, { flex: 1 }]} numberOfLines={2}>
              {item.topic ? item.topic : "Untitled Memory"}
            </Text>
            {item.mood && (
              <Text style={{ fontSize: 24, marginLeft: 5 }}>{item.mood}</Text>
            )}
          </View>
          {item.location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 5,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                📍 {item.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // 2. COMPACT ROW VIEW (New)
  const renderCompactJournalRow = ({ item }) => (
    <TouchableOpacity
      style={styles.compactRow}
      onPress={() => setDetailEntry(item)}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.7}
    >
      {/* Leftmost Small Image Preview */}
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.compactImage} />
      ) : (
        <View
          style={[
            styles.compactImage,
            { backgroundColor: isDark ? "#333" : "#e0e0e0" },
          ]}
        />
      )}

      {/* Middle Content (Date & Topic) */}
      <View style={styles.compactContent}>
        <Text style={styles.compactDate}>{item.date}</Text>
        <Text style={styles.compactTopic} numberOfLines={1}>
          {item.topic ? item.topic : "Untitled"}
        </Text>
      </View>

      {/* Rightmost Mood */}
      {item.mood && <Text style={styles.compactMood}>{item.mood}</Text>}
    </TouchableOpacity>
  );

  // 3. MONTH FOLDER VIEW (Existing)
  const renderMonthSummary = ({ item }) => {
    const bgColor = getMonthColor(item.monthIndex);
    const monthName = getMonthName(item.monthIndex);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSelectedFilterTag("All");
          setSelectedMonthData(item);
        }}
      >
        <View style={[styles.monthSummaryCard, { backgroundColor: bgColor }]}>
          <View style={styles.monthHeaderRow}>
            <Text style={styles.monthTitle}>
              {monthName} {item.year}
            </Text>
            <Text style={styles.monthCount}>{item.count} Entries</Text>
          </View>

          <View style={styles.previewContainer}>
            {item.previewImages.length > 0 ? (
              item.previewImages.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={[
                    styles.previewThumb,
                    { zIndex: 3 - index, left: index * -15 },
                  ]}
                />
              ))
            ) : (
              <Text
                style={{ opacity: 0.5, fontStyle: "italic", marginTop: 10 }}
              >
                No photos this month
              </Text>
            )}
          </View>
          <Text style={styles.tapToView}>Tap to view all</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // FLOATING DETAIL WINDOW
  const renderDetailModal = () => {
    if (!detailEntry) return null;
    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailEntry(null)}
      >
        <View style={styles.floatingOverlay}>
          <View style={styles.floatingWindow}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {detailEntry.image && (
                <Image
                  source={{ uri: detailEntry.image }}
                  style={styles.detailImage}
                />
              )}
              <View style={styles.detailContent}>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailDate}>{detailEntry.date}</Text>
                  {detailEntry.location && (
                    <Text
                      style={[
                        styles.detailDate,
                        { fontSize: 12, maxWidth: "60%", textAlign: "right" },
                      ]}
                    >
                      📍 {detailEntry.location}
                    </Text>
                  )}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginBottom: 15,
                  }}
                >
                  {detailEntry.tags &&
                    detailEntry.tags.map((t, i) => (
                      <View key={i} style={styles.detailTag}>
                        <Text style={styles.detailTagText}>{t}</Text>
                      </View>
                    ))}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 15,
                  }}
                >
                  <Text style={[styles.detailTopic, { flex: 1 }]}>
                    {detailEntry.topic ? detailEntry.topic : "Untitled Memory"}
                  </Text>
                  {detailEntry.mood && (
                    <Text style={{ fontSize: 32, marginLeft: 10 }}>
                      {detailEntry.mood}
                    </Text>
                  )}
                </View>
                <Text style={styles.detailBody}>{detailEntry.text}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeFloatBtn}
              onPress={() => setDetailEntry(null)}
            >
              <Text style={styles.closeFloatText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editFloatBtn}
              onPress={() => startEdit(detailEntry)}
            >
              <Text style={styles.editFloatText}>✎ Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    // CASE 1: COMPACT VIEW (New)
    if (viewMode === "compact") {
      return (
        <View style={{ flex: 1 }}>
          {renderTagFilter()}
          <FlatList
            data={getFilteredEntries(entries)}
            keyExtractor={(item, index) =>
              item?.id ? item.id.toString() : index.toString()
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={renderCompactJournalRow} // Use compact renderer
            ListEmptyComponent={
              <Text style={styles.emptyText}>No memories found.</Text>
            }
          />
        </View>
      );
    }

    // CASE 2: Inside a specific month folder
    if (viewMode === "month" && selectedMonthData) {
      const displayedEntries = getFilteredEntries(selectedMonthData.data);
      const monthName = getMonthName(selectedMonthData.monthIndex);
      return (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity
              onPress={() => setSelectedMonthData(null)}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text
              style={[styles.subTitle, { color: isDark ? "#fff" : "#000" }]}
            >
              {monthName} {selectedMonthData.year}
            </Text>
          </View>
          {renderTagFilter()}
          <FlatList
            data={displayedEntries}
            keyExtractor={(item, index) =>
              item?.id ? item.id.toString() : index.toString()
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={renderJournalCard} // Use standard card inside month
            ListEmptyComponent={
              <Text style={styles.emptyText}>No entries found.</Text>
            }
          />
        </View>
      );
    }

    // CASE 3: Month Folder View
    if (viewMode === "month" && !selectedMonthData) {
      return (
        <View style={{ flex: 1 }}>
          <FlatList
            data={getGroupedByMonth()}
            keyExtractor={(item) => `${item.monthIndex}-${item.year}`}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={renderMonthSummary}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No memories yet.</Text>
            }
          />
        </View>
      );
    }

    // CASE 4: Standard Card List View (Default)
    return (
      <View style={{ flex: 1 }}>
        {renderTagFilter()}
        <FlatList
          data={getFilteredEntries(entries)}
          keyExtractor={(item, index) =>
            item?.id ? item.id.toString() : index.toString()
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderJournalCard}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No memories found.</Text>
          }
        />
      </View>
    );
  };

  const renderTagFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilterTag === "All" && styles.activeChip,
          ]}
          onPress={() => setSelectedFilterTag("All")}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilterTag === "All" && styles.activeFilterText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {availableTags.map((tag, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.filterChip,
              selectedFilterTag === tag && styles.activeChip,
            ]}
            onPress={() => setSelectedFilterTag(tag)}
            onLongPress={() => handleDeleteTag(tag)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilterTag === tag && styles.activeFilterText,
              ]}
            >
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Journal</Text>
        {/* Updated View Toggle with 3 buttons */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            onPress={() => {
              setViewMode("list");
              setSelectedMonthData(null);
            }}
            style={[
              styles.toggleBtn,
              viewMode === "list" && styles.activeToggle,
            ]}
          >
            <Text
              style={{ fontSize: 18, opacity: viewMode === "list" ? 1 : 0.4 }}
            >
              📄
            </Text>
          </TouchableOpacity>

          {/* NEW COMPACT BUTTON */}
          <TouchableOpacity
            onPress={() => {
              setViewMode("compact");
              setSelectedMonthData(null);
            }}
            style={[
              styles.toggleBtn,
              viewMode === "compact" && styles.activeToggle,
            ]}
          >
            <Text
              style={{
                fontSize: 18,
                opacity: viewMode === "compact" ? 1 : 0.4,
              }}
            >
              ≣
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setViewMode("month");
              setSelectedMonthData(null);
            }}
            style={[
              styles.toggleBtn,
              viewMode === "month" && styles.activeToggle,
            ]}
          >
            <Text
              style={{ fontSize: 18, opacity: viewMode === "month" ? 1 : 0.4 }}
            >
              📅
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}
      {renderDetailModal()}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <JournalModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveEntry}
        theme={theme}
        existingTags={availableTags}
        onAddCustomTag={handleAddCustomTag}
        onDeleteTag={handleDeleteTag}
        initialData={entryToEdit}
      />
    </View>
  );
};

// --- STYLES ---
const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
      backgroundColor: isDark ? "#121212" : colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: isDark ? "#fff" : colors.textPrimary,
    },
    viewToggle: {
      flexDirection: "row",
      backgroundColor: isDark ? "#333" : "#eee",
      borderRadius: 12,
      padding: 4,
    },
    toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    activeToggle: { backgroundColor: isDark ? "#555" : "#fff", elevation: 2 },
    subHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
    backBtn: { paddingRight: 15 },
    backText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
    subTitle: { fontSize: 20, fontWeight: "bold" },
    filterContainer: { marginBottom: 15, height: 40 },
    filterChip: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? "#333" : "#e0e0e0",
      marginRight: 10,
      justifyContent: "center",
    },
    activeChip: { backgroundColor: colors.primary },
    filterText: { color: isDark ? "#ccc" : "#333", fontWeight: "600" },
    activeFilterText: { color: "#fff" },
    card: {
      borderRadius: 16,
      marginBottom: 15,
      overflow: "hidden",
      elevation: 2,
      backgroundColor: isDark ? "#1e1e1e" : colors.cardBg,
    },
    cardImage: { width: "100%", height: 140, resizeMode: "cover" },
    cardContent: { padding: 12 },
    topicText: {
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? "#fff" : colors.textPrimary,
    },
    dateBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      zIndex: 1,
    },
    dateText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
    cardTagsContainer: {
      position: "absolute",
      top: 10,
      left: 10,
      flexDirection: "row",
      zIndex: 1,
    },
    cardTag: {
      backgroundColor: "rgba(255,255,255,0.9)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginRight: 5,
    },
    cardTagText: { fontSize: 10, fontWeight: "bold", color: "#333" },

    // --- NEW COMPACT ROW STYLES ---
    compactRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1e1e1e" : colors.cardBg,
      padding: 10,
      borderRadius: 12,
      marginBottom: 10,
      elevation: 1,
    },
    compactImage: {
      width: 50,
      height: 50,
      borderRadius: 8,
      marginRight: 15,
      backgroundColor: "#ccc", // Fallback color
    },
    compactContent: {
      flex: 1,
      justifyContent: "center",
    },
    compactDate: {
      fontSize: 12,
      color: isDark ? "#aaa" : colors.textSecondary,
      marginBottom: 4,
    },
    compactTopic: {
      fontSize: 16,
      fontWeight: "bold",
      color: isDark ? "#fff" : colors.textPrimary,
    },
    compactMood: {
      fontSize: 24,
      marginLeft: 10,
    },

    monthSummaryCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      height: 160,
      justifyContent: "space-between",
    },
    monthHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    monthTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: "#333",
      opacity: 0.9,
    },
    monthCount: { fontSize: 14, color: "#555", fontWeight: "600" },
    previewContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingLeft: 10,
    },
    previewThumb: {
      width: 50,
      height: 50,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: "#fff",
    },
    tapToView: {
      fontSize: 12,
      color: "#555",
      alignSelf: "flex-end",
      fontWeight: "bold",
    },
    emptyText: {
      textAlign: "center",
      marginTop: 50,
      color: isDark ? "#aaa" : colors.textSecondary,
    },
    fab: {
      position: "absolute",
      bottom: 30,
      right: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
    },
    fabText: { fontSize: 30, color: "#fff" },
    floatingOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    floatingWindow: {
      width: width * 0.9,
      height: height * 0.75,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 24,
      overflow: "hidden",
      elevation: 10,
    },
    detailImage: { width: "100%", height: 250, resizeMode: "cover" },
    detailContent: { padding: 24 },
    detailMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    detailDate: {
      color: isDark ? "#aaa" : "#888",
      fontWeight: "600",
      fontSize: 14,
    },
    detailTag: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 6,
      marginBottom: 5,
    },
    detailTagText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
    detailTopic: {
      fontSize: 26,
      fontWeight: "bold",
      color: isDark ? "#fff" : "#222",
      marginBottom: 10,
    },
    detailBody: {
      fontSize: 16,
      lineHeight: 26,
      color: isDark ? "#ddd" : "#444",
    },
    closeFloatBtn: {
      position: "absolute",
      top: 15,
      right: 15,
      width: 32,
      height: 32,
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    closeFloatText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    editFloatBtn: {
      position: "absolute",
      bottom: 20,
      right: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 30,
      elevation: 5,
    },
    editFloatText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  });

export default JournalScreen;
