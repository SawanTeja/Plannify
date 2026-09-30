import { StyleSheet } from "react-native";

export const ITEM_WIDTH = 60;

export const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      marginBottom: 20,
      height: 80,
    },
    dateBox: {
      width: ITEM_WIDTH - 10,
      height: 75,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
      marginRight: 10,
      borderWidth: 1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      elevation: 3,
      shadowOpacity: 0.15,
    },
    selectedBox: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderWidth: 0,
      shadowColor: colors.primary,
      elevation: 8,
      shadowOpacity: 0.4,
      transform: [{ scale: 1.05 }],
    },
    dayName: {
      fontSize: 11,
      marginBottom: 4,
      fontWeight: "600",
      textTransform: "uppercase",
      color: colors.textSecondary,
    },
    dayNameSelected: {
      color: colors.white || "#ffffff",
    },
    dayNum: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    dayNumSelected: {
      color: colors.white || "#ffffff",
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 4,
      backgroundColor: colors.primary,
    },
  });
