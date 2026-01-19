import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { AppContext } from "../context/AppContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8; // Slightly wider for modern feel

const SideMenu = ({ visible, onClose }) => {
  const {
    userData,
    updateUserData,
    toggleTheme,
    getStorageUsage,
    setUserData,
    colors, // New Color System
    theme,
  } = useContext(AppContext);

  const [storageSize, setStorageSize] = useState("Calculating...");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userData.name);

  // Animation States
  const [showModal, setShowModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- GESTURE LOGIC ---
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 5 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderGrant: () => {
        slideAnim.setOffset(0);
        slideAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) slideAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SIDEBAR_WIDTH * 0.3 || gestureState.vx < -0.5) {
          Animated.timing(slideAnim, {
            toValue: -SIDEBAR_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(handleClose);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      setTempName(userData.name);
      getStorageUsage().then(setStorageSize);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShowModal(false);
          setIsEditingName(false);
        }
      });
    }
  }, [visible]);

  const handleClose = () => {
    if (isEditingName && tempName.trim().length > 0) {
      updateUserData({ name: tempName });
    }
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your gallery!");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      updateUserData({ image: result.assets[0].uri });
    }
  };

  const saveName = () => {
    if (tempName.trim().length > 0) updateUserData({ name: tempName });
    setIsEditingName(false);
  };

  const handleFactoryReset = async () => {
    Alert.alert("⚠ Factory Reset", "This will wipe all data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Wipe Data",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          setUserData({
            name: "Guest",
            userType: "student",
            isOnboarded: false,
            notifyTasks: true,
          });
          onClose();
        },
      },
    ]);
  };

  if (!showModal) return null;

  // Dynamic Styles
  const glassStyle = {
    backgroundColor:
      theme === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
    borderRightColor: colors.glassBorder,
  };

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={handleClose}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Glass Panel */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sidebar,
            glassStyle,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* 1. Profile Card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surfaceHighlight,
                borderColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
              {userData.image ? (
                <Image
                  source={{ uri: userData.image }}
                  style={styles.profileImage}
                />
              ) : (
                <View
                  style={[
                    styles.profileImage,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.placeholderText}>
                    {userData.name?.[0]?.toUpperCase() || "G"}
                  </Text>
                </View>
              )}
              <View
                style={[styles.editBadge, { backgroundColor: colors.surface }]}
              >
                <Text style={{ fontSize: 8 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.nameContainer}>
              {isEditingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        color: colors.textPrimary,
                        borderBottomColor: colors.primary,
                      },
                    ]}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    onSubmitEditing={saveName}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={saveName}>
                    <Text style={{ fontSize: 16 }}>✅</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditingName(true)}>
                  <Text
                    style={[styles.userName, { color: colors.textPrimary }]}
                  >
                    {userData.name || "Guest"}
                  </Text>
                  <Text style={[styles.userRole, { color: colors.primary }]}>
                    {userData.userType === "student"
                      ? "Student Account"
                      : "Pro Account"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* 2. Settings Options */}
          <View style={styles.menuContainer}>
            {/* User Type Toggle */}
            <View
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
            >
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Profile Mode
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {userData.userType === "student"
                    ? "Optimized for School"
                    : "Optimized for Work"}
                </Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
                value={userData.userType === "job"}
                onValueChange={() =>
                  updateUserData({
                    userType:
                      userData.userType === "student" ? "job" : "student",
                  })
                }
              />
            </View>

            {/* Notifications */}
            <View
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
            >
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Notifications
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  Daily reminders
                </Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.white}
                value={userData.notifyTasks}
                onValueChange={(val) => updateUserData({ notifyTasks: val })}
              />
            </View>

            {/* Dark Mode */}
            <View
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
            >
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {theme === "dark" ? "On" : "Off"}
                </Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
                value={theme === "dark"}
                onValueChange={toggleTheme}
              />
            </View>
          </View>

          {/* 3. Footer */}
          <View style={{ flex: 1 }} />

          <View style={[styles.footer, { borderColor: colors.border }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 15,
              }}
            >
              <Text style={{ color: colors.textMuted }}>Storage Used</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: "bold" }}>
                {storageSize}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.resetBtn,
                { backgroundColor: colors.danger + "20" },
              ]} // 20% opacity red
              onPress={handleFactoryReset}
            >
              <Text style={[styles.resetBtnText, { color: colors.danger }]}>
                Reset App Data
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)", // Deep dim for focus
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: "100%",
    padding: 25,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  // Profile
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  imageWrapper: { marginRight: 15 },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    padding: 3,
    borderRadius: 8,
    elevation: 2,
  },
  nameContainer: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "bold" },
  userRole: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "bold",
    borderBottomWidth: 1,
    padding: 0,
    minWidth: 120,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  divider: { height: 1, width: "100%", marginBottom: 25 },

  // Menu
  menuContainer: { gap: 15 },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
  },
  menuLabel: { fontSize: 16, fontWeight: "600" },
  menuSub: { fontSize: 12, marginTop: 2 },

  // Footer
  footer: { borderTopWidth: 1, paddingTop: 20 },
  resetBtn: { padding: 15, borderRadius: 15, alignItems: "center" },
  resetBtnText: { fontWeight: "bold", fontSize: 14 },
});

export default SideMenu;
