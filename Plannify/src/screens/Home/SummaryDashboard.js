import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SideMenu from "../../components/SideMenu";
import { AppContext } from "../../context/AppContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getData } from "../../utils/storageHelper";
import { getLocalDateString, getLocalToday } from "../../utils/dateHelper";
import getStyles from "./SummaryDashboard.styles";

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
  {
    id: "social",
    name: "Social",
    icon: "account-group-outline",
    route: "Social",
  },
  {
    id: "splitfund",
    name: "Split Fund",
    icon: "account-cash-outline",
    route: "SplitFund",
  },
];

const SummaryDashboard = () => {
  const navigation = useNavigation();
  const { userData, colors, appStyles, isPremium } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);
  const safeAreaInsets = useSafeAreaInsets();

  // --- STATE ---
  const [globalStreak, setGlobalStreak] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [attendanceAvg, setAttendanceAvg] = useState(null);
  const [lowAttendanceCount, setLowAttendanceCount] = useState(0);
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

  const loadSummaries = useCallback(async () => {
    try {
      setRefreshing(true);
      // 1. Habits
      const habits = (await getData("habits_data")) || [];
      setGlobalStreak(calculatePerfectStreak(habits));

      // 2. Tasks
      const tasks = (await getData("tasks")) || [];
      const today = getLocalToday();
      const count = Array.isArray(tasks)
        ? tasks.filter((t) => !t.completed && !t.isDeleted && t.date >= today).length
        : 0;
      setPendingTasks(count);

      // 3. Attendance
      const subjects = (await getData("att_subjects")) || [];
      const settings = (await getData("att_settings")) || { minAttendance: 75 };
      const minAtt = settings.minAttendance;

      if (subjects.length > 0) {
        let totalP = 0,
          totalC = 0;
        let lowCount = 0;

        subjects.forEach((s) => {
          const stats = Object.values(s.history || {});
          let subP = 0,
            subC = 0;

          stats.forEach((rec) => {
            subP += rec.p;
            subC += rec.p + rec.a;
          });

          totalC += subC;
          totalP += subP;

          if (subC > 0) {
            const subPct = (subP / subC) * 100;
            if (subPct < minAtt) lowCount++;
          }
        });
        setAttendanceAvg(totalC === 0 ? 0 : (totalP / totalC) * 100);
        setLowAttendanceCount(lowCount);
      } else {
        setAttendanceAvg(null);
        setLowAttendanceCount(0);
      }

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
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummaries();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [loadSummaries]),
  );

  // --- LOGIC ---
  const activeFeatures = ALL_FEATURES.filter((f) => {
    if (!activeShortcutIds.includes(f.id)) return false;
    if (f.studentOnly && userData.userType !== "student") return false;
    if (f.id === "social" && !isPremium) return false;
    return true;
  });

  const toggleShortcut = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveShortcutIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };


  
  // --- RENDERERS ---
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.greetingText}>
          Good Morning,
        </Text>
        <Text style={[styles.nameText, appStyles.headerTitleStyle]}>
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
            style={styles.profileAvatar}
          />
        ) : (
          <View
            style={[
              styles.profileAvatar,
              styles.profileAvatarDefault,
            ]}
          >
            <Text style={styles.avatarInitial}>
              {userData.name?.[0]?.toUpperCase() || "G"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: safeAreaInsets.top + 10 }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
          <View style={styles.bentoColumn}>
            <TouchableOpacity
              style={[
                styles.card,
                styles.cardHabit,
              ]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Habits")}
            >
              <View
                style={[
                  styles.iconCircle,
                  styles.iconCirclePrimary,
                ]}
              >
                <MaterialCommunityIcons
                  name="fire"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={styles.cardValue}>
                  {globalStreak}
                </Text>
                <Text style={styles.cardLabel}>
                  Day Streak
                </Text>
                <View style={styles.streakRow}>
                  <Text style={styles.streakIncrease}>
                    +12%{" "}
                  </Text>
                  <Text style={styles.streakTime}>
                    this week
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* COLUMN 2: Tasks & Budget (Stacked) */}
          <View style={styles.bentoColumn}>
            {/* TASKS */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Tasks")}
            >
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.iconCircle,
                    styles.iconCircleSecondary,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={20}
                    color={colors.secondary}
                  />
                </View>
                <Text style={styles.cardValueSmall}>
                  {pendingTasks}
                </Text>
              </View>
              <Text style={styles.cardLabel}>
                Tasks Pending
              </Text>
            </TouchableOpacity>

            {/* BUDGET */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("BudgetTab")}
            >
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.iconCircle,
                    styles.iconCircleAccent,
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
                  { fontSize: 20 },
                ]}
              >
                {budgetStatus.currency}
                {budgetStatus.spent}
              </Text>

              {/* Modern Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor:
                        budgetStatus.spent > budgetStatus.limit
                          ? colors.danger
                          : colors.accent,
                      width: `${Math.min((budgetStatus.spent / (budgetStatus.limit || 1)) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.cardLabelSmall}>
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
              styles.card,
              styles.attendanceCard,
            ]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("Attendance")}
          >
            <View style={styles.attendanceLeft}>
              <Text style={styles.cardLabel}>
                Attendance Rate
              </Text>
              <Text style={styles.cardValue}>
                {attendanceAvg ? `${attendanceAvg.toFixed(0)}%` : "--"}
              </Text>
              <Text
                style={[
                  styles.attendanceStatus,
                  {
                    color: lowAttendanceCount > 0 ? colors.danger : colors.success,
                  },
                ]}
              >
                {lowAttendanceCount > 0
                  ? `Warning: Low in ${lowAttendanceCount} subject${lowAttendanceCount > 1 ? 's' : ''}`
                  : "Excellent Status"}
              </Text>
            </View>

            {/* Circular Indicator Placeholder */}
            <View style={styles.attendanceIndicator}>
              <MaterialCommunityIcons
                name="school"
                size={24}
                color={colors.textMuted}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* --- QUICK ACTIONS --- */}
        <View style={styles.shortcutsSection}>
          <View style={styles.shortcutsHeader}>
            <Text style={styles.shortcutsTitle}>
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
          <View style={styles.shortcutsGrid}>
            {activeFeatures.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={styles.quickBtn}
                onPress={() => navigation.navigate(f.route)}
              >
                <View style={styles.quickBtnContent}>
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={28}
                    color={colors.primary}
                  />
                  <Text style={styles.quickBtnText}>
                    {f.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* --- FLOATING POPOVER (Replaces Old Sidebar) --- */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* --- EDIT MODAL (Draggable Bottom Sheet) --- */}
      <Modal
        isVisible={editModalVisible}
        onSwipeComplete={() => setEditModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setEditModalVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={true}
        backdropOpacity={0.7}
        propagateSwipe={true}
      >
        <View style={styles.bottomModalContent}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={styles.modalTitle}>
            Edit Shortcuts
          </Text>
          <View style={styles.modalScrollContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ALL_FEATURES.map((f) => {
                if (f.studentOnly && userData.userType !== "student")
                  return null;
                // NEW: Hide Social if not Premium
                if (f.id === "social" && !isPremium) return null;

                const active = activeShortcutIds.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => toggleShortcut(f.id)}
                    style={styles.shortcutItem}
                  >
                    <MaterialCommunityIcons
                      name={
                        active ? "checkbox-marked-circle" : "circle-outline"
                      }
                      size={24}
                      color={active ? colors.primary : colors.textMuted}
                    />
                    <Text style={styles.shortcutItemText}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setEditModalVisible(false)}
          >
            <Text style={styles.doneBtnText}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default SummaryDashboard;
