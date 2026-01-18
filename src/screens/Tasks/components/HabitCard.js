import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors from "../../../constants/colors";

// FIXED IMPORT: navigates back to 'screens' then into 'Habits/gamification'
import { XP_PER_HABIT } from "../../Habits/gamification/gamificationUtils";

const HabitCard = ({ item, isDone, onToggle, isDark, streakBonus }) => {
  // Pastel colors for icons based on category
  const getIconColor = (cat) => {
    switch (cat) {
      case "Health 💪":
        return "#e0f2f1";
      case "Work 💼":
        return "#e3f2fd";
      case "Study 📚":
        return "#f3e5f5";
      default:
        return "#fff3e0";
    }
  };

  const bgColor = isDark ? "#1e1e1e" : "#fff";
  const textColor = isDark ? "#fff" : "#333";
  const subText = isDark ? "#aaa" : "#888";

  // Calculate potential XP display
  const potentialXp = XP_PER_HABIT + (streakBonus || 0);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onToggle}
      style={[styles.card, { backgroundColor: bgColor }]}
    >
      <View style={styles.row}>
        {/* Icon Circle */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isDark ? "#333" : getIconColor(item.category) },
          ]}
        >
          <Text style={styles.icon}>
            {item.category ? item.category.slice(-2) : "📝"}
          </Text>
        </View>

        {/* Text Info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: textColor }]}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.stats,
                { color: colors.primary, fontWeight: "bold" },
              ]}
            >
              🔥 {item.streak || 0}
            </Text>
            {/* Gamification Cue */}
            {!isDone && (
              <Text
                style={[styles.stats, { color: "#f1c40f", marginLeft: 10 }]}
              >
                +{potentialXp} XP
              </Text>
            )}
            {isDone && (
              <Text
                style={[
                  styles.stats,
                  { color: colors.success, marginLeft: 10 },
                ]}
              >
                Done
              </Text>
            )}
          </View>
        </View>

        {/* Custom Checkbox */}
        <View style={[styles.checkboxBase, isDone && styles.checkboxChecked]}>
          {isDone && <Text style={styles.checkIcon}>✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  row: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  stats: { fontSize: 12 },
  checkboxBase: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkIcon: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default HabitCard;
