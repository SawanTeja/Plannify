import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";
import { scheduleLowAttendanceReminder } from "../../services/NotificationService";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SHORT_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// --- DATE HELPERS ---
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    dateStr: `${year}-${month}-${day}`,
    dayName: DAYS[now.getDay()],
  };
};

const getDayNameFromDateStr = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return DAYS[date.getDay()];
};

const AttendanceScreen = () => {
  const { userData, colors, theme, syncNow, lastRefreshed, appStyles } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;
  const { dateStr: todayStr, dayName: todayDayName } = getLocalToday();

  const [activeTab, setActiveTab] = useState("Today");
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState({});

  const [selectedHistoryDate, setSelectedHistoryDate] = useState(todayStr);
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [tempSchedule, setTempSchedule] = useState({});
  const [classCount, setClassCount] = useState("1");
  const [editingDay, setEditingDay] = useState("Monday");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [minAttendance, setMinAttendance] = useState(75);
  const [minAttendanceInput, setMinAttendanceInput] = useState("75");

  useEffect(() => {
    loadData();
  }, [lastRefreshed]); // Fix: Reload when sync updates

  useEffect(() => {
    calculateHistoryHeatmap();
  }, [subjects, selectedHistoryDate, colors]);

  const loadData = async () => {
    const s = (await getData("att_subjects")) || [];
    let schWrapper = (await getData("att_schedule")) || {};

    // MIGRATION: Ensure schedule has the correct structure for syncing
    if (!schWrapper._id && !schWrapper.schedule) {
       // Old format found, convert it
       schWrapper = { 
           _id: 'timetable', 
           schedule: schWrapper, 
           updatedAt: new Date() 
       };
       await storeData("att_schedule", schWrapper);
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubjects(s);
    setSchedule(schWrapper.schedule || {});
    
    // Load Settings
    const settings = (await getData("att_settings")) || { minAttendance: 75 };
    setMinAttendance(settings.minAttendance);
    setMinAttendanceInput(settings.minAttendance.toString());
  };

  const checkAttendanceWarnings = (currentSubjects, limit) => {
      const low = currentSubjects.filter(sub => {
          let totalP = 0, totalC = 0;
          if (sub.history) {
              Object.values(sub.history).forEach(d => {
                  totalP += d.p;
                  totalC += d.p + d.a;
              });
          }
          if (totalC === 0) return false;
          const pct = (totalP / totalC) * 100;
          return pct < limit;
      });
      scheduleLowAttendanceReminder(low);
  };

  const saveMinAttendance = async () => {
      let val = parseInt(minAttendanceInput);
      if (isNaN(val)) val = 75;
      val = Math.max(0, Math.min(100, val));
      
      setMinAttendance(val);
      setMinAttendanceInput(val.toString());
      await storeData("att_settings", { minAttendance: val });
      checkAttendanceWarnings(subjects, val);
      Alert.alert("Saved", "Attendance requirement updated.");
  };

  const saveData = async (newSubjects, newScheduleData) => {
    if (newSubjects) {
      setSubjects(newSubjects);
      await storeData("att_subjects", newSubjects);
    }
    if (newScheduleData) {
      setSchedule(newScheduleData);
      // SYNC FIX: Wrap schedule with metadata
      const wrapper = {
          _id: 'timetable',
          schedule: newScheduleData,
          updatedAt: new Date() // CRITICAL: Updates timestamp
      };
      await storeData("att_schedule", wrapper);
    }

    
    const effectiveSubjects = newSubjects || subjects;
    // We need to wait for state update or use effectiveSubjects direct? 
    // State update is async batch. safe to use effective current variable.
    checkAttendanceWarnings(effectiveSubjects, minAttendance);

    syncNow();
  };

  // --- ACTIONS ---
  const toggleDaySelection = (day) => {
    const newMap = { ...tempSchedule };
    if (newMap[day]) delete newMap[day];
    else newMap[day] = 1;
    setTempSchedule(newMap);
  };

  const adjustDayCount = (day, delta) => {
    const newMap = { ...tempSchedule };
    if (newMap[day]) {
      const newVal = newMap[day] + delta;
      if (newVal > 0) newMap[day] = newVal;
    }
    setTempSchedule(newMap);
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    
    // SYNC FIX: Use _id and updatedAt
    const newId = Date.now().toString();
    const newItem = { 
        _id: newId, // MongoDB friendly
        name: newSubject, 
        history: {},
        updatedAt: new Date()
    };
    const updatedSubjects = [...subjects, newItem];

    let updatedSchedule = { ...schedule };
    Object.keys(tempSchedule).forEach((day) => {
      const count = tempSchedule[day];
      if (!updatedSchedule[day]) updatedSchedule[day] = [];
      updatedSchedule[day].push({ subjectId: newId, count });
    });

    saveData(updatedSubjects, updatedSchedule);
    setNewSubject("");
    setTempSchedule({});
    setModalVisible(false);
  };

  const deleteSubject = (id) => {
    Alert.alert("Delete Subject", "Removes subject and its history.", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          // SYNC FIX: Soft delete would be better, but for now we filter
          // To support true sync delete, we'd need to mark isDeleted: true
          const updatedSub = subjects.filter((s) => (s._id || s.id) !== id);
          
          const updatedSch = { ...schedule };
          Object.keys(updatedSch).forEach((day) => {
            updatedSch[day] = updatedSch[day].filter(
              (item) => item.subjectId !== id,
            );
          });
          saveData(updatedSub, updatedSch);
        },
      },
    ]);
  };

  const addToSchedule = () => {
    if (!selectedSubjectId) return;
    const count = parseInt(classCount);
    if (count < 1) return;
    const newSch = { ...schedule };
    if (!newSch[editingDay]) newSch[editingDay] = [];
    const exists = newSch[editingDay].find(
      (x) => x.subjectId === selectedSubjectId,
    );
    if (exists) exists.count = count;
    else newSch[editingDay].push({ subjectId: selectedSubjectId, count });
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    saveData(null, newSch);
    setScheduleModalVisible(false);
  };

  const removeFromSchedule = (day, subjectId) => {
    const newSch = { ...schedule };
    newSch[day] = newSch[day].filter((x) => x.subjectId !== subjectId);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    saveData(null, newSch);
  };

  const updateAttendance = (
    subjectId,
    type,
    maxClasses,
    targetDate = todayStr,
  ) => {
    if (targetDate > todayStr) {
      Alert.alert("Future Date", "Cannot mark future attendance.");
      return;
    }
    const updatedSubjects = subjects.map((sub) => {
      if ((sub._id || sub.id) !== subjectId) return sub;
      
      const history = { ...(sub.history || {}) }; // Fix: Handle undefined history
      const record = history[targetDate] || { p: 0, a: 0 };
      
      if (record.p + record.a >= maxClasses) {
        if (targetDate === todayStr)
          Alert.alert("Limit Reached", `Max ${maxClasses} classes.`);
        return sub;
      }
      
      if (type === "present") record.p += 1;
      else record.a += 1;
      
      history[targetDate] = record;
      // SYNC FIX: Update timestamp
      return { ...sub, history, updatedAt: new Date() };
    });
    saveData(updatedSubjects, null);
  };

  const resetDate = (subjectId, dateStr) => {
    const updatedSubjects = subjects.map((sub) => {
      if ((sub._id || sub.id) !== subjectId) return sub;
      const history = { ...(sub.history || {}) }; // Fix: Handle undefined history
      delete history[dateStr];
      return { ...sub, history, updatedAt: new Date() };
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    saveData(updatedSubjects, null);
  };

  const markAllToday = (type) => {
    const todaysClasses = schedule[todayDayName] || [];
    if (todaysClasses.length === 0) {
      Alert.alert("No Classes", "No classes scheduled today.");
      return;
    }
    const updatedSubjects = subjects.map((sub) => {
      const scheduled = todaysClasses.find((s) => s.subjectId === (sub._id || sub.id));
      if (scheduled) {
        const history = { ...(sub.history || {}) }; // Fix: Handle undefined history
        if (type === "present")
          history[todayStr] = { p: scheduled.count, a: 0 };
        else history[todayStr] = { p: 0, a: scheduled.count };
        return { ...sub, history, updatedAt: new Date() };
      }
      return sub;
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    saveData(updatedSubjects, null);
  };

  // --- HEATMAP LOGIC ---
  const calculateHistoryHeatmap = () => {
    const marks = {};

    if (subjects.length === 0) {
      setMarkedDates({
        [selectedHistoryDate]: {
            customStyles: {
            container: {
                borderWidth: 2,
                borderColor: colors.primary,
                borderRadius: 8,
            },
            text: { color: colors.textPrimary, fontWeight: "bold" },
            },
        },
      });
      return;
    }

    const allDates = new Set();
    subjects.forEach((sub) => {
      if (sub.history) Object.keys(sub.history).forEach((d) => allDates.add(d));
    });

    allDates.forEach((date) => {
      let totalP = 0,
        totalClasses = 0;
      subjects.forEach((sub) => {
        if (sub.history && sub.history[date]) {
          const rec = sub.history[date];
          totalP += rec.p;
          totalClasses += rec.p + rec.a;
        }
      });

      let color = colors.border;
      if (totalClasses > 0) {
        const ratio = totalP / totalClasses;
        if (ratio === 1) color = colors.success;
        else if (ratio === 0) color = colors.danger;
        else color = colors.warning;
      }

      marks[date] = {
        customStyles: {
          container: { backgroundColor: color, borderRadius: 8 },
          text: { color: colors.white, fontWeight: "bold" },
        },
      };
    });

    marks[selectedHistoryDate] = {
      ...(marks[selectedHistoryDate] || {}),
      customStyles: {
        container: {
          backgroundColor:
            marks[selectedHistoryDate]?.customStyles?.container
              ?.backgroundColor || "transparent",
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: 8,
        },
        text: {
          color: marks[selectedHistoryDate] ? colors.white : colors.textPrimary,
          fontWeight: "bold",
        },
      },
    };
    setMarkedDates(marks);
  };

  // --- RENDERERS ---
  const renderClassCard = (item, dateStr, isReadOnly = false) => {
    const subject = subjects.find((s) => (s._id || s.id) === item.subjectId);
    if (!subject) return null;
    const record = (subject.history && subject.history[dateStr]) || { p: 0, a: 0 };
    const markedCount = record.p + record.a;
    const isDone = markedCount >= item.count;

    let totalP = 0, totalC = 0;
    if (subject.history) {
      Object.values(subject.history).forEach((d) => {
        totalP += d.p;
        totalC += d.p + d.a;
      });
    }
    const overallPercent = totalC === 0 ? 0 : (totalP / totalC) * 100;

    let statusColor = colors.success;
    if (overallPercent < 60) statusColor = colors.danger;
    else if (overallPercent < 75) statusColor = colors.warning;

    return (
      <View key={item.subjectId} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.subName, { color: colors.textPrimary }]}>
              {subject.name}
            </Text>
            <Text style={[styles.subDetail, { color: colors.textSecondary }]}>
              Scheduled: <Text style={{ fontWeight: "bold" }}>{item.count}</Text> Classes
            </Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={[styles.percentText, { color: statusColor }]}>
              {overallPercent.toFixed(0)}%
            </Text>
            <Text style={[styles.percentLabel, { color: colors.textSecondary }]}>
              Overall
            </Text>
          </View>
        </View>

        <View style={[styles.progressContainer, { backgroundColor: colors.background }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Daily Status</Text>
            <Text style={[styles.progressValue, { color: colors.textPrimary }]}>{markedCount}/{item.count}</Text>
          </View>
          <View style={styles.barRow}>
            {Array.from({ length: item.count }).map((_, i) => {
              let color = colors.border;
              if (i < record.p) color = colors.success;
              else if (i < record.p + record.a) color = colors.danger;
              return <View key={i} style={[styles.barSegment, { backgroundColor: color }]} />;
            })}
          </View>
        </View>

        {!isReadOnly && !isDone && (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success + "20", borderColor: colors.success, borderWidth: 1 }]}
              onPress={() => updateAttendance(subject._id || subject.id, "present", item.count, dateStr)}
            >
              <MaterialCommunityIcons name="check" size={20} color={colors.success} />
              <Text style={{ color: colors.success, fontWeight: "bold" }}>Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger + "20", borderColor: colors.danger, borderWidth: 1 }]}
              onPress={() => updateAttendance(subject._id || subject.id, "absent", item.count, dateStr)}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: "bold" }}>Absent</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isReadOnly && isDone && (
          <TouchableOpacity onPress={() => resetDate(subject._id || subject.id, dateStr)} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset Entry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }, appStyles.headerTitleStyle]}>Attendance</Text>
        <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
          {["Today", "History", "Manage"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segmentBtn, activeTab === t ? { backgroundColor: colors.primary } : null]}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab(t); }}
            >
              <Text style={[styles.segmentText, { color: activeTab === t ? colors.white : colors.textSecondary }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TODAY TAB */}
      {activeTab === "Today" && (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <Text style={[styles.dateHeader, { color: colors.primary }]}>{todayDayName}, {todayStr}</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.success, backgroundColor: colors.success + "10" }]} onPress={() => markAllToday("present")}>
              <Text style={{ color: colors.success, fontWeight: "bold" }}>Mark All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.danger, backgroundColor: colors.danger + "10" }]} onPress={() => markAllToday("absent")}>
              <Text style={{ color: colors.danger, fontWeight: "bold" }}>Mark All Absent</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={schedule[todayDayName] || []}
            keyExtractor={(item) => item.subjectId}
            renderItem={({ item }) => renderClassCard(item, todayStr)}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="sleep" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No classes today.</Text>
              </View>
            }
          />
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary, bottom: tabBarHeight + 20 }]}
            onPress={() => setModalVisible(true)}
          >
            <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* HISTORY TAB */}
      {activeTab === "History" && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          <Calendar
            current={selectedHistoryDate}
            onDayPress={(day) => setSelectedHistoryDate(day.dateString)}
            markingType={"custom"}
            markedDates={markedDates}
            theme={{ calendarBackground: colors.surface, dayTextColor: colors.textPrimary, monthTextColor: colors.textPrimary, arrowColor: colors.primary, todayTextColor: colors.secondary, selectedDayBackgroundColor: colors.primary }}
            style={[styles.calendar, { borderRadius: 16 }]}
          />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Log for {selectedHistoryDate}</Text>
          {(() => {
            const dayName = getDayNameFromDateStr(selectedHistoryDate);
            const scheduledItems = schedule[dayName] || [];
            const historyItems = [];
            subjects.forEach((sub) => {
              if (sub.history && sub.history[selectedHistoryDate]) {
                const isScheduled = scheduledItems.some((item) => item.subjectId === (sub._id || sub.id));
                if (!isScheduled) {
                  const rec = sub.history[selectedHistoryDate];
                  const count = rec.p + rec.a || 1;
                  historyItems.push({ subjectId: sub._id || sub.id, count });
                }
              }
            });
            const combinedList = [...scheduledItems, ...historyItems];
            if (combinedList.length === 0) return <View style={styles.emptyState}><Text style={[styles.emptyText, { color: colors.textMuted }]}>No classes found for this date.</Text></View>;
            return combinedList.map((item) => renderClassCard(item, selectedHistoryDate, selectedHistoryDate > todayStr));
          })()}
          <View style={{ height: tabBarHeight + 20 }} />
        </ScrollView>
      )}

      {/* MANAGE TAB */}
      {activeTab === "Manage" && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          
          <View style={[styles.manageCard, { backgroundColor: colors.surface, marginBottom: 20 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Settings</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <View style={{flex: 1}}>
                    <Text style={{color: colors.textPrimary, fontWeight: '600', fontSize: 16}}>Minimum Goal</Text>
                    <Text style={{color: colors.textSecondary, fontSize: 12}}>Notify me if attendance drops below this %</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                    <TextInput 
                        value={minAttendanceInput} 
                        onChangeText={setMinAttendanceInput} 
                        keyboardType="numeric"
                        onEndEditing={saveMinAttendance}
                        style={[styles.input, {width: 60, marginBottom: 0, textAlign: 'center', padding: 8, height: 40}]}
                    />
                    <Text style={{color: colors.textPrimary, fontWeight: 'bold'}}>%</Text>
                </View>
            </View>
          </View>

          <View style={[styles.manageCard, { backgroundColor: colors.surface }]}>
            <View style={styles.manageHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Subjects</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.tagCloud}>
              {subjects.map((sub) => (
                <View key={sub._id || sub.id} style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.textPrimary }]}>{sub.name}</Text>
                  <TouchableOpacity onPress={() => deleteSubject(sub._id || sub.id)}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              {subjects.length === 0 && <Text style={[styles.emptyText, { color: colors.textMuted }]}>No subjects added yet.</Text>}
            </View>
          </View>

          <View style={[styles.manageCard, { marginTop: 20, backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 15, color: colors.textPrimary }]}>Weekly Timetable</Text>
            {DAYS.map((day) => (
              <View key={day} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayTitle, { color: colors.primary }]}>{day}</Text>
                  <TouchableOpacity onPress={() => { setEditingDay(day); setScheduleModalVisible(true); }}>
                    <Text style={[styles.addLink, { color: colors.textSecondary }]}>+ Add Class</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.classList}>
                  {(schedule[day] || []).map((item, idx) => {
                    const sub = subjects.find((s) => (s._id || s.id) === item.subjectId);
                    return (
                      <View key={idx} style={styles.classItem}>
                        <Text style={[styles.classText, { color: colors.textPrimary }]}>• {sub ? sub.name : "Unknown"}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Text style={[styles.countBadge, { color: colors.textSecondary }]}>{item.count}x</Text>
                          <TouchableOpacity onPress={() => removeFromSchedule(day, item.subjectId)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  {(!schedule[day] || schedule[day].length === 0) && <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>Free Day</Text>}
                </View>
              </View>
            ))}
          </View>
          <View style={{ height: tabBarHeight + 20 }} />
        </ScrollView>
      )}

      {/* MODAL: ADD SUBJECT */}
      <Modal isVisible={modalVisible} onSwipeComplete={() => setModalVisible(false)} swipeDirection={["down"]} onBackdropPress={() => setModalVisible(false)} style={styles.bottomModal} avoidKeyboard={true} backdropOpacity={0.7} propagateSwipe={true}>
        <View style={[styles.bottomModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.dragHandleContainer}><View style={[styles.dragHandle, { backgroundColor: colors.border }]} /></View>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Subject</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Subject Name" placeholderTextColor={colors.textMuted} value={newSubject} onChangeText={setNewSubject} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Weekly Schedule (Optional)</Text>
          <View style={styles.weekSelector}>
            {DAYS.map((day, idx) => {
              const count = tempSchedule[day] || 0;
              const isSelected = count > 0;
              return (
                <TouchableOpacity key={day} onPress={() => toggleDaySelection(day)} style={[styles.dayCircle, { borderColor: colors.border }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text style={[styles.dayCircleText, { color: colors.textSecondary }, isSelected && { color: colors.white }]}>{SHORT_DAYS[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {Object.keys(tempSchedule).length > 0 && (
            <View style={styles.counterList}>
              {Object.keys(tempSchedule).map((day) => (
                <View key={day} style={styles.counterRow}>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{day}</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity onPress={() => adjustDayCount(day, -1)} style={[styles.counterBtn, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>-</Text></TouchableOpacity>
                    <Text style={{ color: colors.textPrimary, fontWeight: "bold" }}>{tempSchedule[day]}</Text>
                    <TouchableOpacity onPress={() => adjustDayCount(day, 1)} style={[styles.counterBtn, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>+</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={addSubject} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={[styles.saveBtnText, { color: colors.white }]}>Save Subject</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD TO SCHEDULE */}
      <Modal isVisible={scheduleModalVisible} onSwipeComplete={() => setScheduleModalVisible(false)} swipeDirection={["down"]} onBackdropPress={() => setScheduleModalVisible(false)} style={styles.bottomModal} avoidKeyboard={true} backdropOpacity={0.7}>
        <View style={[styles.bottomModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.dragHandleContainer}><View style={[styles.dragHandle, { backgroundColor: colors.border }]} /></View>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Class to {editingDay}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Select Subject</Text>
          <View style={styles.tagCloud}>
            {subjects.map((sub) => (
              <TouchableOpacity key={sub._id || sub.id} style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }, selectedSubjectId === (sub._id || sub.id) && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setSelectedSubjectId(sub._id || sub.id)}>
                <Text style={[styles.tagText, { color: colors.textPrimary }, selectedSubjectId === (sub._id || sub.id) && { color: colors.white, fontWeight: "bold" }]}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 15, color: colors.textSecondary }]}>Classes per day</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]} keyboardType="numeric" value={classCount} onChangeText={setClassCount} />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setScheduleModalVisible(false)}><Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={addToSchedule} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={[styles.saveBtnText, { color: colors.white }]}>Add to Schedule</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTitle: { fontWeight: "bold", marginBottom: 15 },
  segmentContainer: { flexDirection: "row", borderRadius: 30, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 25, alignItems: "center" },
  segmentText: { fontWeight: "700", fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  emptyState: { alignItems: "center", marginTop: 40, opacity: 0.7 },
  emptyText: { fontSize: 14, marginTop: 10 },
  fab: { position: "absolute", right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 } },
  dateHeader: { textAlign: "center", marginBottom: 15, fontWeight: "bold", fontSize: 16, textTransform: "uppercase", letterSpacing: 1 },
  quickActions: { flexDirection: "row", gap: 12, marginBottom: 20 },
  quickBtn: { flex: 1, borderWidth: 1, paddingVertical: 12, borderRadius: 16, alignItems: "center" },
  card: { borderRadius: 24, padding: 20, marginBottom: 16, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 },
  subName: { fontSize: 18, fontWeight: "bold" },
  subDetail: { fontSize: 12, marginTop: 4 },
  percentBadge: { alignItems: "flex-end" },
  percentText: { fontSize: 20, fontWeight: "bold" },
  percentLabel: { fontSize: 10 },
  progressContainer: { padding: 12, borderRadius: 16, marginBottom: 15 },
  progressLabel: { fontSize: 12, fontWeight: "600" },
  progressValue: { fontSize: 12, fontWeight: "bold" },
  barRow: { flexDirection: "row", gap: 4, height: 6, marginTop: 8 },
  barSegment: { flex: 1, borderRadius: 4 },
  btnRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 12, borderRadius: 16, gap: 8 },
  resetBtn: { alignSelf: "center", marginTop: 10 },
  resetText: { textDecorationLine: "underline", fontSize: 12 },
  manageCard: { borderRadius: 24, padding: 20 },
  manageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  tagCloud: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 8, borderWidth: 1 },
  tagText: { fontWeight: "500" },
  dayRow: { marginBottom: 15, borderBottomWidth: 1, paddingBottom: 10 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dayTitle: { fontWeight: "bold" },
  addLink: { fontSize: 12, fontWeight: "600" },
  classList: { paddingLeft: 10 },
  classItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  classText: { fontSize: 14 },
  countBadge: { fontSize: 12, fontWeight: "bold" },
  bottomModal: { justifyContent: "flex-end", margin: 0 },
  bottomModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1 },
  dragHandleContainer: { alignItems: "center", marginBottom: 20, marginTop: -10 },
  dragHandle: { width: 40, height: 5, borderRadius: 10, opacity: 0.5 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: { padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
  label: { marginBottom: 10, fontWeight: "600" },
  weekSelector: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  dayCircleText: { fontSize: 12, fontWeight: "bold" },
  counterList: { marginBottom: 20 },
  counterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingHorizontal: 5 },
  counterControls: { flexDirection: "row", alignItems: "center", gap: 15 },
  counterBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 20, marginTop: 10 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  saveBtnText: { fontWeight: "bold" },
  cancelText: { fontWeight: "600" },
  calendar: { marginBottom: 20 },
});

export default AttendanceScreen;