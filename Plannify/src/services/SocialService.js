import { apiClient } from './apiClient';

export const SocialService = {
  // ============================================
  // GROUP ENDPOINTS
  // ============================================

  // Create a new group
  createGroup: async (token, name) => {
    return apiClient.post('/social/groups', { name }, token);
  },

  // Get user's groups
  getGroups: async (token) => {
    return apiClient.get('/social/groups', token);
  },

  // Join a group via invite code
  joinGroup: async (token, inviteCode) => {
    return apiClient.post('/social/groups/join', { inviteCode }, token);
  },

  // Leave a group
  leaveGroup: async (token, groupId) => {
    return apiClient.delete(`/social/groups/${groupId}/leave`, token);
  },

  // Get group members
  getMembers: async (token, groupId) => {
    return apiClient.get(`/social/groups/${groupId}/members`, token);
  },

  // Remove a member (owner only)
  removeMember: async (token, groupId, memberId) => {
    return apiClient.delete(`/social/groups/${groupId}/members/${memberId}`, token);
  },

  // Delete a group (owner only)
  deleteGroup: async (token, groupId) => {
    return apiClient.delete(`/social/groups/${groupId}`, token);
  },

  // ============================================
  // POST ENDPOINTS
  // ============================================

  // Get posts in a group
  getPosts: async (token, groupId) => {
    return apiClient.get(`/social/groups/${groupId}/posts`, token);
  },

  // Create a post
  createPost: async (token, groupId, postData) => {
    return apiClient.post(`/social/groups/${groupId}/posts`, postData, token);
  },

  // Update a post (author only)
  updatePost: async (token, postId, postData) => {
    return apiClient.put(`/social/posts/${postId}`, postData, token);
  },

  // Delete a post (author only)
  deletePost: async (token, postId) => {
    return apiClient.delete(`/social/posts/${postId}`, token);
  },

  // ============================================
  // REACTION ENDPOINTS
  // ============================================

  // Add reaction to a post
  addReaction: async (token, postId, emoji) => {
    return apiClient.post(`/social/posts/${postId}/reactions`, { emoji }, token);
  },

  // Remove reaction from a post
  removeReaction: async (token, postId) => {
    return apiClient.delete(`/social/posts/${postId}/reactions`, token);
  },

  // ============================================
  // GROUP SETTINGS ENDPOINTS
  // ============================================

  // Rename a group (owner only)
  renameGroup: async (token, groupId, name) => {
    return apiClient.put(`/social/groups/${groupId}`, { name }, token);
  },

  // Transfer group ownership (owner only)
  transferOwnership: async (token, groupId, newOwnerId) => {
    return apiClient.post(`/social/groups/${groupId}/transfer`, { newOwnerId }, token);
  },
};

export default SocialService;
