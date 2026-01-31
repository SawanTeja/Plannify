import { Ionicons } from "@expo/vector-icons"; // Added for icons
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { AppContext } from "../context/AppContext";
import BackupModal from "./BackupModal";
import { ApiService } from "../services/ApiService"; // Import ApiService


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
  } = useContext(AppContext);

  const [storageSize, setStorageSize] = useState("Calculating...");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userData.name);

  // State for the Backup Modal
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Update data when opening
  useEffect(() => {
    if (visible) {
      setTempName(userData.name);
      getStorageUsage().then(setStorageSize);
    }
  }, [visible]);

  const handleClose = () => {
    if (isEditingName && tempName.trim().length > 0) {
      updateUserData({ name: tempName });
    }
    setIsEditingName(false);
    onClose();
  };

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
          // Force Logout to ensure clean state
          await logout(); 
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
                      Alert.alert("Success", "Cloud database has been cleared.");
                      
                      Alert.alert("Success", "Cloud database has been cleared. The app will now reset.");
                      
                      // Also clear local data and logout to prevent immediate re-sync
                      await AsyncStorage.clear();
                      await logout(); // Force Logout
                      
                      setUserData({
                        name: "Guest",
                        userType: "student",
                        isOnboarded: false,
                        notifyTasks: true,
                      });
                      onClose();
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
    ]);
  };

  // --- STYLES ---
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
        isVisible={visible}
        // 1. SWIPE CONFIGURATION
        onSwipeComplete={handleClose}
        swipeDirection={["up", "left", "right"]} // Swipe UP to dismiss
        onBackdropPress={handleClose}
        onBackButtonPress={handleClose}
        // 2. SLIDE ANIMATIONS
        animationIn="slideInDown"
        animationOut="slideOutUp"
        backdropOpacity={0.4}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
        style={styles.modal}
      >
        <View style={[styles.popoverCard, dynamicStyles.card]}>
          {/* --- LOGIN BUTTON --- */}
          {/* Shows if NOT logged in via Google, OR if logged in but name is still Guest (edge case) */}
          {!user && (
            <TouchableOpacity
              style={[styles.loginBtn, dynamicStyles.loginBtn]}
              onPress={() => setShowBackupModal(true)} // <--- OPENS BACKUP MODAL
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          )}

          {/* --- HEADER: Profile Info --- */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
            >
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
                  <Text style={styles.avatarText}>
                    {userData.name?.[0]?.toUpperCase() || "G"}
                  </Text>
                </View>
              )}
              <View
                style={[styles.cameraBadge, { borderColor: colors.surface }]}
              >
                <Text style={{ fontSize: 8 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              {isEditingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    onSubmitEditing={saveName}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={saveName}>
                    <Text style={{ fontSize: 16, marginLeft: 8 }}>✅</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditingName(true)}>
                  <Text style={[styles.nameText, dynamicStyles.textPrimary]}>
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
            {/* NEW: Cloud Sync Option (Always visible so you can backup/restore) */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowBackupModal(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={colors.textPrimary}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>
                  Cloud Backup & Restore
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Profile Mode */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>
                Work Mode
              </Text>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={"#FFF"}
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
            <View style={styles.row}>
              <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>
                Notifications
              </Text>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={"#FFF"}
                value={userData.notifyTasks}
                onValueChange={(val) => updateUserData({ notifyTasks: val })}
              />
            </View>

            {/* Dark Mode */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, dynamicStyles.textPrimary]}>
                Dark Mode
              </Text>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={"#FFF"}
                value={theme === "dark"}
                onValueChange={toggleTheme}
              />
            </View>
            {/* NEW: Clear Database Option */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleClearDatabase}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="trash-bin-outline"
                  size={20}
                  color={colors.error || "#EF4444"} // Use error color
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.rowLabel, { color: colors.error || "#EF4444" }]}>
                  Clear Cloud Database
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* --- DIVIDER --- */}
          <View style={[styles.divider, dynamicStyles.divider]} />

          {/* --- FOOTER: Storage & Reset --- */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, dynamicStyles.textSecondary]}>
              Storage used: {storageSize}
            </Text>
            <View style={styles.footerButtons}>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.btn, styles.closeBtn]}
              >
                <Text
                  style={{ color: colors.textSecondary, fontWeight: "600" }}
                >
                  Close
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFactoryReset}
                style={[styles.btn, styles.resetBtn]}
              >
                <Text style={{ color: colors.white, fontWeight: "600" }}>
                  Reset App
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Visual Swipe Indicator */}
          <View style={styles.swipeIndicatorContainer}>
            <View
              style={[
                styles.swipeIndicator,
                { backgroundColor: colors.border },
              ]}
            />
          </View>
        </View>
      </Modal>

      {/* --- RENDER BACKUP MODAL --- */}
      <BackupModal
        visible={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-start",
    marginTop: 60,
    marginHorizontal: 15,
  },
  popoverCard: {
    borderRadius: 24,
    padding: 20,
    paddingBottom: 15,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  // LOGIN BUTTON STYLES
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
  loginBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Header
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 2,
    padding: 2,
    elevation: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nameText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emailText: {
    fontSize: 12,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    padding: 0,
    fontSize: 18,
    fontWeight: "bold",
    minWidth: 100,
  },
  // Common
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 15,
    opacity: 0.5,
  },
  settingsList: {
    gap: 15,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  // Footer
  footer: {
    marginTop: 5,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 15,
    textAlign: "center",
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  resetBtn: {
    backgroundColor: "#EF4444", // Red
  },
  swipeIndicatorContainer: {
    alignItems: "center",
    marginTop: 15,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
});

export default SideMenu;
