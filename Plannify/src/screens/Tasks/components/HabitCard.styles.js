import { StyleSheet } from "react-native";

export const getStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginBottom: 12,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      elevation: 3,
      shadowOpacity: 0.15,
    },
    cardDone: {
      backgroundColor: colors.success + "15",
      borderColor: colors.success,
      shadowColor: "transparent",
      elevation: 0,
      shadowOpacity: 0,
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
      backgroundColor: colors.primary + "15",
    },
    iconCircleDone: {
      backgroundColor: colors.success + "20",
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 6,
      color: colors.textPrimary,
    },
    titleDone: {
      color: colors.textMuted,
      textDecorationLine: "line-through",
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
      backgroundColor: colors.background,
    },
    badgeText: {
      fontWeight: "bold",
      fontSize: 12,
      color: colors.textSecondary,
    },
    xpText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    doneText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.success,
    },
    checkboxBase: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.textMuted,
      backgroundColor: "transparent",
    },
    checkboxDone: {
      borderColor: colors.success,
      backgroundColor: colors.success,
    },
  });
