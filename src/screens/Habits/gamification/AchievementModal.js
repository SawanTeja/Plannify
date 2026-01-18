// src/screens/Habits/gamification/AchievementModal.js
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import colors from "../../../constants/colors";

const AchievementModal = ({ visible, type, data, onClose, isDark }) => {
  // type can be 'levelup' or 'badge'

  const bg = isDark ? "#1e1e1e" : "#fff";
  const text = isDark ? "#fff" : "#000";

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bg }]}>
          <Text style={{ fontSize: 60, marginBottom: 10 }}>
            {type === "levelup" ? "🎉" : data?.icon || "🏅"}
          </Text>

          <Text style={[styles.title, { color: colors.primary }]}>
            {type === "levelup" ? "LEVEL UP!" : "NEW BADGE!"}
          </Text>

          <Text style={[styles.desc, { color: text }]}>
            {type === "levelup"
              ? `You are now Level ${data?.level}`
              : data?.title}
          </Text>

          {type === "badge" && (
            <Text
              style={{ color: "#888", textAlign: "center", marginBottom: 20 }}
            >
              {data?.desc}
            </Text>
          )}

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },
  desc: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 15,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default AchievementModal;
