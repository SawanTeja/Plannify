import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext } from "react";
import { ScrollView, Text, View } from "react-native";
import { AppContext } from "../../../context/AppContext";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { getStyles } from "./PriorityMatrix.styles";

const PriorityMatrix = ({ tasks }) => {
  const { colors } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

  // Filter tasks
  const high = tasks.filter((t) => t.priority === "High");
  const medium = tasks.filter((t) => t.priority === "Medium");
  const low = tasks.filter((t) => t.priority === "Low");

  const renderTaskList = (list) => {
    if (!list || list.length === 0)
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tasks here
          </Text>
        </View>
      );

    return list.map((item, index) => (
      <View
        key={index}
        style={styles.taskItem}
      >
        <View style={styles.taskRow}>
          <MaterialCommunityIcons
            name="checkbox-blank-circle-outline"
            size={16}
            color={colors.textMuted}
            style={styles.taskIcon}
          />
          <View>
            <Text style={styles.taskTitle}>
              {item.title}
            </Text>

            <View style={styles.metaRow}>
              {item.dateLabel && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={10}
                    color={colors.primary}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaDateText}>
                    {item.dateLabel}
                  </Text>
                </View>
              )}
              {item.duration ? (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={10}
                    color={colors.textSecondary}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaDurationText}>
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
          borderLeftColor: color,
        },
      ]}
    >
      <View style={styles.bucketHeader}>
        <Text style={styles.bucketTitle}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.countText, { color }]}>
            {count}
          </Text>
        </View>
      </View>

      <View style={styles.listContainer}>{renderTaskList(list)}</View>
    </View>
  );

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
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
        count={low.length}
        color={colors.accent}
        list={low}
      />
    </ScrollView>
  );
};

export default PriorityMatrix;
