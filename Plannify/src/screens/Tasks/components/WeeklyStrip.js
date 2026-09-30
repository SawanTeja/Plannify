import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import {
  getLocalDateString,
  getLocalToday,
  getDayName,
} from "../../../utils/dateHelper";
import { getStyles, ITEM_WIDTH } from "./WeeklyStrip.styles";

const SCREEN_WIDTH = Dimensions.get("window").width;

const WeeklyStrip = ({ selectedDate, onSelectDate }) => {
  const styles = useThemedStyles(getStyles);
  const [weekDates, setWeekDates] = useState([]);
  const scrollViewRef = useRef(null);

  // 1. Generate Strip centered on TODAY (Fixed Anchor)
  useEffect(() => {
    const anchor = new Date();
    const dates = [];
    
    // Generate 14 days back and 14 days forward
    for (let i = -14; i <= 14; i++) {
        const d = new Date(anchor);
        d.setDate(anchor.getDate() + i);
        // We only care about the date part string
        const dateStr = getLocalDateString(d);
        dates.push({
            obj: d,
            dateStr: dateStr
        });
    }
    setWeekDates(dates);
  }, []);

  // 2. Scroll to the selected date whenever it changes
  useEffect(() => {
    if (weekDates.length > 0 && selectedDate) {
      const index = weekDates.findIndex((d) => d.dateStr === selectedDate);

      if (index !== -1 && scrollViewRef.current) {
        // Since we have padding = (SCREEN_WIDTH - ITEM_WIDTH) / 2 in contentContainerStyle
        // The first item (index 0) is centered at scrollOffset = 0.
        // Each subsequent item is ITEM_WIDTH away.
        // So simply scrolling to index * ITEM_WIDTH keeps it centered.
        const xPos = index * ITEM_WIDTH;
        scrollViewRef.current.scrollTo({
          x: xPos,
          animated: true,
        });
      }
    }
  }, [selectedDate, weekDates]);

  const isToday = (dateStr) => {
    return dateStr === getLocalToday();
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
        {weekDates.map((item, index) => {
          const { dateStr, obj } = item;
          const isSelected = dateStr === selectedDate;
          const dayNum = obj.getDate();
          const dayName = getDayName(obj);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onSelectDate(dateStr)}
              activeOpacity={0.7}
              style={[
                styles.dateBox,
                isSelected && styles.selectedBox,
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected && styles.dayNumSelected,
                ]}
              >
                {dayNum}
              </Text>

              {/* Dot for Today */}
              {isToday(dateStr) && !isSelected && (
                <View style={styles.todayDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default WeeklyStrip;
