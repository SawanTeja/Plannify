import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useContext, useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  // 1. Removed SafeAreaView from react-native (we will use a View with manual padding)
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

const BudgetSetup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, theme, syncNow } = useContext(AppContext);
  const isEditing = route.params?.isEditing;

  const insets = useSafeAreaInsets();
  const FLOATING_TAB_BAR_HEIGHT = 100;
  const bottomPadding = FLOATING_TAB_BAR_HEIGHT + insets.bottom;

  // Hide the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const [currency, setCurrency] = useState("$");
  const [totalBudget, setTotalBudget] = useState("");
  const [useCategories, setUseCategories] = useState(true);
  const [categories, setCategories] = useState([
    { id: 1, name: "Food", limit: "" },
    { id: 2, name: "Transport", limit: "" },
  ]);

  useEffect(() => {
    if (isEditing) loadExistingData();
  }, [isEditing]);

  const loadExistingData = async () => {
    const data = await getData("budget_data");
    if (data) {
      setCurrency(data.currency);
      setTotalBudget(data.totalBudget ? data.totalBudget.toString() : "");
      if (data.categories && data.categories.length > 0) {
        setUseCategories(true);
        setCategories(
          data.categories.map((c) => ({ ...c, limit: c.limit ? c.limit.toString() : "" })),
        );
      } else {
        setUseCategories(false);
      }
    }
  };

  const addCategory = () =>
    setCategories([...categories, { id: Date.now(), name: "", limit: "" }]);

  const removeCategory = (id) =>
    setCategories(categories.filter((c) => c.id !== id));

  const updateCategory = (id, field, value) =>
    setCategories(
      categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const handleSave = async () => {
    const budgetNum = parseFloat(totalBudget);
    if (!budgetNum || budgetNum <= 0) {
      Alert.alert("Error", "Please enter a valid total monthly budget.");
      return;
    }

    let finalCategories = [];
    if (useCategories) {
      const allocated = categories.reduce(
        (sum, item) => sum + (parseFloat(item.limit) || 0),
        0,
      );
      finalCategories = categories.filter((c) => c.name.trim() !== "");

      if (finalCategories.length === 0) {
        Alert.alert(
          "Error",
          "Please add at least one category or turn off 'Category Breakdown'.",
        );
        return;
      }
      if (Math.abs(allocated - budgetNum) > 1) {
        Alert.alert(
          "Mismatch",
          `Categories sum to ${currency}${allocated}, but Total is ${currency}${budgetNum}. Please match them.`,
        );
        return;
      }
    }

    const oldData = isEditing ? await getData("budget_data") : null;
    const finalData = {
      ...(oldData || {}),
      currency,
      totalBudget: budgetNum,
      currentMonth:
        oldData?.currentMonth ||
        new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        }),
      history: oldData?.history || [],
      transactions: oldData?.transactions || [],
      categories: useCategories
        ? finalCategories.map((c) => ({
            ...c,
            limit: parseFloat(c.limit),
            spent:
              oldData?.categories?.find((oc) => oc.id === c.id)?.spent || 0,
          }))
        : [],
      updatedAt: new Date(), // Fix: Ensure settings sync
    };

    await storeData("budget_data", finalData);
    syncNow();
    navigation.navigate("BudgetMain");
  };

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    headerText: { color: colors.textPrimary },
    subText: { color: colors.textSecondary },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: colors.shadow,
    },
    input: {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    currencyBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyBtnInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    textActive: { color: colors.white },
    textInactive: { color: colors.textSecondary },
  };

  return (
    // 2. Replaced SafeAreaView with View and applied manual padding
    <View
      style={[
        styles.screen,
        dynamicStyles.container,
        { paddingTop: insets.top }, // Pushes content down below status bar
      ]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPadding + 100 },
            ]}
          >
            {/* Header */}
            <View style={styles.headerContainer}>
              {isEditing && (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backBtn}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              )}

              <Text style={[styles.headerTitle, dynamicStyles.headerText]}>
                {isEditing ? "Edit Budget" : "Budget Setup"}
              </Text>
            </View>

            {/* Currency Section */}
            <View style={[styles.card, dynamicStyles.card]}>
              <Text style={[styles.label, dynamicStyles.subText]}>
                Select Currency
              </Text>
              <View style={styles.currencyRow}>
                {["$", "₹", "€", "£"].map((sym) => {
                  const isActive = currency === sym;
                  return (
                    <TouchableOpacity
                      key={sym}
                      style={[
                        styles.currencyBtn,
                        isActive
                          ? dynamicStyles.currencyBtnActive
                          : dynamicStyles.currencyBtnInactive,
                      ]}
                      onPress={() => setCurrency(sym)}
                    >
                      <Text
                        style={[
                          styles.currencyText,
                          isActive
                            ? dynamicStyles.textActive
                            : dynamicStyles.textInactive,
                        ]}
                      >
                        {sym}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text
                style={[styles.label, dynamicStyles.subText, { marginTop: 20 }]}
              >
                Total Monthly Budget
              </Text>
              <View style={[styles.inputContainer, dynamicStyles.input]}>
                <Text style={[styles.inputPrefix, dynamicStyles.headerText]}>
                  {currency}
                </Text>
                <TextInput
                  style={[styles.mainInput, { color: colors.textPrimary }]}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  value={totalBudget}
                  onChangeText={setTotalBudget}
                />
              </View>
            </View>

            {/* Category Toggle */}
            <View style={[styles.card, dynamicStyles.card, styles.toggleCard]}>
              <View>
                <Text style={[styles.toggleTitle, dynamicStyles.headerText]}>
                  Category Breakdown
                </Text>
                <Text style={[styles.toggleSub, dynamicStyles.subText]}>
                  Allocate budget to specific needs
                </Text>
              </View>
              <Switch
                value={useCategories}
                onValueChange={setUseCategories}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {/* Category List */}
            {useCategories && (
              <View style={styles.categoriesContainer}>
                <Text style={[styles.sectionTitle, dynamicStyles.headerText]}>
                  Allocations
                </Text>

                {categories.map((cat, index) => (
                  <View
                    key={cat.id}
                    style={[styles.catCard, dynamicStyles.card]}
                  >
                    <View style={styles.catInputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.subText]}>
                        Name
                      </Text>
                      <TextInput
                        style={[
                          styles.catInput,
                          {
                            color: colors.textPrimary,
                            borderBottomColor: colors.border,
                          },
                        ]}
                        placeholder="e.g. Food"
                        placeholderTextColor={colors.textMuted}
                        value={cat.name}
                        onChangeText={(t) => updateCategory(cat.id, "name", t)}
                      />
                    </View>

                    <View style={styles.catInputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.subText]}>
                        Limit ({currency})
                      </Text>
                      <TextInput
                        style={[
                          styles.catInput,
                          {
                            color: colors.textPrimary,
                            borderBottomColor: colors.border,
                          },
                        ]}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textMuted}
                        value={cat.limit}
                        onChangeText={(t) => updateCategory(cat.id, "limit", t)}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => removeCategory(cat.id)}
                      style={styles.deleteBtn}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    { borderColor: colors.primary, borderStyle: "dashed" },
                  ]}
                  onPress={addCategory}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.addBtnText, { color: colors.primary }]}>
                    Add Category
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: bottomPadding,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>Save Budget</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: 20 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10, // Added slight extra top margin for breathing room
  },
  backBtn: { padding: 8, marginRight: 10 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },

  card: { padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 10 },

  currencyRow: { flexDirection: "row", gap: 12 },
  currencyBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  currencyText: { fontSize: 20, fontWeight: "bold" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  inputPrefix: { fontSize: 20, fontWeight: "bold", marginRight: 10 },
  mainInput: { flex: 1, fontSize: 20, fontWeight: "bold", height: "100%" },

  toggleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleTitle: { fontSize: 16, fontWeight: "bold" },
  toggleSub: { fontSize: 12, marginTop: 4 },

  categoriesContainer: { marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 15,
  },
  catInputWrapper: { flex: 1 },
  inputLabel: { fontSize: 10, marginBottom: 4 },
  catInput: {
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  deleteBtn: { padding: 8 },

  addBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  addBtnText: { fontWeight: "bold" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20,
  },
  saveBtn: {
    height: 55,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default BudgetSetup;
