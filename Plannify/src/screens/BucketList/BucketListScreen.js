import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { useAlert } from "../../context/AlertContext";
import { EmptyState, FloatingActionButton } from "../../components/common";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getData, storeData } from "../../utils/storageHelper";
import getStyles from "./BucketListScreen.styles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  "All",
  "Travel",
  "Movies",
  "Books",
  "Food",
  "Other",
];

const CATEGORY_ICONS = {
  All: "all-inclusive",
  Travel: "airplane",
  Movies: "movie-open",
  Books: "book-open-page-variant",
  Food: "silverware-fork-knife",
  Other: "star-four-points",
};

const BucketListScreen = () => {
  const { colors, syncNow, lastRefreshed, appStyles } = useContext(AppContext);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(getStyles);
  const tabBarHeight = insets.bottom + 60;

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [selectedCat, setSelectedCat] = useState("Travel");

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (lastRefreshed) {
      loadItems();
    }
  }, [lastRefreshed]);

  const loadItems = async () => {
    const data = await getData("bucket_list");
    if (data) {
      const normalized = data.map((item) => {
        const plainCat = CATEGORIES.find(
          (c) => item.category?.startsWith(c) && c !== "All"
        );
        if (plainCat && item.category !== plainCat) {
          return { ...item, category: plainCat };
        }
        return item;
      });

      setItems(normalized.filter((i) => !i.isDeleted));
    }
  };

  const saveItems = async (newData) => {
    setItems(newData);
    await storeData("bucket_list", newData);
    syncNow();
  };

  const addItem = () => {
    if (!newItem.trim()) return;

    const newEntry = {
      _id: Date.now().toString(),
      text: newItem.trim(),
      category: selectedCat,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = [newEntry, ...items];
    saveItems(updated);

    setNewItem("");
    setModalVisible(false);
  };

  const toggleComplete = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = items.map((item) => {
      if ((item._id || item.id) === id) {
        return {
          ...item,
          completed: !item.completed,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    saveItems(updated);
  };

  const deleteItem = (id) => {
    showAlert("Delete Goal", "Are you sure you want to remove this dream?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          const updated = items.map((item) => {
            if ((item._id || item.id) === id) {
              return {
                ...item,
                isDeleted: true,
                updatedAt: new Date().toISOString(),
              };
            }
            return item;
          });
          saveItems(updated);
        },
      },
    ]);
  };

  const activeItems = items.filter((i) => !i.isDeleted);

  const visibleItems =
    filter === "All"
      ? activeItems
      : activeItems.filter((i) => i.category === filter);

  const completedCount = activeItems.filter((i) => i.completed).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.headerArea}>
        <View>
          <Text style={[styles.headerTitle, appStyles.headerTitleStyle]}>
            Bucket List
          </Text>
          <Text style={styles.headerSub}>
            {completedCount}/{activeItems.length} Dreams Achieved
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
      <View style={{ height: 50, marginBottom: 10 }}>
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
                  isActive && styles.catPillActive,
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setFilter(cat);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MaterialCommunityIcons
                    name={CATEGORY_ICONS[cat]}
                    size={16}
                    color={isActive ? colors.white : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.catText,
                      isActive && styles.catTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.card,
              item.completed && { opacity: 0.6 },
            ]}
            onPress={() => toggleComplete(item._id || item.id)}
            onLongPress={() => deleteItem(item._id || item.id)}
          >
            <View style={styles.row}>
              <TouchableOpacity onPress={() => toggleComplete(item._id || item.id)}>
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

              <TouchableOpacity onPress={() => deleteItem(item._id || item.id)}>
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
          <EmptyState
            icon="lightbulb-on-outline"
            title="No dreams found"
            subtitle="Tap + to add one!"
          />
        }
      />

      {/* FAB */}
      <FloatingActionButton
        bottom={tabBarHeight + 20}
        onPress={() => setModalVisible(true)}
      />

      {/* Modal */}
      <Modal
        isVisible={modalVisible}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        avoidKeyboard={false}
        style={styles.modalContainer}
        backdropOpacity={0.7}
      >
        <View style={styles.modalContent}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={styles.modalTitle}>
            New Goal
          </Text>

          <TextInput
            style={styles.input}
            placeholder="What do you want to achieve?"
            placeholderTextColor={colors.textMuted}
            value={newItem}
            onChangeText={setNewItem}
            autoFocus
          />

          <Text style={styles.label}>
            Select Category
          </Text>
          <View style={styles.catWrap}>
            {CATEGORIES.filter((c) => c !== "All").map((cat) => {
              const isCatSelected = selectedCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    isCatSelected && styles.catChipActive,
                  ]}
                  onPress={() => setSelectedCat(cat)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialCommunityIcons
                      name={CATEGORY_ICONS[cat]}
                      size={16}
                      color={
                        isCatSelected ? colors.white : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.catChipText,
                        isCatSelected && styles.catChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
              style={styles.saveBtn}
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

export default BucketListScreen;