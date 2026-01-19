import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppContext } from "../../../context/AppContext";
import { getXpForCategory } from "../../Habits/gamification/gamificationConfig";

const HabitCard = ({ item, isDone, onToggle, streakBonus = 0 }) => {
  const { colors } = useContext(AppContext);

  // 1. Icon Logic
  const getIconName = (cat) => {
    const catName = typeof cat === "string" ? cat : cat?.label || "";
    if (catName.includes("Health")) return "heart-pulse";
    if (catName.includes("Work")) return "briefcase-outline";
    if (catName.includes("Study")) return "book-open-variant";
    if (catName.includes("Mind")) return "leaf";
    if (catName.includes("Skill")) return "palette-outline";
    return "flash-outline";
  };

  const iconName = getIconName(item.category);

  // 2. XP Calculation
  const baseXp = getXpForCategory(item.category);
  const potentialXp = baseXp + streakBonus;

  // 3. Dynamic Styles
  const cardStyle = {
    backgroundColor: isDone ? colors.success + "15" : colors.surface,
    borderColor: isDone ? colors.success : colors.border,
    borderWidth: 1,
    // FIX: Remove shadow and elevation when Done to prevent the "dark box" artifact
    shadowColor: isDone ? "transparent" : colors.shadow,
    elevation: isDone ? 0 : 3,
    shadowOpacity: isDone ? 0 : 0.15,
  };

  const iconBg = isDone ? colors.success + "20" : colors.primary + "15";
  const iconColor = isDone ? colors.success : colors.primary;
  const titleColor = isDone ? colors.textMuted : colors.textPrimary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={[styles.card, cardStyle]}
    >
      <View style={styles.row}>
        {/* Icon Circle */}
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              {
                color: titleColor,
                textDecorationLine: isDone ? "line-through" : "none",
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {/* Streak Badge */}
            <View
              style={[styles.badge, { backgroundColor: colors.background }]}
            >
              <MaterialCommunityIcons
                name="fire"
                size={12}
                color={colors.warning}
              />
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {item.streak || 0}
              </Text>
            </View>

            {/* XP / Status */}
            {!isDone ? (
              <Text style={[styles.xpText, { color: colors.primary }]}>
                +{potentialXp} XP
              </Text>
            ) : (
              <Text style={[styles.doneText, { color: colors.success }]}>
                Done
              </Text>
            )}
          </View>
        </View>

        {/* Custom Checkbox */}
        <View
          style={[
            styles.checkboxBase,
            {
              borderColor: isDone ? colors.success : colors.textMuted,
              backgroundColor: isDone ? colors.success : "transparent",
            },
          ]}
        >
          {isDone && (
            <MaterialCommunityIcons
              name="check"
              size={18}
              color={colors.white}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    // Soft shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  info: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "700",
  },
  doneText: {
    fontSize: 12,
    fontWeight: "700",
  },
  checkboxBase: {
    width: 28,
    height: 28,
    borderRadius: 14, // Circular
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
});

export default HabitCard;
