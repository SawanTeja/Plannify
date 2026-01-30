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
import { AppContext } from "../context/AppContext";
import { getData, storeData } from "../utils/storageHelper";

// Icon Import
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

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
  const { colors } = useContext(AppContext);

  const headerStyle = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { fontWeight: "bold" },
    headerShadowVisible: false,
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
  HomeTab: "home-variant",
  Habits: "fire",
  Tasks: "checkbox-marked-circle-outline",
  Attendance: "school",
  BudgetTab: "wallet",
  Journal: "notebook",
  BucketList: "star-four-points",
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
  colors,
  onReorder,
}) => {
  const { routes, index: activeIndex } = state;
  const screenWidth = Dimensions.get("window").width;
  const flatListRef = useRef(null);

  const TAB_WIDTH = (screenWidth - 40) / 4.5;

  useEffect(() => {
    if (flatListRef.current && routes.length > 0) {
      flatListRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [activeIndex, routes.length]);

  const renderTabButton = (route, isActive, drag) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel || TAB_LABELS[route.name];
    const iconName = TAB_ICONS[route.name] || "help-circle";

    // Colors
    const activeColor = colors.white;
    const inactiveColor = colors.textMuted || "#888";

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
        activeOpacity={0.7}
        style={[styles.tabItem, { width: TAB_WIDTH }]}
      >
        {/* TAB CONTENT WRAPPER
            This single view holds BOTH Icon and Text.
            The Background Circle is absolutely positioned inside here.
        */}
        <View style={styles.tabContent}>
          {isActive && (
            <View
              style={[
                styles.activeBackground,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
            />
          )}

          <MaterialCommunityIcons
            name={iconName}
            size={24}
            color={isActive ? activeColor : inactiveColor}
          />

          <Text
            style={[
              styles.tabLabel,
              {
                color: isActive ? activeColor : inactiveColor,
                opacity: isActive ? 1 : 0.7,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.floatingContainer}>
      <View
        style={[
          styles.glassPanel,
          {
            backgroundColor: colors.glassBg,
            borderColor: colors.glassBorder,
            shadowColor: colors.shadow,
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
    </View>
  );
};

// --- MAIN NAVIGATOR ---
const MainTabNavigator = () => {
  const { colors, userData } = useContext(AppContext);
  const [orderedTabs, setOrderedTabs] = useState(DEFAULT_TAB_ORDER);
  const [isLoaded, setIsLoaded] = useState(false);

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
        <CustomTabBar {...props} colors={colors} onReorder={handleReorder} />
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
  floatingContainer: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  glassPanel: {
    height: 70,
    width: "100%",
    borderRadius: 35,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tabItem: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  // UPDATED: A large, unified container for Icon + Text
  tabContent: {
    width: 60, // Increased width
    height: 60, // Increased height to wrap both elements
    borderRadius: 30, // Perfectly rounded
    justifyContent: "center",
    alignItems: "center",
  },
  activeBackground: {
    ...StyleSheet.absoluteFillObject, // Fills the tabContent completely
    borderRadius: 30,
    opacity: 1, // Full opacity or slightly less if desired
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2, // Slight spacing between Icon and Text
    zIndex: 2,
  },
});

export default MainTabNavigator;
