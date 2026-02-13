import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/context/AppContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { useEffect } from "react";
import "./src/services/NotificationService";
import { scheduleDailyMorningReminder } from "./src/services/NotificationService";

export default function App() {
  useEffect(() => {
    scheduleDailyMorningReminder();
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
