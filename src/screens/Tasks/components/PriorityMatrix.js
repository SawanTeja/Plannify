import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppContext } from "../../../context/AppContext";

const PriorityMatrix = ({ tasks }) => {
  const { colors } = useContext(AppContext);

  // Filter tasks
  const high = tasks.filter((t) => t.priority === "High");
  const medium = tasks.filter((t) => t.priority === "Medium");
  const low = tasks.filter((t) => t.priority === "Low");

  const renderTaskList = (list, iconColor) => {
    if (!list || list.length === 0)
      return (
        <View style={{ padding: 10, opacity: 0.5 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontStyle: "italic",
              fontSize: 12,
            }}
          >
            No tasks here
          </Text>
        </View>
      );

    return list.map((item, index) => (
      <View
        key={index}
        style={[styles.taskItem, { borderBottomColor: colors.border }]}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <MaterialCommunityIcons
            name="checkbox-blank-circle-outline"
            size={16}
            color={colors.textMuted}
            style={{ marginTop: 2, marginRight: 8 }}
          />
          <View>
            <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
              {item.title}
            </Text>

            <View
              style={{
                flexDirection: "row",
                marginTop: 4,
                alignItems: "center",
                gap: 10,
              }}
            >
              {item.dateLabel && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={10}
                    color={colors.primary}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {item.dateLabel}
                  </Text>
                </View>
              )}
              {item.duration ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={10}
                    color={colors.textSecondary}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                    {item.duration}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    ));
  };

  const Bucket = ({ title, count, color, list }) => (
    <View
      style={[
        styles.bucket,
        {
          backgroundColor: colors.surface,
          borderLeftColor: color,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.bucketHeader}>
        <Text style={[styles.bucketTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: color + "20" }]}>
          <Text style={{ color: color, fontWeight: "bold", fontSize: 10 }}>
            {count}
          </Text>
        </View>
      </View>

      <View style={styles.listContainer}>{renderTaskList(list, color)}</View>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
      showsVerticalScrollIndicator={false}
    >
      <Bucket
        title="🔥 High Priority"
        count={high.length}
        color={colors.danger}
        list={high}
      />

      <Bucket
        title="⚡ Medium Priority"
        count={medium.length}
        color={colors.warning}
        list={medium}
      />

      <Bucket
        title="☕ Low Priority"
        count={medium.length}
        color={colors.accent}
        list={low}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bucket: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 16,
    borderLeftWidth: 4,
    // Modern Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent", // Handled dynamically via background color mostly
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
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listContainer: {
    marginTop: 0,
  },
  taskItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default PriorityMatrix;
