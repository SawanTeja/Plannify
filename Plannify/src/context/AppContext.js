import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import allColors from "../constants/colors";
import { getData, storeData } from "../utils/storageHelper";

// Import Auth Services
import {
  configureGoogleSignIn,
  getCurrentUser,
  refreshGoogleToken,
  signInWithGoogle,
  signOutGoogle,
} from "../services/AuthService";

// Import Backend Integration Services
import { ApiService } from "../services/ApiService"; 
import { SyncHelper } from "../utils/SyncHelper";   

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");
  const [isMaterialYou, setIsMaterialYou] = useState(true); // Default to true
  const { theme: materialTheme } = useMaterial3Theme();

  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(0);

  // Premium State (Temporary Toggle)
  const [isPremium, setIsPremium] = useState(false); // Default to false

  // Unified User Data State (Local profile data)
  const [userData, setUserData] = useState({
    name: "Guest",
    image: null,
    userType: "student",
    isOnboarded: false,
    notifyTasks: true,
  });

  // Calculate generic colors
  const baseColors = allColors[theme];
  // Calculate Material You overrides if available AND enabled
  const materialColors = (isMaterialYou && materialTheme) ? materialTheme[theme] : null;

  const activeColors = {
    ...allColors.common,
    ...baseColors,
    // Override with Material You colors if available
    ...(materialColors ? {
      primary: materialColors.primary,
      primaryLight: materialColors.primaryContainer,
      secondary: materialColors.secondary, // Or tertiary
      accent: materialColors.tertiary,
      
      background: materialColors.background,
      surface: materialColors.surface,
      surfaceHighlight: materialColors.surfaceVariant,
      
      textPrimary: materialColors.onBackground,
      textSecondary: materialColors.onSurfaceVariant,
      textMuted: materialColors.outline,

      border: materialColors.outlineVariant,
      divider: materialColors.outlineVariant,
      
      // Keep app-specific custom mappings if needed
    } : {})
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
  }, [user, isPremium]); // Re-run when user logs in/out or premium status changes

  // 2. APP STATE LISTENER (Auto-Refresh Token on Resume)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log("📱 App has come to the foreground!");
        if (user) {
          console.log("🔄 Refreshing Token...", user.user?.email);
          const freshUser = await refreshGoogleToken();
          if (freshUser && freshUser.idToken) {
             console.log("✅ Token Refreshed Successfully");
             setUser(freshUser);
             performSync(freshUser.idToken);
          } else {
             console.log("⚠️ Token Refresh Failed or Cancelled");
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [user, isPremium]);

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

    // 3. Load Material You Setting
    const storedMaterialYou = await getData("is_material_you");
    if (storedMaterialYou !== null) { // Check for null because false is valid
      setIsMaterialYou(storedMaterialYou);
    }
    
    // 4. Load Premium Status (if you want to persist it, for now using state only as requested)
    // const storedPremium = await getData("is_premium");
    // if (storedPremium !== null) setIsPremium(storedPremium);

    // 5. Check Google Login Status
    await checkUser();
  };

  // --- Auth Helper Functions ---
  const checkUser = async () => {
    try {
      // PROACTIVELY TRY TO REFRESH TOKEN ON STARTUP
      const refreshedUser = await refreshGoogleToken();
      
      if (refreshedUser) {
        console.log("✅ Auto-Login with Fresh Token");
        setUser(refreshedUser);
        if (refreshedUser.idToken) performSync(refreshedUser.idToken);
      } else {
        // Fallback to standard check if silent sign-in fails (e.g. no internet but maybe cached?)
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
      // UPDATED: Pass isPremium to getChanges
      const changes = await SyncHelper.getChanges(lastSyncTime, isPremium);
      
      if (!silent) console.log(`Syncing... (Last: ${lastSyncTime || 'Never'}) Premium: ${isPremium}`);

      // 3. Call API
      const response = await ApiService.sync(token, lastSyncTime, changes);
      
      if (response.success) {
        // 4. Apply Server Changes to Local Storage
        // UPDATED: Pass isPremium to applyServerChanges
        const hasNewData = await SyncHelper.applyServerChanges(response.changes || {}, isPremium);
        
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

  const toggleMaterialYou = async () => {
    setIsMaterialYou(prev => {
        const newVal = !prev;
        storeData("is_material_you", newVal);
        return newVal;
    });
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
        isMaterialYou,
        toggleMaterialYou,
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
        lastRefreshed,
        // Premium Values
        isPremium,
        setIsPremium,
        // Global Styles
        appStyles: {
            headerTitleStyle: {
                fontSize: 28,
                fontWeight: "bold",
                letterSpacing: 0.5,
            }
        }
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