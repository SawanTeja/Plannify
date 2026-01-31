import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy"; // Fixed: Use legacy explicitly for SDK 54
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  // Modal, // REMOVED standard Modal
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT ENHANCED MODAL
import Modal from "react-native-modal";
import { AppContext } from "../../context/AppContext";
import { uploadToCloudinary } from "../../utils/cloudinaryHelper";

const MOODS = ["😊", "😂", "🥰", "😐", "😢", "😡"];

const JournalModal = ({
  visible,
  onClose,
  onSave,
  existingTags,
  onAddCustomTag,
  initialData,
  onDeleteTag,
}) => {
  const { colors, theme } = useContext(AppContext);

  // Fields
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [locationName, setLocationName] = useState("");

  // UI State
  const [isFetchingLoc, setIsFetchingLoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);  // NEW: For upload progress
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTopic(initialData.topic || "");
        setNote(initialData.text || "");
        setSelectedImage(initialData.image || null);
        setSelectedTags(initialData.tags || []);
        setSelectedMood(initialData.mood || null);
        setLocationName(initialData.location || "");
      } else {
        setTopic("");
        setNote("");
        setSelectedImage(null);
        setSelectedTags([]);
        setSelectedMood(null);
        setLocationName("");
      }
      setNewTagInput("");
      setShowTagInput(false);
    }
  }, [visible, initialData]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your photos to upload memories.");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Fixed enum
        allowsEditing: false, // Ensure full aspect ratio
        quality: 1,
      });
      if (!result.canceled) setSelectedImage(result.assets[0].uri);
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("Error", "Failed to open gallery");
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }
    
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false, // Ensure full aspect ratio
      quality: 1,
    });
    
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handleGetLocation = async () => {
    setIsFetchingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        setIsFetchingLoc(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 5000,
      });
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (address.length > 0) {
        const addr = address[0];
        const locString = `${addr.city || addr.name}, ${addr.region || addr.country}`;
        setLocationName(locString);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Could not fetch location", "Try entering it manually.");
    } finally {
      setIsFetchingLoc(false);
    }
  };

  const handleSave = async () => {
    if (!note && !selectedImage && !topic) return;

    // Copy local image to document directory if needed
    let localImageUri = selectedImage;
    let needsCloudUpload = false;

    if (selectedImage && (selectedImage.startsWith("file://") || selectedImage.startsWith("content://"))) {
      // Check if it's already in document directory or already uploaded
      if (!selectedImage.includes(FileSystem.documentDirectory) && !selectedImage.startsWith("http")) {
        const fileName = selectedImage.split("/").pop();
        const newPath = FileSystem.documentDirectory + fileName;
        try {
          await FileSystem.copyAsync({ from: selectedImage, to: newPath });
          localImageUri = newPath;
        } catch (e) {
          console.error("Error copying image locally:", e);
          localImageUri = selectedImage;
        }
        needsCloudUpload = true;
      }
    }

    // Save immediately with local image
    // If image needs cloud upload, mark uploadStatus as 'pending'
    onSave({
      id: initialData ? initialData.id : null,
      date: initialData ? initialData.date : null,
      timestamp: initialData ? initialData.timestamp : null,
      topic: topic,
      text: note,
      image: localImageUri,
      tags: selectedTags,
      mood: selectedMood,
      location: locationName,
      uploadStatus: needsCloudUpload ? 'pending' : (localImageUri?.startsWith('http') ? 'complete' : null),
    });
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim().length > 0) {
      onAddCustomTag(newTagInput.trim());
      setSelectedTags([...selectedTags, newTagInput.trim()]);
      setNewTagInput("");
      setShowTagInput(false);
    }
  };

  // Dynamic Styles
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    headerText: { color: colors.textPrimary },
    textSecondary: { color: colors.textSecondary },
    input: { backgroundColor: colors.surface, color: colors.textPrimary },
    modalHeader: {
      backgroundColor: colors.background, // Match container
      borderBottomColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    chipTextActive: { color: colors.white },
    chipTextInactive: { color: colors.textSecondary },
    dragHandle: { backgroundColor: colors.border },
  };

  return (
    <Modal
      isVisible={visible}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      onBackdropPress={onClose}
      style={styles.modalStyle}
      avoidKeyboard={true}
      propagateSwipe={true} // Allows scrolling inside without closing modal
    >
      <View style={[styles.sheetContainer, dynamicStyles.container]}>
        {/* 2. Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, dynamicStyles.dragHandle]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={[styles.header, dynamicStyles.modalHeader]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Text style={[styles.cancelText, dynamicStyles.textSecondary]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, dynamicStyles.headerText]}>
              {initialData ? "Edit Memory" : "New Memory"}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveText, { color: colors.primary }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Topic Input */}
            <TextInput
              style={[styles.topicInput, { color: colors.textPrimary }]}
              placeholder="Title (e.g. Trip to Mountains)"
              placeholderTextColor={colors.textMuted}
              value={topic}
              onChangeText={setTopic}
              maxLength={50}
            />

            {/* Location Bar */}
            <View
              style={[
                styles.locationContainer,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={colors.primary}
              />
              <TextInput
                style={[styles.locationInput, { color: colors.textPrimary }]}
                placeholder="Add location..."
                placeholderTextColor={colors.textMuted}
                value={locationName}
                onChangeText={setLocationName}
              />
              <TouchableOpacity
                onPress={handleGetLocation}
                disabled={isFetchingLoc}
              >
                {isFetchingLoc ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={20}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Mood Selector */}
            <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>
              How did you feel?
            </Text>
            <View style={styles.moodRow}>
              {MOODS.map((m, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedMood(m)}
                  style={[
                    styles.moodItem,
                    {
                      backgroundColor:
                        selectedMood === m
                          ? colors.surfaceHighlight
                          : "transparent",
                      borderColor:
                        selectedMood === m ? colors.primary : "transparent",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags */}
            <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>
              Tags
            </Text>
            <View style={styles.tagSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                <TouchableOpacity
                  style={[
                    styles.tagChip,
                    {
                      borderColor: colors.primary,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      backgroundColor: "transparent",
                    },
                  ]}
                  onPress={() => setShowTagInput(!showTagInput)}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontWeight: "bold",
                      marginLeft: 4,
                    }}
                  >
                    New
                  </Text>
                </TouchableOpacity>

                {existingTags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleTag(tag)}
                    onLongPress={() => onDeleteTag && onDeleteTag(tag)}
                    style={[
                      styles.tagChip,
                      selectedTags.includes(tag)
                        ? dynamicStyles.chipActive
                        : dynamicStyles.chipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedTags.includes(tag)
                          ? dynamicStyles.chipTextActive
                          : dynamicStyles.chipTextInactive,
                      ]}
                    >
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {showTagInput && (
                <View style={styles.newTagRow}>
                  <TextInput
                    style={[
                      styles.smallInput,
                      dynamicStyles.input,
                      { borderColor: colors.border },
                    ]}
                    placeholder="Tag name..."
                    placeholderTextColor={colors.textMuted}
                    value={newTagInput}
                    onChangeText={setNewTagInput}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleAddTag}
                    style={{ marginLeft: 10 }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Main Note */}
            <TextInput
              style={[styles.textInput, dynamicStyles.input]}
              multiline
              placeholder="Write your memories here..."
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
            />

            {/* Image Picker Buttons */}
            <View style={styles.mediaButtonsRow}>
              {/* Camera Button */}
              <TouchableOpacity
                style={[
                  styles.mediaBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={pickFromCamera}
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.mediaBtnText, { color: colors.textPrimary }]}>
                  Camera
                </Text>
              </TouchableOpacity>

              {/* Gallery Button */}
              <TouchableOpacity
                style={[
                  styles.mediaBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={pickImage}
              >
                <MaterialCommunityIcons
                  name="image"
                  size={24}
                  color={colors.secondary}
                />
                <Text style={[styles.mediaBtnText, { color: colors.textPrimary }]}>
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
            {/* Image Preview */}
            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  onPress={() => setSelectedImage(null)}
                  style={styles.removeImageBtn}
                >
                  <MaterialCommunityIcons name="close-circle" size={24} color={colors.danger || "#EF4444"} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal Styles
  modalStyle: {
    margin: 0,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    height: "92%", // Takes up most of the screen like a pageSheet
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },

  // Existing Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 5 },
  title: { fontSize: 18, fontWeight: "bold" },
  cancelText: { fontSize: 16 },
  saveText: { fontSize: 16, fontWeight: "bold" },

  content: { padding: 20, paddingBottom: 50 },

  topicInput: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "500",
  },

  sectionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  moodItem: { padding: 10, borderRadius: 20 },

  tagSection: { marginBottom: 25 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "600" },
  newTagRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    width: 150,
  },

  textInput: {
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
    textAlignVertical: "top",
    lineHeight: 24,
    borderRadius: 12,
    padding: 15,
  },

  imgBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  imgBtnText: { marginTop: 8, fontWeight: "600" },
  
  // New Media Buttons Styles
  mediaButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  mediaBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  previewContainer: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain", // Show full aspect ratio
    backgroundColor: "#000", // Background for non-square aspect ratios
  },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
  },
});

export default JournalModal;
