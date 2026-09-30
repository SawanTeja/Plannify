import { StyleSheet } from "react-native";

export default (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 10,
    },
    card: {
      padding: 20,
      borderRadius: 24,
      marginBottom: 15,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: colors.shadow,
    },
    cardCurrent: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    subDate: {
      fontSize: 12,
      marginTop: 2,
      color: colors.textSecondary,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    badgeText: {
      fontWeight: "bold",
      fontSize: 11,
      textTransform: "uppercase",
    },
    progressSection: {
      marginTop: 15,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    progressPercent: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "bold",
    },
    progressBarBg: {
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
    },
    stats: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statBold: {
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    miniLog: {
      marginTop: 15,
      alignItems: "flex-end",
    },
    breakdownText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      marginTop: 50,
    },
    empty: {
      textAlign: "center",
      marginTop: 10,
      color: colors.textSecondary,
    },
    detailModal: {
      justifyContent: "flex-end",
      margin: 0,
    },
    detailCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "90%",
      overflow: "hidden",
      width: "100%",
      backgroundColor: colors.background,
    },
    dragHandleContainer: {
      alignItems: "center",
      paddingVertical: 10,
      width: "100%",
      backgroundColor: "transparent",
    },
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 10,
      opacity: 0.5,
      backgroundColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      padding: 8,
      borderRadius: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    summaryBox: {
      padding: 24,
      borderRadius: 24,
      alignItems: "center",
      marginBottom: 25,
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    bigSpent: {
      fontSize: 32,
      fontWeight: "bold",
      marginTop: 5,
      color: colors.textPrimary,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 15,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    txRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    txDesc: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    txDate: {
      fontSize: 12,
      marginTop: 2,
      color: colors.textSecondary,
    },
    txAmount: {
      fontSize: 16,
      fontWeight: "bold",
    },
  });
