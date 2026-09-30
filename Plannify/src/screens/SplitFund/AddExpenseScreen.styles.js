import { StyleSheet } from "react-native";

export default (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    card: {
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      padding: 15,
      borderRadius: 12,
    },
    mainCard: {
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      padding: 15,
      borderRadius: 12,
      marginBottom: 20,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    inputRowZIndex: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      zIndex: 100,
    },
    currencyPickerWrap: {
      zIndex: 101,
    },
    currencyBtn: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 10,
      padding: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      minWidth: 60,
      justifyContent: "space-between",
    },
    currencyBtnText: {
      fontSize: 18,
      color: colors.textPrimary,
      fontWeight: "bold",
    },
    currencyDropdown: {
      position: "absolute",
      top: 45,
      left: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      zIndex: 200,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      minWidth: 60,
    },
    currencyOption: {
      padding: 10,
      alignItems: "center",
    },
    currencyOptionBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    currencyOptionText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "bold",
    },
    mainInput: {
      flex: 1,
      height: 40,
      fontSize: 16,
      color: colors.textPrimary,
    },
    amountInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 32,
      fontWeight: "bold",
      height: 50,
      paddingVertical: 0,
    },
    divider: {
      height: 1,
      marginVertical: 10,
      backgroundColor: colors.border,
    },
    label: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 10,
      textTransform: "uppercase",
      color: colors.textSecondary,
    },
    payerScroll: {
      marginBottom: 20,
      zIndex: -1,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
    },
    chipActive: {
      backgroundColor: colors.primary,
    },
    chipInactive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 14,
    },
    chipTextActive: {
      color: "white",
    },
    chipTextInactive: {
      color: colors.textPrimary,
    },
    tabRow: {
      flexDirection: "row",
      marginBottom: 20,
      justifyContent: "space-between",
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    tabActive: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#888",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    avatarText: {
      color: "white",
      fontWeight: "bold",
    },
    memberName: {
      flex: 1,
      color: colors.textPrimary,
    },
    smallInput: {
      width: 80,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      textAlign: "right",
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    infoText: {
      textAlign: "center",
      marginVertical: 10,
      color: colors.textSecondary,
    },
    saveBtn: {
      marginTop: 30,
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
