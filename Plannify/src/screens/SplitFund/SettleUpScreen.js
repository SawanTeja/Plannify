import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { AppContext } from '../../context/AppContext';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SplitService } from '../../services/SplitService';
import { simplifyDebts } from '../../utils/SplitLogic';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { getStyles } from './SettleUpScreen.styles';

const SettleUpScreen = ({ route }) => {
    const { colors, user } = useContext(AppContext);
    const styles = useThemedStyles(getStyles);
    const { showAlert } = useAlert();
    // Initial balances from params, but we will refresh them locally too
    const { groupId, balances: initialBalances, members } = route.params;

    const [balances, setBalances] = useState(initialBalances);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Get user ID consistently - prioritize _id (Mongo) over id (Google)
    const currentUserId = user?.user?._id || user?.user?.id || 'local_user';

    const calculateSuggestions = useCallback((currentBalances) => {
        const simplified = simplifyDebts(currentBalances);
        setSuggestions(simplified);
    }, []);

    // Initial Load & Refresh Logic
    useEffect(() => {
        if (balances) {
            calculateSuggestions(balances);
        }
    }, [balances, calculateSuggestions]);

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
            
            // Refresh balances to update the list immediately
            await fetchLatestBalances();
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

    return (
        <View style={styles.container}>
            {/* Refresh Indicator */}
            {refreshing && (
                <View style={styles.refreshContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <Text style={styles.title}>Outstanding Debts</Text>
                <Text style={styles.subtitle}>
                    Below is the most efficient way to settle all group debts.
                </Text>

                {suggestions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.success} />
                        <Text style={styles.emptyText}>All settled up!</Text>
                        <Text style={styles.emptySub}>No one owes anything in this group.</Text>
                    </View>
                ) : (
                    suggestions.map((s, index) => {
                         const isMyDebt = String(s.from) === String(currentUserId);
                         
                         return (
                            <View 
                                key={index} 
                                style={styles.debtCard}
                            >
                                <View style={styles.debtInfo}>
                                    <View style={styles.avatarRow}>
                                        {/* Payer Avatar */}
                                        <View style={[styles.avatar, styles.avatarPayer]}>
                                             <Text style={styles.avatarTextDanger}>
                                                 {getName(s.from)[0]}
                                             </Text>
                                        </View>
                                        <MaterialCommunityIcons name="arrow-right-thin" size={24} color={colors.textSecondary} style={styles.arrowIcon} />
                                        {/* Payee Avatar */}
                                        <View style={[styles.avatar, styles.avatarPayee]}>
                                             <Text style={styles.avatarTextSuccess}>
                                                 {getName(s.to)[0]}
                                             </Text>
                                        </View>
                                    </View>

                                    <View style={styles.debtDetail}>
                                        <Text style={styles.debtDescription}>
                                            <Text style={styles.boldText}>{getName(s.from)}</Text> owes <Text style={styles.boldText}>{getName(s.to)}</Text>
                                        </Text>
                                        <Text style={styles.amountText}>
                                            {colors.currency}{s.amount}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={[
                                        styles.settleBtn, 
                                        isMyDebt ? styles.settleBtnActive : styles.settleBtnInactive
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
                                            <Text style={isMyDebt ? styles.settleBtnTextActive : styles.settleBtnTextInactive}>
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

export default SettleUpScreen;
