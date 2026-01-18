import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useContext } from "react";

import { ActivityIndicator, View } from "react-native";

import { AppContext } from "../context/AppContext";

// Navigators

import MainTabNavigator from "./MainTabNavigator";

// Screens

import SetupScreen from "../screens/Onboarding/SetupScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { userData, loading, theme } = useContext(AppContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const MyDarkTheme = {
    ...DarkTheme,

    colors: {
      ...DarkTheme.colors,

      background: "#121212",

      card: "#1e1e1e",

      text: "#ffffff",
    },
  };

  return (
    <NavigationContainer theme={theme === "dark" ? MyDarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userData.isOnboarded ? (
          <Stack.Screen name="Setup" component={SetupScreen} />
        ) : (
          // The Tabs now contain ALL the sub-screens inside them

          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
