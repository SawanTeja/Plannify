import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
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
import { useAlert } from "../../context/AlertContext";
import { EmptyState, FloatingActionButton } from "../../components/common";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getData, storeData } from "../../utils/storageHelper";
import { scheduleLowAttendanceReminder } from "../../services/NotificationService";
import getStyles from "./AttendanceScreen.styles";

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
  const { colors, syncNow, lastRefreshed, appStyles } = useContext(AppContext);
  const { showAlert } = useAlert();
  const styles = useThemedStyles(getStyles);
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

  const calculateHistoryHeatmap = useCallback(() => {
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
  }, [subjects, selectedHistoryDate, colors]);

  useEffect(() => {
    calculateHistoryHeatmap();
  }, [calculateHistoryHeatmap]);

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
      showAlert("Saved", "Attendance requirement updated.");
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
    showAlert("Delete Subject", "Removes subject and its history.", [
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
      showAlert("Future Date", "Cannot mark future attendance.");
      return;
    }
    const updatedSubjects = subjects.map((sub) => {
      if ((sub._id || sub.id) !== subjectId) return sub;
      
      const history = { ...(sub.history || {}) }; // Fix: Handle undefined history
      const record = history[targetDate] || { p: 0, a: 0 };
      
      if (record.p + record.a >= maxClasses) {
        if (targetDate === todayStr)
          showAlert("Limit Reached", `Max ${maxClasses} classes.`);
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
      showAlert("No Classes", "No classes scheduled today.");
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
      <View key={item.subjectId} style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.subName}>
              {subject.name}
            </Text>
            <Text style={styles.subDetail}>
              Scheduled: <Text style={{ fontWeight: "bold" }}>{item.count}</Text> Classes
            </Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={[styles.percentText, { color: statusColor }]}>
              {overallPercent.toFixed(0)}%
            </Text>
            <Text style={styles.percentLabel}>
              Overall
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Daily Status</Text>
            <Text style={styles.progressValue}>{markedCount}/{item.count}</Text>
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
              style={[styles.actionBtn, styles.actionBtnPresent]}
              onPress={() => updateAttendance(subject._id || subject.id, "present", item.count, dateStr)}
            >
              <MaterialCommunityIcons name="check" size={20} color={colors.success} />
              <Text style={styles.actionBtnTextPresent}>Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnAbsent]}
              onPress={() => updateAttendance(subject._id || subject.id, "absent", item.count, dateStr)}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.danger} />
              <Text style={styles.actionBtnTextAbsent}>Absent</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isReadOnly && isDone && (
          <TouchableOpacity onPress={() => resetDate(subject._id || subject.id, dateStr)} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset Entry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, appStyles.headerTitleStyle]}>Attendance</Text>
        <View style={styles.segmentContainer}>
          {["Today", "History", "Manage"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segmentBtn, activeTab === t && styles.segmentBtnActive]}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab(t); }}
            >
              <Text style={[styles.segmentText, activeTab === t && styles.segmentTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TODAY TAB */}
      {activeTab === "Today" && (
        <View style={styles.tabContent}>
          <Text style={styles.dateHeader}>{todayDayName}, {todayStr}</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, styles.quickBtnPresent]} onPress={() => markAllToday("present")}>
              <Text style={styles.quickBtnTextPresent}>Mark All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, styles.quickBtnAbsent]} onPress={() => markAllToday("absent")}>
              <Text style={styles.quickBtnTextAbsent}>Mark All Absent</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={schedule[todayDayName] || []}
            keyExtractor={(item) => item.subjectId}
            renderItem={({ item }) => renderClassCard(item, todayStr)}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
            ListEmptyComponent={
              <EmptyState
                icon="sleep"
                title="No classes today"
                subtitle="Enjoy your free time!"
                actionLabel="Add Subject"
                onActionPress={() => setModalVisible(true)}
              />
            }
          />
          <FloatingActionButton
            bottom={tabBarHeight + 20}
            onPress={() => setModalVisible(true)}
          />
        </View>
      )}

      {/* HISTORY TAB */}
      {activeTab === "History" && (
        <ScrollView style={styles.tabContent}>
          <Calendar
            current={selectedHistoryDate}
            onDayPress={(day) => setSelectedHistoryDate(day.dateString)}
            markingType={"custom"}
            markedDates={markedDates}
            theme={{ calendarBackground: colors.surface, dayTextColor: colors.textPrimary, monthTextColor: colors.textPrimary, arrowColor: colors.primary, todayTextColor: colors.secondary, selectedDayBackgroundColor: colors.primary }}
            style={styles.calendar}
          />
          <Text style={styles.sectionTitle}>Log for {selectedHistoryDate}</Text>
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
            if (combinedList.length === 0) return <View style={styles.emptyState}><Text style={styles.emptyText}>No classes found for this date.</Text></View>;
            return combinedList.map((item) => renderClassCard(item, selectedHistoryDate, selectedHistoryDate > todayStr));
          })()}
          <View style={{ height: tabBarHeight + 20 }} />
        </ScrollView>
      )}

      {/* MANAGE TAB */}
      {activeTab === "Manage" && (
        <ScrollView style={styles.tabContent}>
          <View style={[styles.manageCard, { marginBottom: 20 }]}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.settingsRow}>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsLabel}>Minimum Goal</Text>
                <Text style={styles.settingsSubLabel}>Notify me if attendance drops below this %</Text>
              </View>
              <View style={styles.settingsInputRow}>
                <View style={styles.settingsInputWrap}>
                  <TextInput 
                    value={minAttendanceInput} 
                    onChangeText={setMinAttendanceInput} 
                    keyboardType="numeric"
                    style={styles.settingsInput}
                  />
                  <Text style={styles.settingsUnit}>%</Text>
                </View>
                
                <TouchableOpacity 
                  onPress={saveMinAttendance}
                  style={styles.settingsSaveBtn}
                >
                  <MaterialCommunityIcons name="check" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.manageCard}>
            <View style={styles.manageHeader}>
              <Text style={styles.sectionTitle}>My Subjects</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.tagCloud}>
              {subjects.map((sub) => (
                <View key={sub._id || sub.id} style={styles.tag}>
                  <Text style={styles.tagText}>{sub.name}</Text>
                  <TouchableOpacity onPress={() => deleteSubject(sub._id || sub.id)}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              {subjects.length === 0 && <Text style={styles.emptyText}>No subjects added yet.</Text>}
            </View>
          </View>

          <View style={[styles.manageCard, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Weekly Timetable</Text>
            {DAYS.map((day) => (
              <View key={day} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  <TouchableOpacity onPress={() => { setEditingDay(day); setScheduleModalVisible(true); }}>
                    <Text style={styles.addLink}>+ Add Class</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.classList}>
                  {(schedule[day] || []).map((item, idx) => {
                    const sub = subjects.find((s) => (s._id || s.id) === item.subjectId);
                    return (
                      <View key={idx} style={styles.classItem}>
                        <Text style={styles.classText}>• {sub ? sub.name : "Unknown"}</Text>
                        <View style={styles.scheduleClassRight}>
                          <Text style={styles.countBadge}>{item.count}x</Text>
                          <TouchableOpacity onPress={() => removeFromSchedule(day, item.subjectId)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  {(!schedule[day] || schedule[day].length === 0) && <Text style={styles.freeDayText}>Free Day</Text>}
                </View>
              </View>
            ))}
          </View>
          <View style={{ height: tabBarHeight + 20 }} />
        </ScrollView>
      )}

      {/* MODAL: ADD SUBJECT */}
      <Modal isVisible={modalVisible} onSwipeComplete={() => setModalVisible(false)} swipeDirection={["down"]} onBackdropPress={() => setModalVisible(false)} style={styles.bottomModal} avoidKeyboard backdropOpacity={0.7} propagateSwipe>
        <View style={styles.bottomModalContent}>
          <View style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>
          <Text style={styles.modalTitle}>Add Subject</Text>
          <TextInput style={styles.input} placeholder="Subject Name" placeholderTextColor={colors.textMuted} value={newSubject} onChangeText={setNewSubject} />
          <Text style={styles.label}>Weekly Schedule (Optional)</Text>
          <View style={styles.weekSelector}>
            {DAYS.map((day, idx) => {
              const count = tempSchedule[day] || 0;
              const isSelected = count > 0;
              return (
                <TouchableOpacity key={day} onPress={() => toggleDaySelection(day)} style={[styles.dayCircle, isSelected && styles.dayCircleActive]}>
                  <Text style={[styles.dayCircleText, isSelected && styles.dayCircleTextActive]}>{SHORT_DAYS[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {Object.keys(tempSchedule).length > 0 && (
            <View style={styles.counterList}>
              {Object.keys(tempSchedule).map((day) => (
                <View key={day} style={styles.counterRow}>
                  <Text style={[styles.classText, { flex: 1 }]}>{day}</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity onPress={() => adjustDayCount(day, -1)} style={styles.counterBtn}><Text style={styles.classText}>-</Text></TouchableOpacity>
                    <Text style={[styles.classText, { fontWeight: "bold" }]}>{tempSchedule[day]}</Text>
                    <TouchableOpacity onPress={() => adjustDayCount(day, 1)} style={styles.counterBtn}><Text style={styles.classText}>+</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={addSubject} style={styles.saveBtn}><Text style={styles.saveBtnText}>Save Subject</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD TO SCHEDULE */}
      <Modal isVisible={scheduleModalVisible} onSwipeComplete={() => setScheduleModalVisible(false)} swipeDirection={["down"]} onBackdropPress={() => setScheduleModalVisible(false)} style={styles.bottomModal} avoidKeyboard backdropOpacity={0.7}>
        <View style={styles.bottomModalContent}>
          <View style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>
          <Text style={styles.modalTitle}>Add Class to {editingDay}</Text>
          <Text style={styles.label}>Select Subject</Text>
          <View style={styles.tagCloud}>
            {subjects.map((sub) => {
              const isSelected = selectedSubjectId === (sub._id || sub.id);
              return (
                <TouchableOpacity key={sub._id || sub.id} style={[styles.tag, isSelected && styles.dayCircleActive]} onPress={() => setSelectedSubjectId(sub._id || sub.id)}>
                  <Text style={[styles.tagText, isSelected && styles.dayCircleTextActive]}>{sub.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.label, { marginTop: 15 }]}>Classes per day</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={classCount} onChangeText={setClassCount} />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setScheduleModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={addToSchedule} style={styles.saveBtn}><Text style={styles.saveBtnText}>Add to Schedule</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AttendanceScreen;