import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
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
} from "./gamification/gamificationUtils";
import LevelProgress from "./gamification/LevelProgress";

const CATEGORIES = [
  "General ⚡",
  "Health 💪",
  "Study 📚",
  "Work 💼",
  "Mindfulness 🧘",
  "Skill 🎨",
];

const HabitScreen = () => {
  const { theme } = useContext(AppContext);
  const isDark = theme === "dark";

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

  const bg = isDark ? "#121212" : colors.background;
  const text = isDark ? "#fff" : colors.textPrimary;
  const cardBg = isDark ? "#1e1e1e" : "#fff";
  const inputColor = {
    color: text,
    borderColor: isDark ? "#444" : "#ddd",
    backgroundColor: isDark ? "#2c2c2c" : "#fff",
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  useEffect(() => {
    generateHeatmap();
  }, [habits, isDark, selectedDate]);

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
    // We start checking from the targetDate backwards
    let d = new Date(targetDate);

    // Safety check for invalid date
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

  // --- CORE GAMIFICATION LOGIC (FIXED) ---
  const processGamification = async (
    isCompleting,
    habitId,
    streakCount,
    category,
  ) => {
    let newStats = { ...userStats };

    // 1. Calculate the XP Value for this specific action
    const baseXp = getXpForCategory(category);
    const streakBonus = streakCount * XP_PER_STREAK_DAY;
    const totalActionXp = baseXp + streakBonus;

    if (isCompleting) {
      // ADD XP
      newStats.xp += totalActionXp;
      newStats.totalCompleted += 1;
    } else {
      // REMOVE XP (Exact same amount we would have given)
      // Prevent negative XP
      newStats.xp = Math.max(0, newStats.xp - totalActionXp);
      newStats.totalCompleted = Math.max(0, newStats.totalCompleted - 1);
    }

    // 2. IDEMPOTENT LEVEL CALCULATION
    // This fixes the infinite level bug. Level is always derived directly from Total XP.
    // Level 1 = 0-99 XP, Level 2 = 100-199 XP, etc.
    const calculatedLevel = Math.floor(newStats.xp / XP_PER_LEVEL) + 1;

    // Check if we ACTUALLY leveled up (to show modal)
    if (calculatedLevel > newStats.level) {
      setTimeout(() => {
        setAchievementData({
          visible: true,
          type: "levelup",
          data: { level: calculatedLevel },
        });
      }, 500);
    }

    // Update level to the calculated one (handles downgrades too automatically)
    newStats.level = calculatedLevel;

    // 3. BADGE LOGIC
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
    // 1. DATE CHECKS
    if (selectedDate > today) {
      Alert.alert(
        "Future Date",
        "You cannot complete habits for future dates.",
      );
      return;
    }

    // 2-Day Restriction (Anti-Cheese)
    const d1 = new Date(selectedDate);
    const d2 = new Date(today);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 2) {
      Alert.alert(
        "Too Late",
        "You can only edit habits from the last 2 days to maintain integrity.",
      );
      return;
    }

    const updated = habits.map((h) => {
      if (h.id === id) {
        const isDone = h.history[selectedDate];
        const newHistory = { ...h.history };

        if (isDone) {
          // --- UNDOING A HABIT ---
          // 1. Calculate what the streak WAS when it was active.
          // Since it is currently 'true' in history, calculating streak normally returns the value including today.
          const streakWas = calculateStreakForHabit(newHistory, selectedDate);

          // 2. Remove from history
          delete newHistory[selectedDate];

          // 3. Remove XP based on that streak
          processGamification(false, id, streakWas, h.category);
        } else {
          // --- COMPLETING A HABIT ---
          // 1. Add to history temporarily to calculate projected streak
          newHistory[selectedDate] = true;

          // 2. Calculate what the streak IS now with this new check
          const currentStreak = calculateStreakForHabit(
            newHistory,
            selectedDate,
          );

          // 3. Add XP based on this new streak
          processGamification(true, id, currentStreak, h.category);
        }
        return { ...h, history: newHistory };
      }
      return h;
    });

    setHabits(updated);
    await storeData("habits_data", updated);
  };

  // --- HEATMAP GENERATION (Standard) ---
  const generateHeatmap = () => {
    const marks = {};
    if (!habits || habits.length === 0) {
      // Just mark selected date
      marks[selectedDate] = {
        customStyles: {
          container: { borderWidth: 2, borderColor: colors.primary },
          text: { color: text },
        },
      };
      setMarkedDates(marks);
      return;
    }

    let startTimestamp = Date.now();
    habits.forEach((h) => {
      if (h.id < startTimestamp) startTimestamp = h.id;
      if (h.history) {
        Object.keys(h.history).forEach((d) => {
          const ts = new Date(d).getTime();
          if (ts < startTimestamp) startTimestamp = ts;
        });
      }
    });

    const startDate = new Date(startTimestamp);
    const endDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

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

      let color = isDark ? "#222" : "#f0f0f0";
      let textColor = isDark ? "#aaa" : "#888";

      if (completedCount > 0) {
        if (ratio === 1) {
          color = colors.success;
          textColor = "#fff";
        } else {
          color = "#f1c40f";
          textColor = "#fff";
        }
      } else if (dateStr === today) {
        color = isDark ? "#374151" : "#D1D5DB";
        textColor = isDark ? "#fff" : "#000";
      } else if (dateStr < today) {
        color = "#e74c3c";
        textColor = "#fff";
      }

      marks[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: color,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          },
          text: { color: textColor, fontWeight: "bold" },
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
          const updated = habits.filter((h) => h.id !== id);
          setHabits(updated);
          await storeData("habits_data", updated);
        },
      },
    ]);
  };

  const openCalendarModal = () => {
    setTempSelectedDate(selectedDate);
    setCalendarVisible(true);
  };
  const handleGoToDate = () => {
    setSelectedDate(tempSelectedDate);
    setCalendarVisible(false);
  };

  const getModalMarks = () => {
    const modalMarks = JSON.parse(JSON.stringify(markedDates));
    if (modalMarks[selectedDate] && selectedDate !== tempSelectedDate) {
      modalMarks[selectedDate].customStyles.container.borderWidth = 0;
    }
    if (!modalMarks[tempSelectedDate])
      modalMarks[tempSelectedDate] = {
        customStyles: { container: {}, text: {} },
      };
    if (!modalMarks[tempSelectedDate].customStyles)
      modalMarks[tempSelectedDate].customStyles = { container: {}, text: {} };

    modalMarks[tempSelectedDate].customStyles.container.borderWidth = 2;
    modalMarks[tempSelectedDate].customStyles.container.borderColor =
      colors.primary;
    return modalMarks;
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop:
            Platform.OS === "android" ? StatusBar.currentHeight + 20 : 20,
        }}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: text }]}>Habit Tracker</Text>
          <TouchableOpacity onPress={openCalendarModal}>
            <Text style={{ fontSize: 24 }}>📅</Text>
          </TouchableOpacity>
        </View>

        <LevelProgress stats={userStats} isDark={isDark} />

        <WeeklyStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isDark={isDark}
        />

        <FlatList
          data={habits}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            // Calculate streak for display purposes (assuming today is part of it if marked)
            const streak = calculateStreakForHabit(item.history, today);
            // Calculate potential bonus for display logic
            // If done, bonus is already in streak. If not done, it would be (streak+1)*5?
            // To keep it simple in UI, we just show base streak bonus
            const bonus = streak * XP_PER_STREAK_DAY;

            return (
              <View style={styles.habitRow}>
                <View style={{ flex: 1 }}>
                  <HabitCard
                    item={{ ...item, streak: streak }}
                    isDone={item.history[selectedDate]}
                    onToggle={() => toggleHabit(item.id)}
                    isDark={isDark}
                    streakBonus={bonus}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => deleteHabit(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={{ fontSize: 20 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 50, color: "#aaa" }}>
              No habits yet. Start today!
            </Text>
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {/* MODALS */}
        <Modal
          visible={calendarVisible}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: cardBg, width: "90%", alignItems: "center" },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: text, marginBottom: 15 }]}
              >
                Performance Heatmap
              </Text>
              <Calendar
                current={tempSelectedDate}
                onDayPress={(day) => setTempSelectedDate(day.dateString)}
                markingType={"custom"}
                markedDates={getModalMarks()}
                style={{ width: 300, borderRadius: 10 }}
                theme={{
                  calendarBackground: cardBg,
                  dayTextColor: text,
                  monthTextColor: text,
                  arrowColor: colors.primary,
                  textDisabledColor: "#444",
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                  marginTop: 20,
                  paddingHorizontal: 10,
                }}
              >
                <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                  <Text style={{ color: "#aaa", fontSize: 16 }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGoToDate}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Go To Date
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={addVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <Text style={[styles.modalTitle, { color: text }]}>
                New Habit
              </Text>
              <Text style={{ color: text, marginBottom: 5, fontWeight: "600" }}>
                Title
              </Text>
              <TextInput
                style={[styles.input, inputColor]}
                placeholder="e.g. Drink Water"
                placeholderTextColor="#888"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={{ color: text, marginBottom: 5, fontWeight: "600" }}>
                Goal Duration
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, inputColor, { marginBottom: 0 }]}
                    placeholder="Hours"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={hours}
                    onChangeText={setHours}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, inputColor, { marginBottom: 0 }]}
                    placeholder="Mins"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={minutes}
                    onChangeText={setMinutes}
                  />
                </View>
              </View>

              <Text style={{ color: text, marginBottom: 5, fontWeight: "600" }}>
                Category
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 5,
                  marginBottom: 15,
                }}
              >
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      padding: 6,
                      borderWidth: 1,
                      borderColor: category === c ? colors.primary : "#ddd",
                      borderRadius: 8,
                      backgroundColor:
                        category === c ? colors.primary : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: category === c ? "#fff" : "#888",
                        fontSize: 12,
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddHabit}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <AchievementModal
          visible={achievementData.visible}
          type={achievementData.type}
          data={achievementData.data}
          isDark={isDark}
          onClose={() =>
            setAchievementData({ ...achievementData, visible: false })
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 28, fontWeight: "bold" },
  habitRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  deleteBtn: { padding: 10, marginLeft: 5, justifyContent: "center" },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: { padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 15 },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
  cancelText: { textAlign: "center", color: "#888" },
});

export default HabitScreen;
