import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
// 1. Import the enhanced Modal
import Modal from "react-native-modal";

import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";
import { updateNightlyReminder } from "../../services/NotificationService";

// Components
import HabitCard from "../Tasks/components/HabitCard";
import WeeklyStrip from "../Tasks/components/WeeklyStrip";

// Gamification Imports
import AchievementModal from "./gamification/AchievementModal";
import {
  BADGES,
  INITIAL_USER_STATS,
  XP_PER_LEVEL,
  XP_PER_STREAK_DAY,
  checkNewBadges,
  getXpForCategory,
} from "./gamification/gamificationConfig";
import LevelProgress from "./gamification/LevelProgress";
import { getLocalDateString, getLocalToday } from "../../utils/dateHelper";

// Enable Animations
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  "General ⚡",
  "Health 💪",
  "Study 📚",
  "Work 💼",
  "Mindfulness 🧘",
  "Skill 🎨",
];

const HabitScreen = () => {
  const { colors, theme, syncNow, lastRefreshed, appStyles } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;

  const today = getLocalToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [tempSelectedDate, setTempSelectedDate] = useState(today);

  const [habits, setHabits] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  // --- GAMIFICATION STATE ---
  const [userStats, setUserStats] = useState(INITIAL_USER_STATS);
  const [achievementData, setAchievementData] = useState({
    visible: false,
    type: "",
    data: null,
  });

  const [addVisible, setAddVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [category, setCategory] = useState("General ⚡");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  useEffect(() => {
    generateHeatmap();
  }, [habits, theme, selectedDate]);

  // Reload data when sync completes
  useEffect(() => {
    if (lastRefreshed) {
      loadData();
    }
  }, [lastRefreshed]);

  const loadData = async () => {
    const h = await getData("habits_data");
    if (h) setHabits(h);

    const stats = await getData("user_gamification");
    if (stats) setUserStats(stats);
    else setUserStats(INITIAL_USER_STATS);
    
    // Check for night reminder
    checkMissingHabits(h);
  };

  const checkMissingHabits = (currentHabits) => {
    if (!currentHabits) return;
    
    // We only care about today's status for the night reminder
    // getLocalToday() returns "YYYY-MM-DD"
    const todayStr = getLocalToday();
    
    const hasMissing = currentHabits.some(h => {
        // If it's done today, history[todayStr] will be true
        return !h.history || !h.history[todayStr];
    });

    updateNightlyReminder(hasMissing);
  };

  // --- STREAK LOGIC ---
  const calculateStreakForHabit = (history, targetDate) => {
    let streak = 0;
    if (!history) return 0;
    let d = new Date(targetDate);
    if (isNaN(d.getTime())) return 0;

    // We can just iterate back in days using standard date manipulation
    // because we have formatted keys.
    while (true) {
      // Check current date string
      const dateStr = getLocalDateString(d);

      if (history[dateStr]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // --- GAMIFICATION LOGIC ---
  const processGamification = async (
    isCompleting,
    habitId,
    streakCount,
    category,
  ) => {
    let newStats = { ...userStats };
    const baseXp = getXpForCategory(category);
    const streakBonus = streakCount * XP_PER_STREAK_DAY;
    const totalActionXp = baseXp + streakBonus;

    if (isCompleting) {
      newStats.xp += totalActionXp;
      newStats.totalCompleted += 1;
    } else {
      newStats.xp = Math.max(0, newStats.xp - totalActionXp);
      newStats.totalCompleted = Math.max(0, newStats.totalCompleted - 1);
    }

    const calculatedLevel = Math.floor(newStats.xp / XP_PER_LEVEL) + 1;

    if (calculatedLevel > newStats.level) {
      setTimeout(() => {
        setAchievementData({
          visible: true,
          type: "levelup",
          data: { level: calculatedLevel },
        });
      }, 500);
    }

    newStats.level = calculatedLevel;

    if (isCompleting) {
      const unlockedIds = checkNewBadges(newStats, streakCount);
      if (unlockedIds.length > 0) {
        newStats.badges = [...newStats.badges, ...unlockedIds];
        const badgeDetails = BADGES.find((b) => b.id === unlockedIds[0]);
        setTimeout(() => {
          setAchievementData({
            visible: true,
            type: "badge",
            data: badgeDetails,
          });
        }, 1000);
      }
    }

    // Fix: Add timestamp so SyncHelper picks it up
    const finalStats = { ...newStats, updatedAt: new Date() };
    setUserStats(finalStats);
    await storeData("user_gamification", finalStats);
    syncNow();
  };

  const toggleHabit = async (id) => {
    if (selectedDate > today) {
      Alert.alert("Future Date", "Cannot complete habits for future dates.");
      return;
    }

    const d1 = new Date(selectedDate);
    const d2 = new Date(today);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 2) {
      Alert.alert("Too Late", "You can only edit habits from the last 2 days");
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updated = habits.map((h) => {
      if (h.id === id) {
        const isDone = h.history[selectedDate];
        const newHistory = { ...h.history };

        if (isDone) {
          const streakWas = calculateStreakForHabit(newHistory, selectedDate);
          delete newHistory[selectedDate];
          processGamification(false, id, streakWas, h.category);
        } else {
          newHistory[selectedDate] = true;
          const currentStreak = calculateStreakForHabit(
            newHistory,
            selectedDate,
          );
          processGamification(true, id, currentStreak, h.category);
        }
        return { ...h, history: newHistory, updatedAt: new Date() }; // Fix: Add timestamp
      }
      return h;
    });

    setHabits(updated);
    await storeData("habits_data", updated);
    syncNow();
    checkMissingHabits(updated);
  };

  // --- HEATMAP GENERATION ---
  const generateHeatmap = () => {
    const marks = {};
    if (!habits || habits.length === 0) {
      marks[selectedDate] = {
        customStyles: {
          container: { borderWidth: 2, borderColor: colors.primary },
          text: { color: colors.textPrimary },
        },
      };
      setMarkedDates(marks);
      return;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = getLocalDateString(d);

      let completedCount = 0;
      habits.forEach((h) => {
        if (h.history && h.history[dateStr]) completedCount++;
      });

      const ratio = habits.length > 0 ? completedCount / habits.length : 0;

      let bg = colors.surfaceHighlight;
      let txt = colors.textMuted;

      if (completedCount > 0) {
        txt = colors.white;
        if (ratio === 1) bg = colors.success;
        else if (ratio > 0.5) bg = colors.primary;
        else bg = colors.secondary;
      } else if (dateStr === today) {
        bg = colors.surface;
        txt = colors.textPrimary;
      }

      marks[dateStr] = {
        customStyles: {
          container: { backgroundColor: bg, borderRadius: 6 },
          text: { color: txt, fontWeight: "bold" },
        },
      };
    }

    if (!marks[selectedDate])
      marks[selectedDate] = { customStyles: { container: {}, text: {} } };
    if (!marks[selectedDate].customStyles)
      marks[selectedDate].customStyles = {};
    if (!marks[selectedDate].customStyles.container)
      marks[selectedDate].customStyles.container = {};

    marks[selectedDate].customStyles.container.borderWidth = 2;
    marks[selectedDate].customStyles.container.borderColor = colors.primary;

    setMarkedDates(marks);
  };

  const handleAddHabit = async () => {
    if (!title.trim()) return;

    let formattedDuration = "";
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h > 0 && m > 0) formattedDuration = `${h} hr ${m} min`;
    else if (h > 0) formattedDuration = `${h} hr`;
    else if (m > 0) formattedDuration = `${m} min`;

    const newHabit = {
      id: Date.now(),
      title,
      category,
      duration: formattedDuration,
      history: {},
      updatedAt: new Date(), // Fix: Add timestamp
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    await storeData("habits_data", updated);
    syncNow();
    checkMissingHabits(updated);
    setTitle("");
    setHours("");
    setMinutes("");
    setAddVisible(false);
  };

  const deleteHabit = (id) => {
    Alert.alert("Delete Habit", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          const updated = habits.filter((h) => h.id !== id);
          setHabits(updated);
          await storeData("habits_data", updated);
          syncNow();
          checkMissingHabits(updated);
        },
      },
    ]);
  };

  const dynamicStyles = {
    screen: { 
        backgroundColor: colors.background,
        paddingTop: insets.top 
    },
    textPrimary: { color: colors.textPrimary },
    modalContent: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    fab: { backgroundColor: colors.primary, shadowColor: colors.primary },
  };

  return (
    <View style={[styles.screen, dynamicStyles.screen]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, dynamicStyles.textPrimary, appStyles.headerTitleStyle]}>
            Habit Tracker
          </Text>
          <TouchableOpacity
            onPress={() => {
              setTempSelectedDate(selectedDate);
              setCalendarVisible(true);
            }}
          >
            <MaterialCommunityIcons
              name="calendar-month"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={habits}
          ListHeaderComponent={
            <>
              {/* HUD */}
              <LevelProgress stats={userStats} />

              {/* Date Strip */}
              <View style={{ marginBottom: 15 }}>
                <WeeklyStrip
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  isDark={theme === "dark"}
                />
              </View>
            </>
          }
          keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
          renderItem={({ item }) => {
            const streak = calculateStreakForHabit(item.history, today);
            const bonus = streak * XP_PER_STREAK_DAY;

            return (
              <View style={styles.habitRow}>
                <View style={{ flex: 1 }}>
                  <HabitCard
                    item={{ ...item, streak: streak }}
                    isDone={item.history && item.history[selectedDate]}
                    onToggle={() => toggleHabit(item.id)}
                    isDark={theme === "dark"}
                    streakBonus={bonus}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => deleteHabit(item.id)}
                  style={styles.deleteBtn}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <MaterialCommunityIcons
                name="rocket-launch-outline"
                size={50}
                color={colors.textMuted}
              />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  color: colors.textMuted,
                }}
              >
                No habits yet. Start your journey today!
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          style={[styles.fab, dynamicStyles.fab, { bottom: tabBarHeight + 20 }]}
          onPress={() => setAddVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
        </TouchableOpacity>

        {/* --- CALENDAR MODAL (Updated to react-native-modal for consistency) --- */}
        <Modal
          isVisible={calendarVisible}
          onBackdropPress={() => setCalendarVisible(false)}
          animationIn="fadeIn"
          animationOut="fadeOut"
          backdropOpacity={0.7}
        >
          <View
            style={[
              styles.modalContent,
              dynamicStyles.modalContent,
              // Keep Calendar rounded and centered
              { borderRadius: 24 },
            ]}
          >
            <Text style={[styles.modalTitle, dynamicStyles.textPrimary]}>
              Consistency Heatmap
            </Text>

            <Calendar
              current={tempSelectedDate}
              onDayPress={(day) => setTempSelectedDate(day.dateString)}
              markingType={"custom"}
              markedDates={markedDates}
              style={{ borderRadius: 10, marginBottom: 20 }}
              theme={{
                calendarBackground: colors.surface,
                dayTextColor: colors.textPrimary,
                monthTextColor: colors.textPrimary,
                arrowColor: colors.primary,
                textDisabledColor: colors.textMuted,
                todayTextColor: colors.secondary,
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Text
                  style={[styles.cancelText, { color: colors.textSecondary }]}
                >
                  Close
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSelectedDate(tempSelectedDate);
                  setCalendarVisible(false);
                }}
              >
                <Text style={styles.saveBtnText}>Go To Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- ADD HABIT MODAL (Floating Slide-up Window) --- */}
        <Modal
          isVisible={addVisible}
          // 2. ENABLE SLIDE TO CLOSE
          onSwipeComplete={() => setAddVisible(false)}
          swipeDirection={["down"]}
          onBackdropPress={() => setAddVisible(false)}
          style={styles.bottomModal} // 3. BOTTOM POSITIONING
          avoidKeyboard={true}
          backdropOpacity={0.7}
        >
          <View style={[styles.bottomModalContent, dynamicStyles.modalContent]}>
            {/* 4. DRAG HANDLE */}
            <View style={styles.dragHandleContainer}>
              <View
                style={[styles.dragHandle, { backgroundColor: colors.border }]}
              />
            </View>

            <Text style={[styles.modalTitle, dynamicStyles.textPrimary]}>
              New Habit
            </Text>

            <Text style={[styles.label, dynamicStyles.textPrimary]}>Title</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="e.g. Drink Water"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={[styles.label, dynamicStyles.textPrimary]}>
              Duration (Optional)
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  { flex: 1, marginBottom: 0 },
                ]}
                placeholder="Hours"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={hours}
                onChangeText={setHours}
              />
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  { flex: 1, marginBottom: 0 },
                ]}
                placeholder="Mins"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={minutes}
                onChangeText={setMinutes}
              />
            </View>

            <Text style={[styles.label, dynamicStyles.textPrimary]}>
              Category
            </Text>
            <View style={styles.catCloud}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        category === c ? colors.primary : colors.background,
                      borderColor:
                        category === c ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        category === c ? colors.white : colors.textSecondary,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Text
                  style={[styles.cancelText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddHabit}
              >
                <Text style={styles.saveBtnText}>Create Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <AchievementModal
          visible={achievementData.visible}
          type={achievementData.type}
          data={achievementData.data}
          onClose={() =>
            setAchievementData({ ...achievementData, visible: false })
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10, // Standardize to just 10, since wrapper handles insets? No, wait.
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontWeight: "bold" },
  habitRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  deleteBtn: { padding: 10, marginLeft: 5, justifyContent: "center" },

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

  // --- NEW MODAL STYLES ---
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  bottomModalContent: {
    padding: 25,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: 40,
  },
  modalContent: {
    padding: 25,
    borderWidth: 1,
  },
  // Drag Handle Styles
  dragHandleContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: -10, // Pull it up slightly
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },

  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  label: { marginBottom: 8, fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  catCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 25,
  },
  catChip: {
    paddingHorizontal: 12,
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
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
  cancelText: { fontWeight: "600" },
});

export default HabitScreen;
