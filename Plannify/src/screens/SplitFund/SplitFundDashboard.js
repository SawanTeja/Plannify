import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, RefreshControl } from 'react-native';
import { AppContext } from '../../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import { SplitService } from '../../services/SplitService';

const SplitFundDashboard = () => {
    const { colors, theme, userData, user, lastRefreshed, appStyles } = useContext(AppContext);
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    
    const [groups, setGroups] = useState([]);
    const [netBalance, setNetBalance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modals
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    
    // Inputs
    const [newGroupName, setNewGroupName] = useState('');
    const [isOfflineGroup, setIsOfflineGroup] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    const currentUser = {
        id: user?.id || 'local_user', 
        name: userData?.name || 'Me',
        email: user?.email
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Auto-refresh when sync finishes
    useEffect(() => {
        if (lastRefreshed) {
            loadData();
        }
    }, [lastRefreshed, loadData]);

    const loadData = useCallback(async () => {
        // Allow loading without token for offline groups
        setIsRefreshing(true);
        try {
            const loadedGroups = await SplitService.getGroups(user?.idToken); // Token optional
            setGroups(loadedGroups);
            
            // Calculate total net balance across all groups
            let total = 0;
            for (const group of loadedGroups) {
                // Determine token to use (none for offline)
                const token = group.isOffline ? null : user?.idToken;
                if (!group.isOffline && !token) continue;

                const balances = await SplitService.calculateBalances(token, group._id || group.id);
                const myId = user?.user?.id || user?.user?._id || 'local_user';
                if (myId && balances[myId]) {
                    total += balances[myId];
                }
            }
            setNetBalance(total);
        } catch (e) {
            console.error("Failed to load SplitFund data", e);
        } finally {
            setIsRefreshing(false);
        }
    }, [user?.idToken, user?.user?.id]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;

        try {
            if (isOfflineGroup) {
                // Create local group
                await SplitService.createLocalGroup(newGroupName, [currentUser]);
            } else {
                // Create online group
                if (!user?.idToken) {
                    Alert.alert("Error", "You must be logged in to create online groups.");
                    return;
                }
                await SplitService.createGroup(user.idToken, newGroupName);
            }
            
            setCreateModalVisible(false);
            setNewGroupName('');
            setIsOfflineGroup(false); // Reset
            loadData();
        } catch (e) {
            Alert.alert("Error", e.message || "Could not create group");
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim()) return;
        if (!user?.idToken) {
            Alert.alert("Error", "You must be logged in to join groups.");
            return;
        }
        try {
            await SplitService.joinGroup(user.idToken, joinCode.toUpperCase());
            setJoinModalVisible(false);
            setJoinCode('');
            loadData();
            Alert.alert("Success", "Joined group successfully!");
        } catch (e) {
            Alert.alert("Error", e.message || "Could not join group");
        }
    };

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.textPrimary },
        subText: { color: colors.textSecondary },
        card: { backgroundColor: colors.surface, borderColor: colors.border },
        input: { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
        modalContent: { backgroundColor: colors.surface, borderColor: colors.border },
    };

    return (
        <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top + 10 }]}>
            <View style={styles.header}>
                <Text style={[styles.title, dynamicStyles.text, appStyles.headerTitleStyle]}>SplitFund</Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                     <TouchableOpacity onPress={() => setJoinModalVisible(true)}>
                        <MaterialCommunityIcons name="account-plus-outline" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                        <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>
                    {netBalance >= 0 ? '+' : '-'}{colors.currency || '$'}{Math.abs(netBalance).toFixed(2)}
                </Text>
                <Text style={styles.balanceSub}>
                    {netBalance === 0 ? "You are all settled up!" : netBalance > 0 ? "You are owed" : "You owe"}
                </Text>
            </View>

            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadData} tintColor={colors.primary} />}
            >
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Your Groups</Text>
                {groups.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyText, dynamicStyles.subText]}>
                            No groups yet. Create or join one!
                        </Text>
                    </View>
                ) : (
                    groups.map(g => (
                        <TouchableOpacity 
                            key={g._id || g.id} 
                            style={[styles.groupCard, dynamicStyles.card]}
                            onPress={() => navigation.navigate('GroupDetails', { groupId: g._id || g.id, groupName: g.name })}
                        >
                            <View style={styles.groupIconBg}>
                                <MaterialCommunityIcons name="account-group" size={24} color={colors.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.groupName, dynamicStyles.text]}>{g.name}</Text>
                                <Text style={[styles.groupMembers, dynamicStyles.subText]}>
                                    {g.members?.length || 0} members {g.isOffline ? '• Offline' : ''}
                                </Text>
                            </View>
                            {g.isOffline && <MaterialCommunityIcons name="wifi-off" size={20} color={colors.textMuted} style={{ marginRight: 5 }} />}
                            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* CREATE GROUP MODAL */}
            <Modal isVisible={createModalVisible} onBackdropPress={() => setCreateModalVisible(false)} avoidKeyboard>
                <View style={[styles.modalContent, dynamicStyles.modalContent]}>
                    <Text style={[styles.modalTitle, dynamicStyles.text]}>Create New Group</Text>
                    <TextInput 
                        placeholder="Group Name (e.g. Trip to Goa)" 
                        placeholderTextColor={colors.textMuted}
                        style={[styles.input, dynamicStyles.input]}
                        value={newGroupName}
                        onChangeText={setNewGroupName}
                    />
                    
                    <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                        onPress={() => setIsOfflineGroup(!isOfflineGroup)}
                    >
                        <MaterialCommunityIcons 
                            name={isOfflineGroup ? "checkbox-marked" : "checkbox-blank-outline"} 
                            size={24} 
                            color={colors.primary} 
                        />
                        <Text style={[dynamicStyles.text, { marginLeft: 10 }]}>Offline Group (Local only)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleCreateGroup}>
                        <Text style={styles.saveBtnText}>Create Group</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* JOIN GROUP MODAL */}
            <Modal isVisible={joinModalVisible} onBackdropPress={() => setJoinModalVisible(false)} avoidKeyboard>
                <View style={[styles.modalContent, dynamicStyles.modalContent]}>
                    <Text style={[styles.modalTitle, dynamicStyles.text]}>Join Group</Text>
                    <TextInput 
                        placeholder="Enter Group Code" 
                        placeholderTextColor={colors.textMuted}
                        style={[styles.input, dynamicStyles.input]}
                        value={joinCode}
                        onChangeText={setJoinCode}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleJoinGroup}>
                        <Text style={styles.saveBtnText}>Join Group</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { },
    balanceCard: { marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 20, alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
    balanceAmount: { color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
    balanceSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
    content: { paddingHorizontal: 20, paddingBottom: 100 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
    emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { marginTop: 10, textAlign: 'center' },
    groupCard: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 15 },
    groupIconBg: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    groupName: { fontSize: 16, fontWeight: 'bold' },
    groupMembers: { fontSize: 12, marginTop: 2 },
    
    modalContent: { padding: 20, borderRadius: 20, borderWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 16, marginBottom: 20 },
    saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default SplitFundDashboard;
