// src/screens/Habits/gamification/LevelProgress.js
import { StyleSheet, Text, View } from "react-native";
import colors from "../../../constants/colors";
import { XP_PER_LEVEL } from "./gamificationUtils";

const LevelProgress = ({ stats, isDark }) => {
  const { xp, level } = stats;

  // Calculate percentage for the bar
  const xpNeeded = level * XP_PER_LEVEL;
  const progress = Math.min((xp / xpNeeded) * 100, 100);

  const textColor = isDark ? "#fff" : "#333";
  const barBg = isDark ? "#333" : "#e0e0e0";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: textColor }]}>
            Level {level}
          </Text>
          <Text style={[styles.subLabel, { color: isDark ? "#aaa" : "#666" }]}>
            {Math.floor(xp)} / {xpNeeded} XP
          </Text>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={{ fontSize: 18 }}>🏆 {stats.badges.length}</Text>
        </View>
      </View>

      {/* Progress Bar Track */}
      <View style={[styles.progressBarBg, { backgroundColor: barBg }]}>
        {/* Progress Bar Fill */}
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    elevation: 4,
  },
  levelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontWeight: "bold",
    fontSize: 16,
  },
  subLabel: {
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  badgeContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default LevelProgress;
