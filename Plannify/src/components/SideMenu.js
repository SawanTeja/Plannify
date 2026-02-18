import { Ionicons } from "@expo/vector-icons";
import { FEATURES } from "../config/buildConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../context/AppContext";
import BackupModal from "./BackupModal";
import { ApiService } from "../services/ApiService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120; // px distance to trigger dismiss
const FLING_VELOCITY = 0.5; // velocity threshold for a "fling"

const SideMenu = ({ visible, onClose }) => {
  const {
    userData,
    updateUserData,
    toggleTheme,
    getStorageUsage,
    setUserData,
    colors,
    theme,
    user,
    logout,
    isPremium,
    setIsPremium,
  } = useContext(AppContext);

  const insets = useSafeAreaInsets();
  const [storageSize, setStorageSize] = useState("Calculating...");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userData.name);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [internalVisible, setInternalVisible] = useState(false);

  // --- ANIMATION VALUES ---
  const pan = useRef(new Animated.ValueXY()).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // --- PAN RESPONDER: Real-time finger tracking ---
  const panResponder = useRef(
    PanResponder.create({
      // Claim touch on empty areas (text, padding, dividers) immediately
      onStartShouldSetPanResponder: () => true,
      // Don't steal from buttons/switches at touch-start (so taps still work)
      onStartShouldSetPanResponderCapture: () => false,
      // CAPTURE PHASE: Steal touch from child components (Switch, Buttons, etc.)
      // at only 4px of movement — fast swipes are caught before native controls claim them
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        return Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
      },
      // BUBBLE PHASE fallback: catch any gestures that weren't captured above
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        // Flatten any existing offset into the base value
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        const { dx, dy, vx, vy } = gesture;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vel = Math.sqrt(vx * vx + vy * vy);

        // If the user dragged far enough or flung hard enough → dismiss
        if (dist > DISMISS_THRESHOLD || vel > FLING_VELOCITY) {
          // Determine fling direction from velocity (or position if velocity is low)
          const dirX = vel > FLING_VELOCITY ? vx : (dx / (dist || 1));
          const dirY = vel > FLING_VELOCITY ? vy : (dy / (dist || 1));
          const magnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

          // Fling off screen in the gesture direction
          const exitX = (dirX / magnitude) * SCREEN_WIDTH * 1.5;
          const exitY = (dirY / magnitude) * SCREEN_HEIGHT * 1.5;

          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: exitX, y: exitY },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(cardOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start(() => {
            closeModal();
          });
        } else {
          // Snap back to center with a spring
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 80,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // --- OPEN / CLOSE ANIMATIONS ---
  const openModal = useCallback(() => {
    setInternalVisible(true);
    pan.setValue({ x: 0, y: -80 }); // Start slightly above
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 7,
        tension: 60,
        useNativeDriver: false,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const animateOut = useCallback((cb) => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: 0, y: -150 },
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (cb) cb();
    });
  }, []);

  const closeModal = useCallback(() => {
    if (isEditingName && tempName.trim().length > 0) {
      updateUserData({ name: tempName });
    }
    setIsEditingName(false);
    setInternalVisible(false);
    pan.setValue({ x: 0, y: 0 });
    onClose();
  }, [isEditingName, tempName, onClose, updateUserData]);

  const handleClose = useCallback(() => {
    animateOut(() => closeModal());
  }, [animateOut, closeModal]);

  // Watch visibility prop
  useEffect(() => {
    if (visible) {
      openModal();
    } else if (internalVisible) {
      // Parent closed it externally
      setInternalVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setTempName(userData.name);
      getStorageUsage().then(setStorageSize);
    }
  }, [visible]);

  // --- BUSINESS LOGIC ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your gallery!");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
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
    Alert.alert("⚠ Factory Reset", "This will wipe all LOCAL data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Wipe Local Data",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          await logout();
          setUserData({
            name: "Guest",
            userType: "student",
            isOnboarded: false,
            notifyTasks: true,
          });
          closeModal();
        },
      },
    ]);
  };

  const handleClearDatabase = async () => {
    Alert.alert(
      "⚠ Clear Cloud Database",
      "This will PERMANENTLY delete all your data including Tasks, Habits, Budget, Attendance etc. from the server.\n\nThis cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            if (user && user.idToken) {
              try {
                const result = await ApiService.resetData(user.idToken);
                if (result.success) {
                  Alert.alert("Success", "Cloud database has been cleared. The app will now reset.");
                  await AsyncStorage.clear();
                  await logout();
                  setUserData({
                    name: "Guest",
                    userType: "student",
                    isOnboarded: false,
                    notifyTasks: true,
                  });
                  closeModal();
                } else {
                  Alert.alert("Error", "Failed to clear database.");
                }
              } catch (e) {
                Alert.alert("Error", "Network request failed.");
              }
            } else {
              Alert.alert("Error", "You must be logged in to clear cloud data.");
            }
          },
        },
      ]
    );
  };

  // --- COMPUTED STYLES ---
  // Card rotates slightly based on horizontal drag for a natural feel
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-6deg", "0deg", "6deg"],
    extrapolate: "clamp",
  });

  const cardAnimatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate },
      { scale: cardScale },
    ],
    opacity: cardOpacity,
  };

  const dynamicStyles = {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    textPrimary: { color: colors.textPrimary },
    textSecondary: { color: colors.textSecondary },
    divider: { backgroundColor: colors.border },
    loginBtn: { backgroundColor: colors.primary },
  };

  return (
    <>
      <Modal
        visible={internalVisible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Draggable Card — single Animated.View with bg color so touches register everywhere */}
        <Animated.View
          style={[
            styles.cardWrapper,
            styles.popoverCard,
            dynamicStyles.card,
            { marginTop: insets.top + 20 },
            cardAnimatedStyle,
          ]}
          {...panResponder.panHandlers}
        >
            {/* --- Drag Handle (Top) --- */}
            <View style={styles.dragHandleContainer}>
              <View
                style={[styles.dragHandle, { backgroundColor: colors.border }]}
              />
            </View>

            {/* --- LOGIN BUTTON --- */}
            {FEATURES.LOGIN && (!user || !user.idToken) && (
              <TouchableOpacity
                style={[styles.loginBtn, dynamicStyles.loginBtn]}
                onPress={() => setShowBackupModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>Log In / Sign Up</Text>
              </TouchableOpacity>
            )}

            {/* --- HEADER: Profile Info --- */}
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                {userData.image ? (
                  <Image source={{ uri: userData.image }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profileImage, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {userData.name?.[0]?.toUpperCase() || "G"}
                    </Text>
                  </View>
                )}
                <View style={[styles.cameraBadge, { borderColor: colors.surface }]}>
                  <Text style={{ fontSize: 8 }}>📷</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.infoContainer}>
                {isEditingName ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                      value={tempName}
                      onChangeText={setTempName}
                      autoFocus
                      onSubmitEditing={saveName}
                      returnKeyType="done"
                      maxLength={27}
                    />
                    <TouchableOpacity onPress={saveName}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setIsEditingName(true)}>
                    <Text
                      style={[styles.nameText, dynamicStyles.textPrimary]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {userData.name || "Guest"}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.emailText, dynamicStyles.textSecondary]}>
                  {userData.userType === "student" ? "Student" : "Pro"} Account
                </Text>
              </View>
            </View>

            {/* --- DIVIDER --- */}
            <View style={[styles.divider, dynamicStyles.divider]} />

            {/* --- SETTINGS ROWS --- */}
            <View style={styles.settingsList}>
              {FEATURES.PREMIUM && (
              <View style={styles.row}>
                <View>
                  <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>Premium Features</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Enable Online Sync for Pro Modules</Text>
                </View>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={"#FFF"}
                  value={isPremium}
                  onValueChange={setIsPremium}
                />
              </View>
              )}

              {FEATURES.CLOUD_BACKUP && (
              <TouchableOpacity style={styles.row} onPress={() => setShowBackupModal(true)}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="cloud-upload-outline" size={20} color={colors.textPrimary} style={{ marginRight: 10 }} />
                  <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>Cloud Backup & Restore</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              )}

              <View style={styles.row}>
                <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>Work Mode</Text>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={"#FFF"}
                  value={userData.userType === "job"}
                  onValueChange={() =>
                    updateUserData({ userType: userData.userType === "student" ? "job" : "student" })
                  }
                />
              </View>

              {FEATURES.NOTIFICATIONS && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>Notifications</Text>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={"#FFF"}
                  value={userData.notifyTasks}
                  onValueChange={(val) => updateUserData({ notifyTasks: val })}
                />
              </View>
              )}

              <View style={styles.row}>
                <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>Dark Mode</Text>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={"#FFF"}
                  value={theme === "dark"}
                  onValueChange={toggleTheme}
                />
              </View>

              {FEATURES.CLEAR_DATABASE && (
              <TouchableOpacity style={styles.row} onPress={handleClearDatabase}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="trash-bin-outline" size={20} color={colors.error || "#EF4444"} style={{ marginRight: 10 }} />
                  <Text style={[styles.rowLabel, { color: colors.error || "#EF4444" }]}>Clear Cloud Database</Text>
                </View>
              </TouchableOpacity>
              )}
            </View>

            {/* --- DIVIDER --- */}
            <View style={[styles.divider, dynamicStyles.divider]} />

            {/* --- FOOTER --- */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, dynamicStyles.textSecondary]}>
                Storage used: {storageSize}
              </Text>
              <View style={styles.footerButtons}>
                <TouchableOpacity onPress={handleClose} style={[styles.btn, styles.closeBtn]}>
                  <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Close</Text>
                </TouchableOpacity>
                {FEATURES.RESET_APP && (
                <TouchableOpacity onPress={handleFactoryReset} style={[styles.btn, styles.resetBtn]}>
                  <Text style={{ color: colors.white, fontWeight: "600" }}>Reset App</Text>
                </TouchableOpacity>
                )}
              </View>
            </View>
        </Animated.View>
      </Modal>

      <BackupModal visible={showBackupModal} onClose={() => setShowBackupModal(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cardWrapper: {
    position: "absolute",
    left: 15,
    right: 15,
  },
  popoverCard: {
    borderRadius: 24,
    padding: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  // Drag Handle
  dragHandleContainer: {
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 5,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },
  // Login
  loginBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  // Header
  headerContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatarContainer: { marginRight: 15 },
  profileImage: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 22, fontWeight: "bold" },
  cameraBadge: {
    position: "absolute", bottom: -2, right: -2, backgroundColor: "#FFF",
    borderRadius: 10, borderWidth: 2, padding: 2, elevation: 2,
  },
  infoContainer: { flex: 1, justifyContent: "center" },
  nameText: { fontSize: 18, fontWeight: "bold" },
  emailText: { fontSize: 12 },
  editRow: { flexDirection: "row", alignItems: "center" },
  input: { borderBottomWidth: 1, borderBottomColor: "#ccc", padding: 0, fontSize: 18, fontWeight: "bold" },
  // Common
  divider: { height: 1, width: "100%", marginVertical: 15, opacity: 0.5 },
  settingsList: { gap: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  // Footer
  footer: { marginTop: 5 },
  footerText: { fontSize: 12, marginBottom: 10, textAlign: "center" },
  footerButtons: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  closeBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#ccc" },
  resetBtn: { backgroundColor: "#EF4444" },
});

export default SideMenu;
