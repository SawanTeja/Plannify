import { getData } from '../utils/storageHelper';

// IMPORTANT: This should match your ApiService URL configuration
const API_URL = 'http://localhost:5000/api';

export const SocialService = {
  // ============================================
  // GROUP ENDPOINTS
  // ============================================

  // Create a new group
  createGroup: async (token, name) => {
    try {
      const response = await fetch(`${API_URL}/social/groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create group');
      return data;
    } catch (error) {
      console.error('Create Group Error:', error);
      throw error;
    }
  },

  // Get user's groups
  getGroups: async (token) => {
    try {
      const response = await fetch(`${API_URL}/social/groups`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch groups');
      return data;
    } catch (error) {
      console.error('Get Groups Error:', error);
      throw error;
    }
  },

  // Join a group via invite code
  joinGroup: async (token, inviteCode) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to join group');
      return data;
    } catch (error) {
      console.error('Join Group Error:', error);
      throw error;
    }
  },

  // Leave a group
  leaveGroup: async (token, groupId) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to leave group');
      return data;
    } catch (error) {
      console.error('Leave Group Error:', error);
      throw error;
    }
  },

  // Get group members
  getMembers: async (token, groupId) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch members');
      return data;
    } catch (error) {
      console.error('Get Members Error:', error);
      throw error;
    }
  },

  // Remove a member (owner only)
  removeMember: async (token, groupId, memberId) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove member');
      return data;
    } catch (error) {
      console.error('Remove Member Error:', error);
      throw error;
    }
  },

  // Delete a group (owner only)
  deleteGroup: async (token, groupId) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete group');
      return data;
    } catch (error) {
      console.error('Delete Group Error:', error);
      throw error;
    }
  },

  // ============================================
  // POST ENDPOINTS
  // ============================================

  // Get posts in a group
  getPosts: async (token, groupId) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}/posts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch posts');
      return data;
    } catch (error) {
      console.error('Get Posts Error:', error);
      throw error;
    }
  },

  // Create a post
  createPost: async (token, groupId, postData) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create post');
      return data;
    } catch (error) {
      console.error('Create Post Error:', error);
      throw error;
    }
  },

  // Update a post (author only)
  updatePost: async (token, postId, postData) => {
    try {
      const response = await fetch(`${API_URL}/social/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update post');
      return data;
    } catch (error) {
      console.error('Update Post Error:', error);
      throw error;
    }
  },

  // Delete a post (author only)
  deletePost: async (token, postId) => {
    try {
      const response = await fetch(`${API_URL}/social/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete post');
      return data;
    } catch (error) {
      console.error('Delete Post Error:', error);
      throw error;
    }
  },

  // ============================================
  // REACTION ENDPOINTS
  // ============================================

  // Add reaction to a post
  addReaction: async (token, postId, emoji) => {
    try {
      const response = await fetch(`${API_URL}/social/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add reaction');
      return data;
    } catch (error) {
      console.error('Add Reaction Error:', error);
      throw error;
    }
  },

  // Remove reaction from a post
  removeReaction: async (token, postId) => {
    try {
      const response = await fetch(`${API_URL}/social/posts/${postId}/reactions`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove reaction');
      return data;
    } catch (error) {
      console.error('Remove Reaction Error:', error);
      throw error;
    }
  },

  // ============================================
  // GROUP SETTINGS ENDPOINTS
  // ============================================

  // Rename a group (owner only)
  renameGroup: async (token, groupId, name) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to rename group');
      return data;
    } catch (error) {
      console.error('Rename Group Error:', error);
      throw error;
    }
  },

  // Transfer group ownership (owner only)
  transferOwnership: async (token, groupId, newOwnerId) => {
    try {
      const response = await fetch(`${API_URL}/social/groups/${groupId}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newOwnerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to transfer ownership');
      return data;
    } catch (error) {
      console.error('Transfer Ownership Error:', error);
      throw error;
    }
  },
};
