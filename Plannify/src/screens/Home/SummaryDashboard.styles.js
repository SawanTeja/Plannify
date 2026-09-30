import { StyleSheet } from "react-native";

export default (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 120,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 25,
    },
    greetingText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    nameText: {
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    profileAvatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
    },
    profileAvatarDefault: {
      backgroundColor: colors.primary,
    },
    avatarInitial: {
      color: "#FFF",
      fontSize: 18,
      fontWeight: "bold",
    },
    bentoContainer: {
      flexDirection: "row",
      gap: 15,
    },
    bentoColumn: {
      flex: 1,
      gap: 15,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 20,
      justifyContent: "space-between",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHabit: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    iconCirclePrimary: {
      backgroundColor: colors.primary + "20",
    },
    iconCircleSecondary: {
      width: 36,
      height: 36,
      backgroundColor: colors.secondary + "20",
      marginBottom: 0,
    },
    iconCircleAccent: {
      width: 36,
      height: 36,
      backgroundColor: colors.accent + "20",
      marginBottom: 0,
    },
    cardValue: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    cardValueSmall: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: "600",
      marginTop: 2,
      color: colors.textSecondary,
    },
    cardLabelSmall: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    streakRow: {
      flexDirection: "row",
      marginTop: 5,
    },
    streakIncrease: {
      fontSize: 10,
      color: colors.success,
      fontWeight: "bold",
    },
    streakTime: {
      fontSize: 10,
      color: colors.textMuted,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    progressBarBg: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginVertical: 8,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
    },
    attendanceCard: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 15,
      paddingVertical: 25,
    },
    attendanceLeft: {
      flex: 1,
    },
    attendanceStatus: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: "600",
    },
    attendanceIndicator: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 4,
      borderColor: colors.surfaceHighlight,
      justifyContent: "center",
      alignItems: "center",
    },
    shortcutsSection: {
      marginTop: 30,
    },
    shortcutsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    shortcutsTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    shortcutsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "center",
    },
    quickBtn: {
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 24,
      width: "30%",
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    quickBtnContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    quickBtnText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: "center",
    },
    bottomModal: {
      justifyContent: "flex-end",
      margin: 0,
    },
    bottomModalContent: {
      padding: 25,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      paddingBottom: 40,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    dragHandleContainer: {
      alignItems: "center",
      marginBottom: 20,
      marginTop: -10,
    },
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 10,
      opacity: 0.5,
      backgroundColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.textPrimary,
    },
    modalScrollContainer: {
      maxHeight: 400,
    },
    shortcutItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    shortcutItemText: {
      marginLeft: 15,
      fontSize: 16,
      color: colors.textPrimary,
    },
    doneBtn: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 15,
      alignItems: "center",
      marginTop: 20,
    },
    doneBtnText: {
      color: colors.white,
      fontWeight: "bold",
    },
  });
