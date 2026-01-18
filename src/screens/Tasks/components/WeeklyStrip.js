import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../../constants/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;

const WeeklyStrip = ({ selectedDate, onSelectDate, isDark }) => {
  const [weekDates, setWeekDates] = useState([]);
  const scrollViewRef = useRef(null);

  // Generate a 2-week window surrounding the selected date
  useEffect(() => {
    generateStrip(selectedDate);
  }, [selectedDate]);

  const generateStrip = (baseDateStr) => {
    const baseDate = new Date(baseDateStr);
    const dates = [];

    // Generate range: 7 days before to 7 days after the selected date
    for (let i = -7; i <= 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    setWeekDates(dates);

    // Scroll to center (Index 7 is our selected date)
    setTimeout(() => {
      if (scrollViewRef.current) {
        // Formula: (ItemWidth * Index) - (HalfScreen) + (HalfItem)
        scrollViewRef.current.scrollTo({
          x: 60 * 7 - SCREEN_WIDTH / 2 + 30,
          animated: true,
        });
      }
    }, 100);
  };

  return (
    <View style={{ marginBottom: 15 }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        {weekDates.map((date, index) => {
          const dateStr = date.toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          const dayNum = date.getDate();
          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onSelectDate(dateStr)}
              style={[
                styles.dateBox,
                isSelected && styles.selectedBox,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : isDark
                      ? "#333"
                      : "#eee",
                },
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: isSelected ? "#fff" : isDark ? "#aaa" : "#888" },
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  { color: isSelected ? "#fff" : isDark ? "#fff" : "#000" },
                ]}
              >
                {dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  dateBox: {
    width: 50,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    marginRight: 10,
  },
  selectedBox: {
    elevation: 5,
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  dayNum: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default WeeklyStrip;
