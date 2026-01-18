import { useContext, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";

const SetupScreen = () => {
  const { updateUserData } = useContext(AppContext);
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [notify, setNotify] = useState(true);

  const handleFinish = () => {
    // FIX: Removed the validation check.
    // If name is empty, we default to "Guest"
    const finalName = name.trim().length > 0 ? name : "Guest";

    updateUserData({
      name: finalName,
      userType: role,
      notifyTasks: notify,
      isOnboarded: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Let's get to know you.</Text>
          </View>

          {/* 1. Name Input (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>
              What should we call you?{" "}
              <Text
                style={{ fontWeight: "normal", fontSize: 14, color: "#999" }}
              >
                (Optional)
              </Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 2. Role Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>What do you do currently?</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.card, role === "student" && styles.activeCard]}
                onPress={() => setRole("student")}
              >
                <Text
                  style={[
                    styles.cardText,
                    role === "student" && styles.activeText,
                  ]}
                >
                  🎓 Student
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, role === "job" && styles.activeCard]}
                onPress={() => setRole("job")}
              >
                <Text
                  style={[styles.cardText, role === "job" && styles.activeText]}
                >
                  💼 Job / Work
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Notification Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Enable Reminders?</Text>
              <Switch
                trackColor={{ false: "#767577", true: colors.primary }}
                thumbColor={notify ? "#fff" : "#f4f3f4"}
                onValueChange={() => setNotify(!notify)}
                value={notify}
              />
            </View>
            <Text style={styles.hint}>
              We'll remind you about budget limits and daily tasks.
            </Text>
          </View>

          {/* Next Button */}
          <TouchableOpacity style={styles.button} onPress={handleFinish}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
  },
  header: { marginBottom: 30, marginTop: 20 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  section: { marginBottom: 30 },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#333",
  },
  row: { flexDirection: "row", gap: 15 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  hint: { fontSize: 14, color: colors.textSecondary, marginTop: 5 },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCard: { borderColor: colors.primary, backgroundColor: "#E3F2FD" },
  cardText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
  activeText: { color: colors.primary },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default SetupScreen;
