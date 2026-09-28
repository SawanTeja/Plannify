import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useEffect, useState } from "react";
import { Appearance, AppState } from "react-native";
import { StatusBar } from "expo-status-bar";

import allColors from "../constants/colors";
import { getData, storeData } from "../utils/storageHelper";

// Auth Services
import {
  configureGoogleSignIn,
  getCurrentUser,
  refreshGoogleToken,
  signInWithGoogle,
  signOutGoogle,
} from "../services/AuthService";

// Backend Integration Services
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

  // Premium State
  const [isPremium, setIsPremium] = useState(false);

  // Unified User Data State (Local profile data)
  const [userData, setUserData] = useState({
    name: "Guest",
    image: null,
    userType: "student",
    isOnboarded: false,
    notifyTasks: true,
  });

  // Calculate theme colors
  const baseColors = allColors[theme] || allColors.dark;
  const activeColors = {
    ...allColors.common,
    ...baseColors,
  };

  // --- SYNC LOGIC ---
  const performSync = useCallback(async (forceToken = null, silent = false) => {
    if (isSyncing && !silent) return;

    const token = forceToken || user?.idToken;
    if (!token) return;

    try {
      if (!silent) setIsSyncing(true);

      const lastSyncTime = await getData("last_sync_timestamp");
      const changes = await SyncHelper.getChanges(lastSyncTime, isPremium);

      if (!silent) {
        console.log(`Syncing... (Last: ${lastSyncTime || "Never"}) Premium: ${isPremium}`);
      }

      const response = await ApiService.sync(token, lastSyncTime, changes);

      if (response && response.success) {
        const hasNewData = await SyncHelper.applyServerChanges(response.changes || {}, isPremium);
        await storeData("last_sync_timestamp", response.timestamp);

        if (hasNewData) {
          console.log("✨ New Data Received from Cloud!");
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
  }, [isSyncing, user?.idToken, isPremium]);

  // 1. AUTO-SYNC TIMER
  useEffect(() => {
    let syncInterval;

    if (user?.idToken) {
      console.log("🟢 Auto-Sync Started (Every 5s)");
      syncInterval = setInterval(() => {
        performSync(user.idToken, true);
      }, 5000);
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [user?.idToken, performSync]);

  // 2. APP STATE LISTENER (Auto-Refresh Token on Resume)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active" && user) {
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
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [user, performSync]);

  // Check Google Login Status
  const checkUser = useCallback(async () => {
    try {
      const refreshedUser = await refreshGoogleToken();

      if (refreshedUser) {
        console.log("✅ Auto-Login with Fresh Token");
        setUser(refreshedUser);
        if (refreshedUser.idToken) performSync(refreshedUser.idToken);
      } else {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userObj = {
            user: currentUser.user || currentUser,
            idToken: currentUser.idToken,
          };
          setUser(userObj);
          if (userObj.idToken) performSync(userObj.idToken);
        }
      }
    } catch (e) {
      console.log("Auth Check Error:", e);
    } finally {
      setAuthLoading(false);
    }
  }, [performSync]);

  // Settings Loader
  const loadSettings = useCallback(async () => {
    const storedTheme = await getData("app_theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const colorScheme = Appearance.getColorScheme();
      setTheme(colorScheme || "dark");
    }

    const storedUserData = await getData("user_data");
    if (storedUserData) {
      setUserData((prev) => ({ ...prev, ...storedUserData }));
    }

    await checkUser();
  }, [checkUser]);

  useEffect(() => {
    configureGoogleSignIn();
    loadSettings();
  }, [loadSettings]);

  const updateUserData = useCallback(async (newData) => {
    setUserData((prev) => {
      const updatedState = { ...prev, ...newData };
      storeData("user_data", updatedState);
      return updatedState;
    });
  }, []);

  const login = async () => {
    try {
      setAuthLoading(true);
      const userInfo = await signInWithGoogle();

      if (!userInfo) {
        setAuthLoading(false);
        return null;
      }

      if (userInfo.idToken) {
        try {
          console.log("Verifying token with backend...");
          await ApiService.login(userInfo.idToken);
          setUser(userInfo);
          performSync(userInfo.idToken);
        } catch (backendError) {
          console.error("Backend login failed (Offline mode active):", backendError);
          setUser(userInfo);
        }
      }

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
    } catch (error) {
      console.log("Logout failed", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    await storeData("app_theme", newTheme);
  };

  const getStorageUsage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      for (const key of keys) {
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
          },
        },
      }}
    >
      <StatusBar
        style={theme === "dark" ? "light" : "dark"}
        backgroundColor={activeColors.background}
      />
      {children}
    </AppContext.Provider>
  );
};