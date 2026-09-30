import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Modal from "react-native-modal";
import { AppContext } from "../../context/AppContext";
import { EmptyState } from "../../components/common";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getData } from "../../utils/storageHelper";
import getStyles from "./BudgetHistory.styles";

const BudgetHistory = () => {
  const { colors, theme } = useContext(AppContext);
  const styles = useThemedStyles(getStyles);
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
          item.isCurrent && styles.cardCurrent,
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.monthTitle}>
              {item.month}
            </Text>
            <Text style={styles.subDate}>
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
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Spent
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(percentage)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: isOver ? colors.danger : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.stats}>
          <Text style={styles.statText}>
            Limit:{" "}
            <Text style={styles.statBold}>
              {currency}
              {item.totalBudget}
            </Text>
          </Text>
          <Text style={styles.statText}>
            Spent:{" "}
            <Text
              style={[
                styles.statBold,
                { color: isOver ? colors.danger : colors.textPrimary },
              ]}
            >
              {currency}
              {item.totalSpent}
            </Text>
          </Text>
        </View>

        <View style={styles.miniLog}>
          <Text style={styles.breakdownText}>
            View Breakdown →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView 
      style={styles.container} 
      edges={['left', 'right', 'bottom']}
    >
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
            <EmptyState
              icon="history"
              title="No budget history yet"
              subtitle="Previous months will appear here as you log expenses."
            />
          }
        />
      </View>

      {/* --- SWIPEABLE DETAILS MODAL --- */}
      <Modal
        isVisible={detailsVisible}
        onSwipeComplete={() => setDetailsVisible(false)}
        swipeDirection={["down"]}
        onBackdropPress={() => setDetailsVisible(false)}
        style={styles.detailModal}
        backdropOpacity={0.5}
        propagateSwipe={true}
      >
        <View style={styles.detailCard}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {selectedMonth && (
            <>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedMonth.month}
                </Text>
                <TouchableOpacity
                  onPress={() => setDetailsVisible(false)}
                  style={styles.closeBtn}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
              >
                {/* Summary Box */}
                <View style={styles.summaryBox}>
                  <Text style={styles.statText}>
                    Total Spent
                  </Text>
                  <Text
                    style={[
                      styles.bigSpent,
                      {
                        color:
                          selectedMonth.totalSpent > selectedMonth.totalBudget
                            ? colors.danger
                            : colors.primary,
                      },
                    ]}
                  >
                    {currency}
                    {selectedMonth.totalSpent}
                  </Text>
                  <Text style={[styles.subDate, { marginTop: 4 }]}>
                    Budget Limit: {currency}
                    {selectedMonth.totalBudget}
                  </Text>
                </View>

                {/* Transactions List */}
                <Text style={styles.sectionHeader}>
                  Transaction History
                </Text>

                {selectedMonth.transactions &&
                selectedMonth.transactions.length > 0 ? (
                  selectedMonth.transactions.map((tx, index) => (
                    <View
                      key={index}
                      style={styles.txRow}
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
                          <Text style={styles.txDesc}>
                            {tx.description || tx.desc}
                          </Text>
                          <Text style={styles.txDate}>
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
                  <Text style={styles.empty}>
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

export default BudgetHistory;
