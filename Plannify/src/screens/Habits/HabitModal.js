import { useContext, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { AppContext } from "../../context/AppContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getStyles } from "./HabitScreen.styles";

export const CATEGORIES = [
  "General ⚡",
  "Health 💪",
  "Study 📚",
  "Work 💼",
  "Mindfulness 🧘",
  "Skill 🎨",
];

const HabitModal = ({ visible, onClose, onSave, initialData }) => {
  const { colors } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);

  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [category, setCategory] = useState("General ⚡");

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTitle(initialData.title || "");
        setCategory(initialData.category || "General ⚡");
        // Parse duration if present
        if (initialData.duration) {
          const hrMatch = initialData.duration.match(/(\d+)\s*hr/);
          const minMatch = initialData.duration.match(/(\d+)\s*min/);
          setHours(hrMatch ? hrMatch[1] : "");
          setMinutes(minMatch ? minMatch[1] : "");
        } else {
          setHours("");
          setMinutes("");
        }
      } else {
        setTitle("");
        setHours("");
        setMinutes("");
        setCategory("General ⚡");
      }
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!title.trim()) return;

    let formattedDuration = "";
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    if (h > 0 && m > 0) formattedDuration = `${h} hr ${m} min`;
    else if (h > 0) formattedDuration = `${h} hr`;
    else if (m > 0) formattedDuration = `${m} min`;

    onSave({
      title: title.trim(),
      category,
      duration: formattedDuration,
    });

    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      onBackdropPress={onClose}
      style={styles.bottomModal}
      avoidKeyboard={true}
      backdropOpacity={0.7}
      propagateSwipe={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.bottomModalContent}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={styles.modalTitle}>
            {initialData ? "Edit Habit" : "New Habit"}
          </Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Drink Water"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Text style={styles.label}>Duration (Optional)</Text>
          <View style={styles.durationRow}>
            <TextInput
              style={[styles.input, styles.durationInput]}
              placeholder="Hours"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
            />
            <TextInput
              style={[styles.input, styles.durationInput]}
              placeholder="Mins"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={minutes}
              onChangeText={setMinutes}
            />
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.catCloud}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.catChip,
                  category === c && styles.catChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    category === c && styles.catChipTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {initialData ? "Save Changes" : "Create Habit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default HabitModal;
