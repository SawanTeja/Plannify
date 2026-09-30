import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import Modal from 'react-native-modal';
import {
    View,
    Text,
    TouchableOpacity,
    RefreshControl,
    Clipboard,
    ScrollView,
    TextInput
} from 'react-native';
import { AppContext } from '../../context/AppContext';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { SplitService } from '../../services/SplitService';
import { simplifyDebts } from '../../utils/SplitLogic';
import { formatCurrency } from '../../utils/formatters';
import { FloatingActionButton } from '../../components/common';
import getStyles from './GroupScreen.styles';

const GroupScreen = ({ route }) => {
    const { colors, user } = useContext(AppContext);
    const { showAlert } = useAlert();
    const { groupId, groupName } = route.params;
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(getStyles);
    const tabBarHeight = insets.bottom + 60;
    
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [simplifiedDebts, setSimplifiedDebts] = useState([]);
    const [group, setGroup] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Offline Member Add
    const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    
    // Modals
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [spendingsModalVisible, setSpendingsModalVisible] = useState(false);
    const [membersModalVisible, setMembersModalVisible] = useState(false);

    const loadGroupData = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        try {
            // 0. FAST LOAD (Cache)
            // Try to find group in cache
            const offlineGroups = await SplitService.getLocalGroups();
            const cachedOnlineGroups = await SplitService.getCachedOnlineGroups();
            const allCached = [...offlineGroups, ...cachedOnlineGroups];
            // Fix: Use loose string comparison for IDs to ensure cache hit
            const cachedGroup = allCached.find(g => String(g._id || g.id) === String(groupId));
            
            if (cachedGroup) {
                setGroup(cachedGroup);
                // Load cached expenses
                const cachedExpenses = await SplitService.getCachedOnlineExpenses(groupId) || [];

                if (cachedGroup.isOffline) {
                     const localExp = await SplitService.getLocalExpenses(groupId);
                     setExpenses(localExp);
                     // Calculate balances immediately from cache
                     const cachedBalances = await SplitService.calculateBalances(null, groupId, localExp);
                     setBalances(cachedBalances);
                     setSimplifiedDebts(simplifyDebts(cachedBalances));
                } else {
                     setExpenses(cachedExpenses);
                     if (cachedExpenses.length > 0) {
                         const cachedBalances = await SplitService.calculateBalances(null, groupId, cachedExpenses);
                         setBalances(cachedBalances);
                         setSimplifiedDebts(simplifyDebts(cachedBalances));
                     }
                }
            }

            // 1. NETWORK REFRESH
            // Fetch all groups to find current one (updates cache)
            const allGroups = await SplitService.getGroups(user?.idToken);
            const currentGroup = allGroups.find(g => String(g._id || g.id) === String(groupId));
            if (currentGroup) {
                setGroup(currentGroup);
            }
            
            // Determine token (null if offline)
            const token = currentGroup?.isOffline ? null : user?.idToken;

            // This will fetch fresh expenses and update cache
            const exp = await SplitService.getExpenses(token, groupId);
            setExpenses(exp);

            // Use the freshly fetched 'exp' to calculate balances (avoids double network call)
            const bals = await SplitService.calculateBalances(token, groupId, exp);
            setBalances(bals);
            
            // Calculate Simplified Debts for Homepage
            setSimplifiedDebts(simplifyDebts(bals));

        } catch (e) {
            console.error("Error loading group details", e);
        } finally {
            if (isManualRefresh) setIsRefreshing(false);
        }
    }, [groupId, user?.idToken]);

    useFocusEffect(
        useCallback(() => {
            loadGroupData();
        }, [loadGroupData])
    );

    const copyCode = useCallback(() => {
        if (group?.inviteCode) {
            Clipboard.setString(group.inviteCode);
            showAlert("Copied!", `Group code ${group.inviteCode} copied to clipboard.`);
        }
    }, [group?.inviteCode, showAlert]);

    useEffect(() => {
        navigation.setOptions({
            title: groupName || 'Group',
            headerRight: () => (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
                    <TouchableOpacity onPress={() => setMembersModalVisible(true)}>
                        <MaterialCommunityIcons name="account-group" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    {group && !group.isOffline && (
                        <TouchableOpacity onPress={copyCode}>
                            <MaterialCommunityIcons name="content-copy" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                    )}
                </View>
            )
        });
    }, [group, groupName, colors.textPrimary, navigation, copyCode]);



    const handleAddMember = async () => {
        if (!newMemberName.trim()) return;
        try {
            // Use unified addMember method (handles both online and offline)
             const token = group?.isOffline ? null : user?.idToken;
            await SplitService.addMember(token, groupId, newMemberName.trim());
            
            setNewMemberName('');
            setAddMemberModalVisible(false);
            loadGroupData();
            // showAlert("Success", "Member added successfully"); // Removed per user request
        } catch (e) {
            showAlert("Error", e.message || "Could not add member.");
        }
    };

    const confirmDeleteGroup = () => {
        showAlert(
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
            showAlert("Error", e.message || "Could not delete group");
        }
    };

    // Helper to format currency
    const formatMoney = (amount) => formatCurrency(amount, colors.currency, { absolute: true });

    // Derived Data
    const regularExpenses = expenses.filter(item => item.type !== 'payment' && item.splitType !== 'Payment');
    const settlementExpenses = expenses.filter(item => item.type === 'payment' || item.splitType === 'Payment');

    const getName = useCallback((id) => {
        const myId = user?.user?._id || user?.user?.id || 'guest';
        if (String(id) === String(myId)) return 'You';
        return group?.members?.find(m => String(m._id || m.id) === String(id))?.name || 'Someone';
    }, [group?.members, user]);

    // Calculate total spendings per member
    const memberSpendings = useMemo(() => {
        const spendingMap = {};
        
        // Initialize
        group?.members?.forEach(m => {
            const id = m._id || m.id;
            spendingMap[String(id)] = 0;
        });

        regularExpenses.forEach(item => {
            const payerId = String(item.paidBy);
            // Add to map, initializing if strictly needed (though we did above)
            spendingMap[payerId] = (spendingMap[payerId] || 0) + parseFloat(item.amount || 0);
        });

        // Convert to array
        return Object.entries(spendingMap).map(([id, amount]) => ({
            id,
            amount,
            name: getName(id)
        })).sort((a, b) => b.amount - a.amount);
    }, [regularExpenses, group?.members, getName]);

    const handleDeleteMember = async (memberId, memberName) => {
        showAlert(
            "Remove Member",
            `Are you sure you want to remove ${memberName}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Remove", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            const token = group?.isOffline ? null : user?.idToken;
                            await SplitService.deleteMember(token, groupId, memberId);
                            loadGroupData();
                        } catch (e) {
                            showAlert("Error", e.message || "Could not remove member");
                        }
                    } 
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* HEADEr */}
            {group && (
                <View style={styles.headerCard}>
                    <View style={{ marginBottom: 15 }}>
                        {!group.isOffline && (
                            <Text style={styles.groupCode}>
                                Invite Code: {group.inviteCode}
                            </Text>
                        )}
                    </View>
                    
                    <View style={styles.actionRow}>
                        <TouchableOpacity 
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('SettleUp', { groupId, balances, members: group.members })}
                        >
                            <MaterialCommunityIcons name="handshake" size={20} color={colors.textPrimary} />
                            <Text style={styles.btnText}>Settle Up</Text>
                        </TouchableOpacity>

                         <TouchableOpacity 
                            style={styles.actionBtn}
                            onPress={() => setSpendingsModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.textPrimary} />
                            <Text style={styles.btnText}>Spendings</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.actionBtn}
                            onPress={() => setHistoryModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="history" size={20} color={colors.textPrimary} />
                            <Text style={styles.btnText}>Settlement Log</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* DEBT GRAPH (Who owes Whom) */}
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadGroupData} tintColor={colors.primary} />}
            >
                <Text style={styles.sectionHeader}>Overview</Text>
                
                {simplifiedDebts.length === 0 ? (
                    <View style={styles.emptyOverview}>
                         <MaterialCommunityIcons name="check-circle-outline" size={48} color={colors.success} />
                         <Text style={styles.emptyOverviewText}>Everyone is settled up!</Text>
                    </View>
                ) : (
                    simplifiedDebts.map((debt, index) => {
                        const fromName = getName(debt.from);
                        const toName = getName(debt.to);
                        const isMeInvolved = fromName === 'You' || toName === 'You';
                        
                        return (
                            <View key={index} style={[styles.debtCard, isMeInvolved && styles.debtCardInvolved]}>
                                <View style={styles.debtMemberRow}>
                                    <View style={[styles.avatar, styles.avatarDanger]}>
                                        <Text style={{color: colors.danger, fontWeight:'bold'}}>{fromName[0]}</Text>
                                    </View>
                                    <Text style={styles.debtMemberName}>{fromName}</Text>
                                </View>
                                
                                <View style={styles.debtCenter}>
                                    <Text style={styles.debtSendsText}>sends</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textSecondary} />
                                    <Text style={styles.debtAmount}>{formatMoney(debt.amount)}</Text>
                                </View>

                                <View style={styles.debtMemberRow}>
                                    <Text style={styles.debtMemberName}>{toName}</Text>
                                    <View style={[styles.avatar, styles.avatarSuccess]}>
                                        <Text style={{color: colors.success, fontWeight:'bold'}}>{toName[0]}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}

                <TouchableOpacity 
                    onPress={() => setAddMemberModalVisible(true)}
                    style={styles.bigAddMemberBtn}
                >
                        <MaterialCommunityIcons name="account-plus" size={24} color={colors.textPrimary} />
                        <Text style={styles.bigAddMemberText}>
                            Add Member
                        </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={confirmDeleteGroup}
                    style={styles.deleteGroupBtn}
                >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.deleteGroupText}>Delete Group</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* FAB */}
            <FloatingActionButton 
                bottom={tabBarHeight + 20}
                onPress={() => navigation.navigate('AddExpense', { groupId, members: group?.members || [] })}
            />

            {/* ADD MEMBER MODAL (OFFLINE ONLY) */}
            <Modal isVisible={addMemberModalVisible} onBackdropPress={() => setAddMemberModalVisible(false)} avoidKeyboard>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add Member</Text>
                    <TextInput 
                        placeholder="Member Name"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        value={newMemberName}
                        onChangeText={setNewMemberName}
                    />
                    <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddMember}>
                        <Text style={styles.modalSaveBtnText}>Add Member</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* MEMBERS MODAL */}
            <Modal isVisible={membersModalVisible} onBackdropPress={() => setMembersModalVisible(false)} avoidKeyboard>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.modalTitleLeft}>Group Members</Text>
                        <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.memberList}>
                        {group?.members?.map((member, index) => {
                            const isMe = String(member._id || member.id) === String(user?.user?._id || user?.user?.id);
                            return (
                                <View key={index} style={styles.memberRow}>
                                    <View style={styles.debtMemberRow}>
                                        <View style={[styles.avatar, styles.avatarPrimary, { marginRight: 15 }]}>
                                            <Text style={{color: colors.primary, fontWeight:'bold'}}>{(member.name || '?')[0]}</Text>
                                        </View>
                                        <Text style={styles.memberNameText}>
                                            {member.name || 'Unknown'} {isMe && '(You)'}
                                        </Text>
                                    </View>
                                    {(!isMe || group.isOffline) && (
                                        <TouchableOpacity onPress={() => handleDeleteMember(member._id || member.id, member.name)}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>

            {/* SPENDINGS MODAL */}
             <Modal isVisible={spendingsModalVisible} onBackdropPress={() => setSpendingsModalVisible(false)} style={styles.bottomModal}>
                <View style={styles.spendingSheet}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.modalTitleLarge}>Total Spending</Text>
                        <TouchableOpacity onPress={() => setSpendingsModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                        {memberSpendings.map((member, index) => (
                             <View key={index} style={styles.spendingRow}>
                                 <View style={styles.debtMemberRow}>
                                     <View style={[styles.avatar, styles.avatarPrimary, { marginRight: 10 }]}>
                                         <Text style={{color: colors.primary, fontWeight:'bold'}}>{member.name[0]}</Text>
                                     </View>
                                     <Text style={styles.memberNameText}>{member.name}</Text>
                                 </View>
                                 <Text style={styles.spendingAmount}>{formatMoney(member.amount)}</Text>
                             </View>
                        ))}
                        
                        {memberSpendings.length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 30 }}>
                                <Text style={{ color: colors.textMuted }}>No expenses recorded yet.</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* HISTORY LOG MODAL */}
            <Modal isVisible={historyModalVisible} onBackdropPress={() => setHistoryModalVisible(false)} style={styles.bottomModal}>
                <View style={styles.historySheet}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.modalTitleLarge}>Settlement Log</Text>
                        <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                        {settlementExpenses.length === 0 && (group?.activities || []).length === 0 ? (
                             <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>No settlements or history.</Text>
                        ) : (
                            <View>
                                {settlementExpenses.length > 0 && (
                                    <View style={{marginBottom: 20}}>
                                        <Text style={styles.historySectionTitle}>Settlements</Text>
                                        {[...settlementExpenses].reverse().map((item, index) => {
                                             const month = new Date(item.date).toLocaleString('default', { month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });
                                             const payerName = group?.members?.find(m => String(m._id || m.id) === String(item.paidBy))?.name || 'Someone';
                                             // Find who was paid (the key in splits object)
                                             const payeeId = Object.keys(item.splits || {})[0];
                                             const payeeName = group?.members?.find(m => String(m._id || m.id) === String(payeeId))?.name || 'Someone';
                                             
                                             return (
                                                 <View key={index} style={styles.historyItem}>
                                                     <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} style={{ marginRight: 10 }} />
                                                     <View style={{ flex: 1 }}>
                                                         <Text style={styles.historyItemText}>
                                                            <Text style={{fontWeight:'bold'}}>{payerName}</Text> paid <Text style={{fontWeight:'bold'}}>{payeeName}</Text>
                                                         </Text>
                                                         <Text style={styles.historyDate}>{month}</Text>
                                                     </View>
                                                     <Text style={styles.historyAmount}>{formatMoney(item.amount)}</Text>
                                                 </View>
                                             );
                                        })}
                                    </View>
                                )}

                                {(group?.activities || []).length > 0 && (
                                     <View>
                                         <Text style={styles.historyActivityTitle}>Other Activity</Text>
                                         {[...(group?.activities || [])].reverse().map((act, index) => (
                                            <View key={index} style={styles.activityItem}>
                                                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textMuted} style={{ marginTop: 2, marginRight: 10 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.activityText}>{act.text}</Text>
                                                    <Text style={styles.activityDate}>
                                                        {new Date(act.date).toLocaleString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                     </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

export default GroupScreen;
