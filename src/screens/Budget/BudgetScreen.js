import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useCallback, useContext, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

const BudgetScreen = () => {
  const navigation = useNavigation();
  const { theme } = useContext(AppContext);
  const isDark = theme === "dark";

  const [budget, setBudget] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [payDay, setPayDay] = useState("");

  const containerStyle = {
    backgroundColor: isDark ? "#121212" : colors.background,
  };
  const cardStyle = { backgroundColor: isDark ? "#1e1e1e" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : colors.textPrimary };
  const subTextStyle = { color: isDark ? "#aaa" : colors.textSecondary };
  const inputColor = {
    color: isDark ? "#fff" : "#000",
    borderColor: isDark ? "#444" : colors.gray,
  };

  useFocusEffect(
    useCallback(() => {
      loadBudget();
    }, []),
  );

  const loadBudget = async () => {
    let data = await getData("budget_data");
    if (!data) {
      navigation.navigate("BudgetSetup");
      return;
    }

    const realMonth = new Date().toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    if (!data.currentMonth || data.currentMonth !== realMonth) {
      data.currentMonth = realMonth;
      data.transactions = [];
      if (data.categories)
        data.categories = data.categories.map((c) => ({ ...c, spent: 0 }));
      await storeData("budget_data", data);
    }

    let autoPaidItems = [];
    const todayDay = new Date().getDate();

    if (data.recurringPayments) {
      data.recurringPayments = data.recurringPayments.map((rp) => {
        if (rp.lastPaidMonth !== realMonth && todayDay >= rp.day) {
          const newTx = {
            id: Date.now() + Math.random(),
            desc: `⚡ Auto: ${rp.desc}`,
            amount: rp.amount,
            category: "Recurring",
            type: "debit",
            date: new Date().toLocaleDateString(),
          };
          data.transactions.unshift(newTx);
          autoPaidItems.push(rp.desc);
          return { ...rp, lastPaidMonth: realMonth };
        }
        return rp;
      });
    }

    if (autoPaidItems.length > 0) {
      await storeData("budget_data", data);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚡ Auto-Pay Executed",
            body: `Paid: ${autoPaidItems.join(", ")}`,
            sound: true,
          },
          trigger: null,
        });
      } catch (e) {
        console.log("Notification failed (Expo Go limitation)");
      }
      Alert.alert("⚡ Auto-Pay Executed", `Paid: ${autoPaidItems.join(", ")}`);
    }

    setBudget(data);
    if (data.categories && data.categories.length > 0)
      setSelectedCat(data.categories[0].name);
    else setSelectedCat("General");
  };

  const handleAddTransaction = async () => {
    if (!amount || !desc) return;
    const val = parseFloat(amount);
    const newBudget = { ...budget };
    const newTx = {
      id: Date.now(),
      desc,
      amount: val,
      category: selectedCat || "General",
      type: "debit",
      date: new Date().toLocaleDateString(),
    };
    newBudget.transactions = [newTx, ...newBudget.transactions];
    if (newBudget.categories) {
      newBudget.categories = newBudget.categories.map((cat) => {
        if (cat.name === selectedCat) return { ...cat, spent: cat.spent + val };
        return cat;
      });
    }
    await storeData("budget_data", newBudget);
    setBudget(newBudget);
    setModalVisible(false);
    setAmount("");
    setDesc("");
  };

  const handleAddIncome = async () => {
    if (!amount || !desc) return;
    const val = parseFloat(amount);
    const newBudget = { ...budget };
    const newTx = {
      id: Date.now(),
      desc,
      amount: val,
      category: "Income",
      type: "credit",
      date: new Date().toLocaleDateString(),
    };
    newBudget.transactions = [newTx, ...newBudget.transactions];
    await storeData("budget_data", newBudget);
    setBudget(newBudget);
    setIncomeModalVisible(false);
    setAmount("");
    setDesc("");
  };

  const handleAddRecurring = async () => {
    if (!amount || !desc || !payDay) return;
    const day = parseInt(payDay);
    if (day < 1 || day > 31) {
      Alert.alert("Invalid Date", "Please enter a day between 1-31");
      return;
    }
    const newBudget = { ...budget };
    const newRecurring = {
      id: Date.now(),
      desc,
      amount: parseFloat(amount),
      day,
      lastPaidMonth: "",
    };
    newBudget.recurringPayments = [
      ...(newBudget.recurringPayments || []),
      newRecurring,
    ];
    await storeData("budget_data", newBudget);
    setBudget(newBudget);
    setRecurringModalVisible(false);
    setAmount("");
    setDesc("");
    setPayDay("");
    loadBudget();
  };

  if (!budget) return null;

  const hasCategories = budget.categories && budget.categories.length > 0;
  const totalSpent = hasCategories
    ? budget.categories.reduce((acc, item) => acc + item.spent, 0)
    : budget.transactions
        .filter((t) => t.type !== "credit")
        .reduce((acc, item) => acc + item.amount, 0);
  const totalIncome = budget.transactions
    .filter((t) => t.type === "credit")
    .reduce((acc, item) => acc + item.amount, 0);
  const remaining = budget.totalBudget + totalIncome - totalSpent;

  return (
    // FIX: Added Padding for Android Status Bar
    <View
      style={[
        styles.container,
        containerStyle,
        {
          paddingTop:
            Platform.OS === "android" ? StatusBar.currentHeight + 20 : 20,
        },
      ]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.actionBtn, cardStyle]}
          onPress={() => navigation.navigate("BudgetHistory")}
        >
          <Text style={styles.btnText}>📜 History</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>Budget</Text>
        <TouchableOpacity
          style={[styles.actionBtn, cardStyle]}
          onPress={() =>
            navigation.navigate("BudgetSetup", { isEditing: true })
          }
        >
          <Text style={styles.btnText}>⚙️ Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerCard}>
          <Text style={styles.balanceLabel}>
            Remaining ({budget.currentMonth})
          </Text>
          <Text style={styles.balance}>
            {budget.currency}
            {remaining.toFixed(2)}
          </Text>
          <View style={{ flexDirection: "row", gap: 15 }}>
            <Text style={styles.subText}>
              Limit: {budget.currency}
              {budget.totalBudget}
            </Text>
            <Text style={[styles.subText, { color: "#81ecec" }]}>
              In: +{totalIncome}
            </Text>
            <Text style={[styles.subText, { color: "#ff7675" }]}>
              Out: -{totalSpent}
            </Text>
          </View>
        </View>

        {hasCategories && (
          <>
            <Text style={[styles.sectionTitle, textStyle]}>Breakdown</Text>
            {budget.categories.map((item) => {
              const percent = item.limit > 0 ? item.spent / item.limit : 0;
              return (
                <View key={item.id} style={[styles.catItem, cardStyle]}>
                  <View style={styles.catHeader}>
                    <Text style={[styles.catName, textStyle]}>{item.name}</Text>
                    <Text style={[styles.catVal, subTextStyle]}>
                      {budget.currency}
                      {item.spent} / {item.limit}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(percent * 100, 100)}%`,
                          backgroundColor:
                            percent > 1 ? colors.danger : colors.success,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {budget.recurringPayments && budget.recurringPayments.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, textStyle, { marginTop: 20 }]}>
              Auto-Pay Active ⚡
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {budget.recurringPayments.map((rp) => (
                <View
                  key={rp.id}
                  style={[
                    styles.chip,
                    { backgroundColor: cardStyle.backgroundColor },
                  ]}
                >
                  <Text style={{ color: textStyle.color, fontWeight: "bold" }}>
                    {rp.desc}
                  </Text>
                  <Text style={{ color: subTextStyle.color, fontSize: 12 }}>
                    Day {rp.day} • {budget.currency}
                    {rp.amount}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={[styles.sectionTitle, textStyle]}>Recent</Text>
        {budget.transactions && budget.transactions.length > 0 ? (
          budget.transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={[styles.logRow, cardStyle]}>
              <View>
                <Text style={[styles.logDesc, textStyle]}>{tx.desc}</Text>
                <Text style={[styles.logDate, subTextStyle]}>
                  {tx.date} • {tx.category}
                </Text>
              </View>
              <Text
                style={[
                  styles.logAmount,
                  {
                    color:
                      tx.type === "credit" ? colors.success : colors.danger,
                  },
                ]}
              >
                {tx.type === "credit" ? "+" : "-"}
                {budget.currency}
                {tx.amount}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyLog, subTextStyle]}>
            No transactions yet.
          </Text>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: "#a55eea", marginRight: 10 }]}
          onPress={() => setRecurringModalVisible(true)}
        >
          <Text style={styles.fabIcon}>⚡</Text>
          <Text style={styles.fabLabel}>AUTO</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.success, marginRight: 10 },
          ]}
          onPress={() => setIncomeModalVisible(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabLabel}>INCOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.danger }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabIcon}>-</Text>
          <Text style={styles.fabLabel}>SPEND</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle]}>
            <Text style={[styles.modalTitle, textStyle]}>Add Expense</Text>
            <TextInput
              placeholder="Description"
              placeholderTextColor="#aaa"
              style={[styles.input, inputColor]}
              value={desc}
              onChangeText={setDesc}
            />
            <TextInput
              placeholder="Amount"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              style={[styles.input, inputColor]}
              value={amount}
              onChangeText={setAmount}
            />
            {hasCategories && (
              <View style={styles.catSelectRow}>
                {budget.categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      selectedCat === cat.name && styles.catChipActive,
                    ]}
                    onPress={() => setSelectedCat(cat.name)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedCat === cat.name && styles.chipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.danger }]}
              onPress={handleAddTransaction}
            >
              <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={incomeModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle]}>
            <Text
              style={[
                styles.modalTitle,
                {
                  color: colors.success,
                  fontWeight: "bold",
                  fontSize: 22,
                  marginBottom: 20,
                  textAlign: "center",
                },
              ]}
            >
              Add Income
            </Text>
            <TextInput
              placeholder="Source"
              placeholderTextColor="#aaa"
              style={[styles.input, inputColor]}
              value={desc}
              onChangeText={setDesc}
            />
            <TextInput
              placeholder="Amount"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              style={[styles.input, inputColor]}
              value={amount}
              onChangeText={setAmount}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.success }]}
              onPress={handleAddIncome}
            >
              <Text style={styles.addBtnText}>Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIncomeModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={recurringModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle]}>
            <Text
              style={[
                styles.modalTitle,
                {
                  color: "#a55eea",
                  fontWeight: "bold",
                  fontSize: 22,
                  marginBottom: 20,
                  textAlign: "center",
                },
              ]}
            >
              Setup Auto-Pay
            </Text>
            <Text
              style={{
                color: subTextStyle.color,
                textAlign: "center",
                marginBottom: 15,
              }}
            >
              Money will be deducted automatically every month on this date.
            </Text>
            <TextInput
              placeholder="Name (e.g. Netflix)"
              placeholderTextColor="#aaa"
              style={[styles.input, inputColor]}
              value={desc}
              onChangeText={setDesc}
            />
            <TextInput
              placeholder="Amount"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              style={[styles.input, inputColor]}
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              placeholder="Day of Month (1-31)"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              style={[styles.input, inputColor]}
              value={payDay}
              onChangeText={setPayDay}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#a55eea" }]}
              onPress={handleAddRecurring}
            >
              <Text style={styles.addBtnText}>Save Auto-Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRecurringModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Note: Padding is now handled dynamically in the inline style of the container
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
  },
  btnText: { fontWeight: "bold", color: colors.primary },
  headerCard: {
    backgroundColor: colors.primary,
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 16 },
  balance: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    marginVertical: 5,
  },
  subText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  catItem: { padding: 15, borderRadius: 12, marginBottom: 10 },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  catName: { fontSize: 16, fontWeight: "500" },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.gray,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  logDesc: { fontSize: 16, fontWeight: "500" },
  logDate: { fontSize: 12, marginTop: 2 },
  logAmount: { fontSize: 16, fontWeight: "bold" },
  emptyLog: { textAlign: "center", marginTop: 10, marginBottom: 20 },
  chip: { padding: 10, borderRadius: 10, marginRight: 10, minWidth: 120 },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 30,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabIcon: { fontSize: 24, color: "#fff", lineHeight: 28 },
  fabLabel: { fontSize: 8, color: "#fff", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  catSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray,
  },
  catChipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.textPrimary },
  chipTextActive: { color: "#fff" },
  addBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelText: { textAlign: "center", color: colors.textSecondary },
});

export default BudgetScreen;
