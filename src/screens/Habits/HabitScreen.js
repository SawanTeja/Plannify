import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
// 1. Import Safe Area Insets
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

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
  const { colors, theme } = useContext(AppContext);

  // 2. Calculate dynamic bottom height
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;

  const getLocalToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split("T")[0];
  };

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

  const loadData = async () => {
    const h = await getData("habits_data");
    if (h) setHabits(h);

    const stats = await getData("user_gamification");
    if (stats) setUserStats(stats);
    else setUserStats(INITIAL_USER_STATS);
  };

  // --- STREAK LOGIC ---
  const calculateStreakForHabit = (history, targetDate) => {
    let streak = 0;
    let d = new Date(targetDate);
    if (isNaN(d.getTime())) return 0;

    while (true) {
      const offset = d.getTimezoneOffset() * 60000;
      const loopDate = new Date(d.getTime() - offset);
      const dateStr = loopDate.toISOString().split("T")[0];

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

    setUserStats(newStats);
    await storeData("user_gamification", newStats);
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

    // Animate change
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
        return { ...h, history: newHistory };
      }
      return h;
    });

    setHabits(updated);
    await storeData("habits_data", updated);
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

    // Find range (naive approach: last 90 days to today)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date(); // Today

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const offset = d.getTimezoneOffset() * 60000;
      const loopDate = new Date(d.getTime() - offset);
      const dateStr = loopDate.toISOString().split("T")[0];

      let completedCount = 0;
      habits.forEach((h) => {
        if (h.history && h.history[dateStr]) completedCount++;
      });

      const ratio = habits.length > 0 ? completedCount / habits.length : 0;

      // Dynamic Colors based on theme
      let bg = colors.surfaceHighlight; // Empty day
      let txt = colors.textMuted;

      if (completedCount > 0) {
        txt = colors.white;
        if (ratio === 1)
          bg = colors.success; // All done
        else if (ratio > 0.5)
          bg = colors.primary; // Most done
        else bg = colors.secondary; // Some done
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

    // Highlight Selected
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
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    await storeData("habits_data", updated);
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
        },
      },
    ]);
  };

  // --- DYNAMIC STYLES ---
  const dynamicStyles = {
    screen: { backgroundColor: colors.background },
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
          <Text style={[styles.title, dynamicStyles.textPrimary]}>
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

        <FlatList
          data={habits}
          keyExtractor={(item) => item.id.toString()}
          // 3. Apply Dynamic Padding
          contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
          renderItem={({ item }) => {
            const streak = calculateStreakForHabit(item.history, today);
            const bonus = streak * XP_PER_STREAK_DAY;

            return (
              <View style={styles.habitRow}>
                <View style={{ flex: 1 }}>
                  <HabitCard
                    item={{ ...item, streak: streak }}
                    isDone={item.history[selectedDate]}
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
          // 4. Position FAB Dynamically above Tab Bar
          style={[styles.fab, dynamicStyles.fab, { bottom: tabBarHeight + 20 }]}
          onPress={() => setAddVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
        </TouchableOpacity>

        {/* CALENDAR MODAL */}
        <Modal
          visible={calendarVisible}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                dynamicStyles.modalContent,
                { width: "90%" },
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
          </View>
        </Modal>

        {/* ADD HABIT MODAL */}
        <Modal visible={addVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalContent]}>
              <Text style={[styles.modalTitle, dynamicStyles.textPrimary]}>
                New Habit
              </Text>

              <Text style={[styles.label, dynamicStyles.textPrimary]}>
                Title
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="e.g. Drink Water"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 28, fontWeight: "bold" },
  habitRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  deleteBtn: { padding: 10, marginLeft: 5, justifyContent: "center" },

  fab: {
    position: "absolute",
    // bottom: 30, // Removed, handled dynamically
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

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    // 5. Center content horizontally
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    padding: 25,
    borderRadius: 24,
    borderWidth: 1,
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
