import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import { getStyles } from "./AchievementModal.styles";

const AchievementModal = ({ visible, type, data, onClose }) => {
  const styles = useThemedStyles(getStyles);

  // Animation Value
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Spring Open
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset when closed
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        {/* Animated Card */}
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Glowing Icon Container */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {type === "levelup" ? "🎉" : data?.icon || "🏅"}
            </Text>
          </View>

          <Text style={styles.title}>
            {type === "levelup" ? "LEVEL UP!" : "NEW BADGE!"}
          </Text>

          <Text style={styles.desc}>
            {type === "levelup"
              ? `You are now Level ${data?.level}`
              : data?.title}
          </Text>

          {type === "badge" && (
            <Text style={styles.subDesc}>
              {data?.desc}
            </Text>
          )}

          <TouchableOpacity
            style={styles.btn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>
              Awesome!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AchievementModal;
