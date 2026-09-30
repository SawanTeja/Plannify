import { StyleSheet } from "react-native";

export const getStyles = (colors) =>
  StyleSheet.create({
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
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.2)",
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
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
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      fontWeight: "bold",
      fontSize: 16,
      letterSpacing: 0.5,
      color: colors.textPrimary,
    },
    subLabel: {
      fontSize: 12,
      marginTop: 4,
      opacity: 0.8,
      color: colors.textSecondary,
    },
    subLabelBold: {
      fontWeight: "bold",
    },
    progressBarBg: {
      height: 10,
      borderRadius: 5,
      width: "100%",
      overflow: "hidden",
      backgroundColor: colors.surfaceHighlight,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 5,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
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
      color: colors.textSecondary,
    },
  });
