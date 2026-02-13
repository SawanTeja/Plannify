import React, { useContext, useEffect, useState, useCallback } from 'react';
import Modal from 'react-native-modal';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, RefreshControl, Clipboard, Alert, ScrollView, TextInput } from 'react-native';
import { AppContext } from '../../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SplitService } from '../../services/SplitService';

const GroupScreen = ({ route }) => {
    const { colors, theme, userData, user } = useContext(AppContext);
    const { groupId, groupName } = route.params;
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const tabBarHeight = insets.bottom + 60;
    
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [group, setGroup] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Offline Member Add
    const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    
    // History Modal
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

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

    const loadGroupData = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        try {
            // 0. FAST LOAD (Cache)
            // Try to find group in cache
            const offlineGroups = await SplitService.getLocalGroups();
            const cachedOnlineGroups = await SplitService.getCachedOnlineGroups();
            const allCached = [...offlineGroups, ...cachedOnlineGroups];
            const cachedGroup = allCached.find(g => (g._id === groupId || g.id === groupId));
            
            if (cachedGroup) {
                setGroup(cachedGroup);
                // Load cached expenses
                const cachedExpenses = await SplitService.getCachedOnlineExpenses(groupId) || [];
                // If offline group, getLocalExpenses is essentially the same as getCachedOnlineExpenses wrapper logic 
                // (or we can just call getExpenses since it handles cache fallback)
                // But for explicit speed:
                if (cachedGroup.isOffline) {
                     const localExp = await SplitService.getLocalExpenses(groupId);
                     setExpenses(localExp);
                } else {
                     setExpenses(cachedExpenses);
                }
                
                // Calc balances on cache
                // We rely on service for calculation logic, but we can pass a flag if we want cache-only?
                // SplitService.calculateBalances calls getExpenses.
                // Since getExpenses now CACHES results, if we just called it above (or if we trust cache),
                // we can just run it. 
                // However, without a token it might fail for online groups if not cached?
                // Actually, calculateBalances calls getExpenses(token). 
                // optimizing calculateBalances to use cache if network fails is done in Service.
            }

            // 1. NETWORK REFRESH
            // Fetch all groups to find current one (updates cache)
            const allGroups = await SplitService.getGroups(user?.idToken);
            const currentGroup = allGroups.find(g => (g._id === groupId || g.id === groupId));
            setGroup(currentGroup);
            
            // Determine token (null if offline)
            const token = currentGroup?.isOffline ? null : user?.idToken;

            // This will fetch fresh expenses and update cache
            const exp = await SplitService.getExpenses(token, groupId);
            setExpenses(exp);

            const bals = await SplitService.calculateBalances(token, groupId);
            setBalances(bals);

        } catch (e) {
            console.error("Error loading group details", e);
            // Alert.alert("Error", "Could not load group data."); // Silent fail is better for background refresh
        } finally {
            if (isManualRefresh) setIsRefreshing(false);
        }
    };

    const copyCode = () => {
        if (group?.inviteCode) {
            Clipboard.setString(group.inviteCode);
            Alert.alert("Copied!", `Group code ${group.inviteCode} copied to clipboard.`);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberName.trim()) return;
        try {
            // Use unified addMember method (handles both online and offline)
             const token = group?.isOffline ? null : user?.idToken;
            await SplitService.addMember(token, groupId, newMemberName.trim());
            
            setNewMemberName('');
            setAddMemberModalVisible(false);
            loadGroupData();
            // Alert.alert("Success", "Member added successfully"); // Removed per user request
        } catch (e) {
            Alert.alert("Error", e.message || "Could not add member.");
        }
    };

    const confirmDeleteGroup = () => {
        Alert.alert(
            "Delete Group",
            "Are you sure you want to delete this group? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: handleDeleteGroup 
                }
            ]
        );
    };

    const handleDeleteGroup = async () => {
        try {
            const token = group?.isOffline ? null : user?.idToken;
            await SplitService.deleteGroup(token, groupId);
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", e.message || "Could not delete group");
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
        // Backend stores paidBy as User ID
        // Backend stores paidBy as User ID
        const myId = user?.user?._id || user?.user?.id || 'guest'; // Prioritize _id
        const isPayer = String(item.paidBy) === String(myId);
        const month = new Date(item.date).toLocaleString('default', { month: 'short', day: 'numeric' });
        
        return (
            <TouchableOpacity style={[styles.expenseItem, dynamicStyles.card]}>
                <View style={styles.dateBox}>
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>{month}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.expDesc, dynamicStyles.text]}>{item.description}</Text>
                    <Text style={[styles.expPayer, dynamicStyles.subText]}>
                        {isPayer ? 'You' : (group?.members?.find(m => String(m._id || m.id) === String(item.paidBy))?.name || 'Someone')} paid {formatMoney(item.amount)}
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
                    <View style={{ marginBottom: 15 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5 }}>
                            <Text style={[styles.groupCode, { color: colors.primary }]}>{group.name}</Text>
                        </View>
                        
                        {!group.isOffline && (
                            <Text style={[styles.groupCode, { color: colors.textSecondary, fontSize: 11, marginBottom: 10 }]}>
                                Invite Code: {group.inviteCode}
                            </Text>
                        )}

                        {/* ADD MEMBER BUTTON - Visible for Offline groups OR Online Group Creator */}
                        {/* ADD MEMBER BUTTON - Visible for Offline groups OR Any Member of Online Group (per user request) */}
                        <TouchableOpacity 
                            onPress={() => setAddMemberModalVisible(true)} 
                            style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHighlight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                        >
                            <MaterialCommunityIcons name="account-plus" size={16} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 5, fontSize: 12 }}>
                                Add Member {group.isOffline ? '(Offline)' : '(Virtual)'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                             {/* Show ALL members, even with 0 balance */}
                             {group.members.map((member) => {
                                 const uid = member._id || member.id;
                                 const amount = balances[uid] || 0;
                                 const myId = user?.user?._id || user?.user?.id || 'guest';
                                 const isMe = String(uid) === String(myId);
                                 
                                 return (
                                     <View key={uid} style={[styles.balanceChip, { backgroundColor: amount >= 0 ? colors.success + '20' : colors.danger + '20' }]}>
                                         <Text style={[styles.chipText, { color: amount >= 0 ? colors.success : colors.danger }]}>
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
                            onPress={() => setHistoryModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="history" size={20} color={colors.textPrimary} />
                            <Text style={[styles.btnText, dynamicStyles.text]}>History Log</Text>
                        </TouchableOpacity>

                        {/* DELETE BUTTON (Offline: All, Online: Owner only) */}
                        {(() => {
                            const myId = user?.user?._id || user?.user?.id;
                            // Check ownership (handle populated object or direct ID string)
                            const ownerId = group.ownerId?._id || group.ownerId;
                            const isOwner = myId && ownerId && String(ownerId) === String(myId);
                            
                            // Show if Offline OR Owner
                            if (group.isOffline || isOwner) {
                                return (
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { borderColor: colors.error || '#EF4444' }]}
                                        onPress={confirmDeleteGroup}
                                    >
                                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error || '#EF4444'} />
                                        <Text style={[styles.btnText, { color: colors.error || '#EF4444' }]}>Delete</Text>
                                    </TouchableOpacity>
                                );
                            }
                            return null;
                        })()}
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
                style={[styles.fab, { backgroundColor: colors.primary, bottom: tabBarHeight + 20 }]}
                onPress={() => navigation.navigate('AddExpense', { groupId, members: group?.members || [] })}
            >
                <MaterialCommunityIcons name="plus" size={32} color="white" />
            </TouchableOpacity>

            {/* ADD MEMBER MODAL (OFFLINE ONLY) */}
            <Modal isVisible={addMemberModalVisible} onBackdropPress={() => setAddMemberModalVisible(false)} avoidKeyboard>
                <View style={[styles.modalContent, dynamicStyles.card, { padding: 20, borderRadius: 15 }]}>
                    <Text style={[dynamicStyles.text, { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }]}>Add Offline Member</Text>
                    <TextInput 
                        placeholder="Member Name"
                        placeholderTextColor={colors.textMuted}
                        style={{ height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, color: colors.textPrimary, marginBottom: 15 }}
                        value={newMemberName}
                        onChangeText={setNewMemberName}
                    />
                    <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={handleAddMember}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Add Member</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* HISTORY LOG MODAL */}
            <Modal isVisible={historyModalVisible} onBackdropPress={() => setHistoryModalVisible(false)} style={{ margin: 0, justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={[dynamicStyles.text, { fontSize: 20, fontWeight: 'bold' }]}>Group History</Text>
                        <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                        {(group?.activities || []).length === 0 ? (
                             <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>No history yet.</Text>
                        ) : (
                            [...(group?.activities || [])].reverse().map((act, index) => (
                                <View key={index} style={{ flexDirection: 'row', marginBottom: 15, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 10 }}>
                                    <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textMuted} style={{ marginTop: 2, marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[dynamicStyles.text, { fontSize: 14 }]}>{act.text}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                                            {new Date(act.date).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </Modal>
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
    
    fab: { position: 'absolute', right: 30, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 4 } }
});

export default GroupScreen;
