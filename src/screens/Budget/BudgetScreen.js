import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
// 1. Import Safe Area Insets
import { useCallback, useContext, useState } from "react";
import {
  Alert,
  // Modal, // REMOVED standard modal
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 2. Import Enhanced Modal
import Modal from "react-native-modal";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { getData, storeData } from "../../utils/storageHelper";

const BudgetScreen = () => {
  const navigation = useNavigation();
  const { colors, theme } = useContext(AppContext);

  // 3. Calculate Dynamic Spacing
  const insets = useSafeAreaInsets();
  const FLOATING_TAB_BAR_HEIGHT = 90;
  const dockPositionBottom = FLOATING_TAB_BAR_HEIGHT + insets.bottom + 10;

  const [budget, setBudget] = useState(null);

  // Modals
  const [modalVisible, setModalVisible] = useState(false); // Expense
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);

  // Form Inputs
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [payDay, setPayDay] = useState("");

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

    // Month Reset Logic
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

    // Auto-Pay Logic
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
    resetForm();
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
    resetForm();
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
    resetForm();
    loadBudget();
  };

  const resetForm = () => {
    setAmount("");
    setDesc("");
    setPayDay("");
  };

  if (!budget) return null;

  // --- CALCULATIONS ---
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

  // --- DYNAMIC STYLES ---
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
    modalContent: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.primary },
    pillInactive: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
    },
  };

  return (
    <View
      style={[
        styles.container,
        dynamicStyles.container,
        { paddingTop: insets.top },
      ]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      {/* --- TOP BAR --- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate("BudgetHistory")}
        >
          <MaterialCommunityIcons
            name="history"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, dynamicStyles.headerText]}>
          My Wallet
        </Text>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() =>
            navigation.navigate("BudgetSetup", { isEditing: true })
          }
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: dockPositionBottom + 100,
          paddingHorizontal: 20,
        }}
      >
        {/* --- MAIN BALANCE CARD --- */}
        <View style={[styles.walletCard, { backgroundColor: colors.primary }]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Available Balance
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontSize: 36,
                  fontWeight: "bold",
                  marginVertical: 5,
                }}
              >
                {budget.currency}
                {remaining.toFixed(2)}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                {budget.currentMonth}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="contactless-payment"
              size={32}
              color="rgba(255,255,255,0.6)"
            />
          </View>

          <View style={styles.walletFooter}>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                INCOME
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                +{budget.currency}
                {totalIncome}
              </Text>
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                SPENT
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                -{budget.currency}
                {totalSpent}
              </Text>
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                LIMIT
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                {budget.currency}
                {budget.totalBudget}
              </Text>
            </View>
          </View>
        </View>

        {/* --- AUTO PAY SECTION --- */}
        {budget.recurringPayments && budget.recurringPayments.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, dynamicStyles.headerText]}>
              Upcoming Bills
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
            >
              {budget.recurringPayments.map((rp) => (
                <View key={rp.id} style={[styles.billChip, dynamicStyles.card]}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={[styles.billName, dynamicStyles.headerText]}>
                      {rp.desc}
                    </Text>
                    <Text style={[styles.billDetail, dynamicStyles.subText]}>
                      Day {rp.day} • {budget.currency}
                      {rp.amount}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* --- BREAKDOWN SECTION --- */}
        {hasCategories && (
          <>
            <Text style={[styles.sectionTitle, dynamicStyles.headerText]}>
              Spending Breakdown
            </Text>
            {budget.categories.map((item) => {
              const percent = item.limit > 0 ? item.spent / item.limit : 0;
              const isOver = percent >= 1;
              return (
                <View
                  key={item.id}
                  style={[styles.categoryRow, dynamicStyles.card]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <Text style={[styles.catName, dynamicStyles.headerText]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.catVal, dynamicStyles.subText]}>
                      <Text
                        style={{
                          fontWeight: "bold",
                          color: isOver ? colors.danger : colors.textPrimary,
                        }}
                      >
                        {budget.currency}
                        {item.spent}
                      </Text>{" "}
                      / {budget.currency}
                      {item.limit}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(percent * 100, 100)}%`,
                          backgroundColor: isOver
                            ? colors.danger
                            : colors.success,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* --- RECENT TRANSACTIONS --- */}
        <Text
          style={[
            styles.sectionTitle,
            dynamicStyles.headerText,
            { marginTop: 20 },
          ]}
        >
          Recent Activity
        </Text>
        {budget.transactions && budget.transactions.length > 0 ? (
          budget.transactions.slice(0, 5).map((tx) => (
            <View key={tx.id} style={[styles.txRow, dynamicStyles.card]}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor:
                        tx.type === "credit"
                          ? colors.success + "20"
                          : colors.danger + "20",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                    size={18}
                    color={
                      tx.type === "credit" ? colors.success : colors.danger
                    }
                  />
                </View>
                <View>
                  <Text style={[styles.txDesc, dynamicStyles.headerText]}>
                    {tx.desc}
                  </Text>
                  <Text style={[styles.txDate, dynamicStyles.subText]}>
                    {tx.date}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  color:
                    tx.type === "credit" ? colors.success : colors.textPrimary,
                }}
              >
                {tx.type === "credit" ? "+" : "-"}
                {budget.currency}
                {tx.amount}
              </Text>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", marginTop: 20, opacity: 0.6 }}>
            <MaterialCommunityIcons
              name="receipt"
              size={40}
              color={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, marginTop: 5 }}>
              No transactions yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* --- FLOATING ACTION DOCK --- */}
      <View
        style={[
          styles.dockContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            bottom: dockPositionBottom,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => setRecurringModalVisible(true)}
        >
          <View style={[styles.dockIcon, { backgroundColor: "#A855F7" }]}>
            <MaterialCommunityIcons
              name="flash"
              size={20}
              color={colors.white}
            />
          </View>
          <Text style={[styles.dockLabel, dynamicStyles.subText]}>
            Auto-Pay
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => setIncomeModalVisible(true)}
        >
          <View style={[styles.dockIcon, { backgroundColor: colors.success }]}>
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={colors.white}
            />
          </View>
          <Text style={[styles.dockLabel, dynamicStyles.subText]}>Income</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => setModalVisible(true)}
        >
          <View style={[styles.dockIcon, { backgroundColor: colors.danger }]}>
            <MaterialCommunityIcons
              name="minus"
              size={20}
              color={colors.white}
            />
          </View>
          <Text style={[styles.dockLabel, dynamicStyles.subText]}>Expense</Text>
        </TouchableOpacity>
      </View>

      {/* --- 1. ADD EXPENSE MODAL (Slide Up) --- */}
      <Modal
        isVisible={modalVisible}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={false} // HOPEFULL KEYBOARD FIX
        backdropOpacity={0.7}
      >
        <View style={[styles.bottomModalContent, dynamicStyles.modalContent]}>
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: colors.border }]}
            />
          </View>

          <Text style={[styles.modalTitle, dynamicStyles.headerText]}>
            Add Expense
          </Text>

          <TextInput
            placeholder="Description (e.g. Coffee)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, dynamicStyles.input]}
            value={desc}
            onChangeText={setDesc}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[styles.input, dynamicStyles.input]}
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
                    selectedCat === cat.name
                      ? dynamicStyles.pillActive
                      : dynamicStyles.pillInactive,
                  ]}
                  onPress={() => setSelectedCat(cat.name)}
                >
                  <Text
                    style={{
                      color:
                        selectedCat === cat.name
                          ? colors.white
                          : colors.textSecondary,
                      fontWeight: "600",
                    }}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.danger }]}
              onPress={handleAddTransaction}
            >
              <Text style={styles.saveBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- 2. ADD INCOME MODAL (Slide Up) --- */}
      <Modal
        isVisible={incomeModalVisible}
        onSwipeComplete={() => setIncomeModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setIncomeModalVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={true}
        backdropOpacity={0.7}
      >
        <View style={[styles.bottomModalContent, dynamicStyles.modalContent]}>
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: colors.border }]}
            />
          </View>

          <Text style={[styles.modalTitle, { color: colors.success }]}>
            Add Income
          </Text>

          <TextInput
            placeholder="Source (e.g. Salary)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, dynamicStyles.input]}
            value={desc}
            onChangeText={setDesc}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[styles.input, dynamicStyles.input]}
            value={amount}
            onChangeText={setAmount}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setIncomeModalVisible(false)}>
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.success }]}
              onPress={handleAddIncome}
            >
              <Text style={styles.saveBtnText}>Add Income</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- 3. ADD AUTO-PAY MODAL (Slide Up) --- */}
      <Modal
        isVisible={recurringModalVisible}
        onSwipeComplete={() => setRecurringModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setRecurringModalVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={true}
        backdropOpacity={0.7}
      >
        <View style={[styles.bottomModalContent, dynamicStyles.modalContent]}>
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: colors.border }]}
            />
          </View>

          <Text style={[styles.modalTitle, { color: "#A855F7" }]}>
            Setup Auto-Pay
          </Text>
          <Text style={[styles.modalSub, dynamicStyles.subText]}>
            This will automatically deduct from your budget on the specified day
            every month.
          </Text>

          <TextInput
            placeholder="Service Name (e.g. Netflix)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, dynamicStyles.input]}
            value={desc}
            onChangeText={setDesc}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[styles.input, dynamicStyles.input]}
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            placeholder="Day of Month (1-31)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[styles.input, dynamicStyles.input]}
            value={payDay}
            onChangeText={setPayDay}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setRecurringModalVisible(false)}>
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#A855F7" }]}
              onPress={handleAddRecurring}
            >
              <Text style={styles.saveBtnText}>Save Auto-Pay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  iconBtn: {
    padding: 10,
    borderRadius: 12,
    elevation: 2,
  },
  walletCard: {
    padding: 25,
    borderRadius: 24,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    height: 180,
    justifyContent: "space-between",
  },
  walletFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },

  // Bills
  billChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    minWidth: 160,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  billName: { fontWeight: "bold", fontSize: 14 },
  billDetail: { fontSize: 11 },

  // Categories
  categoryRow: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  catName: { fontSize: 15, fontWeight: "600" },
  catVal: { fontSize: 12 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },

  // Transactions
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  txDesc: { fontSize: 15, fontWeight: "600" },
  txDate: { fontSize: 12, marginTop: 2 },

  // Dock
  dockContainer: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    gap: 15,
  },
  dockItem: { alignItems: "center", width: 60 },
  dockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  dockLabel: { fontSize: 10, fontWeight: "600" },
  divider: {
    width: 1,
    height: "80%",
    backgroundColor: "#eee",
    alignSelf: "center",
  },

  // --- NEW MODAL STYLES ---
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  bottomModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    paddingBottom: 40,
    borderWidth: 1,
  },
  dragHandleContainer: {
    alignItems: "center",
    marginBottom: 15,
    marginTop: -10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  modalSub: { textAlign: "center", marginBottom: 20, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  catSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 20,
    marginTop: 10,
  },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
  cancelText: { fontWeight: "600" },
});

export default BudgetScreen;
