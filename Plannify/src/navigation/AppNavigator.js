import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useContext } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { AppContext } from "../context/AppContext";

// Navigators
import MainTabNavigator from "./MainTabNavigator";

// Screens
import SetupScreen from "../screens/Onboarding/SetupScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { userData, theme, colors } = useContext(AppContext);

  // 1. Select the Base Theme (Dark or Default) to get default fonts/props
  const BaseTheme = theme === "dark" ? DarkTheme : DefaultTheme;

  // 2. Create the Custom Theme by overriding ONLY the colors
  const NavigationTheme = {
    ...BaseTheme, // <--- CRITICAL: This copies 'fonts' and other props
    colors: {
      ...BaseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.secondary,
    },
  };

  // Loading State
  if (userData === undefined) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NavigationTheme}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        {!userData.isOnboarded ? (
          <Stack.Screen name="Setup" component={SetupScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
