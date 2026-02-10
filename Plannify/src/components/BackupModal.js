import { Ionicons } from "@expo/vector-icons";
import { useContext, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { AppContext } from "../context/AppContext";
import { backupToDrive, restoreFromDrive } from "../services/DriveService";

const BackupModal = ({ visible, onClose }) => {
  const { user, userData, login, logout, colors, theme } = useContext(AppContext);

  // loadingAction tracks which button is spinning: 'login', 'backup', 'restore'
  const [loadingAction, setLoadingAction] = useState(null);

  const handleLogin = async () => {
    setLoadingAction("login");
    try {
      await login();
    } catch (e) {
      Alert.alert("Login Failed", e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    setLoadingAction("backup");
    try {
      await backupToDrive();
      Alert.alert("Success", "Backup completed successfully!");
    } catch (e) {
      Alert.alert("Backup Failed", e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRestore = async () => {
    if (!user) return;

    Alert.alert(
      "Confirm Restore",
      "This will OVERWRITE all current data on this device with the data from Google Drive. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Restore",
          onPress: async () => {
            setLoadingAction("restore");
            try {
              await restoreFromDrive();
              Alert.alert(
                "Restore Complete",
                "Data restored. Please restart the app to see the changes.",
                [{ text: "OK", onPress: () => onClose() }],
              );
            } catch (e) {
              Alert.alert("Restore Failed", e.message);
            } finally {
              setLoadingAction(null);
            }
          },
        },
      ],
    );
  };

  // Dynamic Styles based on theme
  const containerStyle = {
    backgroundColor: colors.background || "#ffffff",
    borderColor: colors.border || "#333",
  };
  const textStyle = { color: colors.textPrimary || colors.text || "#000" };
  const subTextStyle = { color: colors.textSecondary || "#888" };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, containerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, textStyle]}>Cloud Sync</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textStyle.color} />
            </TouchableOpacity>
          </View>

          {/* User Profile Section */}
          <View style={styles.profileSection}>
            {user ? (
              // LOGGED IN VIEW
              <>
                <Image
                  source={{ uri: userData?.image }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, textStyle]}>
                    {userData?.name || "User"}
                  </Text>
                  <Text style={[styles.userEmail, subTextStyle]}>
                    {user?.user?.email || "Signed In"}
                  </Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                  <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </>
            ) : (
              // GUEST VIEW
              <View style={styles.guestSection}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={40}
                  color={textStyle.color}
                />
                <Text style={[styles.guestText, textStyle]}>
                  Sign in to backup your journal & data.
                </Text>
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleLogin}
                  disabled={!!loadingAction}
                >
                  {loadingAction === "login" ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons
                        name="logo-google"
                        size={18}
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.googleBtnText}>
                        Sign in with Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border || "#eee" },
            ]}
          />

          {/* Actions - Only visible if logged in */}
          {user && (
            <View style={styles.actions}>
              {/* BACKUP BUTTON */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#4CAF50" }]}
                onPress={handleBackup}
                disabled={!!loadingAction}
              >
                {loadingAction === "backup" ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="white" />
                    <Text style={styles.actionBtnText}>Backup Now</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* RESTORE BUTTON */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#2196F3" }]}
                onPress={handleRestore}
                disabled={!!loadingAction}
              >
                {loadingAction === "restore" ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="cloud-download" size={20} color="white" />
                    <Text style={styles.actionBtnText}>Restore Data</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Info Text */}
          {user && (
            <Text style={[styles.infoFooter, subTextStyle]}>
              Backups are saved to a hidden folder in your Google Drive.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userEmail: {
    fontSize: 12,
  },
  logoutBtn: {
    padding: 5,
  },
  guestSection: {
    width: "100%",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  guestText: {
    textAlign: "center",
    marginBottom: 10,
  },
  googleBtn: {
    flexDirection: "row",
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
  },
  googleBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 15,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  infoFooter: {
    marginTop: 15,
    textAlign: "center",
    fontSize: 11,
    fontStyle: "italic",
  },
});

export default BackupModal;
