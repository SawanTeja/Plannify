import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import * as Notifications from "expo-notifications";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppContext } from "../../../context/AppContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PomodoroModal = ({ visible, onClose }) => {
  useKeepAwake();
  const { colors, theme } = useContext(AppContext);

  const [minutes, setMinutes] = useState("25");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  // Animation for Pulse Effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) {
      const m = parseInt(minutes) || 0;
      setTimeLeft(m * 60);
      pulseAnim.setValue(1); // Reset scale
    } else {
      // Start Pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [minutes, isActive]);

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

  // Dynamic Styles
  const dynamicStyles = {
    container: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: colors.primary, // Glow color for container
    },
    textPrimary: { color: colors.textPrimary },
    timerRing: { borderColor: isActive ? colors.danger : colors.primary },
    input: {
      color: colors.textPrimary,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    closeBtn: { borderColor: colors.textMuted },
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.container, dynamicStyles.container]}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.title, dynamicStyles.textPrimary]}>
              Focus Mode
            </Text>
          </View>

          {/* Animated Timer Circle */}
          <Animated.View
            style={[
              styles.timerCircle,
              dynamicStyles.timerRing,
              {
                transform: [{ scale: pulseAnim }],
                shadowColor: isActive ? colors.danger : colors.primary,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.timerText,
                {
                  color: isActive ? colors.danger : colors.textPrimary,
                  fontSize: timeLeft > 3600 ? 42 : 56,
                },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                marginTop: -5,
              }}
            >
              {isActive ? "STAY FOCUSED" : "READY?"}
            </Text>
          </Animated.View>

          {!isActive && (
            <View style={styles.inputRow}>
              <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                Duration (min):{" "}
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
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
                { backgroundColor: isActive ? colors.danger : colors.primary },
              ]}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.btnText}>
                {isActive ? "Pause Timer" : "Start Session"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.closeBtn, dynamicStyles.closeBtn]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>
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
    backgroundColor: "rgba(0,0,0,0.85)", // Deep focus background
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    // Base shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
  },
  title: { fontSize: 22, fontWeight: "bold", letterSpacing: 1 },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    // Neon Glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  timerText: {
    fontWeight: "bold",
    fontVariant: ["tabular-nums"], // Monospaced numbers prevent jitter
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 15,
    minWidth: 80,
    textAlign: "center",
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "bold",
  },
  row: { flexDirection: "column", gap: 15, width: "100%" },
  btn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    elevation: 0,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default PomodoroModal;
