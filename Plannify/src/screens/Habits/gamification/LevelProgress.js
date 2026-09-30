import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { AppContext } from "../../../context/AppContext";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { XP_PER_LEVEL } from "./gamificationConfig";
import { getStyles } from "./LevelProgress.styles";

const LevelProgress = ({ stats }) => {
  const { colors } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);
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
  }, [rawProgress, progressAnim]);

  return (
    <View style={styles.container}>
      {/* Top Row: Level Info */}
      <View style={styles.row}>
        {/* Glowing Level Circle */}
        <View style={styles.levelBadge}>
          <Text style={styles.levelLabel}>LVL</Text>
          <Text style={styles.levelText}>{level}</Text>
        </View>

        {/* Text Stats */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>
              Explorers Rank
            </Text>
            <View style={styles.badgeContainer}>
              <MaterialCommunityIcons
                name="trophy-variant"
                size={14}
                color={colors.warning}
              />
              <Text style={styles.badgeText}>
                {badges.length}
              </Text>
            </View>
          </View>

          <Text style={styles.subLabel}>
            {Math.floor(xp)} /{" "}
            <Text style={styles.subLabelBold}>{xpNeeded} XP</Text>
          </Text>
        </View>
      </View>

      {/* Progress Bar Track */}
      <View style={styles.progressBarBg}>
        {/* Animated Fill with Glow */}
        <Animated.View
          style={[
            styles.progressBarFill,
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

export default LevelProgress;
