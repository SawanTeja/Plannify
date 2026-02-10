import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
  Dimensions,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "../../context/AppContext";
import { SocialService } from "../../services/SocialService";
import SocialPostModal from "./SocialPostModal";

// Enable Layout Animation
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

const SocialScreen = () => {
  const { colors, theme, user, lastRefreshed, appStyles } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 60;

  // State
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null); // postId
  const [editingPost, setEditingPost] = useState(null);
  const [detailPost, setDetailPost] = useState(null);

  // Group Modal States
  const [createGroupName, setCreateGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [isGroupOwner, setIsGroupOwner] = useState(false);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [modalMode, setModalMode] = useState("menu"); // 'menu', 'create', 'join'
  const [fullScreenImage, setFullScreenImage] = useState(null);

  // Reaction emojis
  const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

  // Load groups on mount
  useEffect(() => {
    if (user?.idToken) {
      loadGroups();
    }
  }, [user]);

  // Load posts when group changes
  useEffect(() => {
    if (selectedGroup && user?.idToken) {
      loadPosts(selectedGroup._id);
    }
  }, [selectedGroup]);

  // Reload data when sync completes
  useEffect(() => {
    if (lastRefreshed && user?.idToken) {
      console.log('🔄 Social: Reloading after sync...');
      loadGroups();
      if (selectedGroup) {
        loadPosts(selectedGroup._id);
      }
    }
  }, [lastRefreshed]);

  const loadGroups = async () => {
    if (!user?.idToken) return;
    
    try {
      setIsLoading(true);
      const result = await SocialService.getGroups(user.idToken);
      if (result.success) {
        setGroups(result.groups);
        // Auto-select first group if none selected
        if (result.groups.length > 0 && !selectedGroup) {
          setSelectedGroup(result.groups[0]);
        }
      }
    } catch (error) {
      console.error("Load Groups Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async (groupId) => {
    if (!user?.idToken) return;

    try {
      setIsLoading(true);
      const result = await SocialService.getPosts(user.idToken, groupId);
      if (result.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPosts(result.posts);
      }
    } catch (error) {
      console.error("Load Posts Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGroups();
    if (selectedGroup) {
      await loadPosts(selectedGroup._id);
    }
    setIsRefreshing(false);
  };

  const handleCreateGroup = async () => {
    if (!createGroupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      const result = await SocialService.createGroup(user.idToken, createGroupName.trim());
      if (result.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setGroups([result.group, ...groups]);
        setSelectedGroup(result.group);
        setCreateGroupName("");
        setShowGroupModal(false);
        
        // Show invite code
        Alert.alert(
          "Group Created! 🎉",
          `Share this code with friends:\n\n${result.group.inviteCode}`,
          [
            { text: "Copy Code", onPress: () => Clipboard.setString(result.group.inviteCode) },
            { text: "OK" }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create group");
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }

    try {
      const result = await SocialService.joinGroup(user.idToken, joinCode.trim());
      if (result.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        
        // Handle "Already a member" case
        if (result.message === 'Already a member') {
             Alert.alert("Already Joined", `You are already a member of "${result.group.name}"`);
             // We still switch to it
             if (!groups.find(g => g._id === result.group._id)) {
                setGroups([result.group, ...groups]);
             }
             setSelectedGroup(result.group);
             setJoinCode("");
             setShowGroupModal(false);
             return;
        }

        // Add group if not already in list
        if (!groups.find(g => g._id === result.group._id)) {
          setGroups([result.group, ...groups]);
        }
        setSelectedGroup(result.group);
        setJoinCode("");
        setShowGroupModal(false);
        Alert.alert("Success", `Joined "${result.group.name}"!`);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Invalid invite code");
    }
  };

  const handleLeaveGroup = async (groupId) => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await SocialService.leaveGroup(user.idToken, groupId);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setGroups(groups.filter(g => g._id !== groupId));
              if (selectedGroup?._id === groupId) {
                setSelectedGroup(groups.length > 1 ? groups.find(g => g._id !== groupId) : null);
                setPosts([]);
              }
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to leave group");
            }
          }
        }
      ]
    );
  };

  const handleDeleteGroup = async (groupId) => {
    Alert.alert(
      "Delete Group",
      "Are you sure? This will permanently delete the group and ALL posts. This cannot be undone!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              await SocialService.deleteGroup(user.idToken, groupId);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setGroups(groups.filter(g => g._id !== groupId));
              if (selectedGroup?._id === groupId) {
                const remaining = groups.filter(g => g._id !== groupId);
                setSelectedGroup(remaining.length > 0 ? remaining[0] : null);
                setPosts([]);
              }
              setShowGroupModal(false);
              Alert.alert("Deleted", "Group has been permanently deleted");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete group");
            }
          }
        }
      ]
    );
  };

  const handleShowMembers = async () => {
    if (!selectedGroup || !user?.idToken) return;

    try {
      const result = await SocialService.getMembers(user.idToken, selectedGroup._id);
      if (result.success) {
        setGroupMembers(result.members);
        setIsGroupOwner(result.isOwner);
        setShowMembersModal(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load members");
    }
  };

  const handleShareInvite = async () => {
    if (!selectedGroup) return;
    
    try {
      const message = `🎉 Join my group "${selectedGroup.name}" on Plannify!\n\nInvite Code: ${selectedGroup.inviteCode}\n\nOpen the app, go to Social tab, tap the settings icon, and enter this code to join!`;
      
      await Share.share({
        message,
        title: `Join ${selectedGroup.name}`,
      });
    } catch (error) {
      if (error.message !== 'User did not share') {
        Alert.alert("Error", "Failed to share invite");
      }
    }
  };

  const handleRemoveMember = async (memberId) => {
    Alert.alert(
      "Remove Member",
      "Remove this person from the group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await SocialService.removeMember(user.idToken, selectedGroup._id, memberId);
              setGroupMembers(groupMembers.filter(m => m._id !== memberId));
            } catch (error) {
              Alert.alert("Error", "Failed to remove member");
            }
          }
        }
      ]
    );
  };

  const handleSavePost = async (postData) => {
    try {
      if (editingPost) {
        // Update existing post
        const result = await SocialService.updatePost(user.idToken, editingPost._id, postData);
        if (result.success) {
          setPosts(posts.map(p => p._id === editingPost._id ? result.post : p));
        }
      } else {
        // Create new post
        const result = await SocialService.createPost(user.idToken, selectedGroup._id, postData);
        if (result.success) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
          setPosts([result.post, ...posts]);
        }
      }
      setShowPostModal(false);
      setEditingPost(null);
    } catch (error) {
      Alert.alert("Error", "Failed to save post");
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert(
      "Delete Post",
      "Delete this memory?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await SocialService.deletePost(user.idToken, postId);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setPosts(posts.filter(p => p._id !== postId));
              if (detailPost?._id === postId) setDetailPost(null);
            } catch (error) {
              Alert.alert("Error", "Failed to delete post");
            }
          }
        }
      ]
    );
  };

  // --- REACTION HANDLERS ---
  const handleAddReaction = async (postId, emoji) => {
    try {
      const result = await SocialService.addReaction(user.idToken, postId, emoji);
      if (result.success) {
        setPosts(posts.map(p => 
          p._id === postId ? { ...p, reactions: result.reactions } : p
        ));
        if (detailPost?._id === postId) {
          setDetailPost({ ...detailPost, reactions: result.reactions });
        }
      }
      setShowReactionPicker(null);
    } catch (error) {
      Alert.alert("Error", "Failed to add reaction");
    }
  };

  const handleRemoveReaction = async (postId) => {
    try {
      const result = await SocialService.removeReaction(user.idToken, postId);
      if (result.success) {
        setPosts(posts.map(p => 
          p._id === postId ? { ...p, reactions: result.reactions } : p
        ));
        if (detailPost?._id === postId) {
          setDetailPost({ ...detailPost, reactions: result.reactions });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to remove reaction");
    }
  };

  // --- GROUP SETTINGS HANDLERS ---
  const handleRenameGroup = async () => {
    if (!renameGroupName.trim() || !selectedGroup) return;
    
    try {
      const result = await SocialService.renameGroup(user.idToken, selectedGroup._id, renameGroupName.trim());
      if (result.success) {
        setGroups(groups.map(g => g._id === selectedGroup._id ? result.group : g));
        setSelectedGroup(result.group);
        setRenameGroupName("");
        Alert.alert("Success", "Group renamed!");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to rename group");
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    if (!selectedGroup) return;
    
    Alert.alert(
      "Transfer Ownership",
      "Are you sure? You will no longer be the owner.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await SocialService.transferOwnership(user.idToken, selectedGroup._id, newOwnerId);
              if (result.success) {
                setGroups(groups.map(g => g._id === selectedGroup._id ? result.group : g));
                setSelectedGroup(result.group);
                setShowTransferModal(false);
                setIsGroupOwner(false);
                Alert.alert("Success", "Ownership transferred!");
              }
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to transfer ownership");
            }
          }
        }
      ]
    );
  };

  // Helper to get user's reaction on a post
  const getUserReaction = (post) => {
    if (!post.reactions || !user.user?.id) return null;
    return post.reactions.find(r => r.userId === user.user.id);
  };

  // Helper to group reactions by emoji
  const groupReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return [];
    const grouped = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.userName);
    });
    return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count: count.length }));
  };

  // --- DYNAMIC STYLES ---
  const dynamicStyles = {
    container: { 
      backgroundColor: colors.background,
      paddingTop: insets.top + 10,
    },
    headerText: { color: colors.textPrimary },
    subText: { color: colors.textSecondary },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      shadowColor: colors.shadow,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    fab: { backgroundColor: colors.primary, shadowColor: colors.primary },
    modalContent: { backgroundColor: colors.surface },
  };

  // --- RENDERERS ---
  const renderGroupChip = (group) => {
    const isActive = selectedGroup?._id === group._id;
    return (
      <TouchableOpacity
        key={group._id}
        onPress={() => setSelectedGroup(group)}
        onLongPress={() => {
          if (!group.isOwner) {
            handleLeaveGroup(group._id);
          }
        }}
        style={[
          styles.groupChip,
          isActive ? dynamicStyles.chipActive : dynamicStyles.chipInactive,
        ]}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: isActive ? colors.white : colors.textSecondary,
          }}
        >
          {group.name}
        </Text>
        <View style={styles.memberBadge}>
          <Text style={{ fontSize: 10, color: isActive ? colors.white : colors.textMuted }}>
            {group.memberCount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPostCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => setDetailPost(item)}
      onLongPress={() => item.isOwn && handleDeletePost(item._id)}
      activeOpacity={0.9}
      style={[styles.card, dynamicStyles.card]}
    >
      <View style={styles.authorRow}>
        {item.authorAvatar ? (
          <Image source={{ uri: item.authorAvatar }} style={styles.authorAvatar} />
        ) : (
          <View style={[styles.authorAvatar, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.white, fontWeight: "bold" }}>
              {item.authorName?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, dynamicStyles.headerText]}>
            {item.authorName || "Unknown"}
          </Text>
          <Text style={[styles.dateText, dynamicStyles.subText]}>{item.date}</Text>
        </View>
        {item.isOwn && (
          <TouchableOpacity
            onPress={() => {
              setEditingPost(item);
              setShowPostModal(true);
            }}
            style={styles.editBtn}
          >
            <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      )}

      <View style={styles.postContent}>
        <View style={styles.rowBetween}>
          <Text style={[styles.topicText, dynamicStyles.headerText]} numberOfLines={1}>
            {item.topic || "Untitled"}
          </Text>
          {item.mood && <Text style={{ fontSize: 20 }}>{item.mood}</Text>}
        </View>

        {item.text && (
          <Text style={[styles.textPreview, dynamicStyles.subText]} numberOfLines={3}>
            {item.text}
          </Text>
        )}

        {item.location && (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={12} color={colors.textSecondary} />
            <Text style={[styles.locText, dynamicStyles.subText]} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((t, i) => (
              <Text key={i} style={[styles.miniTag, { color: colors.primary }]}>
                #{t}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Reaction Bar */}
      <View style={styles.reactionBar}>
        <View style={styles.reactionsLeft}>
          {groupReactions(item.reactions).map(({ emoji, count }) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionBubble, { backgroundColor: colors.surfaceHighlight }]}
              onPress={() => {
                const userReaction = getUserReaction(item);
                if (userReaction?.emoji === emoji) {
                  handleRemoveReaction(item._id);
                } else {
                  handleAddReaction(item._id, emoji);
                }
              }}
            >
              <Text style={{ fontSize: 14 }}>{emoji}</Text>
              <Text style={[styles.reactionCount, dynamicStyles.subText]}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => setShowReactionPicker(showReactionPicker === item._id ? null : item._id)}
          style={[styles.addReactionBtn, { borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="emoticon-plus-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Reaction Picker */}
      {showReactionPicker === item._id && (
        <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleAddReaction(item._id, emoji)}
              style={styles.emojiBtn}
            >
              <Text style={{ fontSize: 22 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  // --- GROUP MODAL ---
  const renderGroupModal = () => (
    <Modal
      isVisible={showGroupModal}
      onBackdropPress={() => setShowGroupModal(false)}
      onSwipeComplete={() => setShowGroupModal(false)}
      swipeDirection={["down"]}
      style={styles.modal}
      backdropOpacity={0.5}
      avoidKeyboard={true}
    >
      <ScrollView style={[styles.modalContent, dynamicStyles.modalContent]}>
        <View style={styles.dragHandle} />

        {/* --- VIEW: CREATE GROUP --- */}
        {modalMode === "create" && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setModalMode("menu")} style={{ marginRight: 15 }}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, dynamicStyles.headerText, { marginBottom: 0 }]}>
                Create New Group
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.subText]}>GROUP NAME</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={{
                    flex: 1,
                    height: 48,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 15,
                    fontSize: 15,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  }}
                  placeholder="e.g. Family Trip 2024"
                  placeholderTextColor={colors.textMuted}
                  value={createGroupName}
                  onChangeText={setCreateGroupName}
                  autoFocus={true}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.actionBtn, 
                  { backgroundColor: colors.primary, marginTop: 20, justifyContent: "center" }
                ]}
                onPress={handleCreateGroup}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                <Text style={styles.actionBtnText}>Create Group</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 300 }} /> 
          </View>
        )}

        {/* --- VIEW: JOIN GROUP --- */}
        {modalMode === "join" && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setModalMode("menu")} style={{ marginRight: 15 }}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, dynamicStyles.headerText, { marginBottom: 0 }]}>
                Join Group
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.subText]}>INVITE CODE</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={{
                    flex: 1,
                    height: 48,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 15,
                    fontSize: 15,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    fontWeight: "bold",
                    letterSpacing: 1,
                  }}
                  placeholder="ENTER CODE"
                  placeholderTextColor={colors.textMuted}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  autoCapitalize="characters"
                  maxLength={6}
                  autoFocus={true}
                />
              </View>
               <TouchableOpacity
                style={[
                  styles.actionBtn, 
                  { backgroundColor: colors.success || "#22C55E", marginTop: 20, justifyContent: "center" }
                ]}
                onPress={handleJoinGroup}
              >
                <MaterialCommunityIcons name="login" size={20} color={colors.white} />
                <Text style={styles.actionBtnText}>Join Group</Text>
              </TouchableOpacity>
            </View>
             <View style={{ height: 300 }} />
          </View>
        )}

        {/* --- VIEW: MENU / SETTINGS --- */}
        {modalMode === "menu" && (
          <View>
            <Text style={[styles.modalTitle, dynamicStyles.headerText]}>Social Settings</Text>

            {/* CURRENT GROUP INFO */}
            {selectedGroup ? (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, dynamicStyles.subText]}>CURRENT GROUP</Text>
                  <View style={[styles.groupInfoCard, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.groupInfoName, dynamicStyles.headerText]}>
                      {selectedGroup.name}
                    </Text>
                    
                    <View style={styles.codeRow}>
                      <Text style={dynamicStyles.subText}>Invite Code: </Text>
                      <Text style={[styles.inviteCode, { color: colors.primary }]}>
                        {selectedGroup.inviteCode}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Clipboard.setString(selectedGroup.inviteCode);
                          Alert.alert("Copied!", "Invite code copied to clipboard");
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                     <TouchableOpacity onPress={handleShowMembers} style={styles.membersBtn}>
                      <MaterialCommunityIcons name="account-group" size={16} color={colors.textSecondary} />
                      <Text style={dynamicStyles.subText}> {selectedGroup.memberCount} members</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* OWNER ACTIONS */}
                {selectedGroup.isOwner && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, dynamicStyles.subText]}>OWNER ACTIONS</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={{
                          flex: 1,
                          height: 48,
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 15,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        }}
                        placeholder="Rename group..."
                        placeholderTextColor={colors.textMuted}
                        value={renameGroupName}
                        onChangeText={setRenameGroupName}
                      />
                      <TouchableOpacity
                        style={[styles.inputBtn, { backgroundColor: colors.primary }]}
                        onPress={handleRenameGroup}
                      >
                        <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                     <TouchableOpacity
                      onPress={() => {
                        handleShowMembers();
                        setShowTransferModal(true);
                      }}
                      style={[styles.settingsBtn, { borderColor: colors.warning || "#F59E0B" }]}
                    >
                      <MaterialCommunityIcons name="account-switch" size={20} color={colors.warning || "#F59E0B"} />
                      <Text style={{ color: colors.warning || "#F59E0B", marginLeft: 8 }}>
                        Transfer Ownership
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(selectedGroup._id)}
                      style={[styles.settingsBtn, { borderColor: colors.error || "#EF4444" }]}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color={colors.error || "#EF4444"} />
                      <Text style={{ color: colors.error || "#EF4444", marginLeft: 8 }}>
                        Delete Group
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* MEMBER ACTIONS */}
                {!selectedGroup.isOwner && (
                   <TouchableOpacity
                    onPress={() => handleLeaveGroup(selectedGroup._id)}
                    style={[styles.settingsBtn, { borderColor: colors.error || "#EF4444", marginBottom: 20 }]}
                  >
                    <MaterialCommunityIcons name="exit-run" size={20} color={colors.error || "#EF4444"} />
                    <Text style={{ color: colors.error || "#EF4444", marginLeft: 8 }}>
                      Leave Group
                    </Text>
                  </TouchableOpacity>
                )}
                 <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            ) : (
               <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Text style={dynamicStyles.subText}>No group selected</Text>
               </View>
            )}

            {/* NAVIGATION BUTTONS */}
            <View style={styles.section}>
               <Text style={[styles.sectionTitle, dynamicStyles.subText]}>NEW ACTIONS</Text>
               <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: 10 }]}
                onPress={() => setModalMode("create")}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                <Text style={styles.actionBtnText}>Create New Group</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setModalMode("join")}
              >
                <MaterialCommunityIcons name="link" size={20} color={colors.textPrimary} />
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Join Existing Group</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 50 }} />
          </View>
        )}
      </ScrollView>
    </Modal>
  );

  // --- MEMBERS MODAL ---
  const renderMembersModal = () => (
    <Modal
      isVisible={showMembersModal}
      onBackdropPress={() => setShowMembersModal(false)}
      onSwipeComplete={() => setShowMembersModal(false)}
      swipeDirection={["down"]}
      style={styles.modal}
      backdropOpacity={0.5}
    >
      <View style={[styles.modalContent, dynamicStyles.modalContent]}>
        <View style={styles.dragHandle} />
        <Text style={[styles.modalTitle, dynamicStyles.headerText]}>Group Members</Text>

        <FlatList
          data={groupMembers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
              ) : (
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: colors.white, fontWeight: "bold" }}>
                    {item.name?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, dynamicStyles.headerText]}>{item.name}</Text>
                <Text style={dynamicStyles.subText}>{item.email}</Text>
              </View>
              {isGroupOwner && item._id !== user.user?.id && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {showTransferModal && (
                    <TouchableOpacity 
                      onPress={() => handleTransferOwnership(item._id)}
                      style={[styles.transferBtn, { backgroundColor: colors.warning || "#F59E0B" }]}
                    >
                      <MaterialCommunityIcons name="crown" size={16} color={colors.white} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleRemoveMember(item._id)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color={colors.error || "#EF4444"} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptySubtitle, dynamicStyles.subText]}>No members found</Text>
          }
        />
      </View>
    </Modal>
  );

  // --- DETAIL MODAL ---
  const renderDetailModal = () => (
    <Modal
      isVisible={!!detailPost}
      onBackdropPress={() => setDetailPost(null)}
      onSwipeComplete={() => setDetailPost(null)}
      swipeDirection={["down"]}
      style={styles.detailModal}
      backdropOpacity={0.8}
      propagateSwipe
    >
      {detailPost && (
        <View style={[styles.detailCard, dynamicStyles.modalContent]}>
          <View style={styles.dragHandle} />
          
          <ScrollView>
            {/* Author */}
            <View style={styles.authorRow}>
              {detailPost.authorAvatar ? (
                <Image source={{ uri: detailPost.authorAvatar }} style={styles.authorAvatar} />
              ) : (
                <View style={[styles.authorAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: colors.white, fontWeight: "bold" }}>
                    {detailPost.authorName?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View>
                <Text style={[styles.authorName, dynamicStyles.headerText]}>
                  {detailPost.authorName}
                </Text>
                <Text style={dynamicStyles.subText}>{detailPost.date}</Text>
              </View>
            </View>

            {detailPost.image && (
              <TouchableOpacity onPress={() => setFullScreenImage(detailPost.image)} activeOpacity={0.9}>
                 <Image source={{ uri: detailPost.image }} style={styles.detailImage} />
              </TouchableOpacity>
            )}

            <View style={styles.detailBody}>
              <View style={styles.rowBetween}>
                <Text style={[styles.detailTitle, dynamicStyles.headerText]}>
                  {detailPost.topic}
                </Text>
                {detailPost.mood && <Text style={{ fontSize: 28 }}>{detailPost.mood}</Text>}
              </View>

              {detailPost.location && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                  <Text style={dynamicStyles.subText}> {detailPost.location}</Text>
                </View>
              )}

              {detailPost.tags && detailPost.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {detailPost.tags.map((t, i) => (
                    <View
                      key={i}
                      style={[styles.tagBadge, { backgroundColor: colors.surfaceHighlight }]}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 12 }}>#{t}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.detailText, dynamicStyles.headerText]}>
                {detailPost.text}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeDetailBtn}
            onPress={() => setDetailPost(null)}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.white} />
          </TouchableOpacity>

          {detailPost.isOwn && (
            <TouchableOpacity
              style={styles.editDetailBtn}
              onPress={() => {
                setEditingPost(detailPost);
                setDetailPost(null);
                setShowPostModal(true);
              }}
            >
              <MaterialCommunityIcons name="pencil" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Modal>
  );

  // --- NOT LOGGED IN STATE ---
  if (!user) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="account-group" size={60} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, dynamicStyles.subText]}>
          Log in to use Social
        </Text>
        <Text style={[styles.emptySubtitle, dynamicStyles.subText]}>
          Share memories with friends and family
        </Text>
      </View>
    );
  }

  // --- NO GROUPS STATE ---
  if (groups.length === 0 && !isLoading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
        
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, dynamicStyles.headerText, appStyles.headerTitleStyle]}>Social</Text>
        </View>

        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="account-group-outline" size={60} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, dynamicStyles.headerText]}>
            No groups yet
          </Text>
          <Text style={[styles.emptySubtitle, dynamicStyles.subText]}>
            Create a group or join one with an invite code
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setModalMode("create");
                setShowGroupModal(true);
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.actionBtnText}>Create Group</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => {
                setModalMode("join");
                setShowGroupModal(true);
              }}
            >
              <MaterialCommunityIcons name="link" size={20} color={colors.textPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderGroupModal()}
      </View>
    );
  }

  // --- MAIN RENDER ---
  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, dynamicStyles.headerText, appStyles.headerTitleStyle]}>Social</Text>
        <TouchableOpacity onPress={() => {
          setModalMode("menu");
          setShowGroupModal(true);
        }}>
          <MaterialCommunityIcons name="cog" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Group Selector */}
      <View style={styles.groupSelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {groups.map(renderGroupChip)}
          <TouchableOpacity
            onPress={() => {
               setModalMode("create");
               setShowGroupModal(true);
            }}
            style={[styles.groupChip, styles.addGroupChip, { borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Posts Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPostCard}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="image-multiple-outline" size={50} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, dynamicStyles.subText]}>No posts yet</Text>
            <Text style={[styles.emptySubtitle, dynamicStyles.subText]}>
              Be the first to share a memory!
            </Text>
          </View>
        }
      />

      {/* FAB */}
      {selectedGroup && (
        <TouchableOpacity
          style={[styles.fab, dynamicStyles.fab, { bottom: tabBarHeight + 20 }]}
          onPress={() => {
            setEditingPost(null);
            setShowPostModal(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Modals */}
      {renderGroupModal()}
      {renderMembersModal()}
      {renderDetailModal()}

      {/* FULL SCREEN IMAGE MODAL */}
       <Modal
        isVisible={!!fullScreenImage}
        onBackdropPress={() => setFullScreenImage(null)}
        onSwipeComplete={() => setFullScreenImage(null)}
        swipeDirection={["down", "up", "left", "right"]}
        style={{ margin: 0 }}
        backdropOpacity={1}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
          <TouchableOpacity 
            style={{ position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
            onPress={() => setFullScreenImage(null)}
          >
             <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {fullScreenImage && (
             <Image 
               source={{ uri: fullScreenImage }} 
               style={{ width: "100%", height: "100%", resizeMode: "contain" }} 
             />
          )}
        </View>
      </Modal>

      <SocialPostModal
        visible={showPostModal}
        onClose={() => {
          setShowPostModal(false);
          setEditingPost(null);
        }}
        onSave={handleSavePost}
        initialData={editingPost}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: {
  },
  groupSelector: {
    marginBottom: 15,
    paddingLeft: 20,
  },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  addGroupChip: {
    paddingHorizontal: 12,
  },
  memberBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  card: {
    borderRadius: 16,
    marginBottom: 15,
    overflow: "hidden",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: {
    fontWeight: "600",
    fontSize: 14,
  },
  dateText: {
    fontSize: 11,
  },
  editBtn: {
    padding: 6,
  },
  postImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  postContent: {
    padding: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topicText: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  textPreview: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  locText: {
    fontSize: 11,
    marginLeft: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  miniTag: {
    fontSize: 11,
    fontWeight: "600",
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginTop: 6,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
  // Modal Styles
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#888",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
  },
  inputBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  groupInfoCard: {
    padding: 15,
    borderRadius: 12,
  },
  groupInfoName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inviteCode: {
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 2,
  },
  membersBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  memberName: {
    fontWeight: "600",
  },
  // Detail Modal
  detailModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 10,
  },
  detailImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  detailBody: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 15,
  },
  closeDetailBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editDetailBtn: {
    position: "absolute",
    top: 20,
    right: 65,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Reaction Styles
  reactionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
  },
  reactionsLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  addReactionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionPicker: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  emojiBtn: {
    padding: 6,
  },
  // Group Settings Styles
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  transferBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  shareInviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    marginVertical: 20,
    marginHorizontal: -20,
  },
});

export default SocialScreen;
