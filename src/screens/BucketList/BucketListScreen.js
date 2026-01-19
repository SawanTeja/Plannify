import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
// 1. IMPORT THE NEW MODAL LIBRARY
import Modal from "react-native-modal";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

// Enable Layout Animation
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  "All",
  "Travel ✈️",
  "Movies 🎬",
  "Books 📚",
  "Food 🍕",
  "Other ✨",
];

const BucketListScreen = () => {
  const { colors } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [selectedCat, setSelectedCat] = useState("Travel ✈️");

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const data = await getData("bucket_list");
    if (data) setItems(data);
  };

  const saveItems = async (newData) => {
    setItems(newData);
    await storeData("bucket_list", newData);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const newEntry = {
      id: Date.now(),
      text: newItem,
      category: selectedCat,
      completed: false,
    };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    saveItems([newEntry, ...items]);
    setNewItem("");
    setModalVisible(false);
  };

  const toggleComplete = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    saveItems(updated);
  };

  const deleteItem = (id) => {
    Alert.alert("Delete Dream", "Remove this from your bucket list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          const updated = items.filter((item) => item.id !== id);
          saveItems(updated);
        },
      },
    ]);
  };

  const visibleItems =
    filter === "All" ? items : items.filter((i) => i.category === filter);
  const completedCount = items.filter((i) => i.completed).length;

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
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    textActive: { color: colors.white },
    textInactive: { color: colors.textSecondary },
    fab: { backgroundColor: colors.primary, shadowColor: colors.primary },
    modalContent: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.headerArea}>
        <View>
          <Text style={[styles.headerTitle, dynamicStyles.headerText]}>
            Bucket List
          </Text>
          <Text style={[styles.headerSub, dynamicStyles.subText]}>
            {completedCount}/{items.length} Dreams Achieved
          </Text>
        </View>
        <View style={styles.progressCircle}>
          <MaterialCommunityIcons
            name="star"
            size={24}
            color={colors.warning}
          />
        </View>
      </View>

      {/* Category Pills */}
      <View style={{ height: 60, marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = filter === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                style={[
                  styles.catPill,
                  isActive
                    ? dynamicStyles.pillActive
                    : dynamicStyles.pillInactive,
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setFilter(cat);
                }}
              >
                <Text
                  style={[
                    styles.catText,
                    isActive
                      ? dynamicStyles.textActive
                      : dynamicStyles.textInactive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.card,
              dynamicStyles.card,
              item.completed && { opacity: 0.6 },
            ]}
            onPress={() => toggleComplete(item.id)}
            onLongPress={() => deleteItem(item.id)}
          >
            <View style={styles.row}>
              <TouchableOpacity onPress={() => toggleComplete(item.id)}>
                <MaterialCommunityIcons
                  name={
                    item.completed
                      ? "checkbox-marked-circle"
                      : "checkbox-blank-circle-outline"
                  }
                  size={26}
                  color={item.completed ? colors.success : colors.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.itemText,
                    dynamicStyles.headerText,
                    item.completed && {
                      textDecorationLine: "line-through",
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {item.text}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.category}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => deleteItem(item.id)}>
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, dynamicStyles.subText]}>
              No dreams found. Tap + to add one!
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, dynamicStyles.fab, { bottom: tabBarHeight + 20 }]}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
      </TouchableOpacity>

      {/* --- NEW SWIPEABLE MODAL --- */}
      <Modal
        isVisible={modalVisible}
        // 2. THIS ENABLES THE SLIDE DOWN TO CLOSE
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={["down"]}
        // 3. Tapping the background closes it too
        onBackdropPress={() => setModalVisible(false)}
        // 4. Smooth Animations
        animationIn="slideInUp"
        animationOut="slideOutDown"
        // 5. Input keyboard handling
        avoidKeyboard={true}
        // 6. Style to center the modal content
        style={styles.modalContainer}
        // 7. Transparency for backdrop
        backdropOpacity={0.7}
      >
        <View style={[styles.modalContent, dynamicStyles.modalContent]}>
          {/* 8. Visual "Drag Handle" to show it can be swiped */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: colors.border }]}
            />
          </View>

          <Text style={[styles.modalTitle, dynamicStyles.headerText]}>
            New Goal
          </Text>

          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder="What do you want to achieve?"
            placeholderTextColor={colors.textMuted}
            value={newItem}
            onChangeText={setNewItem}
            autoFocus
          />

          <Text style={[styles.label, dynamicStyles.subText]}>
            Select Category
          </Text>
          <View style={styles.catWrap}>
            {CATEGORIES.filter((c) => c !== "All").map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  {
                    backgroundColor:
                      selectedCat === cat ? colors.primary : colors.background,
                    borderColor:
                      selectedCat === cat ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCat(cat)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color:
                      selectedCat === cat ? colors.white : colors.textSecondary,
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ padding: 10 }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={addItem}
            >
              <Text style={styles.saveBtnText}>Add Dream</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (Your existing styles remain exactly the same)
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
  },
  headerArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  headerSub: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  progressCircle: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  catScroll: { gap: 10, paddingRight: 20 },
  catPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: "center",
  },
  catText: { fontWeight: "600", fontSize: 13 },
  card: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 15 },
  textContainer: { flex: 1 },
  itemText: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: { fontSize: 10, fontWeight: "bold" },
  fab: {
    position: "absolute",
    right: 25,
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
  emptyContainer: { alignItems: "center", marginTop: 60, opacity: 0.7 },
  emptyText: { textAlign: "center", marginTop: 15, fontSize: 16 },

  // --- UPDATED MODAL STYLES ---
  modalContainer: {
    justifyContent: "flex-end", // Change to 'center' if you want it in the middle like your screenshot
    margin: 0, // This ensures the modal takes up full width for sliding
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    borderWidth: 1,
    paddingBottom: 40, // Extra padding for bottom
  },
  // New styles for the drag handle
  dragHandleContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  catWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 20,
  },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14 },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});

export default BucketListScreen;
