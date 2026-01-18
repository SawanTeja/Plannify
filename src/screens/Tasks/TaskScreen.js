import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

// Components
// Removed PomodoroModal import
import PriorityMatrix from "./components/PriorityMatrix";

const TaskScreen = () => {
  const { theme } = useContext(AppContext);
  const isDark = theme === "dark";

  const today = new Date().toISOString().split("T")[0];

  // State
  const [viewMode, setViewMode] = useState("List");
  const [tasks, setTasks] = useState({});
  const [sections, setSections] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  // Selection & Navigation
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today);

  // Modals
  const [addVisible, setAddVisible] = useState(false);
  // Removed pomodoroVisible state

  // Form Inputs
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState("Medium");

  // Styles
  const bg = isDark ? "#121212" : colors.background;
  const text = isDark ? "#fff" : colors.textPrimary;
  const subText = isDark ? "#aaa" : colors.textSecondary;
  const cardBg = isDark ? "#1e1e1e" : "#fff";
  const inputColor = {
    color: text,
    borderColor: isDark ? "#444" : "#ddd",
    backgroundColor: isDark ? "#2c2c2c" : "#fff",
  };

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
    if (t) setTasks(t);
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
        title: "Past / Overdue",
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
      selectedTextColor: "#ffffff",
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
      { text: "Cancel" },
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
    <View style={styles.sectionHeaderBox}>
      <Text
        style={[
          styles.sectionTitle,
          { color: isOverdue ? colors.danger : colors.primary },
        ]}
      >
        {title}
      </Text>
    </View>
  );

  const renderTaskItem = ({ item, section }) => {
    const isDone = item.completed;
    return (
      <TouchableOpacity
        onPress={() =>
          toggleTask(item.id, section.realDate || item.dateLabel || today)
        }
        onLongPress={() =>
          deleteTask(item.id, section.realDate || item.dateLabel || today)
        }
        style={[
          styles.taskRow,
          { borderBottomColor: isDark ? "#333" : "#eee" },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            isDone && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          {isDone && (
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
              ✓
            </Text>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text
            style={[
              styles.taskText,
              {
                color: text,
                textDecorationLine: isDone ? "line-through" : "none",
                opacity: isDone ? 0.5 : 1,
              },
            ]}
          >
            {item.title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
              opacity: isDone ? 0.5 : 1,
            }}
          >
            {item.priority === "High" && (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 11,
                  fontWeight: "bold",
                  marginRight: 8,
                }}
              >
                High Priority
              </Text>
            )}
            {item.duration ? (
              <Text style={{ color: subText, fontSize: 11 }}>
                ⏳ {item.duration}
              </Text>
            ) : null}
            {item.dateLabel && (
              <Text
                style={{ color: colors.danger, fontSize: 11, marginLeft: 8 }}
              >
                {item.dateLabel}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === "android" ? StatusBar.currentHeight + 10 : 20,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: text }]}>My Tasks</Text>
          <Text style={{ color: subText, fontSize: 12 }}>
            {viewMode === "List" ? "Timeline View" : "Priority Matrix"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 15 }}>
          {/* REMOVED: Stopwatch Icon and TouchableOpacity */}

          <TouchableOpacity
            onPress={() => setViewMode(viewMode === "List" ? "Matrix" : "List")}
          >
            <Text style={{ fontSize: 24 }}>
              {viewMode === "List" ? "📰" : "📝"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === "List" && (
        <View style={styles.calendarContainer}>
          <Calendar
            current={currentMonth}
            key={isDark ? "dark" : "light"}
            onDayPress={handleDayPress}
            onMonthChange={(month) => setCurrentMonth(month.dateString)}
            markedDates={markedDates}
            enableSwipeMonths={true}
            theme={{
              calendarBackground: bg,
              textSectionTitleColor: subText,
              dayTextColor: text,
              todayTextColor: colors.primary,
              todayFontWeight: "bold",
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: "#ffffff",
              monthTextColor: text,
              arrowColor: colors.primary,
              dotColor: colors.primary,
              selectedDotColor: "#ffffff",
            }}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {viewMode === "Matrix" ? (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <PriorityMatrix tasks={getAllPendingTasks()} isDark={isDark} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTaskItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 100,
            }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 50 }}>
                <Text style={{ fontSize: 30 }}>☕</Text>
                <Text style={{ color: subText, marginTop: 10 }}>
                  No upcoming tasks.
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={addVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: text }]}>
              New Task for {selectedDate}
            </Text>

            <Text style={{ color: text, marginBottom: 5, fontWeight: "600" }}>
              Title
            </Text>
            <TextInput
              style={[styles.input, inputColor]}
              placeholder="Task Title"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text
                  style={{ color: text, marginBottom: 5, fontWeight: "600" }}
                >
                  Duration
                </Text>
                <TextInput
                  style={[styles.input, inputColor]}
                  placeholder="Mins"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>

              <View style={{ flex: 2 }}>
                <Text
                  style={{ color: text, marginBottom: 5, fontWeight: "600" }}
                >
                  Priority
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
                >
                  {["High", "Med", "Low"].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p === "Med" ? "Medium" : p)}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        backgroundColor:
                          priority.startsWith(p) ||
                          (p === "Med" && priority === "Medium")
                            ? colors.primary
                            : "#333",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 10 }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 10,
                gap: 15,
              }}
            >
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Text style={{ color: subText, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddTask}>
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* REMOVED: PomodoroModal Component */}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 26, fontWeight: "bold" },
  calendarContainer: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 10,
  },
  sectionHeaderBox: { paddingVertical: 15, backgroundColor: "transparent" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  taskText: { fontSize: 16, fontWeight: "500" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  fabText: { fontSize: 30, color: "#fff", marginTop: -2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
});

export default TaskScreen;
