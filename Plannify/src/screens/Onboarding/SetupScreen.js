import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FEATURES } from "../../config/buildConfig";
import { useContext, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";

const { width } = Dimensions.get("window");

const SetupScreen = () => {
  const { updateUserData, colors, theme } = useContext(AppContext);

  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [notify, setNotify] = useState(true);

  const handleFinish = () => {
    const finalName = name.trim().length > 0 ? name : "Guest";
    updateUserData({
      name: finalName,
      userType: role,
      notifyTasks: notify,
      isOnboarded: true,
    });
  };

  // Dynamic Styles
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    textPrimary: { color: colors.textPrimary },
    textSecondary: { color: colors.textSecondary },
    input: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    cardActive: {
      backgroundColor: colors.surfaceHighlight,
      borderColor: colors.primary,
      shadowColor: colors.primary,
    },
    button: { backgroundColor: colors.primary, shadowColor: colors.primary },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              <MaterialCommunityIcons
                name="hand-wave"
                size={40}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, dynamicStyles.textPrimary]}>
              Welcome
            </Text>
            <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
              Let's set up your personal workspace.
            </Text>
          </View>

          {/* 1. Name Input */}
          <View style={styles.section}>
            <Text style={[styles.label, dynamicStyles.textPrimary]}>
              What should we call you?
            </Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 2. Role Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, dynamicStyles.textPrimary]}>
              Which describes you best?
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.card,
                  dynamicStyles.card,
                  role === "student" && dynamicStyles.cardActive,
                ]}
                onPress={() => setRole("student")}
              >
                <MaterialCommunityIcons
                  name="school-outline"
                  size={32}
                  color={
                    role === "student" ? colors.primary : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.cardText,
                    {
                      color:
                        role === "student"
                          ? colors.primary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Student
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.card,
                  dynamicStyles.card,
                  role === "job" && dynamicStyles.cardActive,
                ]}
                onPress={() => setRole("job")}
              >
                <MaterialCommunityIcons
                  name="briefcase-outline"
                  size={32}
                  color={role === "job" ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.cardText,
                    {
                      color:
                        role === "job" ? colors.primary : colors.textSecondary,
                    },
                  ]}
                >
                  Professional
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Notification Toggle */}
          {FEATURES.NOTIFICATIONS && (
          <View style={styles.section}>
            <View
              style={[
                styles.toggleContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, dynamicStyles.textPrimary]}>
                  Enable Daily Reminders
                </Text>
                <Text style={[styles.toggleSub, dynamicStyles.textSecondary]}>
                  Get notified about tasks & habits.
                </Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
                onValueChange={() => setNotify(!notify)}
                value={notify}
              />
            </View>
          </View>
          )}

          {/* Spacer */}
          <View style={{ height: 20 }} />

          {/* Next Button */}
          <TouchableOpacity
            style={[styles.button, dynamicStyles.button]}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    maxWidth: "80%",
  },
  section: { marginBottom: 25 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    marginLeft: 4,
  },
  input: {
    padding: 18,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  row: { flexDirection: "row", gap: 15 },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    justifyContent: "center",
    height: 120,
    // Base shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
  },

  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    justifyContent: "space-between",
  },
  toggleLabel: { fontSize: 16, fontWeight: "bold" },
  toggleSub: { fontSize: 12, marginTop: 2 },

  button: {
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default SetupScreen;
