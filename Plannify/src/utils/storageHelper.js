import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Generic Storage Helper
 * Provides safe AsyncStorage read/write operations with error handling.
 */

export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (e) {
    console.error(`Error saving data for key "${key}":`, e);
    return false;
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error(`Error reading data for key "${key}":`, e);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`Error removing data for key "${key}":`, e);
    return false;
  }
};
