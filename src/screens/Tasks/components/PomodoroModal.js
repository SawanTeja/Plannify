import { useKeepAwake } from "expo-keep-awake";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../../constants/colors";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PomodoroModal = ({ visible, onClose, isDark }) => {
  useKeepAwake();

  const [minutes, setMinutes] = useState("25");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) {
      const m = parseInt(minutes) || 0;
      setTimeLeft(m * 60);
    }
  }, [minutes]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      triggerAlarm();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const triggerAlarm = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Time's Up!",
        body: "Focus session complete.",
        sound: true,
      },
      trigger: null,
    });
    Alert.alert("Finished!", "Focus session complete.");
  };

  // FIX: Handles Hours properly
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const mStr = m < 10 ? `0${m}` : m;
    const sStr = s < 10 ? `0${s}` : s;

    if (h > 0) {
      const hStr = h < 10 ? `0${h}` : h;
      return `${hStr}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  const bgColor = isDark ? "#1e1e1e" : "#fff";
  const textColor = isDark ? "#fff" : "#333";

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Focus Timer</Text>

          <View
            style={[
              styles.timerCircle,
              { borderColor: isDark ? "#333" : "#eee" },
            ]}
          >
            <Text
              style={[
                styles.timerText,
                { color: textColor, fontSize: timeLeft > 3600 ? 42 : 56 },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>

          {!isActive && (
            <View style={styles.inputRow}>
              <Text style={{ color: textColor }}>Set Minutes: </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: textColor, borderColor: isDark ? "#444" : "#ccc" },
                ]}
                keyboardType="numeric"
                value={minutes}
                onChangeText={setMinutes}
              />
            </View>
          )}

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: isActive ? "#ff7675" : colors.primary },
              ]}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.btnText}>{isActive ? "Pause" : "Start"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: "#ccc",
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.btnText, { color: isDark ? "#fff" : "#555" }]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    elevation: 10,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  timerText: { fontWeight: "bold" }, // fontSize handled dynamically
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: "center",
    marginLeft: 10,
  },
  row: { flexDirection: "row", gap: 15 },
  btn: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default PomodoroModal;
