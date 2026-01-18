import { useNavigation, useRoute } from "@react-navigation/native";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

const BudgetSetup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useContext(AppContext);
  const isEditing = route.params?.isEditing;
  const isDark = theme === "dark";

  const containerStyle = {
    backgroundColor: isDark ? "#121212" : colors.background,
  };
  const cardStyle = { backgroundColor: isDark ? "#1e1e1e" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : colors.textPrimary };
  const inputStyle = {
    color: isDark ? "#fff" : "#000",
    borderColor: isDark ? "#444" : colors.gray,
    backgroundColor: isDark ? "#121212" : "#fff",
  };

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
      setTotalBudget(data.totalBudget.toString());
      if (data.categories && data.categories.length > 0) {
        setUseCategories(true);
        setCategories(
          data.categories.map((c) => ({ ...c, limit: c.limit.toString() })),
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
    };

    await storeData("budget_data", finalData);

    // FIX: Navigate to the correct internal screen name
    navigation.navigate("BudgetMain");
  };

  return (
    <ScrollView style={[styles.container, containerStyle]}>
      <Text style={[styles.headerTitle, textStyle]}>
        {isEditing ? "Edit Budget" : "Plan Your Budget"}
      </Text>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.label, textStyle]}>Currency</Text>
        <View style={styles.row}>
          {["$", "₹", "€", "£"].map((sym) => (
            <TouchableOpacity
              key={sym}
              style={[
                styles.currBtn,
                currency === sym && styles.currBtnActive,
                { borderColor: isDark ? "#444" : colors.gray },
              ]}
              onPress={() => setCurrency(sym)}
            >
              <Text
                style={[
                  styles.currText,
                  textStyle,
                  currency === sym && { color: "#fff" },
                ]}
              >
                {sym}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, textStyle, { marginTop: 20 }]}>
          Total Monthly Budget
        </Text>
        <TextInput
          style={[styles.input, inputStyle]}
          keyboardType="numeric"
          placeholder="e.g. 5000"
          placeholderTextColor="#aaa"
          value={totalBudget}
          onChangeText={setTotalBudget}
        />

        <View
          style={[
            styles.row,
            { justifyContent: "space-between", marginTop: 20 },
          ]}
        >
          <Text style={[styles.label, { marginBottom: 0 }, textStyle]}>
            Category Breakdown?
          </Text>
          <Switch
            value={useCategories}
            onValueChange={setUseCategories}
            trackColor={{ false: "#767577", true: colors.primary }}
          />
        </View>
      </View>

      {useCategories && (
        <>
          <Text style={[styles.subHeader, textStyle]}>Categories</Text>
          {categories.map((cat) => (
            <View key={cat.id} style={[styles.catRow, cardStyle]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <TextInput
                  style={[
                    styles.smallInput,
                    inputStyle,
                    { textAlign: "left", width: "100%" },
                  ]}
                  placeholder="Name"
                  placeholderTextColor="#aaa"
                  value={cat.name}
                  onChangeText={(t) => updateCategory(cat.id, "name", t)}
                />
              </View>
              <TextInput
                style={[styles.smallInput, inputStyle]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#aaa"
                value={cat.limit}
                onChangeText={(t) => updateCategory(cat.id, "limit", t)}
              />
              <TouchableOpacity
                onPress={() => removeCategory(cat.id)}
                style={{ marginLeft: 10 }}
              >
                <Text style={{ fontSize: 20 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addCatBtn, { borderColor: colors.primary }]}
            onPress={addCategory}
          >
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              + Add Category
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Budget</Text>
      </TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  subHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  card: { padding: 20, borderRadius: 12, marginBottom: 10 },
  label: { fontSize: 16, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  currBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  currBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currText: { fontSize: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginTop: 5,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: "center",
  },
  addCatBtn: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    marginTop: 10,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default BudgetSetup;
