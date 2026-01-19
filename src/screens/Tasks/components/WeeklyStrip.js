import { useContext, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppContext } from "../../../context/AppContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = 60; // Fixed width for calculations

const WeeklyStrip = ({ selectedDate, onSelectDate, isDark }) => {
  const { colors } = useContext(AppContext);
  const [weekDates, setWeekDates] = useState([]);
  const scrollViewRef = useRef(null);

  // 1. Generate Strip centered on TODAY (Fixed Anchor)
  // This prevents the list from "walking away" into old dates when you tap.
  useEffect(() => {
    const today = new Date();
    const dates = [];
    // Generate 14 days back and 14 days forward (wider range)
    for (let i = -14; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    setWeekDates(dates);
  }, []);

  // 2. Scroll to the selected date whenever it changes
  useEffect(() => {
    if (weekDates.length > 0 && selectedDate) {
      const index = weekDates.findIndex(
        (d) => d.toISOString().split("T")[0] === selectedDate,
      );

      if (index !== -1 && scrollViewRef.current) {
        // Center the selected item
        const xPos = index * ITEM_WIDTH - SCREEN_WIDTH / 2 + ITEM_WIDTH / 2;
        scrollViewRef.current.scrollTo({
          x: xPos,
          animated: true,
        });
      }
    }
  }, [selectedDate, weekDates]);

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
        }}
      >
        {weekDates.map((date, index) => {
          const dateStr = date.toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          const dayNum = date.getDate();
          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });

          // Dynamic Styles
          const boxStyle = {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 0 : 1,
            shadowColor: isSelected ? colors.primary : colors.shadow,
          };

          const nameColor = isSelected ? colors.white : colors.textSecondary;
          const numColor = isSelected ? colors.white : colors.textPrimary;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onSelectDate(dateStr)}
              activeOpacity={0.7}
              style={[
                styles.dateBox,
                boxStyle,
                isSelected && styles.selectedBox,
              ]}
            >
              <Text style={[styles.dayName, { color: nameColor }]}>
                {dayName}
              </Text>
              <Text style={[styles.dayNum, { color: numColor }]}>{dayNum}</Text>

              {/* Dot for Today */}
              {isToday(date) && !isSelected && (
                <View
                  style={[styles.todayDot, { backgroundColor: colors.primary }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    height: 80,
  },
  dateBox: {
    width: ITEM_WIDTH - 10, // Slight gap
    height: 75,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25, // Capsule shape
    marginRight: 10,
  },
  selectedBox: {
    // Glow Effect
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }], // Pop up slightly
  },
  dayName: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dayNum: {
    fontSize: 18,
    fontWeight: "bold",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});

export default WeeklyStrip;
