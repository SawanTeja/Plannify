import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import { Appearance, StatusBar } from "react-native";
import allColors from "../constants/colors";
import { getData, storeData } from "../utils/storageHelper";

// Import Auth Services
import {
  configureGoogleSignIn,
  getCurrentUser,
  signInWithGoogle,
  signOutGoogle,
} from "../services/AuthService";

// Import Backend Integration Services
import { ApiService } from "../services/ApiService"; 
import { SyncHelper } from "../utils/SyncHelper";   

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(0);

  // Unified User Data State (Local profile data)
  const [userData, setUserData] = useState({
    name: "Guest",
    image: null,
    userType: "student",
    isOnboarded: false,
    notifyTasks: true,
  });

  const activeColors = {
    ...allColors.common,
    ...allColors[theme],
  };

  // 1. AUTO-SYNC TIMER
  useEffect(() => {
    let syncInterval;

    if (user && user.idToken) {
        console.log("🟢 Auto-Sync Started (Every 15s)");
        // Run sync every 5 seconds for near real-time updates
        syncInterval = setInterval(() => {
            performSync(user.idToken, true); // true = silent mode
        }, 5000); 
    }

    return () => {
        if (syncInterval) clearInterval(syncInterval);
    };
  }, [user]); // Re-run when user logs in/out

  useEffect(() => {
    // Initialize Google Auth Config
    configureGoogleSignIn();

    // Load all settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // 1. Load Theme
    const storedTheme = await getData("app_theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const colorScheme = Appearance.getColorScheme();
      setTheme(colorScheme || "dark");
    }

    // 2. Load Local User Data
    const storedUserData = await getData("user_data");
    if (storedUserData) {
      setUserData((prev) => ({ ...prev, ...storedUserData }));
    }

    // 3. Check Google Login Status
    await checkUser();
  };

  // --- Auth Helper Functions ---
  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Adapt structure to match what login() returns
        const userObj = {
            user: currentUser.user || currentUser,
            idToken: currentUser.idToken // Ensure this exists if checking silently
        };
        setUser(userObj);
        
        // Trigger immediate sync on app launch
        if (userObj.idToken) performSync(userObj.idToken);
      }
    } catch (e) {
      console.log("Auth Check Error:", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async () => {
    try {
      setAuthLoading(true);
      const userInfo = await signInWithGoogle();
      
      if (!userInfo) {
          setAuthLoading(false);
          return; // User cancelled
      }

      // --- BACKEND INTEGRATION START ---
      if (userInfo.idToken) {
          try {
              console.log("Verifying token with backend...");
              // 1. Authenticate with your Express Backend
              await ApiService.login(userInfo.idToken);
              
              // 2. Set User State
              setUser(userInfo);

              // 3. Trigger Initial Sync
              // We don't await this so the UI unblocks immediately
              performSync(userInfo.idToken); 

          } catch (backendError) {
              console.error("Backend login failed (Offline mode active):", backendError);
              // We still allow login locally even if backend fails
              setUser(userInfo);
          }
      }
      // --- BACKEND INTEGRATION END ---

      // Auto-update local name if it's currently "Guest"
      if (userData.name === "Guest" && userInfo?.user?.name) {
        updateUserData({
          name: userInfo.user.name,
          image: userInfo.user.photo,
        });
      }

      return userInfo;
    } catch (error) {
      console.log("Login failed", error);
      throw error; 
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      setAuthLoading(true);
      await signOutGoogle();
      setUser(null);
      // Optional: Clear sync timestamp so next login is a fresh full pull?
      // await storeData('last_sync_timestamp', null);
    } catch (error) {
      console.log("Logout failed", error);
    } finally {
      setAuthLoading(false);
    }
  };

  // --- NEW SYNC LOGIC ---
  const performSync = async (forceToken = null, silent = false) => {
    // If already syncing, skip (unless it's a forced manual sync or we want to allow overlap which is dangerous)
    if (isSyncing && !silent) return;
    
    const token = forceToken || user?.idToken; 

    if (!token) {
        // Silent fail if no token
        return;
    }

    try {
      if (!silent) setIsSyncing(true);
      
      // 1. Get Last Sync Time
      const lastSyncTime = await getData('last_sync_timestamp');
      
      // 2. Gather Local Changes
      const changes = await SyncHelper.getChanges(lastSyncTime);
      
      if (!silent) console.log(`Syncing... (Last: ${lastSyncTime || 'Never'})`);

      // 3. Call API
      const response = await ApiService.sync(token, lastSyncTime, changes);
      
      if (response.success) {
        // 4. Apply Server Changes to Local Storage
        const hasNewData = await SyncHelper.applyServerChanges(response.changes || {});
        
        // 5. Update Timestamp
        await storeData('last_sync_timestamp', response.timestamp);
        
        if (hasNewData) {
            console.log("✨ New Data Received from Cloud!");
            // Update this counter to notify screens to reload!
            setLastRefreshed(Date.now()); 
        } else if (!silent) {
            console.log("✅ Sync Complete (No new data)");
        }
      }

    } catch (error) {
      if (!silent) console.error("❌ Sync Failed:", error);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };
  // ---------------------------

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    await storeData("app_theme", newTheme);
  };

  const updateUserData = async (newData) => {
    setUserData((prev) => {
      const updatedState = { ...prev, ...newData };
      storeData("user_data", updatedState);
      return updatedState;
    });
  };

  const getStorageUsage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      for (let key of keys) {
        const item = await AsyncStorage.getItem(key);
        totalSize += item ? item.length : 0;
      }
      return (totalSize / 1024).toFixed(2) + " KB";
    } catch (e) {
      console.log("Storage Error:", e);
      return "Unknown";
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        colors: activeColors,
        toggleTheme,
        userData,
        updateUserData,
        setUserData,
        getStorageUsage,
        // Auth Values
        user, 
        authLoading, 
        login, 
        logout, 
        // Sync Values
        syncNow: () => performSync(),
        isSyncing,
        lastRefreshed
      }}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={activeColors.background}
      />
      {children}
    </AppContext.Provider>
  );
};