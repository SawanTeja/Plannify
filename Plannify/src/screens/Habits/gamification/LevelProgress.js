import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AppContext } from "../../../context/AppContext";
import { XP_PER_LEVEL } from "./gamificationConfig"; // Ensure this path matches Step 13

const LevelProgress = ({ stats }) => {
  const { colors } = useContext(AppContext);
  const { xp, level, badges } = stats;

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculate percentage
  const xpNeeded = level * XP_PER_LEVEL;
  const rawProgress = Math.min((xp / xpNeeded) * 100, 100);

  useEffect(() => {
    // Smoothly animate the bar filling up
    Animated.timing(progressAnim, {
      toValue: rawProgress,
      duration: 1000,
      useNativeDriver: false, // width property doesn't support native driver
    }).start();
  }, [xp, xpNeeded]);

  // Dynamic Styles
  const dynamicStyles = {
    levelBadge: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
    },
    textPrimary: { color: colors.textPrimary },
    textSecondary: { color: colors.textSecondary },
    barBg: { backgroundColor: colors.surfaceHighlight },
    barFill: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
    },
  };

  return (
    <View style={styles.container}>
      {/* Top Row: Level Info */}
      <View style={styles.row}>
        {/* Glowing Level Circle */}
        <View style={[styles.levelBadge, dynamicStyles.levelBadge]}>
          <Text style={styles.levelLabel}>LVL</Text>
          <Text style={styles.levelText}>{level}</Text>
        </View>

        {/* Text Stats */}
        <View style={styles.textContainer}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={[styles.label, dynamicStyles.textPrimary]}>
              Explorers Rank
            </Text>
            <View style={styles.badgeContainer}>
              <MaterialCommunityIcons
                name="trophy-variant"
                size={14}
                color={colors.warning}
              />
              <Text style={[styles.badgeText, dynamicStyles.textSecondary]}>
                {badges.length}
              </Text>
            </View>
          </View>

          <Text style={[styles.subLabel, dynamicStyles.textSecondary]}>
            {Math.floor(xp)} /{" "}
            <Text style={{ fontWeight: "bold" }}>{xpNeeded} XP</Text>
          </Text>
        </View>
      </View>

      {/* Progress Bar Track */}
      <View style={[styles.progressBarBg, dynamicStyles.barBg]}>
        {/* Animated Fill with Glow */}
        <Animated.View
          style={[
            styles.progressBarFill,
            dynamicStyles.barFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
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
    marginBottom: 12,
  },
  levelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    // Neon Glow Effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  levelLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 8,
    fontWeight: "bold",
  },
  levelText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    lineHeight: 22,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
    // Bar Glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default LevelProgress;
