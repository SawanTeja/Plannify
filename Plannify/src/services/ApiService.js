import { getData } from '../utils/storageHelper';

// CHANGE THIS to your machine's IP if testing on real device!
// For Android Emulator, use 'http://10.0.2.2:5000/api'
// const API_URL = 'http://10.0.2.2:5000/api'; 
// const API_URL = 'http://localhost:5000/api';
const API_URL = 'https://plannify-red.vercel.app/api';

export const ApiService = {
  // 1. Authenticate with Backend
  login: async (googleIdToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${googleIdToken}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Backend Login Error:", error);
      throw error;
    }
  },

  // 2. Sync Data (Push & Pull)
  sync: async (googleIdToken, lastSyncTime, changes) => {
    try {
      const response = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleIdToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastSync: lastSyncTime, // The server uses this to know what to send back
          changes: changes,       // The data we are pushing to the server
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("Sync Error:", error);
      throw error;
    }
  },

  // 3. Reset Data (Clear all user data from backend)
  resetData: async (googleIdToken) => {
    try {
      const response = await fetch(`${API_URL}/sync/reset`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${googleIdToken}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Reset Data Error:", error);
      throw error;
    }
  },

  // 4. Delete Journal Entry (with Cloudinary image)
  deleteJournal: async (googleIdToken, journalId) => {
    try {
      const response = await fetch(`${API_URL}/journal/${journalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${googleIdToken}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Delete Journal Error:", error);
      throw error;
    }
  }
};