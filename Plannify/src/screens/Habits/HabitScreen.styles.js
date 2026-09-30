import { StyleSheet } from "react-native";

export const getStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    title: {
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    dateStripContainer: {
      marginBottom: 15,
    },
    habitRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    habitCardContainer: {
      flex: 1,
    },
    deleteBtn: {
      padding: 10,
      marginLeft: 5,
      justifyContent: "center",
    },
    calendarModalContent: {
      padding: 25,
      borderWidth: 1,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    calendarView: {
      borderRadius: 10,
      marginBottom: 20,
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
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.textPrimary,
    },
    label: {
      marginBottom: 8,
      fontWeight: "600",
      fontSize: 14,
      color: colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    durationRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 15,
    },
    durationInput: {
      flex: 1,
      marginBottom: 0,
    },
    catCloud: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 25,
    },
    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    catChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    catChipTextActive: {
      color: colors.white || "#ffffff",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 20,
    },
    cancelText: {
      fontWeight: "600",
      color: colors.textSecondary,
    },
    saveBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: "#fff",
      fontWeight: "bold",
    },
  });
