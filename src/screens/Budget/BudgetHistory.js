import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../../constants/colors";
import { AppContext } from "../../context/AppContext";
import { getData } from "../../utils/storageHelper";

const BudgetHistory = () => {
  const { theme } = useContext(AppContext);
  const [history, setHistory] = useState([]);
  const [currency, setCurrency] = useState("$");

  // Modal State
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const isDark = theme === "dark";
  const containerStyle = {
    backgroundColor: isDark ? "#121212" : colors.background,
  };
  const cardStyle = { backgroundColor: isDark ? "#1e1e1e" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : colors.textPrimary };
  const subTextStyle = { color: isDark ? "#aaa" : colors.textSecondary };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await getData("budget_data");
    if (data) {
      setCurrency(data.currency);
      let pastHistory = data.history ? [...data.history].reverse() : [];

      // Calculate current spent
      let currentSpent = 0;
      if (data.categories && data.categories.length > 0) {
        currentSpent = data.categories.reduce((acc, c) => acc + c.spent, 0);
      } else if (data.transactions) {
        currentSpent = data.transactions
          .filter((t) => t.type !== "credit")
          .reduce((acc, t) => acc + t.amount, 0);
      }

      const currentMonthLog = {
        month: `${data.currentMonth} (Current)`,
        totalBudget: data.totalBudget,
        totalSpent: currentSpent,
        transactions: data.transactions || [],
        isCurrent: true,
      };

      setHistory([currentMonthLog, ...pastHistory]);
    }
  };

  const openDetails = (item) => {
    setSelectedMonth(item);
    setDetailsVisible(true);
  };

  const renderMonth = ({ item }) => {
    const isOver = item.totalSpent > item.totalBudget;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openDetails(item)}
        style={[
          styles.card,
          cardStyle,
          item.isCurrent && { borderWidth: 1, borderColor: colors.primary },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.monthTitle, textStyle]}>{item.month}</Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: isOver ? "#ffebee" : "#e0f2f1" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isOver ? colors.danger : colors.success },
              ]}
            >
              {isOver ? "Over Budget" : "Under Budget"}
            </Text>
          </View>
        </View>

        <View style={[styles.stats, { borderColor: isDark ? "#333" : "#eee" }]}>
          <Text style={[styles.statText, subTextStyle]}>
            Limit: {currency}
            {item.totalBudget}
          </Text>
          <Text
            style={[
              styles.statText,
              {
                fontWeight: "bold",
                color: isDark ? "#fff" : colors.textPrimary,
              },
            ]}
          >
            Spent: {currency}
            {item.totalSpent}
          </Text>
        </View>

        <View style={styles.miniLog}>
          <Text style={[styles.miniLogTitle, subTextStyle]}>
            Tap to view full details
          </Text>
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 5 }}>
            View All Transactions →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <FlatList
        data={history}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderMonth}
        ListEmptyComponent={
          <Text style={[styles.empty, subTextStyle]}>No history yet.</Text>
        }
      />

      {/* --- FULL DETAILS MODAL --- */}
      <Modal
        visible={detailsVisible}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={[styles.modalContainer, containerStyle]}>
          {selectedMonth && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setDetailsVisible(false)}
                  style={styles.closeBtn}
                >
                  <Text style={{ fontSize: 24, color: textStyle.color }}>
                    ✕
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, textStyle]}>
                  {selectedMonth.month}
                </Text>
                <View style={{ width: 30 }} />
              </View>

              <View style={[styles.summaryBox, cardStyle]}>
                <Text style={[styles.statText, subTextStyle]}>
                  Total Limit: {currency}
                  {selectedMonth.totalBudget}
                </Text>

                {/* DYNAMIC LABEL: Overbudget vs Underbudget */}
                <Text
                  style={[
                    styles.bigSpent,
                    {
                      color:
                        selectedMonth.totalSpent > selectedMonth.totalBudget
                          ? colors.danger
                          : colors.success,
                    },
                  ]}
                >
                  {selectedMonth.totalSpent > selectedMonth.totalBudget
                    ? "Overbudget"
                    : "Underbudget"}
                  : {currency}
                  {selectedMonth.totalSpent}
                </Text>
              </View>

              <Text style={[styles.sectionHeader, subTextStyle]}>
                Transaction History
              </Text>

              <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                {selectedMonth.transactions &&
                selectedMonth.transactions.length > 0 ? (
                  selectedMonth.transactions.map((tx, index) => (
                    <View key={index} style={[styles.txRow, cardStyle]}>
                      <View>
                        <Text style={[styles.txDesc, textStyle]}>
                          {tx.desc}
                        </Text>
                        <Text style={[styles.txDate, subTextStyle]}>
                          {tx.date} • {tx.category}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.txAmount,
                          {
                            color:
                              tx.type === "credit"
                                ? colors.success
                                : colors.danger,
                          },
                        ]}
                      >
                        {tx.type === "credit" ? "+" : "-"}
                        {currency}
                        {tx.amount}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.empty, subTextStyle]}>
                    No transactions found for this month.
                  </Text>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  monthTitle: { fontSize: 18, fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontWeight: "bold", fontSize: 12 },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  statText: { fontSize: 14 },
  miniLog: { marginTop: 5 },
  miniLogTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 50 },

  // Modal Styles
  modalContainer: { flex: 1, padding: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: { padding: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  summaryBox: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  bigSpent: { fontSize: 24, fontWeight: "bold", marginTop: 5 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 5,
  },

  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  txDesc: { fontSize: 16, fontWeight: "500" },
  txDate: { fontSize: 12, marginTop: 4 },
  txAmount: { fontSize: 16, fontWeight: "bold" },
});

export default BudgetHistory;
