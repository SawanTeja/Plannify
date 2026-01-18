import { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform, // <--- Added
  ScrollView,
  StatusBar, // <--- Added
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

const CATEGORIES = [
  "All",
  "Travel ✈️",
  "Movies 🎬",
  "Books 📚",
  "Food 🍕",
  "Other ✨",
];

const BucketListScreen = () => {
  const { theme } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [selectedCat, setSelectedCat] = useState("Travel ✈️");

  const isDark = theme === "dark";
  const containerStyle = {
    backgroundColor: isDark ? "#121212" : colors.background,
  };
  const cardStyle = { backgroundColor: isDark ? "#1e1e1e" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : colors.textPrimary };
  const subTextStyle = { color: isDark ? "#aaa" : colors.textSecondary };
  const pillStyle = {
    backgroundColor: isDark ? "#333" : "#fff",
    borderColor: isDark ? "#444" : "#eee",
  };
  const inputStyle = {
    color: isDark ? "#fff" : "#000",
    borderColor: isDark ? "#444" : colors.gray,
  };

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
    saveItems([newEntry, ...items]);
    setNewItem("");
    setModalVisible(false);
  };

  const toggleComplete = (id) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    saveItems(updated);
  };

  const deleteItem = (id) => {
    Alert.alert("Delete Item", "Remove from list?", [
      { text: "Cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const updated = items.filter((item) => item.id !== id);
          saveItems(updated);
        },
      },
    ]);
  };

  const visibleItems =
    filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.headerTitle, textStyle]}>Bucket List</Text>

      <View style={{ height: 60 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catPill,
                pillStyle,
                filter === cat && {
                  backgroundColor: isDark ? "#fff" : colors.textPrimary,
                  borderColor: isDark ? "#fff" : colors.textPrimary,
                },
              ]}
              onPress={() => setFilter(cat)}
            >
              <Text
                style={[
                  styles.catText,
                  filter === cat
                    ? { color: isDark ? "#000" : "#fff" }
                    : subTextStyle,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              cardStyle,
              item.completed && {
                opacity: 0.5,
                backgroundColor: isDark ? "#111" : "#f9f9f9",
              },
            ]}
            onPress={() => toggleComplete(item.id)}
            onLongPress={() => deleteItem(item.id)}
          >
            <View
              style={[
                styles.checkbox,
                item.completed && styles.checkboxChecked,
              ]}
            >
              {item.completed && (
                <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.itemText,
                  textStyle,
                  item.completed && styles.textDone,
                ]}
              >
                {item.text}
              </Text>
              <Text style={subTextStyle}>{item.category}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, subTextStyle]}>
            No dreams added yet ✨
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle]}>
            <Text style={[styles.modalTitle, textStyle]}>
              Add to Bucket List
            </Text>
            <TextInput
              style={[styles.input, inputStyle]}
              placeholder="What do you want to do?"
              placeholderTextColor="#aaa"
              value={newItem}
              onChangeText={setNewItem}
            />
            <Text style={[styles.label, subTextStyle]}>Category</Text>
            <View style={styles.catWrap}>
              {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    selectedCat === cat && styles.catChipActive,
                    {
                      backgroundColor:
                        isDark && selectedCat !== cat
                          ? "#333"
                          : selectedCat === cat
                            ? colors.primary
                            : "#f1f2f6",
                    },
                  ]}
                  onPress={() => setSelectedCat(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCat === cat && styles.chipTextActive,
                      isDark && selectedCat !== cat && { color: "#fff" },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={addItem}>
              <Text style={styles.saveBtnText}>Add to List</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // FIXED CONTAINER STYLE
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 15 },
  catScroll: { gap: 10, paddingRight: 20 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    borderWidth: 1,
  },
  catText: { fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    gap: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary },
  itemText: { fontSize: 16, fontWeight: "500" },
  textDone: { textDecorationLine: "line-through", opacity: 0.7 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.textPrimary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabText: { fontSize: 30, color: "#fff" },
  emptyText: { textAlign: "center", marginTop: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { borderRadius: 20, padding: 25 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 25 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  catChipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12 },
  chipTextActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelText: { textAlign: "center", color: colors.textSecondary },
});

export default BucketListScreen;
