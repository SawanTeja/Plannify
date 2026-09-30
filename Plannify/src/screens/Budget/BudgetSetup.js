import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useContext, useEffect, useLayoutEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { useAlert } from "../../context/AlertContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getData, storeData } from "../../utils/storageHelper";
import getStyles from "./BudgetSetup.styles";

const BudgetSetup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, theme, syncNow } = useContext(AppContext);
  const { showAlert } = useAlert();
  const styles = useThemedStyles(getStyles);
  const isEditing = route.params?.isEditing;

  const insets = useSafeAreaInsets();
  const FLOATING_TAB_BAR_HEIGHT = 100;
  const bottomPadding = FLOATING_TAB_BAR_HEIGHT + insets.bottom;

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
      showAlert("Error", "Please enter a valid total monthly budget.");
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
        showAlert(
          "Error",
          "Please add at least one category or turn off 'Category Breakdown'.",
        );
        return;
      }
      if (Math.abs(allocated - budgetNum) > 1) {
        showAlert(
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
        ? finalCategories.map((c) => {
            const oldCat = oldData?.categories?.find((oc) => oc.name === c.name);
            return {
              name: c.name,
              limit: parseFloat(c.limit),
              spent: oldCat ? oldCat.spent : 0,
            };
          })
        : [],
      updatedAt: new Date(),
    };

    await storeData("budget_data", finalData);
    syncNow();
    navigation.navigate("BudgetMain");
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top },
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

              <Text style={styles.headerTitle}>
                {isEditing ? "Edit Budget" : "Budget Setup"}
              </Text>
            </View>

            {/* Currency Section */}
            <View style={styles.card}>
              <Text style={styles.label}>Select Currency</Text>
              <View style={styles.currencyRow}>
                {["$", "₹", "€", "£"].map((sym) => {
                  const isActive = currency === sym;
                  return (
                    <TouchableOpacity
                      key={sym}
                      style={[
                        styles.currencyBtn,
                        isActive && styles.currencyBtnActive,
                      ]}
                      onPress={() => setCurrency(sym)}
                    >
                      <Text
                        style={[
                          styles.currencyText,
                          isActive && styles.currencyTextActive,
                        ]}
                      >
                        {sym}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>
                Total Monthly Budget
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>
                  {currency}
                </Text>
                <TextInput
                  style={styles.mainInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  value={totalBudget}
                  onChangeText={setTotalBudget}
                />
              </View>
            </View>

            {/* Category Toggle */}
            <View style={[styles.card, styles.toggleCard]}>
              <View>
                <Text style={styles.toggleTitle}>
                  Category Breakdown
                </Text>
                <Text style={styles.toggleSub}>
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
                <Text style={styles.sectionTitle}>
                  Allocations
                </Text>

                {categories.map((cat) => (
                  <View
                    key={cat.id}
                    style={styles.catCard}
                  >
                    <View style={styles.catInputWrapper}>
                      <Text style={styles.inputLabel}>
                        Name
                      </Text>
                      <TextInput
                        style={styles.catInput}
                        placeholder="e.g. Food"
                        placeholderTextColor={colors.textMuted}
                        value={cat.name}
                        onChangeText={(t) => updateCategory(cat.id, "name", t)}
                      />
                    </View>

                    <View style={styles.catInputWrapper}>
                      <Text style={styles.inputLabel}>
                        Limit ({currency})
                      </Text>
                      <TextInput
                        style={styles.catInput}
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
                  style={styles.addBtn}
                  onPress={addCategory}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.addBtnText}>
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
            { paddingBottom: bottomPadding },
          ]}
        >
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>Save Budget</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default BudgetSetup;
