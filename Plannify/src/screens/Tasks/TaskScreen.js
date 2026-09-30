import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  SectionList,
  StatusBar,
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
import { useAlert } from "../../context/AlertContext";
import { EmptyState, FloatingActionButton } from "../../components/common";
import { getData, storeData } from "../../utils/storageHelper";
import { getLocalDateString, getLocalToday } from "../../utils/dateHelper";
import { scheduleTaskNotification, cancelTaskNotifications } from "../../services/NotificationService";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getStyles } from "./TaskScreen.styles";

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
  // 1. GET lastRefreshed FROM CONTEXT
  const { theme, colors, lastRefreshed, syncNow, appStyles } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);
  const { showAlert } = useAlert();
  const isDark = theme === "dark";

  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;
  const today = getLocalToday();

  // State
  const [viewMode, setViewMode] = useState("List");
  
  // CHANGED: tasks is now a Flat Array to work with SyncHelper
  const [tasks, setTasks] = useState([]); 
  
  const [sections, setSections] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today);

  const [addVisible, setAddVisible] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false); // NEW STATE

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState("Medium");

  const loadTasks = useCallback(async () => {
    // CHANGED: Key is now "tasks" to match SyncHelper
    const t = await getData("tasks");
    if (t && Array.isArray(t)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTasks(t);
    }
  }, []);

  // Helper: Convert Flat Array -> Date Map for UI Logic
  const getTasksByDate = useCallback(() => {
    const map = {};
    tasks.forEach((task) => {
      if (!task.isDeleted) {
        const date = task.date || today; // Fallback to today
        if (!map[date]) map[date] = [];
        map[date].push(task);
      }
    });
    return map;
  }, [tasks, today]);

  const getAllPendingTasks = useCallback(() => {
    return tasks
      .filter((t) => !t.completed && !t.isDeleted)
      .map((t) => ({
        ...t,
        dateLabel: t.date,
      }));
  }, [tasks]);

  const processSections = useCallback(() => {
    const tasksMap = getTasksByDate();
    const sortedDates = Object.keys(tasksMap).sort();
    const newSections = [];
    const pastTasks = [];

    sortedDates.forEach((date) => {
      if (date < today) {
        const active = tasksMap[date].filter((t) => !t.completed);
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

    if (tasksMap[today] && tasksMap[today].length > 0)
      newSections.push({ title: "Today", data: tasksMap[today] });

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
        const isTomorrow = date === getLocalDateString(tomorrow);

        if (tasksMap[date] && tasksMap[date].length > 0)
          newSections.push({
            title: isTomorrow ? "Tomorrow" : label,
            data: tasksMap[date],
            realDate: date,
          });
      }
    });
    setSections(newSections);
  }, [getTasksByDate, today]);

  const generateCalendarMarks = useCallback(() => {
    const tasksMap = getTasksByDate();
    const marks = {};

    Object.keys(tasksMap).forEach((date) => {
      const activeCount = tasksMap[date].filter((t) => !t.completed).length;
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
  }, [getTasksByDate, colors.primary, selectedDate, today]);

  useEffect(() => {
    loadTasks();
  }, [lastRefreshed, loadTasks]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks]),
  );

  useEffect(() => {
    processSections();
    generateCalendarMarks();
  }, [processSections, generateCalendarMarks]);

  const handleDayPress = (day) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(day.dateString);
    setCurrentMonth(day.dateString);
  };

  const changeMonth = (increment) => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + increment);
    const newDateString = getLocalDateString(date);
    setCurrentMonth(newDateString);
  };

  const openAddModal = () => setAddVisible(true);

  const handleAddTask = async () => {
    if (!title.trim()) return;
    const finalDuration = duration.trim()
      ? duration.includes("min")
        ? duration
        : `${duration} mins`
      : "";
    
    // CHANGED: New Task Structure for Sync
    const newTask = {
      _id: Date.now().toString(), // Mongo ID
      id: Date.now(),             // Legacy ID
      title,
      priority,
      duration: finalDuration,
      completed: false,
      date: selectedDate,         // Store Date explicitly
      isDeleted: false,
      updatedAt: new Date(),      // Sync Timestamp
      notificationIds: [],        // Store notification IDs
    };

    // Schedule Notifications
    const notifIds = await scheduleTaskNotification(newTask.id, newTask.title, newTask.date);
    if (notifIds) newTask.notificationIds = notifIds;

    const updatedTasks = [...tasks, newTask];

    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setTasks(updatedTasks);
    await storeData("tasks", updatedTasks); // Save to new key
    syncNow(); // Trigger instant sync
    
    setTitle("");
    setDuration("");
    setPriority("Medium");
    setAddVisible(false);
  };

  const toggleTask = async (id) => {
    const updatedTasks = tasks.map(t => {
        if (t.id === id || t._id === id) {
            const newStatus = !t.completed;
            
            // If marking as completed, cancel notifications
            if (newStatus && t.notificationIds) {
                cancelTaskNotifications(t.notificationIds);
            }
            // (Optional) If un-completing, we could re-schedule, but simple logic for now: only cancel on complete.

            return { 
                ...t, 
                completed: newStatus, 
                updatedAt: new Date() // Sync Timestamp
            };
        }
        return t;
    });

    setTasks(updatedTasks);
    await storeData("tasks", updatedTasks);
    syncNow();
  };

  const deleteTask = (id) => {
    showAlert("Delete Task", "Remove this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          
          // CHANGED: Soft Delete for Sync
          const updatedTasks = tasks.map(t => {
            if (t.id === id || t._id === id) {
                // Cancel notifications
                if (t.notificationIds) {
                    cancelTaskNotifications(t.notificationIds);
                }
                return { ...t, isDeleted: true, updatedAt: new Date() };
            }
            return t;
          });

          setTasks(updatedTasks);
          await storeData("tasks", updatedTasks);
          syncNow();
        },
      },
    ]);
  };

  const renderSectionHeader = ({ section: { title, isOverdue } }) => (
    <View style={styles.sectionHeaderBox}>
      <Text
        style={[
          styles.sectionTitle,
          isOverdue && styles.sectionTitleOverdue,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  const renderTaskItem = ({ item }) => {
    const isDone = item.completed;
    let priorityColor = colors.success;
    if (item.priority === "High") priorityColor = colors.danger;
    if (item.priority === "Medium") priorityColor = colors.primary;

    return (
      <TouchableOpacity
        onPress={() => toggleTask(item.id || item._id)}
        onLongPress={() => deleteTask(item.id || item._id)}
        activeOpacity={0.7}
        style={styles.taskRow}
      >
        <TouchableOpacity
          onPress={() => toggleTask(item.id || item._id)}
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

        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskText,
              isDone && styles.taskTextDone,
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
                <Text style={styles.metaText}>
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

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 10 },
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
          <Text style={[styles.headerTitle, appStyles.headerTitleStyle]}>
            Tasks
          </Text>
          <Text style={styles.headerSub}>
            {viewMode === "List" ? "Timeline" : "Matrix View"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
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
      <View style={styles.contentWrapper}>
        {viewMode === "Matrix" ? (
          <View
            style={[
              styles.matrixContainer,
              {
                paddingBottom: tabBarHeight,
              },
            ]}
          >
            <PriorityMatrix tasks={getAllPendingTasks()} isDark={isDark} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
            renderItem={renderTaskItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={
              <View style={styles.calendarContainer}>
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
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: "#FFFFFF",
                    todayTextColor: colors.primary,
                    dayTextColor: colors.textPrimary,
                    textDisabledColor: isDark ? "#444" : "#CCC",
                    dotColor: colors.primary,
                    selectedDotColor: "#FFFFFF",
                    arrowColor: colors.primary,
                    monthTextColor: colors.textPrimary,
                    indicatorColor: colors.primary,
                    textDayFontWeight: "400",
                    textMonthFontWeight: "bold",
                    textDayHeaderFontWeight: "600",
                  }}
                />
              </View>
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + 20 },
            ]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <EmptyState
                icon="coffee-outline"
                title="No tasks for this day"
                subtitle="Enjoy your free time or tap below to plan ahead!"
                actionLabel="Add Task"
                onActionPress={openAddModal}
              />
            }
          />
        )}

        {/* FAB */}
        <FloatingActionButton
          bottom={tabBarHeight + 20}
          onPress={openAddModal}
        />
      </View>

      {/* --- ADD TASK MODAL (Updated to Bottom Sheet) --- */}
      <Modal
        isVisible={addVisible}
        onSwipeComplete={() => setAddVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setAddVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={true}
        backdropOpacity={0.7}
      >
        <View style={styles.bottomModalContent}>
          {/* DRAG HANDLE */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              New Task
            </Text>
          </View>
          
          {/* Custom Header & Calendar */}
          <View style={styles.calendarNavWrapper}>
            {/* Unified Custom Header (Always visible) */}
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navArrowBtn}>
                <MaterialCommunityIcons name="chevron-left" size={30} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowYearPicker(!showYearPicker)}
                style={[
                  styles.monthPickerBtn,
                  showYearPicker && styles.monthPickerBtnActive,
                ]}
              >
                <Text style={styles.monthPickerBtnText}>
                  {new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} 
                </Text>
                <MaterialCommunityIcons name={showYearPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navArrowBtn}>
                <MaterialCommunityIcons name="chevron-right" size={30} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {showYearPicker ? (
              /* YEAR/MONTH PICKER */
              <View style={styles.yearPickerContainer}>
                <FlatList
                  data={Array.from({ length: 60 }, (_, i) => { // Next 5 years
                    const d = new Date();
                    d.setMonth(d.getMonth() + i);
                    return {
                      id: i.toString(),
                      dateString: getLocalDateString(d), // YYYY-MM-DD
                      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                      year: d.getFullYear(),
                      month: d.getMonth()
                    };
                  })}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const isCurrent = item.dateString.slice(0, 7) === currentMonth.slice(0, 7);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.yearPickerItem,
                          isCurrent && styles.yearPickerItemActive,
                        ]}
                        onPress={() => {
                          setCurrentMonth(item.dateString);
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.yearPickerItemText,
                          isCurrent && styles.yearPickerItemTextActive,
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : (
              /* CALENDAR */
              <Calendar
                current={currentMonth} 
                key={currentMonth}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                onMonthChange={(month) => setCurrentMonth(month.dateString)}
                renderHeader={() => null}
                hideArrows={true}
                minDate={today}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: colors.primary }
                }}
                theme={{
                  calendarBackground: 'transparent',
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.textPrimary,
                  textDisabledColor: colors.textMuted,
                  dotColor: colors.primary,
                  selectedDotColor: '#ffffff',
                  arrowColor: colors.primary,
                  monthTextColor: colors.textPrimary,
                  indicatorColor: colors.primary,
                }}
                style={styles.calendarStyle} 
              />
            )}
          </View>

          <Text style={styles.label}>
            Title
          </Text>
          <TextInput
            style={styles.input}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <View style={styles.row}>
            <View style={styles.durationCol}>
              <Text style={styles.label}>
                Duration (min)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <View style={styles.priorityCol}>
              <Text style={styles.label}>
                Priority
              </Text>
              <View style={styles.prioritySelector}>
                {["High", "Medium", "Low"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.priorityOption,
                      priority === p && styles.priorityOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        priority === p && styles.priorityOptionTextActive,
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
            style={styles.saveBtn}
            onPress={handleAddTask}
          >
            <Text style={styles.saveBtnText}>Save Task</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default TaskScreen;