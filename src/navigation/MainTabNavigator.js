import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import colors from "../constants/colors";
import { AppContext } from "../context/AppContext";
import { getData, storeData } from "../utils/storageHelper";

// Draggable List Imports
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Screens
import AttendanceScreen from "../screens/Attendance/AttendanceScreen";
import BucketListScreen from "../screens/BucketList/BucketListScreen";
import BudgetHistory from "../screens/Budget/BudgetHistory";
import BudgetScreen from "../screens/Budget/BudgetScreen";
import BudgetSetup from "../screens/Budget/BudgetSetup";
import HabitScreen from "../screens/Habits/HabitScreen";
import SummaryDashboard from "../screens/Home/SummaryDashboard";
import JournalScreen from "../screens/Journal/JournalScreen";
import TaskScreen from "../screens/Tasks/TaskScreen";

const Tab = createMaterialTopTabNavigator();
const HomeStack = createNativeStackNavigator();
const BudgetStack = createNativeStackNavigator();

// --- STACK NAVIGATORS ---
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Dashboard"
        component={SummaryDashboard}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
};

const BudgetStackNavigator = () => {
  const { theme } = useContext(AppContext);
  const isDark = theme === "dark";
  const headerStyle = {
    headerStyle: { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
    headerTintColor: isDark ? "#fff" : "#000",
    headerTitleStyle: { fontWeight: "bold" },
  };
  return (
    <BudgetStack.Navigator>
      <BudgetStack.Screen
        name="BudgetMain"
        component={BudgetScreen}
        options={{ headerShown: false }}
      />
      <BudgetStack.Screen
        name="BudgetHistory"
        component={BudgetHistory}
        options={{ title: "History", ...headerStyle }}
      />
      <BudgetStack.Screen
        name="BudgetSetup"
        component={BudgetSetup}
        options={{ title: "Edit Budget", ...headerStyle }}
      />
    </BudgetStack.Navigator>
  );
};

// --- CONFIGURATION ---
const DEFAULT_TAB_ORDER = [
  "HomeTab",
  "Habits",
  "Tasks",
  "Attendance",
  "BudgetTab",
  "Journal",
  "BucketList",
];

const TAB_ICONS = {
  HomeTab: "🏠",
  Habits: "🔥",
  Tasks: "✅",
  Attendance: "🎓",
  BudgetTab: "💰",
  Journal: "📖",
  BucketList: "✨",
};

const TAB_LABELS = {
  HomeTab: "Home",
  Habits: "Habits",
  Tasks: "Tasks",
  Attendance: "Attend",
  BudgetTab: "Budget",
  Journal: "Journal",
  BucketList: "Bucket",
};

// --- CUSTOM DRAGGABLE TAB BAR ---
const CustomTabBar = ({
  state,
  descriptors,
  navigation,
  isDark,
  onReorder,
}) => {
  const { routes, index: activeIndex } = state;
  const screenWidth = Dimensions.get("window").width;
  const flatListRef = useRef(null);
  const TAB_WIDTH = screenWidth / 4.2; // Extracted width constant

  // Auto-scroll to active tab when index changes (e.g., via swipe)
  useEffect(() => {
    if (flatListRef.current && routes.length > 0) {
      flatListRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5, // Centers the active tab
      });
    }
  }, [activeIndex, routes.length]);

  // Helper to render a single tab button
  const renderTabButton = (route, isActive, drag) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel || TAB_LABELS[route.name];
    const icon = TAB_ICONS[route.name] || "❓";
    const color = isActive ? colors.primary : isDark ? "#666" : "#999";

    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        onLongPress={drag}
        delayLongPress={200}
        style={[
          styles.tabItem,
          { width: TAB_WIDTH },
          isActive && styles.activeTabItem,
        ]}
      >
        <Text style={{ fontSize: 24, opacity: isActive ? 1 : 0.7, color }}>
          {icon}
        </Text>
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
          borderTopColor: isDark ? "#333" : "#eee",
        },
      ]}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DraggableFlatList
          ref={flatListRef}
          data={routes}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          // Optimization for scrollToIndex
          getItemLayout={(data, index) => ({
            length: TAB_WIDTH,
            offset: TAB_WIDTH * index,
            index,
          })}
          onDragEnd={({ data }) => {
            const newOrder = data.map((route) => route.name);
            onReorder(newOrder);
          }}
          renderItem={({ item, drag, isActive }) => {
            const isTabActive = state.index === state.routes.indexOf(item);
            return (
              <ScaleDecorator>
                {renderTabButton(item, isTabActive, drag)}
              </ScaleDecorator>
            );
          }}
        />
      </GestureHandlerRootView>
    </View>
  );
};

// --- MAIN NAVIGATOR ---
const MainTabNavigator = () => {
  const { theme, userData } = useContext(AppContext);
  const isDark = theme === "dark";
  const [orderedTabs, setOrderedTabs] = useState(DEFAULT_TAB_ORDER);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved order on startup
  useEffect(() => {
    const loadOrder = async () => {
      const savedOrder = await getData("userTabOrder");
      if (savedOrder && Array.isArray(savedOrder)) {
        const combinedOrder = [
          ...new Set([...savedOrder, ...DEFAULT_TAB_ORDER]),
        ];
        setOrderedTabs(combinedOrder);
      }
      setIsLoaded(true);
    };
    loadOrder();
  }, []);

  const handleReorder = useCallback((newOrder) => {
    setOrderedTabs(newOrder);
    storeData("userTabOrder", newOrder);
  }, []);

  if (!isLoaded) return null;

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBarPosition="bottom"
      tabBar={(props) => (
        <CustomTabBar {...props} isDark={isDark} onReorder={handleReorder} />
      )}
      screenOptions={{
        swipeEnabled: true,
      }}
    >
      {orderedTabs.map((name) => {
        if (name === "Attendance" && userData.userType !== "student")
          return null;

        switch (name) {
          case "HomeTab":
            return (
              <Tab.Screen
                key={name}
                name="HomeTab"
                component={HomeStackNavigator}
                options={{ tabBarLabel: "Home" }}
              />
            );
          case "Habits":
            return (
              <Tab.Screen key={name} name="Habits" component={HabitScreen} />
            );
          case "Tasks":
            return (
              <Tab.Screen key={name} name="Tasks" component={TaskScreen} />
            );
          case "Attendance":
            return (
              <Tab.Screen
                key={name}
                name="Attendance"
                component={AttendanceScreen}
                options={{ tabBarLabel: "Attend" }}
              />
            );
          case "BudgetTab":
            return (
              <Tab.Screen
                key={name}
                name="BudgetTab"
                component={BudgetStackNavigator}
                options={{ tabBarLabel: "Budget" }}
              />
            );
          case "Journal":
            return (
              <Tab.Screen key={name} name="Journal" component={JournalScreen} />
            );
          case "BucketList":
            return (
              <Tab.Screen
                key={name}
                name="BucketList"
                component={BucketListScreen}
                options={{ tabBarLabel: "Bucket" }}
              />
            );
          default:
            return null;
        }
      })}
    </Tab.Navigator>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    height: 90,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 20,
    elevation: 0,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  activeTabItem: {
    // Optional highlight
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 2,
  },
  activeIndicator: {
    position: "absolute",
    top: -10,
    width: "40%",
    height: 3,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default MainTabNavigator;
