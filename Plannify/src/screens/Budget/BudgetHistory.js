import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  // Modal, // Removed standard modal
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from "react-native";
import Modal from "react-native-modal"; // Enhanced Modal
import { AppContext } from "../../context/AppContext";
import { getData } from "../../utils/storageHelper";

const BudgetHistory = () => {
  const { colors, theme } = useContext(AppContext);
  const [history, setHistory] = useState([]);
  const [currency, setCurrency] = useState("$");

  // Modal State
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

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
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
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
    modalContainer: { backgroundColor: colors.background },
    txCard: { backgroundColor: colors.surface, borderColor: colors.border },
  };

  const renderMonth = ({ item }) => {
    const isOver = item.totalSpent > item.totalBudget;
    const percentage = Math.min(
      (item.totalSpent / (item.totalBudget || 1)) * 100,
      100,
    );

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openDetails(item)}
        style={[
          styles.card,
          dynamicStyles.card,
          item.isCurrent && { borderColor: colors.primary, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.monthTitle, dynamicStyles.headerText]}>
              {item.month}
            </Text>
            <Text style={[styles.subDate, dynamicStyles.subText]}>
              {item.transactions ? item.transactions.length : 0} Transactions
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: isOver
                  ? colors.danger + "20"
                  : colors.success + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isOver ? colors.danger : colors.success },
              ]}
            >
              {isOver ? "Over Budget" : "On Track"}
            </Text>
          </View>
        </View>

        {/* Progress Bar Visual */}
        <View style={{ marginTop: 15 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 5,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Spent
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textPrimary,
                fontWeight: "bold",
              }}
            >
              {Math.round(percentage)}%
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: colors.background,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${percentage}%`,
                backgroundColor: isOver ? colors.danger : colors.primary,
              }}
            />
          </View>
        </View>

        <View style={[styles.stats, { borderTopColor: colors.border }]}>
          <Text style={[styles.statText, dynamicStyles.subText]}>
            Limit:{" "}
            <Text style={{ fontWeight: "bold", color: colors.textPrimary }}>
              {currency}
              {item.totalBudget}
            </Text>
          </Text>
          <Text style={[styles.statText, dynamicStyles.subText]}>
            Spent:{" "}
            <Text
              style={{
                fontWeight: "bold",
                color: isOver ? colors.danger : colors.textPrimary,
              }}
            >
              {currency}
              {item.totalSpent}
            </Text>
          </Text>
        </View>

        <View style={styles.miniLog}>
          <Text
            style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}
          >
            View Breakdown →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.listContainer}>
        <FlatList
          data={history}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMonth}
          contentContainerStyle={{ paddingBottom: 50 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="history"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.empty, dynamicStyles.subText]}>
                No budget history yet.
              </Text>
            </View>
          }
        />
      </View>

      {/* --- SWIPEABLE DETAILS MODAL --- */}
      <Modal
        isVisible={detailsVisible}
        onSwipeComplete={() => setDetailsVisible(false)}
        swipeDirection={["down"]} // Swipe DOWN to close
        onBackdropPress={() => setDetailsVisible(false)}
        style={styles.detailModal}
        backdropOpacity={0.5}
        propagateSwipe={true} // Allow scrolling inside
      >
        <View style={[styles.detailCard, dynamicStyles.modalContainer]}>
          
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {selectedMonth && (
            <>
              {/* Modal Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, dynamicStyles.headerText]}>
                  {selectedMonth.month}
                </Text>
                <TouchableOpacity
                  onPress={() => setDetailsVisible(false)}
                  style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Summary Card */}
                <View style={[styles.summaryBox, dynamicStyles.card]}>
                  <Text style={[styles.statText, dynamicStyles.subText]}>
                    Total Spent vs Limit
                  </Text>

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
                    {currency}
                    {selectedMonth.totalSpent}
                    <Text
                      style={{
                        fontSize: 16,
                        color: colors.textSecondary,
                        fontWeight: "normal",
                      }}
                    >
                      {" "}
                      / {currency}
                      {selectedMonth.totalBudget}
                    </Text>
                  </Text>
                </View>

                <Text style={[styles.sectionHeader, dynamicStyles.subText]}>
                  Transaction History
                </Text>

                {selectedMonth.transactions &&
                selectedMonth.transactions.length > 0 ? (
                  selectedMonth.transactions.map((tx, index) => (
                    <View
                      key={index}
                      style={[styles.txRow, dynamicStyles.txCard]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <View
                          style={[
                            styles.iconBox,
                            {
                              backgroundColor:
                                tx.type === "income"
                                  ? colors.success + "20"
                                  : colors.danger + "20",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={
                              tx.type === "income"
                                ? "arrow-down-left"
                                : "arrow-up-right"
                            }
                            size={20}
                            color={
                              tx.type === "income"
                                ? colors.success
                                : colors.danger
                            }
                          />
                        </View>
                        <View>
                          <Text
                            style={[styles.txDesc, dynamicStyles.headerText]}
                          >
                            {tx.description || tx.desc}
                          </Text>
                          <Text style={[styles.txDate, dynamicStyles.subText]}>
                            {new Date(tx.date).toLocaleDateString()} • {tx.category || "General"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.txAmount,
                          {
                            color:
                              tx.type === "income"
                                ? colors.success
                                : colors.textPrimary,
                          },
                        ]}
                      >
                        {tx.type === "income" ? "+" : "-"} {currency}
                        {tx.amount}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.empty, dynamicStyles.subText]}>
                    No transactions recorded.
                  </Text>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { padding: 20 },
  card: { padding: 20, borderRadius: 24, marginBottom: 15 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  monthTitle: { fontSize: 18, fontWeight: "bold" },
  subDate: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontWeight: "bold", fontSize: 11, textTransform: "uppercase" },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  statText: { fontSize: 14 },
  miniLog: { marginTop: 15, alignItems: "flex-end" },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  empty: { textAlign: "center", marginTop: 10 },

  // Modal Styles
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 8, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  summaryBox: {
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
  },
  bigSpent: { fontSize: 32, fontWeight: "bold", marginTop: 5 },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  txDesc: { fontSize: 16, fontWeight: "600" },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: "bold" },
  
  // NEW: Swipeable Modal Styles
  detailModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    overflow: "hidden",
    width: "100%",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
    width: "100%",
    backgroundColor: "transparent",
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    opacity: 0.5,
  },
});

export default BudgetHistory;
