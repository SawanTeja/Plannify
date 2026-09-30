import { StyleSheet } from "react-native";

export const getStyles = (colors) =>
  StyleSheet.create({
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
      paddingTop: 10,
    },
    bucket: {
      marginBottom: 20,
      padding: 15,
      borderRadius: 16,
      borderLeftWidth: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
    },
    bucketHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.05)",
    },
    bucketTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countText: {
      fontWeight: "bold",
      fontSize: 10,
    },
    listContainer: {
      marginTop: 0,
    },
    emptyContainer: {
      padding: 10,
      opacity: 0.5,
    },
    emptyText: {
      color: colors.textSecondary,
      fontStyle: "italic",
      fontSize: 12,
    },
    taskItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    taskIcon: {
      marginTop: 2,
      marginRight: 8,
    },
    taskTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: "row",
      marginTop: 4,
      alignItems: "center",
      gap: 10,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    metaIcon: {
      marginRight: 3,
    },
    metaDateText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "bold",
    },
    metaDurationText: {
      color: colors.textSecondary,
      fontSize: 10,
    },
  });
