import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AppContext } from "../../../context/AppContext";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { getXpForCategory } from "../../Habits/gamification/gamificationConfig";
import { getStyles } from "./HabitCard.styles";

const HabitCard = ({ item, isDone, onToggle, streakBonus = 0 }) => {
  const { colors } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

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

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={[styles.card, isDone && styles.cardDone]}
    >
      <View style={styles.row}>
        {/* Icon Circle */}
        <View style={[styles.iconCircle, isDone && styles.iconCircleDone]}>
          <MaterialCommunityIcons
            name={iconName}
            size={24}
            color={isDone ? colors.success : colors.primary}
          />
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          <Text
            style={[styles.title, isDone && styles.titleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {/* Streak Badge */}
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name="fire"
                size={12}
                color={colors.warning}
              />
              <Text style={styles.badgeText}>
                {item.streak || 0}
              </Text>
            </View>

            {/* XP / Status */}
            {!isDone ? (
              <Text style={styles.xpText}>
                +{potentialXp} XP
              </Text>
            ) : (
              <Text style={styles.doneText}>
                Done
              </Text>
            )}
          </View>
        </View>

        {/* Custom Checkbox */}
        <View style={[styles.checkboxBase, isDone && styles.checkboxDone]}>
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

export default HabitCard;
