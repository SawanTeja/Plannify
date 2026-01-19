import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  // Modal, // Removed built-in Modal
  Platform,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
// 1. Import react-native-modal
import Modal from "react-native-modal";

import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

// Components
import PriorityMatrix from "./components/PriorityMatrix";

// Enable Animations
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TaskScreen = () => {
  const { theme, colors } = useContext(AppContext);
  const isDark = theme === "dark";

  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;
  const today = new Date().toISOString().split("T")[0];

  // State
  const [viewMode, setViewMode] = useState("List");
  const [tasks, setTasks] = useState({});
  const [sections, setSections] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today);

  const [addVisible, setAddVisible] = useState(false);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState("Medium");

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, []),
  );

  useEffect(() => {
    processSections();
    generateCalendarMarks();
  }, [tasks, selectedDate]);

  const loadTasks = async () => {
    const t = await getData("tasks_data");
    if (t) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTasks(t);
    }
  };

  const getAllPendingTasks = () => {
    let all = [];
    Object.keys(tasks).forEach((date) => {
      const dayTasks = tasks[date];
      dayTasks.forEach((t) => {
        if (!t.completed) {
          all.push({ ...t, dateLabel: date });
        }
      });
    });
    return all;
  };

  const processSections = () => {
    const sortedDates = Object.keys(tasks).sort();
    const newSections = [];
    const pastTasks = [];

    sortedDates.forEach((date) => {
      if (date < today) {
        const active = tasks[date].filter((t) => !t.completed);
        if (active.length > 0)
          active.forEach((t) => pastTasks.push({ ...t, dateLabel: date }));
      }
    });
    if (pastTasks.length > 0)
      newSections.push({
        title: "Overdue",
        data: pastTasks,
        isOverdue: true,
      });

    if (tasks[today] && tasks[today].length > 0)
      newSections.push({ title: "Today", data: tasks[today] });

    sortedDates.forEach((date) => {
      if (date > today) {
        const dateObj = new Date(date);
        const label = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = date === tomorrow.toISOString().split("T")[0];
        if (tasks[date] && tasks[date].length > 0)
          newSections.push({
            title: isTomorrow ? "Tomorrow" : label,
            data: tasks[date],
            realDate: date,
          });
      }
    });
    setSections(newSections);
  };

  const generateCalendarMarks = () => {
    const marks = {};
    Object.keys(tasks).forEach((date) => {
      const activeCount = tasks[date].filter((t) => !t.completed).length;
      if (activeCount > 0) {
        marks[date] = { marked: true, dotColor: colors.primary };
      }
    });

    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: "#FFFFFF",
    };

    if (selectedDate !== today) {
      marks[today] = {
        ...(marks[today] || {}),
        customStyles: {
          text: { fontWeight: "bold", color: colors.primary },
        },
      };
    }
    setMarkedDates(marks);
  };

  const handleDayPress = (day) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(day.dateString);
    setCurrentMonth(day.dateString);
  };

  const openAddModal = () => setAddVisible(true);

  const handleAddTask = async () => {
    if (!title.trim()) return;
    const finalDuration = duration.trim()
      ? duration.includes("min")
        ? duration
        : `${duration} mins`
      : "";
    const newTask = {
      id: Date.now(),
      title,
      priority,
      duration: finalDuration,
      completed: false,
    };

    const updated = { ...tasks };
    if (!updated[selectedDate]) updated[selectedDate] = [];
    updated[selectedDate].push(newTask);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setTasks(updated);
    await storeData("tasks_data", updated);
    setTitle("");
    setDuration("");
    setPriority("Medium");
    setAddVisible(false);
  };

  const toggleTask = async (id, date) => {
    const updated = { ...tasks };
    let targetDate = date || today;
    if (!updated[targetDate])
      Object.keys(updated).forEach((d) => {
        if (updated[d].find((t) => t.id === id)) targetDate = d;
      });

    if (updated[targetDate]) {
      const list = updated[targetDate];
      const idx = list.findIndex((t) => t.id === id);
      if (idx > -1) {
        list[idx].completed = !list[idx].completed;
        setTasks(updated);
        await storeData("tasks_data", updated);
      }
    }
  };

  const deleteTask = (id, date) => {
    Alert.alert("Delete Task", "Remove this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = { ...tasks };
          let targetDate = date || today;
          if (!updated[targetDate])
            Object.keys(updated).forEach((d) => {
              if (updated[d].find((t) => t.id === id)) targetDate = d;
            });

          if (updated[targetDate]) {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            updated[targetDate] = updated[targetDate].filter(
              (t) => t.id !== id,
            );
            if (updated[targetDate].length === 0) delete updated[targetDate];
            setTasks(updated);
            await storeData("tasks_data", updated);
          }
        },
      },
    ]);
  };

  const renderSectionHeader = ({ section: { title, isOverdue } }) => (
    <View
      style={[styles.sectionHeaderBox, { backgroundColor: colors.background }]}
    >
      <Text
        style={[
          styles.sectionTitle,
          { color: isOverdue ? colors.danger : colors.textSecondary },
        ]}
      >
        {title}
      </Text>
    </View>
  );

  const renderTaskItem = ({ item, section }) => {
    const isDone = item.completed;
    let priorityColor = colors.success;
    if (item.priority === "High") priorityColor = colors.danger;
    if (item.priority === "Medium") priorityColor = colors.primary;

    return (
      <TouchableOpacity
        onPress={() =>
          toggleTask(item.id, section.realDate || item.dateLabel || today)
        }
        onLongPress={() =>
          deleteTask(item.id, section.realDate || item.dateLabel || today)
        }
        activeOpacity={0.7}
        style={[styles.taskRow, { backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          onPress={() =>
            toggleTask(item.id, section.realDate || item.dateLabel || today)
          }
        >
          <MaterialCommunityIcons
            name={
              isDone
                ? "checkbox-marked-circle"
                : "checkbox-blank-circle-outline"
            }
            size={24}
            color={isDone ? colors.success : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text
            style={[
              styles.taskText,
              {
                color: isDone ? colors.textMuted : colors.textPrimary,
                textDecorationLine: isDone ? "line-through" : "none",
              },
            ]}
          >
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <View
              style={[styles.priorityBadge, { borderColor: priorityColor }]}
            >
              <View
                style={[styles.priorityDot, { backgroundColor: priorityColor }]}
              />
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {item.priority}
              </Text>
            </View>

            {item.duration ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {item.duration}
                </Text>
              </View>
            ) : null}

            {item.dateLabel && (
              <Text style={styles.overdueText}>{item.dateLabel}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = {
    textColor: isDark ? "#FFFFFF" : "#000000",
    subTextColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
    inputBg: isDark ? "#2C2C2E" : "#F2F2F7",
    modalBg: isDark ? "#1C1C1E" : "#FFFFFF",
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Tasks
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {viewMode === "List" ? "Timeline" : "Matrix View"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => setViewMode(viewMode === "List" ? "Matrix" : "List")}
        >
          <MaterialCommunityIcons
            name={
              viewMode === "List" ? "view-grid-outline" : "format-list-bulleted"
            }
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {viewMode === "List" && (
          <View
            style={[
              styles.calendarContainer,
              { borderBottomColor: colors.border },
            ]}
          >
            <Calendar
              current={currentMonth}
              key={theme}
              onDayPress={handleDayPress}
              onMonthChange={(month) => setCurrentMonth(month.dateString)}
              markedDates={markedDates}
              enableSwipeMonths={true}
              theme={{
                backgroundColor: "transparent",
                calendarBackground: "transparent",
                textSectionTitleColor: dynamicStyles.subTextColor,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: "#FFFFFF",
                todayTextColor: colors.primary,
                dayTextColor: dynamicStyles.textColor,
                textDisabledColor: isDark ? "#444" : "#CCC",
                dotColor: colors.primary,
                selectedDotColor: "#FFFFFF",
                arrowColor: colors.primary,
                monthTextColor: dynamicStyles.textColor,
                indicatorColor: colors.primary,
                textDayFontWeight: "400",
                textMonthFontWeight: "bold",
                textDayHeaderFontWeight: "600",
              }}
            />
          </View>
        )}

        {viewMode === "Matrix" ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: 20,
              paddingBottom: tabBarHeight,
            }}
          >
            <PriorityMatrix tasks={getAllPendingTasks()} isDark={isDark} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTaskItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + 20 },
            ]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="coffee-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No tasks for this day.
                </Text>
              </View>
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: tabBarHeight + 20, backgroundColor: colors.primary },
          ]}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* --- ADD TASK MODAL (Updated to Bottom Sheet) --- */}
      <Modal
        isVisible={addVisible}
        onSwipeComplete={() => setAddVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setAddVisible(false)}
        style={styles.bottomModal} // Aligns content to bottom
        avoidKeyboard={true}
        backdropOpacity={0.7}
      >
        <View
          style={[
            styles.bottomModalContent,
            {
              backgroundColor: dynamicStyles.modalBg,
              borderColor: colors.border,
            },
          ]}
        >
          {/* DRAG HANDLE */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: colors.border }]}
            />
          </View>

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              New Task
            </Text>
            {/* Optional Close Button in header, or just rely on swipe */}
          </View>
          <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
            {selectedDate}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Title
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: dynamicStyles.inputBg,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Duration (min)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: dynamicStyles.inputBg,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="30"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Priority
              </Text>
              <View style={styles.prioritySelector}>
                {["High", "Medium", "Low"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.priorityOption,
                      { borderColor: colors.border },
                      priority === p && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: colors.textSecondary },
                        priority === p && {
                          color: "#FFFFFF",
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddTask}
          >
            <Text style={styles.saveBtnText}>Save Task</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerSub: {
    fontSize: 14,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  calendarContainer: {
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionHeaderBox: {
    paddingVertical: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    opacity: 0.7,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  taskText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  overdueText: {
    color: "#EF4444", // Assuming danger color
    fontSize: 12,
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  // --- NEW MODAL STYLES ---
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  bottomModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40, // Extra padding for safety
    borderWidth: 1,
  },
  dragHandleContainer: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: -10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalSub: {
    marginBottom: 20,
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
  },
  prioritySelector: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default TaskScreen;
