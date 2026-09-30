import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    RefreshControl
} from 'react-native';
import { AppContext } from '../../context/AppContext';
import { useAlert } from '../../context/AlertContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { SplitService } from '../../services/SplitService';
import { EmptyState } from '../../components/common';
import getStyles from './SplitFundDashboard.styles';

const SplitFundDashboard = () => {
    const { colors, userData, user, lastRefreshed, appStyles, isPremium } = useContext(AppContext);
    const { showAlert } = useAlert();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(getStyles);
    
    const [groups, setGroups] = useState([]);
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

    const loadData = useCallback(async (isManualRefresh = false) => {
        // Only show spinner on manual pull-to-refresh
        if (isManualRefresh) setIsRefreshing(true);
        
        try {
            // 1. FAST LOAD: Load from cache immediately
            const offlineGroups = await SplitService.getLocalGroups();
            const cachedOnlineGroups = await SplitService.getCachedOnlineGroups();
            
            // Combine and Dedup
            const allCachedGroups = [...offlineGroups, ...cachedOnlineGroups];
            const uniqueGroups = Array.from(new Map(allCachedGroups.map(item => [item._id || item.id, item])).values());
            
            setGroups(uniqueGroups);
            
            // 2. NETWORK LOAD: Fetch fresh data silently
            if (isPremium) {
                const loadedGroups = await SplitService.getGroups(user?.idToken); 
                setGroups(loadedGroups);
            } else {
                setGroups(uniqueGroups.filter(g => g.isOffline));
            }
        } catch (e) {
            console.error("Failed to load SplitFund data", e);
        } finally {
            if (isManualRefresh) setIsRefreshing(false);
        }
    }, [user?.idToken, isPremium]);

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

    // Initial Migration & Load
    useEffect(() => {
        const init = async () => {
            await SplitService.migrateLegacyData();
            loadData();
        };
        init();
    }, [loadData]);


    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;

        try {
            if (isOfflineGroup) {
                // Create local group
                await SplitService.createLocalGroup(newGroupName, [currentUser]);
            } else {
                // Create online group - PREMUM ONLY
                if (!isPremium) {
                     showAlert("Premium Feature", "Online groups are a premium feature. Please create an Offline group.");
                     return;
                }

                if (!user?.idToken) {
                    showAlert("Error", "You must be logged in to create online groups.");
                    return;
                }
                await SplitService.createGroup(user.idToken, newGroupName);
            }
            
            setCreateModalVisible(false);
            setNewGroupName('');
            setIsOfflineGroup(false); // Reset
            loadData();
        } catch (e) {
            showAlert("Error", e.message || "Could not create group");
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim()) return;

        if (!isPremium) {
             showAlert("Premium Feature", "Joining online groups is a premium feature.");
             return;
        }

        if (!user?.idToken) {
            showAlert("Error", "You must be logged in to join groups.");
            return;
        }
        try {
            await SplitService.joinGroup(user.idToken, joinCode.toUpperCase());
            setJoinModalVisible(false);
            setJoinCode('');
            loadData();
            showAlert("Success", "Joined group successfully!");
        } catch (e) {
            showAlert("Error", e.message || "Could not join group");
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
            <View style={styles.header}>
                <Text style={[styles.title, appStyles.headerTitleStyle]}>SplitFund</Text>
                <View style={styles.headerActions}>
                     <TouchableOpacity onPress={() => setJoinModalVisible(true)}>
                        <MaterialCommunityIcons name="account-plus-outline" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                        <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />}
            >
                <Text style={styles.sectionTitle}>Your Groups</Text>
                {groups.length === 0 ? (
                    <EmptyState
                        icon="account-group-outline"
                        title="No groups yet"
                        subtitle="Create or join a group to start splitting expenses!"
                        actionLabel="Create Group"
                        onActionPress={() => setCreateModalVisible(true)}
                    />
                ) : (
                    groups.map(g => (
                        <TouchableOpacity 
                            key={g._id || g.id} 
                            style={styles.groupCard}
                            onPress={() => navigation.navigate('GroupDetails', { groupId: g._id || g.id, groupName: g.name })}
                        >
                            <View style={styles.groupIconBg}>
                                <MaterialCommunityIcons name="account-group" size={24} color={colors.white} />
                            </View>
                            <View style={styles.groupInfo}>
                                <Text style={styles.groupName}>{g.name}</Text>
                                <Text style={styles.groupMembers}>
                                    {g.members?.length || 0} members {g.isOffline ? '• Offline' : ''}
                                </Text>
                            </View>
                            {g.isOffline && <MaterialCommunityIcons name="wifi-off" size={20} color={colors.textMuted} style={styles.offlineIcon} />}
                            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* CREATE GROUP MODAL */}
            <Modal isVisible={createModalVisible} onBackdropPress={() => setCreateModalVisible(false)} avoidKeyboard>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Create New Group</Text>
                    <TextInput 
                        placeholder="Group Name (e.g. Trip to Goa)" 
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        value={newGroupName}
                        onChangeText={setNewGroupName}
                    />
                    
                    <TouchableOpacity 
                        style={styles.checkboxRow}
                        onPress={() => setIsOfflineGroup(!isOfflineGroup)}
                    >
                        <MaterialCommunityIcons 
                            name={isOfflineGroup ? "checkbox-marked" : "checkbox-blank-outline"} 
                            size={24} 
                            color={colors.primary} 
                        />
                        <Text style={styles.checkboxText}>Offline Group (Local only)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleCreateGroup}>
                        <Text style={styles.saveBtnText}>Create Group</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* JOIN GROUP MODAL */}
            <Modal isVisible={joinModalVisible} onBackdropPress={() => setJoinModalVisible(false)} avoidKeyboard>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Join Group</Text>
                    <TextInput 
                        placeholder="Enter Group Code" 
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        value={joinCode}
                        onChangeText={setJoinCode}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={handleJoinGroup}>
                        <Text style={styles.saveBtnText}>Join Group</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

export default SplitFundDashboard;
