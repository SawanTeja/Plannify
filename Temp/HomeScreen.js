import { useNavigation } from "@react-navigation/native";
import { useContext, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SideMenu from "../src/components/SideMenu";
import colors from "../src/constants/colors";
import { AppContext } from "../src/context/AppContext";

// --- CONFIG: AVAILABLE FEATURES ---
const ALL_FEATURES = [
  {
    id: "budget",
    name: "Budget Planner",
    icon: "💰",
    sub: "Track expenses",
    route: "BudgetTab",
  },
  {
    id: "tasks",
    name: "Daily Tasks",
    icon: "📅",
    sub: "Habits & To-Dos",
    route: "Tasks",
  },
  {
    id: "attendance",
    name: "Attendance",
    icon: "🎓",
    sub: "Track Classes",
    route: "Attendance",
    studentOnly: true,
  },
  {
    id: "journal",
    name: "Journal",
    icon: "📖",
    sub: "Memories & Notes",
    route: "Journal",
  },
  {
    id: "bucket",
    name: "Bucket List",
    icon: "✨",
    sub: "Dreams & Goals",
    route: "BucketList",
  },
  {
    id: "habits",
    name: "Habits",
    icon: "🔥",
    sub: "Keep Streaks",
    route: "Habits",
  }, // Added as an extra option
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { userData, theme } = useContext(AppContext);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // --- STATE: ACTIVE SHORTCUTS ---
  // Default: Show all relevant to user type
  const [activeShortcutIds, setActiveShortcutIds] = useState([
    "budget",
    "tasks",
    "journal",
    "bucket",
    ...(userData.userType === "student" ? ["attendance"] : []),
  ]);

  const isDark = theme === "dark";
  const bgStyle = isDark
    ? { backgroundColor: "#121212" }
    : { backgroundColor: colors.background };
  const textStyle = isDark ? { color: "#fff" } : { color: colors.textPrimary };
  const cardBg = isDark
    ? { backgroundColor: "#1e1e1e" }
    : { backgroundColor: "#fff" };

  // Logic to filter active cards
  const activeFeatures = ALL_FEATURES.filter((f) => {
    // 1. Must be in active list
    if (!activeShortcutIds.includes(f.id)) return false;
    // 2. Must meet student requirement if applicable
    if (f.studentOnly && userData.userType !== "student") return false;
    return true;
  });

  // Logic to toggle shortcuts
  const toggleShortcut = (id) => {
    setActiveShortcutIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  // Name logic
  const rawName = userData.name || "";
  const showName = rawName.trim().length > 0 && rawName !== "Guest";
  const displayName = showName
    ? rawName
    : userData.userType === "student"
      ? "Student"
      : "Professional";

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#121212" : colors.background}
      />

      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={[styles.menuIcon, textStyle]}>☰</Text>
        </TouchableOpacity>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.greeting, isDark && { color: "#aaa" }]}>
            Welcome back,
          </Text>
          <Text style={[styles.title, textStyle]}>{displayName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Quick Access Section Header with Edit Button */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, textStyle]}>Quick Access</Text>
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Grid */}
        <View style={styles.grid}>
          {activeFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.card, cardBg]}
              onPress={() => navigation.navigate(feature.route)}
            >
              <Text style={styles.cardIcon}>{feature.icon}</Text>
              <Text style={[styles.cardTitle, textStyle]}>{feature.name}</Text>
              <Text style={[styles.cardSub, isDark && { color: "#aaa" }]}>
                {feature.sub}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Empty State if user removes everything */}
          {activeFeatures.length === 0 && (
            <Text
              style={{
                color: "#888",
                fontStyle: "italic",
                width: "100%",
                textAlign: "center",
                marginTop: 20,
              }}
            >
              No shortcuts added. Tap Edit to add some!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* --- MODAL: EDIT SHORTCUTS --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardBg]}>
            <Text style={[styles.modalTitle, textStyle]}>Manage Shortcuts</Text>
            <Text style={{ color: "#888", marginBottom: 20 }}>
              Select items to show on home screen
            </Text>

            <ScrollView>
              {ALL_FEATURES.map((feature) => {
                // Skip if student only and user is not student
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
                      <Text style={[styles.optionText, textStyle]}>
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

      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  greeting: { fontSize: 16, color: colors.textSecondary },
  title: { fontSize: 32, fontWeight: "bold", textTransform: "capitalize" },
  menuBtn: { padding: 5 },
  menuIcon: { fontSize: 30, fontWeight: "bold" },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  card: {
    width: "47%",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "bold" },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

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

export default HomeScreen;
