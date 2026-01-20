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

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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
        setUser(currentUser);
        // Optional: specific logic to sync Google profile photo to your local 'userData'
        // if (currentUser.user.photo) updateUserData({ image: currentUser.user.photo });
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
      setUser(userInfo);

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
      throw error; // Rethrow so the UI can show an alert
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      setAuthLoading(true);
      await signOutGoogle();
      setUser(null);
      // Optional: Reset local user data to Guest on logout?
      // updateUserData({ name: "Guest", image: null });
    } catch (error) {
      console.log("Logout failed", error);
    } finally {
      setAuthLoading(false);
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
        user, // The Google User Object
        authLoading, // Boolean to show spinners during login
        login, // Function to trigger Google Login
        logout, // Function to trigger Google Logout
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
