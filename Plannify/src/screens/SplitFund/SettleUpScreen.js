import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { AppContext } from '../../context/AppContext';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SplitService } from '../../services/SplitService';
import { simplifyDebts } from '../../utils/SplitLogic';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SettleUpScreen = ({ route }) => {
    const { colors, theme, user } = useContext(AppContext);
    const { showAlert } = useAlert();
    // Initial balances from params, but we will refresh them locally too
    const { groupId, balances: initialBalances, members } = route.params;
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [balances, setBalances] = useState(initialBalances);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Get user ID consistently - prioritize _id (Mongo) over id (Google)
    const currentUserId = user?.user?._id || user?.user?.id || 'local_user';

    // Initial Load & Refresh Logic
    useEffect(() => {
        if (balances) {
            calculateSuggestions(balances);
        }
    }, [balances]);

    const calculateSuggestions = (currentBalances) => {
        const simplified = simplifyDebts(currentBalances);
        setSuggestions(simplified);
    };

    const fetchLatestBalances = async () => {
        setRefreshing(true);
        try {
            // Determine token (null if offline)
            const isOffline = groupId && groupId.toString().startsWith('local_');
            const token = isOffline ? null : user?.idToken;
            
            const newBalances = await SplitService.calculateBalances(token, groupId);
            setBalances(newBalances);
        } catch (error) {
            console.error("Failed to refresh balances:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSettleDebt = (debt) => {
        const { from, to, amount } = debt;
        // DIRECT PROCESSING - No confirmation popup
        processPayment(from, to, amount);
    };

    const processPayment = async (payerId, payeeId, amountAmount) => {
        if (!user?.idToken && !groupId.toString().startsWith('local_')) {
            showAlert("Error", "You must be logged in to record payments.");
            return;
        }

        setLoading(true);
        try {
             // Determine token
            const isOffline = groupId && groupId.toString().startsWith('local_');
            const token = isOffline ? null : user?.idToken;

            // A Payment is just an expense where Payer pays explicitly for Payee
            await SplitService.addExpense(token, {
                groupId,
                description: 'Settlement',
                amount: parseFloat(amountAmount),
                paidBy: payerId,
                splitType: 'Payment',
                splits: { [payeeId]: parseFloat(amountAmount) }, 
                type: 'payment', // Mark as payment type
                date: new Date()
            });
            
            // Refund/Refresh logic
            // We fetch the latest balances to update the list immediately
            await fetchLatestBalances();
            await fetchLatestBalances();
            // showAlert("Success", "Payment recorded! List updated."); // Removed per user request

        } catch (e) {
            console.error(e);
            showAlert("Error", "Could not record payment.");
        } finally {
            setLoading(false);
        }
    };
    
    // Helper to get consistent name
    const getName = (id) => {
        const targetId = String(id);
        const myIdStr = String(currentUserId);

        if (targetId === myIdStr) return 'You';
        
        const member = members.find(m => String(m._id || m.id) === targetId);
        if (member && String(member._id || member.id) === myIdStr) return 'You';

        return member?.name || 'Unknown';
    };

    // Helper to get Avatar
    const getAvatar = (id) => {
        const targetId = String(id);
        const member = members.find(m => String(m._id || m.id) === targetId);
        return member?.avatar || null;
    };

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.textPrimary },
        subText: { color: colors.textSecondary },
        card: { backgroundColor: colors.surface, borderColor: colors.border },
        highlight: { color: colors.primary },
    };

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            {/* Refresh Indicator */}
            {refreshing && (
                <View style={{ padding: 10 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                
                <Text style={[styles.title, dynamicStyles.text]}>Outstanding Debts</Text>
                <Text style={[styles.subtitle, dynamicStyles.subText]}>
                    Below is the most efficient way to settle all group debts.
                </Text>

                {suggestions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.success} />
                        <Text style={[styles.emptyText, dynamicStyles.text]}>All settled up!</Text>
                        <Text style={[styles.emptySub, dynamicStyles.subText]}>No one owes anything in this group.</Text>
                    </View>
                ) : (
                    suggestions.map((s, index) => {
                         const isMyDebt = String(s.from) === String(currentUserId);
                         const isOwedToMe = String(s.to) === String(currentUserId);
                         
                         return (
                            <View 
                                key={index} 
                                style={[styles.debtCard, dynamicStyles.card]}
                            >
                                <View style={styles.debtInfo}>
                                    <View style={styles.avatarRow}>
                                        {/* Payer Avatar */}
                                        <View style={[styles.avatar, { backgroundColor: colors.danger + '20' }]}>
                                             <Text style={{ color: colors.danger, fontWeight: 'bold' }}>
                                                 {getName(s.from)[0]}
                                             </Text>
                                        </View>
                                        <MaterialCommunityIcons name="arrow-right-thin" size={24} color={colors.textSecondary} style={{ marginHorizontal: 8 }} />
                                        {/* Payee Avatar */}
                                        <View style={[styles.avatar, { backgroundColor: colors.success + '20' }]}>
                                             <Text style={{ color: colors.success, fontWeight: 'bold' }}>
                                                 {getName(s.to)[0]}
                                             </Text>
                                        </View>
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <Text style={[dynamicStyles.text, { fontSize: 16 }]}>
                                            <Text style={{ fontWeight: 'bold' }}>{getName(s.from)}</Text> owes <Text style={{ fontWeight: 'bold' }}>{getName(s.to)}</Text>
                                        </Text>
                                        <Text style={[styles.amountText, { color: colors.textPrimary }]}>
                                            {colors.currency}{s.amount}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={[
                                        styles.settleBtn, 
                                        { backgroundColor: isMyDebt ? colors.primary : colors.surfaceHighlight }
                                    ]}
                                    onPress={() => handleSettleDebt(s)}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={isMyDebt ? 'white' : colors.textPrimary} size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons 
                                                name="check" 
                                                size={16} 
                                                color={isMyDebt ? 'white' : colors.primary} 
                                            />
                                            <Text style={{ 
                                                color: isMyDebt ? 'white' : colors.primary, 
                                                fontWeight: 'bold', 
                                                marginLeft: 4 
                                            }}>
                                                Settle
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
    subtitle: { fontSize: 14, marginBottom: 25 },
    
    debtCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 15,
    },
    debtInfo: { flex: 1, marginRight: 10 },
    avatarRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    
    amountText: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
    
    settleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 90,
        justifyContent: 'center'
    },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
    emptySub: { fontSize: 14, marginTop: 5 }
});

export default SettleUpScreen;
