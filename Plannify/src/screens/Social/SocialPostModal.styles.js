import { StyleSheet } from "react-native";

export default (colors) =>
  StyleSheet.create({
    modal: {
      justifyContent: "flex-end",
      margin: 0,
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 10,
      maxHeight: "90%",
      backgroundColor: colors.surface,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border || "#888",
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    imageSection: {
      marginBottom: 15,
    },
    imageButtons: {
      flexDirection: "row",
      gap: 12,
    },
    imageBtn: {
      flex: 1,
      height: 80,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceHighlight,
    },
    imageBtnText: {
      color: colors.textSecondary,
    },
    imagePreview: {
      position: "relative",
    },
    previewImage: {
      width: "100%",
      height: 200,
      borderRadius: 12,
    },
    removeImageBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 12,
      color: colors.textPrimary,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    topicInput: {
      fontWeight: "600",
      fontSize: 16,
    },
    textInput: {
      height: 100,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    iconBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 8,
      marginTop: 5,
      color: colors.textSecondary,
    },
    moodRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    moodBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    moodBtnActive: {
      backgroundColor: colors.primary,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 15,
      gap: 4,
      backgroundColor: colors.surfaceHighlight,
    },
    tagText: {
      color: colors.textPrimary,
    },
    saveBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 10,
      marginBottom: 20,
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: "#FFF",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
