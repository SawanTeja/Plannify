import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, RefreshControl, Clipboard, Alert, ScrollView } from 'react-native';
import { AppContext } from '../../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SplitService } from '../../services/SplitService';

const GroupScreen = ({ route }) => {
    const { colors, theme, userData, user } = useContext(AppContext);
    const { groupId, groupName } = route.params;
    const navigation = useNavigation();
    
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [group, setGroup] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadGroupData();
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            title: groupName || 'Group',
            headerRight: () => (
                <TouchableOpacity onPress={copyCode}>
                    <MaterialCommunityIcons name="content-copy" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
            )
        });
    }, [group]);

    const loadGroupData = async () => {
        if (!user?.idToken) return;

        setIsRefreshing(true);
        try {
            // Fetch all groups to find current one (could be optimized with getGroupById endpoint)
            const allGroups = await SplitService.getGroups(user.idToken);
            const currentGroup = allGroups.find(g => g._id === groupId); // Use _id from backend
            setGroup(currentGroup);

            const exp = await SplitService.getExpenses(user.idToken, groupId);
            setExpenses(exp);

            const bals = await SplitService.calculateBalances(user.idToken, groupId);
            setBalances(bals);

        } catch (e) {
            console.error("Error loading group details", e);
            Alert.alert("Error", "Could not load group data.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const copyCode = () => {
        if (group?.inviteCode) {
            Clipboard.setString(group.inviteCode);
            Alert.alert("Copied!", `Group code ${group.inviteCode} copied to clipboard.`);
        }
    };

    // Helper to format currency
    const formatMoney = (amount) => {
        return `${colors.currency || '₹'}${Math.abs(amount).toFixed(2)}`;
    };

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.textPrimary },
        subText: { color: colors.textSecondary },
        card: { backgroundColor: colors.surface, borderColor: colors.border },
    };

    const renderExpenseItem = ({ item }) => {
        // Backend stores paidBy as User ID
        const myId = user.user?.id || user.user?._id;
        const isPayer = item.paidBy === myId;
        const month = new Date(item.date).toLocaleString('default', { month: 'short', day: 'numeric' });
        
        return (
            <TouchableOpacity style={[styles.expenseItem, dynamicStyles.card]}>
                <View style={styles.dateBox}>
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>{month}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.expDesc, dynamicStyles.text]}>{item.description}</Text>
                    <Text style={[styles.expPayer, dynamicStyles.subText]}>
                        {isPayer ? 'You' : 'Someone'} paid {formatMoney(item.amount)}
                    </Text>
                </View>
                <View>
                    <Text style={[styles.expAmount, { color: isPayer ? colors.success : colors.danger }]}>
                        {isPayer ? 'you lent' : 'you borrowed'}
                    </Text>
                    <Text style={[styles.expVal, { color: isPayer ? colors.success : colors.danger }]}>
                         {/* This is simplified visual; real owed calculation per expense is complex */}
                         {formatMoney(item.amount / (group?.members?.length || 2))}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            {/* BALANCES HEADER */}
            {group && (
                <View style={[styles.headerCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <Text style={[styles.groupCode, { color: colors.primary }]}>Invite Code: {group.inviteCode}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                         {Object.entries(balances).map(([uid, amount]) => {
                             if (Math.abs(amount) < 0.01) return null; // Hide approximate zeros
                             const member = group.members.find(m => (m._id || m.id) === uid);
                             const myId = user.user?.id || user.user?._id;
                             const isMe = uid === myId;
                             
                             return (
                                 <View key={uid} style={[styles.balanceChip, { backgroundColor: amount > 0 ? colors.success + '20' : colors.danger + '20' }]}>
                                     <Text style={[styles.chipText, { color: amount > 0 ? colors.success : colors.danger }]}>
                                         {isMe ? 'You' : member?.name || 'User'} 
                                         {amount >= 0 ? ' gets ' : ' owes '}
                                         {formatMoney(amount)}
                                     </Text>
                                 </View>
                             );
                         })}
                    </ScrollView>
                    
                    <View style={styles.actionRow}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: colors.border }]}
                            onPress={() => navigation.navigate('SettleUp', { groupId, balances, members: group.members })}
                        >
                            <MaterialCommunityIcons name="handshake" size={20} color={colors.textPrimary} />
                            <Text style={[styles.btnText, dynamicStyles.text]}>Settle Up</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: colors.border }]}
                            onPress={() => Alert.alert("Balances", "Exporting PDF... (Coming Soon)")}
                        >
                            <MaterialCommunityIcons name="file-chart" size={20} color={colors.textPrimary} />
                            <Text style={[styles.btnText, dynamicStyles.text]}>Report</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* EXPENSES LIST */}
            <SectionList
                sections={[{ title: 'Recent Activity', data: expenses }]}
                keyExtractor={(item) => item._id || item.id}
                renderItem={renderExpenseItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
                )}
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 15 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadGroupData} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: colors.textMuted }}>No expenses yet.</Text>
                    </View>
                }
            />

            {/* FAB */}
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddExpense', { groupId, members: group?.members || [] })}
            >
                <MaterialCommunityIcons name="plus" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerCard: { padding: 15, paddingBottom: 10, borderBottomWidth: 1 },
    groupCode: { fontWeight: 'bold', textAlign: 'center', marginBottom: 5, fontSize: 12 },
    balanceChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
    chipText: { fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, borderWidth: 1, gap: 6 },
    btnText: { fontWeight: '600', fontSize: 13 },
    
    sectionHeader: { fontSize: 12, fontWeight: 'bold', marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
    expenseItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
    dateBox: { alignItems: 'center', justifyContent: 'center', width: 40 },
    dateText: { fontSize: 10, textAlign: 'center' },
    expDesc: { fontSize: 16, fontWeight: '600' },
    expPayer: { fontSize: 12 },
    expAmount: { fontSize: 10, textAlign: 'right' },
    expVal: { fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
    
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 4 } }
});

export default GroupScreen;
