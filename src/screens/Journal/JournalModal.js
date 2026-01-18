import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import colors from "../../constants/colors";

const MOODS = ["😊", "😂", "🥰", "😐", "😢", "😡"];

const JournalModal = ({
  visible,
  onClose,
  onSave,
  theme,
  existingTags,
  onAddCustomTag,
  initialData,
  onDeleteTag,
}) => {
  // Fields
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [locationName, setLocationName] = useState("");

  // UI State
  const [isFetchingLoc, setIsFetchingLoc] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const isDark = theme === "dark";
  const containerStyle = {
    backgroundColor: isDark ? "#121212" : colors.background,
  };
  const textStyle = { color: isDark ? "#fff" : colors.textPrimary };
  const inputStyle = { color: isDark ? "#fff" : "#000" };
  const placeholderColor = isDark ? "#666" : "#aaa";

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
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
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
      // Use Balanced for faster results on emulators
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

    let finalImageUri = null;
    if (
      selectedImage &&
      selectedImage.startsWith("file://") &&
      !selectedImage.includes(FileSystem.documentDirectory)
    ) {
      const fileName = selectedImage.split("/").pop();
      const newPath = FileSystem.documentDirectory + fileName;
      try {
        await FileSystem.copyAsync({ from: selectedImage, to: newPath });
        finalImageUri = newPath;
      } catch (e) {
        console.error("Error saving image", e);
        finalImageUri = selectedImage;
      }
    } else {
      finalImageUri = selectedImage;
    }

    onSave({
      id: initialData ? initialData.id : null,
      date: initialData ? initialData.date : null,
      timestamp: initialData ? initialData.timestamp : null,
      topic: topic,
      text: note,
      image: finalImageUri,
      tags: selectedTags,
      mood: selectedMood,
      location: locationName,
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

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, containerStyle]}>
        <View
          style={[styles.header, { borderColor: isDark ? "#333" : "#eee" }]}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, textStyle]}>
            {initialData ? "Edit Memory" : "New Memory"}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            style={[styles.topicInput, inputStyle]}
            placeholder="Topic (e.g., Trip to Mountains)"
            placeholderTextColor={placeholderColor}
            value={topic}
            onChangeText={setTopic}
            maxLength={50}
          />

          <View style={styles.sectionContainer}>
            <Text style={[styles.label, textStyle]}>Mood:</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedMood(m)}
                  style={[
                    styles.moodItem,
                    selectedMood === m && {
                      backgroundColor: isDark ? "#333" : "#eee",
                      borderColor: colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 24 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={[styles.label, textStyle]}>Location:</Text>
              <TouchableOpacity
                onPress={handleGetLocation}
                disabled={isFetchingLoc}
              >
                {isFetchingLoc ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                    📍 Auto-Detect
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.locationInput,
                inputStyle,
                { backgroundColor: isDark ? "#333" : "#f9f9f9" },
              ]}
              placeholder="Add location..."
              placeholderTextColor={placeholderColor}
              value={locationName}
              onChangeText={setLocationName}
            />
          </View>

          <View style={styles.tagSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingTags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleTag(tag)}
                  onLongPress={() => onDeleteTag && onDeleteTag(tag)} // <--- LONG PRESS DELETE
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag)
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: isDark ? "#333" : "#e0e0e0" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTags.includes(tag)
                        ? { color: "#fff" }
                        : { color: isDark ? "#ccc" : "#333" },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setShowTagInput(!showTagInput)}
              >
                <Text style={{ color: colors.primary }}>+ New</Text>
              </TouchableOpacity>
            </ScrollView>
            {showTagInput && (
              <View style={styles.newTagRow}>
                <TextInput
                  style={[
                    styles.smallInput,
                    inputStyle,
                    { borderColor: isDark ? "#444" : "#ccc" },
                  ]}
                  placeholder="Tag name..."
                  placeholderTextColor={placeholderColor}
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                />
                <TouchableOpacity onPress={handleAddTag}>
                  <Text style={styles.addTagBtn}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TextInput
            style={[styles.textInput, inputStyle]}
            multiline
            placeholder="Write your details here..."
            placeholderTextColor={placeholderColor}
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={[
              styles.imgBtn,
              { backgroundColor: isDark ? "#333" : "#f1f2f6" },
            ]}
            onPress={pickImage}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />
            ) : null}
            <Text style={[styles.imgBtnText, textStyle]}>
              📷 {selectedImage ? "Change Photo" : "Add Photo"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    marginTop: Platform.OS === "android" ? 20 : 40,
  },
  title: { fontSize: 18, fontWeight: "bold" },
  cancelText: { fontSize: 16, color: colors.textSecondary },
  saveText: { fontSize: 16, color: colors.primary, fontWeight: "bold" },
  content: { padding: 20, paddingBottom: 50 },
  topicInput: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#33333333",
    paddingBottom: 5,
  },
  sectionContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  moodRow: { flexDirection: "row", justifyContent: "space-between" },
  moodItem: { padding: 8, borderRadius: 30 },
  locationInput: { borderRadius: 10, padding: 10, fontSize: 14, marginTop: 5 },
  tagSection: { marginBottom: 20 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: "center",
  },
  tagText: { fontSize: 12 },
  newTagRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 5,
    width: 120,
    marginRight: 10,
  },
  addTagBtn: { color: colors.primary, fontWeight: "bold" },
  textInput: {
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 10,
    resizeMode: "contain",
  },
  imgBtn: { padding: 15, borderRadius: 12, alignItems: "center" },
  imgBtnText: { fontWeight: "600" },
});

export default JournalModal;
