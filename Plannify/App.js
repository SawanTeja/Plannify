import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/context/AppContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { useEffect } from "react";
import "./src/services/NotificationService";
import { scheduleDailyMorningReminder, scheduleNightlyReminder } from "./src/services/NotificationService";

// Import Alert Context & Component
import { AlertProvider } from "./src/context/AlertContext"; 
import PremiumAlert from "./src/components/PremiumAlert";

export default function App() {
  useEffect(() => {
    scheduleDailyMorningReminder();
    scheduleNightlyReminder();
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AlertProvider>
            <AppNavigator />
            <PremiumAlert /> 
        </AlertProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
