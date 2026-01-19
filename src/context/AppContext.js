import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import { Appearance, StatusBar } from "react-native";
import allColors from "../constants/colors"; // Import the new palette
import { getData, storeData } from "../utils/storageHelper";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  // This is the magic line. It selects the correct object based on the string 'light' or 'dark'
  // We merge 'common' colors so they are always available.
  const activeColors = {
    ...allColors.common,
    ...allColors[theme],
  };

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
        theme, // 'light' or 'dark'
        colors: activeColors, // The actual color object (hex codes)
        toggleTheme,
        userData,
        updateUserData,
        setUserData,
        getStorageUsage,
      }}
    >
      {/* We update the Status Bar (time/battery icons) to match the theme.
         If Dark Mode -> Light Content. If Light Mode -> Dark Content.
      */}
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={activeColors.background}
      />
      {children}
    </AppContext.Provider>
  );
};
