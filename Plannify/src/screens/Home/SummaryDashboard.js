import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import SideMenu from "../../components/SideMenu";
import { AppContext } from "../../context/AppContext";
import { getData } from "../../utils/storageHelper";
import { getLocalDateString, getLocalToday } from "../../utils/dateHelper";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONFIG ---
const ALL_FEATURES = [
  {
    id: "journal",
    name: "Journal",
    icon: "notebook-outline",
    route: "Journal",
  },
  {
    id: "bucket",
    name: "Bucket List",
    icon: "star-four-points-outline",
    route: "BucketList",
  },
  { id: "habits", name: "Habits", icon: "fire", route: "Habits" },
  {
    id: "tasks",
    name: "Tasks",
    icon: "checkbox-marked-circle-outline",
    route: "Tasks",
  },
  { id: "budget", name: "Budget", icon: "wallet-outline", route: "BudgetTab" },
  {
    id: "attendance",
    name: "Attendance",
    icon: "school-outline",
    route: "Attendance",
    studentOnly: true,
  },
];

const SummaryDashboard = () => {
  const navigation = useNavigation();
  const { userData, colors, theme } = useContext(AppContext);

  // --- STATE ---
  const [globalStreak, setGlobalStreak] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [attendanceAvg, setAttendanceAvg] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState({
    spent: 0,
    limit: 0,
    currency: "$",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeShortcutIds, setActiveShortcutIds] = useState([
    "journal",
    "bucket",
  ]);

  useFocusEffect(
    useCallback(() => {
      loadSummaries();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, []),
  );

  // --- LOGIC ---
  const activeFeatures = ALL_FEATURES.filter((f) => {
    if (!activeShortcutIds.includes(f.id)) return false;
    if (f.studentOnly && userData.userType !== "student") return false;
    return true;
  });

  const toggleShortcut = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveShortcutIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  const calculatePerfectStreak = (habits) => {
    if (!habits || habits.length === 0) return 0;
    let streak = 0;
    let d = new Date();
    const todayStr = getLocalDateString(d);
    const allDoneToday = habits.every((h) => h.history && h.history[todayStr]);
    if (allDoneToday) streak++;
    d.setDate(d.getDate() - 1);
    while (true) {
      const dateStr = getLocalDateString(d);
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
    const today = getLocalToday();
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

  // --- STYLES GENERATOR ---
  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    headerText: { color: colors.textPrimary },
    subText: { color: colors.textSecondary },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 20,
      justifyContent: "space-between",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    quickBtn: {
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 24,
      padding: 15,
      alignItems: "center",
      justifyContent: "center",
      width: "30%",
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileAvatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
    },
  };

  // --- RENDERERS ---
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View>
        <Text style={[styles.greetingText, dynamicStyles.subText]}>
          Good Morning,
        </Text>
        <Text style={[styles.nameText, dynamicStyles.headerText]}>
          {userData.name}
        </Text>
      </View>

      {/* UPDATED: Profile Avatar Trigger 
          Clicking this opens the Floating Popover (SideMenu)
      */}
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.8}
      >
        {userData.image ? (
          <Image
            source={{ uri: userData.image }}
            style={dynamicStyles.profileAvatar}
          />
        ) : (
          <View
            style={[
              dynamicStyles.profileAvatar,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>
              {userData.name?.[0]?.toUpperCase() || "G"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={dynamicStyles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadSummaries}
            tintColor={colors.primary}
          />
        }
      >
        {renderHeader()}

        {/* --- BENTO GRID --- */}
        <View style={styles.bentoContainer}>
          {/* COLUMN 1: Habits (Big Vertical) */}
          <View style={{ flex: 1, gap: 15 }}>
            <TouchableOpacity
              style={[
                dynamicStyles.card,
                { flex: 1, backgroundColor: colors.surface },
              ]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Habits")}
            >
              <View
                style={[
                  dynamicStyles.iconCircle,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="fire"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                  {globalStreak}
                </Text>
                <Text
                  style={[styles.cardLabel, { color: colors.textSecondary }]}
                >
                  Day Streak
                </Text>
                <View style={{ flexDirection: "row", marginTop: 5 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.success,
                      fontWeight: "bold",
                    }}
                  >
                    +12%{" "}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>
                    this week
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* COLUMN 2: Tasks & Budget (Stacked) */}
          <View style={{ flex: 1, gap: 15 }}>
            {/* TASKS */}
            <TouchableOpacity
              style={dynamicStyles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Tasks")}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View
                  style={[
                    dynamicStyles.iconCircle,
                    {
                      width: 36,
                      height: 36,
                      backgroundColor: colors.secondary + "20",
                      marginBottom: 0,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={20}
                    color={colors.secondary}
                  />
                </View>
                <Text
                  style={[styles.cardValueSmall, { color: colors.textPrimary }]}
                >
                  {pendingTasks}
                </Text>
              </View>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Tasks Pending
              </Text>
            </TouchableOpacity>

            {/* BUDGET */}
            <TouchableOpacity
              style={dynamicStyles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("BudgetTab")}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View
                  style={[
                    dynamicStyles.iconCircle,
                    {
                      width: 36,
                      height: 36,
                      backgroundColor: colors.accent + "20",
                      marginBottom: 0,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="chart-pie"
                    size={20}
                    color={colors.accent}
                  />
                </View>
              </View>
              <Text
                style={[
                  styles.cardValueSmall,
                  { fontSize: 20, color: colors.textPrimary },
                ]}
              >
                {budgetStatus.currency}
                {budgetStatus.spent}
              </Text>

              {/* Modern Progress Bar */}
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 2,
                  marginVertical: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor:
                      budgetStatus.spent > budgetStatus.limit
                        ? colors.danger
                        : colors.accent,
                    width: `${Math.min((budgetStatus.spent / (budgetStatus.limit || 1)) * 100, 100)}%`,
                  }}
                />
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: colors.textSecondary, fontSize: 11 },
                ]}
              >
                of {budgetStatus.currency}
                {budgetStatus.limit} limit
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- ATTENDANCE (Wide Card) --- */}
        {userData.userType === "student" && (
          <TouchableOpacity
            style={[
              dynamicStyles.card,
              {
                flexDirection: "row",
                alignItems: "center",
                marginTop: 15,
                paddingVertical: 25,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("Attendance")}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Attendance Rate
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  { fontSize: 32, color: colors.textPrimary },
                ]}
              >
                {attendanceAvg ? `${attendanceAvg.toFixed(0)}%` : "--"}
              </Text>
              <Text
                style={{
                  color: attendanceAvg >= 75 ? colors.success : colors.danger,
                  fontSize: 12,
                  marginTop: 4,
                  fontWeight: "600",
                }}
              >
                {attendanceAvg >= 75
                  ? "Excellent Status"
                  : "Warning: Low Attendance"}
              </Text>
            </View>

            {/* Circular Indicator Placeholder */}
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 4,
                borderColor: colors.surfaceHighlight,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="school"
                size={24}
                color={colors.textMuted}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* --- QUICK ACTIONS --- */}
        <View style={{ marginTop: 30 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              Shortcuts
            </Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)}>
              <MaterialCommunityIcons
                name="pencil-circle"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {activeFeatures.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={dynamicStyles.quickBtn}
                onPress={() => navigation.navigate(f.route)}
              >
                <MaterialCommunityIcons
                  name={f.icon}
                  size={28}
                  color={colors.primary}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.textSecondary,
                    marginTop: 8,
                  }}
                >
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* --- FLOATING POPOVER (Replaces Old Sidebar) --- */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* --- EDIT MODAL (Simple Styling for now) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              padding: 25,
              maxHeight: "60%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.textPrimary,
                marginBottom: 20,
              }}
            >
              Edit Shortcuts
            </Text>
            <ScrollView>
              {ALL_FEATURES.map((f) => {
                if (f.studentOnly && userData.userType !== "student")
                  return null;
                const active = activeShortcutIds.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => toggleShortcut(f.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 15,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        active ? "checkbox-marked-circle" : "circle-outline"
                      }
                      size={24}
                      color={active ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={{
                        marginLeft: 15,
                        fontSize: 16,
                        color: colors.textPrimary,
                      }}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 15,
                borderRadius: 15,
                alignItems: "center",
                marginTop: 20,
              }}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={{ color: colors.white, fontWeight: "bold" }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  greetingText: { fontSize: 16, fontWeight: "500" },
  nameText: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  menuBtn: { padding: 8, borderRadius: 12, borderWidth: 1 },
  bentoContainer: { flexDirection: "row", gap: 15 },
  cardValue: { fontSize: 32, fontWeight: "800" },
  cardValueSmall: { fontSize: 22, fontWeight: "800" },
  cardLabel: { fontSize: 13, fontWeight: "600", marginTop: 2 },
});

export default SummaryDashboard;
