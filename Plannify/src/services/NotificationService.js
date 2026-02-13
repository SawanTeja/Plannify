import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }
  return true;
};

export const scheduleLocalNotification = async (title, body, data = {}, trigger = null) => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "Test Notification",
        body: body || "This is a test notification from Plannify!",
        data: data,
        sound: true, // explicit sound enable
      },
      trigger: trigger || null, // null means immediate
    });
    console.log("Notification scheduled");
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }
};

export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

export const scheduleDailyMorningReminder = async () => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // content
  const content = {
    title: "Good Morning! ☀️",
    body: "Time to start your day and check your habits!",
    sound: true,
  };
  
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.find(n => n.content.title === content.title);
  
  if (!alreadyScheduled) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        hour: 6,
        minute: 0,
        repeats: true,
      },
    });
    console.log("Morning reminder scheduled.");
  }
};

export const updateNightlyReminder = async (hasMissingHabits) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const NIGHT_REMINDER_ID = "night-reminder-id";
  const title = "Daily Wrap-up 🌙";

  // 1. Cancel existing night reminder for today
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existingFn = scheduled.find(n => n.content.title === title);
  
  if (existingFn) {
    await Notifications.cancelScheduledNotificationAsync(existingFn.identifier);
  }

  // 2. If habits are missing, schedule for tonight (e.g., 9 PM)
  if (hasMissingHabits) {
    const now = new Date();
    const tonight9PM = new Date();
    tonight9PM.setHours(21, 0, 0, 0); // 9:00 PM

    // If it's already past 9 PM, do nothing (or schedule for tomorrow? No, logic is for 'today')
    if (now < tonight9PM) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: "You have unfinished habits! finish them before bed.",
          sound: true,
        },
        trigger: tonight9PM, // Date object trigger = one-off
      });
      console.log("Night reminder scheduled for tonight at 9 PM.");
    }
  } else {
      console.log("All habits done, no night reminder needed.");
  }
};

export const scheduleLowAttendanceReminder = async (lowSubjects) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const NOTIF_TITLE = "Attendance Alert 📉";
  
  // 1. Cancel existing low attendance reminder
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existingFn = scheduled.find(n => n.content.title === NOTIF_TITLE);
  
  if (existingFn) {
    await Notifications.cancelScheduledNotificationAsync(existingFn.identifier);
  }

  // 2. If there are low attendance subjects, schedule daily at 7 AM
  if (lowSubjects.length > 0) {
      const subjectNames = lowSubjects.map(s => s.name).join(", ");
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIF_TITLE,
          body: `Your attendance is low in: ${subjectNames}. Don't miss classes!`,
          sound: true,
        },
        trigger: {
          hour: 7,
          minute: 0,
          repeats: true,
        },
      });
      console.log("Low attendance reminder scheduled for 7 AM.");
  } else {
      console.log("No low attendance subjects. Reminder cancelled.");
  }
};

export const scheduleTaskNotification = async (taskId, taskTitle, taskDate) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const notificationIds = [];
  const taskDateObj = new Date(taskDate); // "YYYY-MM-DD" -> Date (UTC midnight usually, or local depending on string)
  // Ensure we are working with local time boundaries
  // If taskDate is "2024-02-14", new Date("2024-02-14") might be UTC. 
  // Let's assume input is YYYY-MM-DD string from standard utils.
  // We want 6 AM on that day.
  
  // Parse YYYY-MM-DD correctly to local time 6 AM
  const parts = taskDate.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const targetDay6AM = new Date(year, month, day, 6, 0, 0); // Local 6 AM
  const oneDayBefore6AM = new Date(year, month, day - 1, 6, 0, 0); // Local 6 AM previous day
  // OR maybe "one day before" implies 24h before? The prompt said "one notification about that task one day before". 
  // Let's stick to 6 AM (or maybe a bit later like 9 AM) for the day before, or just use 6 AM for consistency.
  
  const now = new Date();

  // 1. Schedule "One Day Before"
  if (now < oneDayBefore6AM) {
      const id = await Notifications.scheduleNotificationAsync({
          content: {
              title: `Upcoming Task Tomorrow: ${taskTitle}`,
              body: "You have a task scheduled for tomorrow. Get ready!",
              sound: true,
          },
          trigger: oneDayBefore6AM,
      });
      notificationIds.push(id);
  }

  // 2. Schedule "Day Of" (6 AM)
  if (now < targetDay6AM) {
      const id = await Notifications.scheduleNotificationAsync({
          content: {
              title: `Task Today: ${taskTitle}`,
              body: "This task is scheduled for today. Good luck!",
              sound: true,
          },
          trigger: targetDay6AM,
      });
      notificationIds.push(id);
  }

  return notificationIds;
};

export const cancelTaskNotifications = async (notificationIds) => {
    if (!notificationIds || !Array.isArray(notificationIds)) return;
    for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
    }
};

// --- AUTO PAY NOTIFICATIONS ---
export const scheduleAutoPayNotification = async (title, amount, day, currency) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Trigger: Monthly on the specific day at 9:00 AM
    // Note: Expo `calendar` trigger with `repeats: true` works for this.
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Auto-Pay Alert ⚡",
                body: `${currency}${amount} for ${title} has been debited from your wallet.`,
                sound: true,
            },
            trigger: {
                day: day,
                hour: 9, 
                minute: 0,
                repeats: true,
            },
        });
        console.log(`Auto-Pay reminder scheduled for day ${day}: ${id}`);
        return id;
    } catch (error) {
        console.log("Error scheduling auto-pay:", error);
        return null;
    }
};

export const cancelNotification = async (id) => {
    if (!id) return;
    try {
        await Notifications.cancelScheduledNotificationAsync(id);
        console.log(`Notification ${id} cancelled.`);
    } catch (e) {
        console.log("Error cancelling notification:", e);
    }
};
