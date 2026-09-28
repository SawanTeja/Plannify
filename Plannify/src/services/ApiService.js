import { apiClient } from './apiClient';

export const ApiService = {
  // 1. Authenticate with Backend
  login: async (googleIdToken) => {
    return apiClient.get('/auth/me', googleIdToken);
  },

  // 2. Sync Data (Push & Pull)
  sync: async (googleIdToken, lastSyncTime, changes) => {
    return apiClient.post(
      '/sync',
      {
        lastSync: lastSyncTime,
        changes,
      },
      googleIdToken
    );
  },

  // 3. Reset Data (Clear all user data from backend)
  resetData: async (googleIdToken) => {
    return apiClient.delete('/sync/reset', googleIdToken);
  },

  // 4. Delete Journal Entry (with Cloudinary image)
  deleteJournal: async (googleIdToken, journalId) => {
    return apiClient.delete(`/journal/${journalId}`, googleIdToken);
  },
};

export default ApiService;