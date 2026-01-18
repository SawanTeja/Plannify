import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useState } from "react";
import {
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SideMenu from "../../components/SideMenu";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData } from "../../utils/storageHelper";

// --- CONFIG: AVAILABLE FEATURES FOR QUICK ACCESS ---
const ALL_FEATURES = [
  { id: "journal", name: "Journal", icon: "📖", route: "Journal" },
  { id: "bucket", name: "Bucket List", icon: "✨", route: "BucketList" },
  { id: "habits", name: "Habits", icon: "🔥", route: "Habits" },
  { id: "tasks", name: "Tasks", icon: "📅", route: "Tasks" },
  { id: "budget", name: "Budget", icon: "💰", route: "BudgetTab" },
  {
    id: "attendance",
    name: "Attendance",
    icon: "🎓",
    route: "Attendance",
    studentOnly: true,
  },
];

const SummaryDashboard = () => {
  const navigation = useNavigation();
  const { theme, userData } = useContext(AppContext);
  const isDark = theme === "dark";

  // --- STATE: Existing Summary Data ---
  const [globalStreak, setGlobalStreak] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [attendanceAvg, setAttendanceAvg] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState({
    spent: 0,
    limit: 0,
    currency: "$",
  });

  // --- STATE: UI & Editing ---
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Default shortcuts (Journal & Bucket List)
  const [activeShortcutIds, setActiveShortcutIds] = useState([
    "journal",
    "bucket",
  ]);

  const bg = isDark ? "#121212" : "#f8f9fa";
  const cardBg = isDark ? "#1e1e1e" : "#fff";
  const text = isDark ? "#fff" : colors.textPrimary;
  const subText = isDark ? "#aaa" : colors.textSecondary;

  useFocusEffect(
    useCallback(() => {
      loadSummaries();
    }, []),
  );

  // --- LOGIC: Quick Access Filter ---
  const activeFeatures = ALL_FEATURES.filter((f) => {
    if (!activeShortcutIds.includes(f.id)) return false;
    if (f.studentOnly && userData.userType !== "student") return false;
    return true;
  });

  const toggleShortcut = (id) => {
    setActiveShortcutIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  // --- LOGIC: Summaries (Unchanged) ---
  const calculatePerfectStreak = (habits) => {
    if (!habits || habits.length === 0) return 0;
    let streak = 0;
    let d = new Date();
    const todayStr = d.toISOString().split("T")[0];
    const allDoneToday = habits.every((h) => h.history && h.history[todayStr]);
    if (allDoneToday) streak++;
    d.setDate(d.getDate() - 1);
    while (true) {
      const dateStr = d.toISOString().split("T")[0];
      const allDone = habits.every((h) => h.history && h.history[dateStr]);
      if (allDone) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const loadSummaries = async () => {
    // 1. Habits
    const habits = (await getData("habits_data")) || [];
    setGlobalStreak(calculatePerfectStreak(habits));

    // 2. Tasks
    const tasks = (await getData("tasks_data")) || {};
    let count = 0;
    const today = new Date().toISOString().split("T")[0];
    Object.keys(tasks).forEach((date) => {
      if (date >= today)
        count += tasks[date].filter((t) => !t.completed).length;
    });
    setPendingTasks(count);

    // 3. Attendance
    const subjects = (await getData("attendance_data")) || [];
    if (subjects.length > 0) {
      let totalP = 0,
        totalC = 0;
      subjects.forEach((s) => {
        const stats = Object.values(s.history);
        totalC += stats.length;
        totalP += stats.filter((v) => v === "present").length;
      });
      setAttendanceAvg(totalC === 0 ? 0 : (totalP / totalC) * 100);
    } else setAttendanceAvg(null);

    // 4. Budget
    const budget = await getData("budget_data");
    if (budget) {
      const catSpent = (budget.categories || []).reduce(
        (acc, c) => acc + c.spent,
        0,
      );
      const rawSpent = (budget.transactions || []).reduce(
        (acc, t) => acc + t.amount,
        0,
      );
      setBudgetStatus({
        spent: budget.categories?.length > 0 ? catSpent : rawSpent,
        limit: budget.totalBudget,
        currency: budget.currency,
      });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        paddingTop:
          Platform.OS === "android" ? StatusBar.currentHeight + 20 : 20,
      }}
    >
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSummaries} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={[styles.menuIcon, { color: text }]}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.greeting, { color: subText }]}>
              Welcome back,
            </Text>
            <Text style={[styles.title, { color: text }]}>{userData.name}</Text>
          </View>
        </View>

        {/* --- MAIN WIDGETS (Stats) --- */}
        <TouchableOpacity
          style={[styles.widget, { backgroundColor: cardBg }]}
          onPress={() => navigation.navigate("Habits")}
        >
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 24 }}>🔥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.widgetTitle, { color: text }]}>
              Perfect Streak
            </Text>
            <Text
              style={{ color: globalStreak > 0 ? colors.success : subText }}
            >
              {globalStreak > 0
                ? `${globalStreak} Day Streak Active!`
                : "Complete all habits to start"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.widget, { backgroundColor: cardBg }]}
          onPress={() => navigation.navigate("Tasks")}
        >
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 24 }}>📅</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.widgetTitle, { color: text }]}>
              Pending Tasks
            </Text>
            <Text style={{ color: pendingTasks > 5 ? "#e74c3c" : subText }}>
              {pendingTasks} tasks upcoming.
            </Text>
          </View>
        </TouchableOpacity>

        {userData.userType === "student" && (
          <TouchableOpacity
            style={[styles.widget, { backgroundColor: cardBg }]}
            onPress={() => navigation.navigate("Attendance")}
          >
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 24 }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.widgetTitle, { color: text }]}>
                Attendance
              </Text>
              {attendanceAvg !== null ? (
                <Text
                  style={{
                    color: attendanceAvg >= 75 ? colors.success : "#e74c3c",
                    fontWeight: "bold",
                  }}
                >
                  {attendanceAvg.toFixed(1)}% (
                  {attendanceAvg >= 75 ? "Safe" : "Low"})
                </Text>
              ) : (
                <Text style={{ color: subText }}>No data yet.</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.widget, { backgroundColor: cardBg }]}
          onPress={() => navigation.navigate("BudgetTab")}
        >
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 24 }}>💰</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.widgetTitle, { color: text }]}>
              Monthly Budget
            </Text>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min((budgetStatus.spent / (budgetStatus.limit || 1)) * 100, 100)}%`,
                    backgroundColor:
                      budgetStatus.spent > budgetStatus.limit
                        ? "#e74c3c"
                        : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={{ color: subText, fontSize: 12, marginTop: 4 }}>
              {budgetStatus.currency}
              {budgetStatus.spent} / {budgetStatus.currency}
              {budgetStatus.limit}
            </Text>
          </View>
        </TouchableOpacity>

        {/* --- CUSTOMIZABLE QUICK ACCESS SECTION --- */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: text }]}>
            Quick Access
          </Text>
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {activeFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.miniCard, { backgroundColor: cardBg }]}
              onPress={() => navigation.navigate(feature.route)}
            >
              <Text style={{ fontSize: 24, marginBottom: 5 }}>
                {feature.icon}
              </Text>
              <Text style={[styles.miniText, { color: text }]}>
                {feature.name}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Invisible filler to keep alignment if needed, or empty state */}
          {activeFeatures.length === 0 && (
            <Text style={{ color: subText, fontStyle: "italic", padding: 10 }}>
              No shortcuts added.
            </Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- MODAL: EDIT SHORTCUTS --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: text }]}>
              Manage Shortcuts
            </Text>
            <Text style={{ color: subText, marginBottom: 20 }}>
              Select items for Quick Access
            </Text>

            <ScrollView>
              {ALL_FEATURES.map((feature) => {
                if (feature.studentOnly && userData.userType !== "student")
                  return null;
                const isActive = activeShortcutIds.includes(feature.id);
                return (
                  <TouchableOpacity
                    key={feature.id}
                    style={[
                      styles.optionRow,
                      isDark
                        ? { borderBottomColor: "#333" }
                        : { borderBottomColor: "#eee" },
                    ]}
                    onPress={() => toggleShortcut(feature.id)}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 24, marginRight: 15 }}>
                        {feature.icon}
                      </Text>
                      <Text style={[styles.optionText, { color: text }]}>
                        {feature.name}
                      </Text>
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={() => toggleShortcut(feature.id)}
                      trackColor={{ false: "#767577", true: colors.primary }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- SIDE MENU (UNCONDITIONALLY RENDERED) --- */}
      {/* We removed {menuVisible && ...} so animations work properly */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    marginTop: 10,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  menuBtn: { marginRight: 15, padding: 5 },
  menuIcon: { fontSize: 28, fontWeight: "bold" },
  greeting: { fontSize: 16 },
  title: { fontSize: 28, fontWeight: "bold" },

  // Widget Styles
  widget: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  widgetTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  barBg: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 3,
    width: "100%",
    marginTop: 5,
  },
  barFill: { height: "100%", borderRadius: 3 },

  // Quick Access Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  miniCard: {
    width: "31%", // Fits 3 in a row comfortably with gap
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 5,
  },
  miniText: { fontSize: 12, fontWeight: "600" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { borderRadius: 20, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 5 },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  optionText: { fontSize: 16, fontWeight: "600" },
  closeBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  closeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default SummaryDashboard;
