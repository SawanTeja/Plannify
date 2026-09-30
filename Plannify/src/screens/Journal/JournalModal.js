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
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT ENHANCED MODAL
import Modal from "react-native-modal";
import { AppContext } from "../../context/AppContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import getStyles from "./JournalModal.styles";

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
  const { colors } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

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

    setIsSaving(true);
    try {
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
          } catch (_e) {
            console.error("Error copying image locally:", _e);
            localImageUri = selectedImage;
          }
          needsCloudUpload = true;
        }
      }

      // Save immediately with local image
      // If image needs cloud upload, mark uploadStatus as 'pending'
      await onSave({
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
    } finally {
      setIsSaving(false);
    }
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
      <View style={styles.sheetContainer}>
        {/* 2. Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {initialData ? "Edit Memory" : "New Memory"}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Topic Input */}
            <TextInput
              style={styles.topicInput}
              placeholder="Title (e.g. Trip to Mountains)"
              placeholderTextColor={colors.textMuted}
              value={topic}
              onChangeText={setTopic}
              maxLength={50}
            />

            {/* Location Bar */}
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={colors.primary}
              />
              <TextInput
                style={styles.locationInput}
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
            <Text style={styles.sectionLabel}>
              How did you feel?
            </Text>
            <View style={styles.moodRow}>
              {MOODS.map((m, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedMood(m)}
                  style={[
                    styles.moodItem,
                    selectedMood === m && styles.moodItemSelected,
                  ]}
                >
                  <Text style={styles.moodItemEmoji}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags */}
            <Text style={styles.sectionLabel}>
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
                    styles.tagChipAdd,
                  ]}
                  onPress={() => setShowTagInput(!showTagInput)}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.tagChipAddText}>
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
                        ? styles.tagChipActive
                        : styles.tagChipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedTags.includes(tag)
                          ? styles.tagTextActive
                          : styles.tagTextInactive,
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
                    style={styles.smallInput}
                    placeholder="Tag name..."
                    placeholderTextColor={colors.textMuted}
                    value={newTagInput}
                    onChangeText={setNewTagInput}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleAddTag}
                    style={styles.addTagBtn}
                  >
                    <Text style={styles.addTagBtnText}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Main Note */}
            <TextInput
              style={styles.textInput}
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
                style={styles.mediaBtn}
                onPress={pickFromCamera}
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.mediaBtnText}>
                  Camera
                </Text>
              </TouchableOpacity>

              {/* Gallery Button */}
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={pickImage}
              >
                <MaterialCommunityIcons
                  name="image"
                  size={24}
                  color={colors.secondary}
                />
                <Text style={styles.mediaBtnText}>
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

export default JournalModal;
