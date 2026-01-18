import AsyncStorage from "@react-native-async-storage/async-storage"; // <--- Added this
import { createContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import { getData, storeData } from "../utils/storageHelper";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  // Unified User Data State
  const [userData, setUserData] = useState({
    name: "Guest",
    image: null,
    userType: "student",
    isOnboarded: false,
    notifyTasks: true,
  });

  useEffect(() => {
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

    // 2. Load User Data
    const storedUserData = await getData("user_data");
    if (storedUserData) {
      setUserData((prev) => ({ ...prev, ...storedUserData }));
    }
  };

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

  // Helper for Storage Menu
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
        toggleTheme,
        userData,
        updateUserData,
        setUserData,
        getStorageUsage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
