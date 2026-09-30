import { StyleSheet } from "react-native";

export default (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
    },
    headerActions: {
      flexDirection: "row",
      gap: 15,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 15,
      color: colors.textPrimary,
    },
    groupCard: {
      padding: 15,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    groupIconBg: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#6366f1",
      alignItems: "center",
      justifyContent: "center",
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    groupMembers: {
      fontSize: 12,
      marginTop: 2,
      color: colors.textSecondary,
    },
    offlineIcon: {
      marginRight: 5,
    },
    modalContent: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
      color: colors.textPrimary,
    },
    input: {
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 15,
      fontSize: 16,
      marginBottom: 20,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    checkboxText: {
      marginLeft: 10,
      color: colors.textPrimary,
    },
    saveBtn: {
      height: 50,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: "white",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
