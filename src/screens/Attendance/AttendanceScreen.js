import { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

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
  const { theme } = useContext(AppContext);
  const isDark = theme === "dark";

  const bg = isDark ? "#121212" : colors.background;
  const cardBg = isDark ? "#1e1e1e" : "#fff";
  const text = isDark ? "#fff" : colors.textPrimary;
  const subText = isDark ? "#aaa" : colors.textSecondary;
  const inputColor = {
    color: text,
    borderColor: isDark ? "#444" : "#ddd",
    backgroundColor: isDark ? "#2c2c2c" : "#fff",
  };

  const { dateStr: todayStr, dayName: todayDayName } = getLocalToday();

  // State
  const [activeTab, setActiveTab] = useState("Today");
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState({});

  // History State
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(todayStr);
  const [markedDates, setMarkedDates] = useState({});

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  // Add Subject State
  const [newSubject, setNewSubject] = useState("");
  const [tempSchedule, setTempSchedule] = useState({});
  const [classesPerDay, setClassesPerDay] = useState("1");

  // Manage State
  const [editingDay, setEditingDay] = useState("Monday");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [classCount, setClassCount] = useState("1");

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    calculateHistoryHeatmap();
  }, [subjects, selectedHistoryDate]);

  const loadData = async () => {
    const s = (await getData("att_subjects")) || [];
    const sch = (await getData("att_schedule")) || {};
    setSubjects(s);
    setSchedule(sch);
  };

  const saveData = async (newSubjects, newSchedule) => {
    if (newSubjects) {
      setSubjects(newSubjects);
      await storeData("att_subjects", newSubjects);
    }
    if (newSchedule) {
      setSchedule(newSchedule);
      await storeData("att_schedule", newSchedule);
    }
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
            text: { color: text, fontWeight: "bold" },
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

      let color = "#ccc";
      if (totalClasses > 0) {
        const ratio = totalP / totalClasses;
        if (ratio === 1) color = colors.success;
        else if (ratio === 0) color = colors.danger;
        else color = "#f1c40f";
      }

      marks[date] = {
        customStyles: {
          container: { backgroundColor: color, borderRadius: 8 },
          text: { color: "#fff", fontWeight: "bold" },
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
          color: marks[selectedHistoryDate] ? "#fff" : text,
          fontWeight: "bold",
        },
      },
    };
    setMarkedDates(marks);
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
    const newId = Date.now().toString();
    const newItem = { id: newId, name: newSubject, history: {} };
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
          const updatedSub = subjects.filter((s) => s.id !== id);
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
    saveData(null, newSch);
    setScheduleModalVisible(false);
  };

  const removeFromSchedule = (day, subjectId) => {
    const newSch = { ...schedule };
    newSch[day] = newSch[day].filter((x) => x.subjectId !== subjectId);
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
      if (sub.id !== subjectId) return sub;
      const history = { ...sub.history };
      const record = history[targetDate] || { p: 0, a: 0 };
      if (record.p + record.a >= maxClasses) {
        if (targetDate === todayStr)
          Alert.alert("Limit Reached", `Max ${maxClasses} classes.`);
        return sub;
      }
      if (type === "present") record.p += 1;
      else record.a += 1;
      history[targetDate] = record;
      return { ...sub, history };
    });
    saveData(updatedSubjects, null);
  };

  const resetDate = (subjectId, dateStr) => {
    const updatedSubjects = subjects.map((sub) => {
      if (sub.id !== subjectId) return sub;
      const history = { ...sub.history };
      delete history[dateStr];
      return { ...sub, history };
    });
    saveData(updatedSubjects, null);
  };

  const markAllToday = (type) => {
    const todaysClasses = schedule[todayDayName] || [];
    if (todaysClasses.length === 0) {
      Alert.alert("No Classes", "No classes scheduled today.");
      return;
    }
    const updatedSubjects = subjects.map((sub) => {
      const scheduled = todaysClasses.find((s) => s.subjectId === sub.id);
      if (scheduled) {
        const history = { ...sub.history };
        if (type === "present")
          history[todayStr] = { p: scheduled.count, a: 0 };
        else history[todayStr] = { p: 0, a: scheduled.count };
        return { ...sub, history };
      }
      return sub;
    });
    saveData(updatedSubjects, null);
    Alert.alert("Done", `Marked all as ${type}.`);
  };

  // --- RENDERERS ---
  const renderClassCard = (item, dateStr, isReadOnly = false) => {
    const subject = subjects.find((s) => s.id === item.subjectId);
    if (!subject) return null;
    const record = (subject.history && subject.history[dateStr]) || {
      p: 0,
      a: 0,
    };
    const markedCount = record.p + record.a;
    const isDone = markedCount >= item.count;
    let totalP = 0,
      totalC = 0;
    if (subject.history) {
      Object.values(subject.history).forEach((d) => {
        totalP += d.p;
        totalC += d.p + d.a;
      });
    }
    const overallPercent = totalC === 0 ? 0 : (totalP / totalC) * 100;

    return (
      <View
        key={item.subjectId}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View>
            <Text style={[styles.subName, { color: text }]}>
              {subject.name}
            </Text>
            <Text style={{ color: subText }}>
              Scheduled: {item.count} Classes
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontWeight: "bold",
                color: overallPercent >= 75 ? colors.success : colors.danger,
              }}
            >
              {overallPercent.toFixed(1)}%
            </Text>
            <Text style={{ fontSize: 10, color: subText }}>Overall</Text>
          </View>
        </View>
        <View style={styles.todayProgress}>
          <Text style={{ color: text, fontWeight: "bold", marginBottom: 5 }}>
            Status: {markedCount} / {item.count}
          </Text>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {Array.from({ length: item.count }).map((_, i) => {
              let color = isDark ? "#333" : "#ddd";
              if (i < record.p) color = colors.success;
              else if (i < record.p + record.a) color = colors.danger;
              return (
                <View
                  key={i}
                  style={{
                    height: 8,
                    flex: 1,
                    backgroundColor: color,
                    borderRadius: 4,
                  }}
                />
              );
            })}
          </View>
        </View>
        {!isReadOnly && !isDone && (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() =>
                updateAttendance(subject.id, "present", item.count, dateStr)
              }
            >
              <Text style={styles.btnText}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
              onPress={() =>
                updateAttendance(subject.id, "absent", item.count, dateStr)
              }
            >
              <Text style={styles.btnText}>Absent</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isReadOnly && isDone && (
          <TouchableOpacity
            onPress={() => resetDate(subject.id, dateStr)}
            style={{ marginTop: 10, alignItems: "center" }}
          >
            <Text style={{ color: subText, textDecorationLine: "underline" }}>
              Reset Entry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          paddingTop:
            Platform.OS === "android" ? StatusBar.currentHeight + 20 : 20,
        },
      ]}
    >
      <View style={{ marginBottom: 15 }}>
        <Text style={[styles.headerTitle, { color: text }]}>Attendance</Text>
        <View
          style={[
            styles.tabContainer,
            { backgroundColor: isDark ? "#1e1e1e" : "#e0e0e0" },
          ]}
        >
          {["Today", "History", "Manage"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.activeTab]}
              onPress={() => setActiveTab(t)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === t ? { color: "#000" } : { color: "#888" },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* --- TODAY --- */}
      {activeTab === "Today" && (
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.primary,
              fontWeight: "bold",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            {todayDayName}, {todayStr}
          </Text>
          <View style={styles.globalRow}>
            <TouchableOpacity
              style={[styles.globalBtn, { backgroundColor: colors.success }]}
              onPress={() => markAllToday("present")}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                All Present
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.globalBtn, { backgroundColor: colors.danger }]}
              onPress={() => markAllToday("absent")}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                All Absent
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={schedule[todayDayName] || []}
            keyExtractor={(item) => item.subjectId}
            renderItem={({ item }) => renderClassCard(item, todayStr)}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 50 }}>
                <Text style={{ fontSize: 40 }}>💤</Text>
                <Text style={{ color: subText, marginTop: 10 }}>
                  No classes today.
                </Text>
              </View>
            }
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- HISTORY --- */}
      {activeTab === "History" && (
        <ScrollView style={{ flex: 1 }}>
          <Calendar
            current={selectedHistoryDate}
            key={selectedHistoryDate}
            onDayPress={(day) => setSelectedHistoryDate(day.dateString)}
            markingType={"custom"}
            markedDates={markedDates}
            theme={{
              calendarBackground: cardBg,
              dayTextColor: text,
              monthTextColor: text,
              arrowColor: colors.primary,
              textDisabledColor: "#444",
              todayTextColor: colors.primary,
            }}
            style={{ borderRadius: 16, marginBottom: 20 }}
          />
          <Text
            style={[styles.sectionTitle, { color: text, marginBottom: 10 }]}
          >
            Log for {selectedHistoryDate}
          </Text>
          {(() => {
            const dayName = getDayNameFromDateStr(selectedHistoryDate);
            // FIX: Combine Schedule AND existing History
            // This ensures that even if you removed a subject from the schedule, its history record still shows up here so you can delete it.

            const scheduledItems = schedule[dayName] || [];
            const historyItems = [];

            subjects.forEach((sub) => {
              // Check if subject has history for this date but is NOT in schedule
              if (sub.history && sub.history[selectedHistoryDate]) {
                const isScheduled = scheduledItems.some(
                  (item) => item.subjectId === sub.id,
                );
                if (!isScheduled) {
                  // Recover the count from history or default to 1 just to show the card
                  const rec = sub.history[selectedHistoryDate];
                  const count = rec.p + rec.a || 1;
                  historyItems.push({ subjectId: sub.id, count });
                }
              }
            });

            const combinedList = [...scheduledItems, ...historyItems];

            if (combinedList.length === 0)
              return (
                <Text
                  style={{
                    color: subText,
                    fontStyle: "italic",
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No classes or history for {dayName}.
                </Text>
              );

            return combinedList.map((item) =>
              renderClassCard(
                item,
                selectedHistoryDate,
                selectedHistoryDate > todayStr,
              ),
            );
          })()}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* --- MANAGE --- */}
      {activeTab === "Manage" && (
        <ScrollView style={{ flex: 1 }}>
          <View style={[styles.sectionBox, { backgroundColor: cardBg }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={[styles.sectionTitle, { color: text }]}>
                My Subjects
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={{ color: colors.primary, fontSize: 24 }}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {subjects.map((sub) => (
                <View
                  key={sub.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: isDark ? "#333" : "#eee",
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: text, marginRight: 8, fontWeight: "600" }}
                  >
                    {sub.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => deleteSubject(sub.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      style={{
                        color: "#ff5555",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              {subjects.length === 0 && (
                <Text style={{ color: subText }}>No subjects yet.</Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.sectionBox,
              { backgroundColor: cardBg, marginTop: 20 },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: text, marginBottom: 15 }]}
            >
              Weekly Timetable
            </Text>
            {DAYS.map((day) => (
              <View key={day} style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: "#333",
                    paddingBottom: 5,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                    {day}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDay(day);
                      setScheduleModalVisible(true);
                    }}
                  >
                    <Text style={{ color: subText, fontSize: 12 }}>
                      + Add Class
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ marginTop: 5 }}>
                  {(schedule[day] || []).map((item, idx) => {
                    const sub = subjects.find((s) => s.id === item.subjectId);
                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginTop: 5,
                        }}
                      >
                        <Text style={{ color: text }}>
                          • {sub ? sub.name : "Unknown"}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Text style={{ color: subText }}>{item.count}x</Text>
                          <TouchableOpacity
                            onPress={() =>
                              removeFromSchedule(day, item.subjectId)
                            }
                          >
                            <Text style={{ color: colors.danger }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* --- ADD SUBJECT MODAL --- */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: text }]}>
              Add Subject
            </Text>
            <TextInput
              style={[styles.input, inputColor]}
              placeholder="Subject Name"
              placeholderTextColor="#aaa"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            <Text style={{ color: subText, marginBottom: 10 }}>
              Weekly Schedule (Tap Days):
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 15,
              }}
            >
              {DAYS.map((day, idx) => {
                const count = tempSchedule[day] || 0;
                const isSelected = count > 0;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDaySelection(day)}
                    style={{
                      width: 35,
                      height: 35,
                      borderRadius: 18,
                      backgroundColor: isSelected
                        ? colors.primary
                        : "transparent",
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : "#555",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#fff" : subText,
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {SHORT_DAYS[idx]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {Object.keys(tempSchedule).length > 0 && (
              <View style={{ maxHeight: 150, marginBottom: 15 }}>
                <ScrollView>
                  {Object.keys(tempSchedule).map((day) => (
                    <View
                      key={day}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        paddingHorizontal: 5,
                      }}
                    >
                      <Text style={{ color: text }}>{day}</Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => adjustDayCount(day, -1)}
                          style={{
                            padding: 5,
                            backgroundColor: "#333",
                            borderRadius: 5,
                          }}
                        >
                          <Text style={{ color: "#fff" }}>-</Text>
                        </TouchableOpacity>
                        <Text
                          style={{
                            color: text,
                            fontWeight: "bold",
                            width: 20,
                            textAlign: "center",
                          }}
                        >
                          {tempSchedule[day]}
                        </Text>
                        <TouchableOpacity
                          onPress={() => adjustDayCount(day, 1)}
                          style={{
                            padding: 5,
                            backgroundColor: "#333",
                            borderRadius: 5,
                          }}
                        >
                          <Text style={{ color: "#fff" }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: subText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addSubject}>
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- SCHEDULE MODAL --- */}
      <Modal
        visible={scheduleModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: text }]}>
              Add to {editingDay}
            </Text>
            <Text style={{ color: subText, marginBottom: 5 }}>
              Select Subject:
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor:
                      selectedSubjectId === sub.id
                        ? colors.primary
                        : isDark
                          ? "#333"
                          : "#eee",
                  }}
                  onPress={() => setSelectedSubjectId(sub.id)}
                >
                  <Text
                    style={{
                      color: selectedSubjectId === sub.id ? "#fff" : text,
                    }}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: subText, marginBottom: 5 }}>
              Number of Classes:
            </Text>
            <TextInput
              style={[styles.input, inputColor]}
              keyboardType="numeric"
              value={classCount}
              onChangeText={setClassCount}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Text style={{ color: subText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addToSchedule}>
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    height: 45,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: { backgroundColor: "#fff", elevation: 2 },
  tabText: { fontWeight: "700" },
  globalRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  globalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  card: { padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
  subName: { fontSize: 18, fontWeight: "bold" },
  todayProgress: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { fontWeight: "bold", color: "#fff" },
  sectionBox: { padding: 15, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabText: { fontSize: 30, color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 30,
  },
  modalContent: { padding: 25, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 20 },
});

export default AttendanceScreen;
