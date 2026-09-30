import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useContext, useEffect, useState } from "react";
import { Image } from "expo-image";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { AppContext } from "../../context/AppContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { uploadToCloudinary } from "../../utils/cloudinaryHelper";
import getStyles from "./SocialPostModal.styles";

const MOODS = ["😊", "😢", "😡", "😴", "🤔", "🥳", "😌", "🤩", "😰", "🥰"];

const SocialPostModal = ({ visible, onClose, onSave, initialData }) => {
  const { colors, user } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setTopic(initialData.topic || "");
      setText(initialData.text || "");
      setImage(initialData.image || null);
      setLocation(initialData.location || "");
      setMood(initialData.mood || "");
      setTags(initialData.tags || []);
    } else {
      resetForm();
    }
  }, [initialData, visible]);

  const resetForm = () => {
    setTopic("");
    setText("");
    setImage(null);
    setLocation("");
    setMood("");
    setTags([]);
    setTagInput("");
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your gallery!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your camera!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleGetLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your location!");
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({});
      const results = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (results.length > 0) {
        const place = results[0];
        const locationStr = [place.city, place.region, place.country]
          .filter(Boolean)
          .join(", ");
        setLocation(locationStr);
      }
    } catch (_error) {
      Alert.alert("Error", "Could not get location");
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().replace(/^#/, "");
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!topic.trim() && !text.trim() && !image) {
      Alert.alert("Error", "Please add some content");
      return;
    }

    setIsUploading(true);

    try {
      let finalImage = image;
      let uploadStatus = "complete";

      // Upload new image to Cloudinary ONLY IF LOGGED IN
      const isLoggedIn = !!(user && user.idToken);

      if (image && !image.includes("cloudinary.com")) {
        if (isLoggedIn) {
          try {
            finalImage = await uploadToCloudinary(image);
          } catch (error) {
            console.error("Upload failed:", error);
            uploadStatus = "pending";
          }
        } else {
          console.log("👤 Not logged in - skipping Cloudinary upload for now");
          uploadStatus = "pending";
        }
      }

      const postData = {
        ...(initialData || {}),
        topic: topic.trim(),
        text: text.trim(),
        image: finalImage,
        location,
        mood,
        tags,
        date: initialData?.date || new Date().toLocaleDateString(),
        timestamp: initialData?.timestamp || Date.now(),
        uploadStatus,
      };

      onSave(postData);
      resetForm();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      style={styles.modal}
      backdropOpacity={0.5}
      avoidKeyboard
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {initialData ? "Edit Post" : "New Post"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Image */}
            <View style={styles.imageSection}>
              {image ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: image }} style={styles.previewImage} cachePolicy="disk" contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImage(null)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageButtons}>
                  <TouchableOpacity
                    style={styles.imageBtn}
                    onPress={handlePickImage}
                  >
                    <MaterialCommunityIcons name="image" size={24} color={colors.primary} />
                    <Text style={styles.imageBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageBtn}
                    onPress={handleTakePhoto}
                  >
                    <MaterialCommunityIcons name="camera" size={24} color={colors.primary} />
                    <Text style={styles.imageBtnText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Topic */}
            <TextInput
              style={[styles.input, styles.topicInput]}
              placeholder="Title..."
              placeholderTextColor={colors.textMuted}
              value={topic}
              onChangeText={setTopic}
            />

            {/* Text */}
            <TextInput
              style={[styles.input, styles.textInput]}
              placeholder="Write your thoughts..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />

            {/* Location */}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Location..."
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={handleGetLocation}
              >
                <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Mood */}
            <Text style={styles.label}>Mood</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.moodRow}>
                {MOODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMood(mood === m ? "" : m)}
                    style={[
                      styles.moodBtn,
                      mood === m && styles.moodBtnActive,
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Tags */}
            <Text style={styles.label}>Tags</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Add tag..."
                placeholderTextColor={colors.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddTag}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => handleRemoveTag(t)}
                    style={styles.tag}
                  >
                    <Text style={styles.tagText}>#{t}</Text>
                    <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isUploading}
            >
              {isUploading ? (
                <Text style={styles.saveBtnText}>Uploading...</Text>
              ) : (
                <Text style={styles.saveBtnText}>
                  {initialData ? "Save Changes" : "Share Post"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SocialPostModal;
