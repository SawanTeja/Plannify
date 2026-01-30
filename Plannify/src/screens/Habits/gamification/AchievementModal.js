import { useContext, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppContext } from "../../../context/AppContext";

const { width } = Dimensions.get("window");

const AchievementModal = ({ visible, type, data, onClose }) => {
  // Get global colors
  const { colors } = useContext(AppContext);

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
  }, [visible]);

  if (!visible) return null;

  // Dynamic Styles
  const dynamicStyles = {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.primary, // Glowing border
      shadowColor: colors.primary,
    },
    title: { color: colors.primary },
    desc: { color: colors.textPrimary },
    subDesc: { color: colors.textSecondary },
    iconBg: { backgroundColor: colors.surfaceHighlight },
    btn: { backgroundColor: colors.primary, shadowColor: colors.primary },
    btnText: { color: colors.white },
  };

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        {/* Animated Card */}
        <Animated.View
          style={[
            styles.card,
            dynamicStyles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Glowing Icon Container */}
          <View
            style={[
              styles.iconContainer,
              dynamicStyles.iconBg,
              { shadowColor: colors.primary },
            ]}
          >
            <Text style={styles.icon}>
              {type === "levelup" ? "🎉" : data?.icon || "🏅"}
            </Text>
          </View>

          <Text style={[styles.title, dynamicStyles.title]}>
            {type === "levelup" ? "LEVEL UP!" : "NEW BADGE!"}
          </Text>

          <Text style={[styles.desc, dynamicStyles.desc]}>
            {type === "levelup"
              ? `You are now Level ${data?.level}`
              : data?.title}
          </Text>

          {type === "badge" && (
            <Text style={[styles.subDesc, dynamicStyles.subDesc]}>
              {data?.desc}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btn, dynamicStyles.btn]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, dynamicStyles.btnText]}>
              Awesome!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)", // Darker backdrop for focus
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: width * 0.85,
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 2,

    // Glow Effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,

    // Internal Glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 2,
    textAlign: "center",
  },
  desc: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subDesc: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 10,
    width: "100%",
    alignItems: "center",

    // Button Glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: {
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

export default AchievementModal;
