import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEATURES } from "../../config/buildConfig";
import { AppContext } from "../../context/AppContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import getStyles from "./SetupScreen.styles";

const SetupScreen = () => {
  const { updateUserData, colors, theme } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

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

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="hand-wave"
                size={40}
                color={colors.primary}
              />
            </View>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>
              {"Let's set up your personal workspace."}
            </Text>
          </View>

          {/* 1. Name Input */}
          <View style={styles.section}>
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 2. Role Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Which describes you best?</Text>
            <View style={styles.row}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.card,
                  role === "student" && styles.cardActive,
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
                  role === "job" && styles.cardActive,
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
              <View style={styles.toggleContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>
                    Enable Daily Reminders
                  </Text>
                  <Text style={styles.toggleSub}>
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
            style={styles.button}
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

export default SetupScreen;
