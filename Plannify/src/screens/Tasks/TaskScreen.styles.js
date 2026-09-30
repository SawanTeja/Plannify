import { StyleSheet } from "react-native";

export const getStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      color: colors.textPrimary,
    },
    headerSub: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    iconBtn: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    contentWrapper: {
      flex: 1,
    },
    matrixContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    calendarContainer: {
      marginBottom: 10,
      borderBottomWidth: 1,
      paddingBottom: 10,
      borderBottomColor: colors.border,
    },
    listContent: {
      paddingHorizontal: 20,
    },
    sectionHeaderBox: {
      paddingVertical: 12,
      marginTop: 10,
      backgroundColor: colors.background,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    sectionTitleOverdue: {
      color: colors.danger,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      marginBottom: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "transparent",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
    },
    taskContent: {
      flex: 1,
      marginLeft: 15,
    },
    taskText: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 6,
      color: colors.textPrimary,
    },
    taskTextDone: {
      color: colors.textMuted,
      textDecorationLine: "line-through",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    priorityBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      borderWidth: 1,
      gap: 4,
    },
    priorityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: "bold",
    },
    overdueText: {
      color: colors.danger || "#EF4444",
      fontSize: 12,
      fontWeight: "bold",
    },
    bottomModal: {
      justifyContent: "flex-end",
      margin: 0,
    },
    bottomModalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    dragHandleContainer: {
      alignItems: "center",
      marginBottom: 10,
      marginTop: -10,
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
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    calendarNavWrapper: {
      marginBottom: 0,
      marginTop: 15,
    },
    calendarHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      paddingHorizontal: 10,
    },
    navArrowBtn: {
      padding: 5,
    },
    monthPickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    monthPickerBtnActive: {
      backgroundColor: colors.surfaceHighlight,
    },
    monthPickerBtnText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
      marginRight: 4,
    },
    yearPickerContainer: {
      height: 300,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    yearPickerItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    yearPickerItemActive: {
      backgroundColor: colors.primary + "20",
    },
    yearPickerItemText: {
      color: colors.textPrimary,
      textAlign: "center",
    },
    yearPickerItemTextActive: {
      color: colors.primary,
      fontWeight: "bold",
    },
    calendarStyle: {
      borderRadius: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      color: colors.textSecondary,
    },
    input: {
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      marginBottom: 20,
      borderWidth: 1,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    row: {
      flexDirection: "row",
    },
    durationCol: {
      flex: 1,
      marginRight: 10,
    },
    priorityCol: {
      flex: 2,
    },
    prioritySelector: {
      flexDirection: "row",
      gap: 8,
    },
    priorityOption: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priorityOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    priorityOptionText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    priorityOptionTextActive: {
      color: "#FFFFFF",
      fontWeight: "bold",
    },
    saveBtn: {
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 10,
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
