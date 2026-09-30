import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { useAlert } from "../../context/AlertContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { scheduleAutoPayNotification } from "../../services/NotificationService";
import { getData, storeData } from "../../utils/storageHelper";
import getStyles from "./BudgetScreen.styles";

const BudgetScreen = () => {
  const navigation = useNavigation();
  const { colors, theme, syncNow, lastRefreshed, appStyles } = useContext(AppContext);
  const { showAlert } = useAlert();
  const styles = useThemedStyles(getStyles);

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
  const [editingRecurringId, setEditingRecurringId] = useState(null);

  const loadBudget = useCallback(async () => {
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
      if (data.currentMonth) {
        const oldTransactions = data.transactions || [];
        let oldSpent = 0;
        if (data.categories && data.categories.length > 0) {
          oldSpent = data.categories.reduce((acc, c) => acc + c.spent, 0);
        } else {
          oldSpent = oldTransactions
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
        }

        const historyLog = {
          month: data.currentMonth,
          totalBudget: data.totalBudget,
          totalSpent: oldSpent,
          transactions: oldTransactions,
        };

        data.history = [...(data.history || []), historyLog];
      }

      data.currentMonth = realMonth;
      if (data.categories) {
        data.categories = data.categories.map((c) => ({ ...c, spent: 0 }));
      }
      data.transactions = [];
      data.updatedAt = new Date();

      await storeData("budget_data", data);
      syncNow();
    }

    // Auto-Pay Logic
    let autoPaidItems = [];
    const todayDay = new Date().getDate();

    if (data.recurringPayments) {
      const updatedPayments = [];

      for (let rp of data.recurringPayments) {
        if (!rp.notificationId) {
          const notifId = await scheduleAutoPayNotification(rp.desc, rp.amount, rp.day, data.currency);
          if (notifId) rp.notificationId = notifId;
        }

        if (rp.lastPaidMonth !== realMonth && todayDay >= rp.day) {
          const newTx = {
            _id: new Date().getTime().toString() + Math.random(),
            description: `⚡ Auto: ${rp.desc}`,
            amount: rp.amount,
            category: "Recurring",
            type: "expense",
            date: new Date(),
            updatedAt: new Date(),
          };
          data.transactions.unshift(newTx);
          autoPaidItems.push(rp.desc);
          rp.lastPaidMonth = realMonth;
        }
        updatedPayments.push(rp);
      }
      data.recurringPayments = updatedPayments;
    }

    if (autoPaidItems.length > 0 || data.recurringPayments) {
      await storeData("budget_data", data);
      syncNow();
      if (autoPaidItems.length > 0)
        showAlert("⚡ Auto-Pay Executed", `Paid: ${autoPaidItems.join(", ")}`);
    }

    setBudget(data);
    if (data.categories && data.categories.length > 0)
      setSelectedCat(data.categories[0].name);
    else setSelectedCat("General");
  }, [navigation, showAlert, syncNow]);

  useFocusEffect(
    useCallback(() => {
      loadBudget();
    }, [loadBudget])
  );

  useEffect(() => {
    if (lastRefreshed) {
      loadBudget();
    }
  }, [lastRefreshed, loadBudget]);

  const handleAddTransaction = async () => {
    if (!amount || !desc) return;
    const val = parseFloat(amount);
    const newBudget = { ...budget };

    const newTx = {
      _id: new Date().getTime().toString(),
      description: desc,
      amount: val,
      category: selectedCat || "General",
      type: "expense",
      date: new Date(),
      updatedAt: new Date(),
    };

    newBudget.transactions = [newTx, ...newBudget.transactions];

    if (newBudget.categories) {
      newBudget.categories = newBudget.categories.map((cat) => {
        if (cat.name === selectedCat) return { ...cat, spent: cat.spent + val };
        return cat;
      });
    }

    newBudget.updatedAt = new Date();
    await storeData("budget_data", newBudget);
    syncNow();
    setBudget(newBudget);
    setModalVisible(false);
    resetForm();
  };

  const handleAddIncome = async () => {
    if (!amount || !desc) return;
    const val = parseFloat(amount);
    const newBudget = { ...budget };

    const newTx = {
      _id: new Date().getTime().toString(),
      description: desc,
      amount: val,
      category: "Income",
      type: "income",
      date: new Date(),
      updatedAt: new Date(),
    };

    newBudget.transactions = [newTx, ...newBudget.transactions];
    newBudget.updatedAt = new Date();

    await storeData("budget_data", newBudget);
    syncNow();
    setBudget(newBudget);
    setIncomeModalVisible(false);
    resetForm();
  };

  const handleAddRecurring = async () => {
    if (!amount || !desc || !payDay) return;
    const day = parseInt(payDay);
    if (day < 1 || day > 31) {
      showAlert("Invalid Day", "Day must be between 1 and 31");
      return;
    }

    const newBudget = { ...budget };
    const notifId = await scheduleAutoPayNotification(
      desc,
      parseFloat(amount),
      day,
      newBudget.currency
    );

    if (editingRecurringId) {
      newBudget.recurringPayments = newBudget.recurringPayments.map((rp) => {
        if (rp.id === editingRecurringId) {
          return {
            ...rp,
            desc,
            amount: parseFloat(amount),
            day,
            notificationId: notifId || rp.notificationId,
          };
        }
        return rp;
      });
    } else {
      const newRecurring = {
        id: Date.now(),
        desc,
        amount: parseFloat(amount),
        day,
        lastPaidMonth: "",
        notificationId: notifId,
      };
      newBudget.recurringPayments = [
        ...(newBudget.recurringPayments || []),
        newRecurring,
      ];
    }

    newBudget.updatedAt = new Date();
    await storeData("budget_data", newBudget);
    syncNow();
    setBudget(newBudget);
    setRecurringModalVisible(false);
    resetForm();
    loadBudget();
  };

  const resetForm = () => {
    setAmount("");
    setDesc("");
    setPayDay("");
    setEditingRecurringId(null);
  };

  if (!budget) return null;

  const hasCategories = budget.categories && budget.categories.length > 0;

  const totalSpent = hasCategories
    ? budget.categories.reduce((acc, item) => acc + (parseFloat(item.spent) || 0), 0)
    : budget.transactions
        .filter((t) => t.type === "expense")
        .reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);

  const totalIncome = budget.transactions
    .filter((t) => t.type === "income")
    .reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);

  const remaining = (parseFloat(budget.totalBudget) || 0) + totalIncome - totalSpent;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("BudgetHistory")}
        >
          <MaterialCommunityIcons
            name="history"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, appStyles.headerTitleStyle]}>
          My Wallet
        </Text>

        <TouchableOpacity
          style={styles.iconBtn}
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
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletBalanceLabel}>
                Available Balance
              </Text>
              <Text style={styles.walletBalanceValue}>
                {budget.currency}
                {remaining.toFixed(2)}
              </Text>
              <Text style={styles.walletMonth}>
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
              <Text style={styles.walletStatLabel}>
                INCOME
              </Text>
              <Text style={styles.walletStatValue}>
                +{budget.currency}
                {totalIncome}
              </Text>
            </View>
            <View>
              <Text style={styles.walletStatLabel}>
                SPENT
              </Text>
              <Text style={styles.walletStatValue}>
                -{budget.currency}
                {totalSpent}
              </Text>
            </View>
            <View>
              <Text style={styles.walletStatLabel}>
                LIMIT
              </Text>
              <Text style={styles.walletStatValue}>
                {budget.currency}
                {budget.totalBudget}
              </Text>
            </View>
          </View>
        </View>

        {/* --- AUTO PAY SECTION --- */}
        {budget.recurringPayments && budget.recurringPayments.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>
              Upcoming Bills
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.upcomingBillsScroll}
            >
              {budget.recurringPayments.map((rp) => (
                <TouchableOpacity
                  key={rp.id}
                  style={styles.billChip}
                  onPress={() => {
                    setEditingRecurringId(rp.id);
                    setDesc(rp.desc);
                    setAmount(rp.amount.toString());
                    setPayDay(rp.day.toString());
                    setRecurringModalVisible(true);
                  }}
                >
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.billName}>
                      {rp.desc}
                    </Text>
                    <Text style={styles.billDetail}>
                      Day {rp.day} • {budget.currency}
                      {rp.amount}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* --- BREAKDOWN SECTION --- */}
        {hasCategories && (
          <>
            <Text style={styles.sectionTitle}>
              Spending Breakdown
            </Text>
            {budget.categories.map((item) => {
              const percent = item.limit > 0 ? item.spent / item.limit : 0;
              const isOver = percent >= 1;
              return (
                <View
                  key={item.id}
                  style={styles.categoryRow}
                >
                  <View style={styles.categoryHeader}>
                    <Text style={styles.catName}>
                      {item.name}
                    </Text>
                    <Text style={styles.catVal}>
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

                  <View style={styles.progressBarBg}>
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
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Recent Activity
        </Text>
        {budget.transactions && budget.transactions.length > 0 ? (
          budget.transactions.map((tx) => (
            <View key={tx._id || tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor:
                        tx.type === "income"
                          ? colors.success + "20"
                          : colors.danger + "20",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={tx.type === "income" ? "arrow-down" : "arrow-up"}
                    size={18}
                    color={
                      tx.type === "income" ? colors.success : colors.danger
                    }
                  />
                </View>
                <View>
                  <Text style={styles.txDesc}>
                    {tx.description || tx.desc}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  {
                    color:
                      tx.type === "income" ? colors.success : colors.textPrimary,
                  },
                ]}
              >
                {tx.type === "income" ? "+" : "-"}
                {budget.currency}
                {tx.amount}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyTx}>
            <MaterialCommunityIcons
              name="receipt"
              size={40}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTxText}>
              No transactions yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* --- FLOATING ACTION DOCK --- */}
      <View
        style={[
          styles.dockContainer,
          { bottom: dockPositionBottom },
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
          <Text style={styles.dockLabel}>
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
          <Text style={styles.dockLabel}>Income</Text>
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
          <Text style={styles.dockLabel}>Expense</Text>
        </TouchableOpacity>
      </View>

      {/* EXPENSE MODAL */}
      <Modal
        isVisible={modalVisible}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={false}
        backdropOpacity={0.7}
      >
        <View style={styles.bottomModalContent}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={styles.modalTitle}>
            Add Expense
          </Text>

          <TextInput
            placeholder="Description (e.g. Coffee)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={desc}
            onChangeText={setDesc}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
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
                      styles.catChipText,
                      selectedCat === cat.name && styles.catChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>
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

      {/* INCOME MODAL */}
      <Modal
        isVisible={incomeModalVisible}
        onSwipeComplete={() => setIncomeModalVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setIncomeModalVisible(false)}
        style={styles.bottomModal}
        avoidKeyboard={true}
        backdropOpacity={0.7}
      >
        <View style={styles.bottomModalContent}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={[styles.modalTitle, { color: colors.success }]}>
            Add Income
          </Text>

          <TextInput
            placeholder="Source (e.g. Salary)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={desc}
            onChangeText={setDesc}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setIncomeModalVisible(false)}>
              <Text style={styles.cancelText}>
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

      {/* AUTO PAY MODAL */}
      <Modal
        isVisible={recurringModalVisible}
        onSwipeComplete={() => {
          setRecurringModalVisible(false);
          resetForm();
        }}
        swipeDirection={["down"]}
        onBackdropPress={() => {
          setRecurringModalVisible(false);
          resetForm();
        }}
        style={styles.bottomModal}
        avoidKeyboard={true}
        backdropOpacity={0.7}
      >
        <View style={styles.bottomModalContent}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={[styles.modalTitle, { color: "#A855F7" }]}>
            Setup Auto-Pay
          </Text>
          <Text style={styles.modalSub}>
            This will automatically deduct from your budget on the specified day
            every month.
          </Text>

          <TextInput
            placeholder="Service Name (e.g. Netflix)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={desc}
            onChangeText={setDesc}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            placeholder="Day of Month (1-31)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
            value={payDay}
            onChangeText={setPayDay}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => {
                setRecurringModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelText}>
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

export default BudgetScreen;