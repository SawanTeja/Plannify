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
import colors from "../constants/colors";
import { AppContext } from "../context/AppContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

const SideMenu = ({ visible, onClose }) => {
  const {
    userData,
    updateUserData,
    theme,
    toggleTheme,
    getStorageUsage,
    setUserData,
  } = useContext(AppContext);

  const [storageSize, setStorageSize] = useState("Calculating...");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userData.name);

  // Internal state to keep Modal visible while animating out
  const [showModal, setShowModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- UPDATED GESTURE LOGIC ---
  const panResponder = useRef(
    PanResponder.create({
      // We use 'Capture' phases to steal the touch from child buttons (like Profile/Switches)
      // if the user is clearly dragging horizontally.
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // If user moves horizontally > 5px, take over control
        return (
          Math.abs(gestureState.dx) > 5 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },

      onPanResponderGrant: () => {
        // Optional: Can add a small visual feedback here if needed
        // For now, we just ensure the value is clean
        slideAnim.setOffset(0);
        slideAnim.setValue(0);
      },

      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging to the LEFT (negative numbers)
        // We use Math.min(0, ...) to ensure they can't drag it to the right (off the screen)
        if (gestureState.dx < 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        // Logic: Close if dragged > 30% OR swiped fast
        if (gestureState.dx < -SIDEBAR_WIDTH * 0.3 || gestureState.vx < -0.5) {
          // Finish the slide out (Close)
          Animated.timing(slideAnim, {
            toValue: -SIDEBAR_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(handleClose);
        } else {
          // Snap back to open (Reset)
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  // Sync state when opening/closing
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      setTempName(userData.name);
      getStorageUsage().then(setStorageSize);

      // Animate In
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
      // Animate Out (Programmatic close)
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
    if (tempName.trim().length > 0) {
      updateUserData({ name: tempName });
    }
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

  const isDark = theme === "dark";
  const rowBtnBg = isDark ? "#2c2c2c" : "#f5f5f5";

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={handleClose}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sidebar,
            { transform: [{ translateX: slideAnim }] },
            isDark ? styles.sidebarDark : styles.sidebarLight,
          ]}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              {userData.image ? (
                <Image
                  source={{ uri: userData.image }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>
                    {userData.name && userData.name !== "Guest"
                      ? userData.name[0].toUpperCase()
                      : "G"}
                  </Text>
                </View>
              )}
              <View style={styles.editIconBadge}>
                <Text style={{ fontSize: 10 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.nameContainer}>
              {isEditingName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    style={[styles.nameInput, isDark && styles.textDark]}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    onSubmitEditing={saveName}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={saveName}>
                    <Text style={styles.saveText}>✅</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.nameRow}
                  onPress={() => setIsEditingName(true)}
                >
                  <Text style={[styles.userName, isDark && styles.textDark]}>
                    {userData.name && userData.name !== "Guest"
                      ? userData.name
                      : "Guest"}
                  </Text>
                  <Text style={styles.editIcon}>✎</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.userRole}>
                {userData.userType === "student" ? "Student" : "Professional"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu Options */}
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textDark]}>
              Profile Type
            </Text>

            <TouchableOpacity
              style={[styles.rowBtn, { backgroundColor: rowBtnBg }]}
              onPress={() =>
                updateUserData({
                  userType: userData.userType === "student" ? "job" : "student",
                })
              }
            >
              <Text style={[styles.btnText, isDark && styles.textDark]}>
                {userData.userType === "student"
                  ? "🎓 Student"
                  : "💼 Professional"}
              </Text>
              <Text style={styles.changeText}>Switch ⇄</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textDark]}>
              Notifications
            </Text>
            <View style={styles.switchRow}>
              <Text style={[styles.switchText, isDark && styles.textDark]}>
                Daily Task Reminders
              </Text>
              <Switch
                value={userData.notifyTasks}
                onValueChange={(val) => updateUserData({ notifyTasks: val })}
                trackColor={{ false: "#767577", true: colors.primary }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text
                style={[
                  styles.label,
                  { marginBottom: 0 },
                  isDark && styles.textDark,
                ]}
              >
                Dark Mode
              </Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#767577", true: colors.primary }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textDark]}>
              Storage Used
            </Text>
            <Text style={[styles.infoText, isDark && styles.textSubDark]}>
              {storageSize}
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={[styles.resetBtn, isDark && { backgroundColor: "#3c1e1e" }]}
            onPress={handleFactoryReset}
          >
            <Text style={styles.resetBtnText}>🗑 Factory Reset</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: "100%",
    padding: 25,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 10,
    zIndex: 10,
  },
  sidebarLight: { backgroundColor: "#fff" },
  sidebarDark: { backgroundColor: "#1e1e1e" },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  imageContainer: { position: "relative", marginRight: 15 },
  profileImage: { width: 60, height: 60, borderRadius: 30 },
  placeholderImage: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  nameContainer: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "bold", color: "#333" },
  userRole: { fontSize: 12, color: "#888", marginTop: 2 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.primary,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "bold",
    padding: 0,
    minWidth: 100,
    color: "#333",
  },
  saveText: { marginLeft: 10, fontSize: 16 },
  editIcon: { marginLeft: 8, fontSize: 16, color: "#999" },
  textDark: { color: "#fff" },
  textSubDark: { color: "#aaa" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 20 },
  section: { marginBottom: 25 },
  label: { fontSize: 14, color: "#888", marginBottom: 10, fontWeight: "600" },
  rowBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  btnText: { fontSize: 16, fontWeight: "500", color: "#333" },
  changeText: { fontSize: 12, color: colors.primary },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchText: { fontSize: 16, color: "#333" },
  infoText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  resetBtn: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  resetBtnText: { color: colors.danger, fontWeight: "bold", fontSize: 16 },
});

export default SideMenu;
