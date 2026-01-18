import { ScrollView, StyleSheet, Text, View } from "react-native";
import colors from "../../../constants/colors";

const PriorityMatrix = ({ tasks, isDark }) => {
  // These variables were correctly defined but not used below
  const cardBg = isDark ? "#1e1e1e" : "#fff";
  const text = isDark ? "#fff" : colors.textPrimary;
  const subText = isDark ? "#aaa" : colors.textSecondary;

  // Filter tasks into buckets
  const high = tasks.filter((t) => t.priority === "High");
  const medium = tasks.filter((t) => t.priority === "Medium");
  const low = tasks.filter((t) => t.priority === "Low");

  const renderTaskList = (list) => {
    if (!list || list.length === 0)
      return <Text style={[styles.empty, { color: subText }]}>Empty</Text>;

    return list.map((item, index) => (
      <View key={index} style={styles.taskItem}>
        {/* Updated: using dynamic 'text' color */}
        <Text style={[styles.bullet, { color: text }]}>• {item.title}</Text>
        <View style={{ flexDirection: "row", marginLeft: 10 }}>
          {item.dateLabel && (
            <Text
              style={{ color: colors.primary, fontSize: 10, marginRight: 8 }}
            >
              {item.dateLabel}
            </Text>
          )}
          {item.duration ? (
            <Text style={{ color: subText, fontSize: 10 }}>
              ⏳ {item.duration}
            </Text>
          ) : null}
        </View>
      </View>
    ));
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* High Priority */}
      <View
        style={[
          styles.bucket,
          {
            backgroundColor: cardBg, // CHANGED: Uses dynamic background
            borderLeftColor: colors.danger,
          },
        ]}
      >
        <Text style={[styles.bucketTitle, { color: text }]}>
          {" "}
          {/* CHANGED: Uses dynamic text color */}
          🔥 High Priority
        </Text>
        <View style={styles.listContainer}>{renderTaskList(high)}</View>
      </View>

      {/* Medium Priority */}
      <View
        style={[
          styles.bucket,
          {
            backgroundColor: cardBg, // CHANGED
            borderLeftColor: "#f1c40f",
          },
        ]}
      >
        <Text style={[styles.bucketTitle, { color: text }]}>
          {" "}
          {/* CHANGED */}⚡ Medium Priority
        </Text>
        <View style={styles.listContainer}>{renderTaskList(medium)}</View>
      </View>

      {/* Low Priority */}
      <View
        style={[
          styles.bucket,
          {
            backgroundColor: cardBg, // CHANGED
            borderLeftColor: "#3498db",
          },
        ]}
      >
        <Text style={[styles.bucketTitle, { color: text }]}>
          {" "}
          {/* CHANGED */}☕ Low Priority
        </Text>
        <View style={styles.listContainer}>{renderTaskList(low)}</View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bucket: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 5,
    elevation: 2,
    // Optional: Add shadow for iOS/Android consistency on light mode
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bucketTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  listContainer: {
    marginTop: 5,
  },
  taskItem: {
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    fontWeight: "500",
  },
  empty: {
    fontStyle: "italic",
    fontSize: 12,
  },
});

export default PriorityMatrix;
