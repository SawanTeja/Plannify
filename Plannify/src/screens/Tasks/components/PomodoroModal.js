import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import * as Notifications from "expo-notifications";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppContext } from "../../../context/AppContext";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { getStyles } from "./PomodoroModal.styles";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PomodoroModal = ({ visible, onClose }) => {
  useKeepAwake();
  const { colors } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

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
  }, [minutes, isActive, pulseAnim]);

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

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.title}>
              Focus Mode
            </Text>
          </View>

          {/* Animated Timer Circle */}
          <Animated.View
            style={[
              styles.timerCircle,
              isActive && styles.timerCircleActive,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text
              style={[
                styles.timerText,
                timeLeft > 3600 && styles.timerTextLong,
                isActive && styles.timerTextActive,
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.statusSubText}>
              {isActive ? "STAY FOCUSED" : "READY?"}
            </Text>
          </Animated.View>

          {!isActive && (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>
                Duration (min):{" "}
              </Text>
              <TextInput
                style={styles.input}
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
                isActive && styles.btnActive,
              ]}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.btnText}>
                {isActive ? "Pause Timer" : "Start Session"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.closeBtn]}
              onPress={onClose}
            >
              <Text style={styles.closeBtnText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PomodoroModal;
