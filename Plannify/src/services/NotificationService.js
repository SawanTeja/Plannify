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

  const MORNING_ID = "morning-reminder-id";
  const content = {
    title: "Good Morning! ☀️",
    body: "Time to start your day and check your habits!",
    sound: true,
  };
  
  // 1. Cancel existing to ensure no duplicates
  await Notifications.cancelScheduledNotificationAsync(MORNING_ID);

  // 2. Schedule new
  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_ID,
    content,
    trigger: {
      hour: 6,
      minute: 0,
      repeats: true,
    },
  });
  console.log("Morning reminder scheduled (6:00 AM daily).");
};

export const scheduleNightlyReminder = async () => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;
  
    const NIGHT_ID = "night-reminder-recurring-id";
    const content = {
      title: "Daily Wrap-up 🌙",
      body: "Don't forget to mark your habits for today!",
      sound: true,
    };
    
    // 1. Cancel existing to ensure no duplicates
    await Notifications.cancelScheduledNotificationAsync(NIGHT_ID);
  
    // 2. Schedule new
    await Notifications.scheduleNotificationAsync({
      identifier: NIGHT_ID,
      content,
      trigger: {
        hour: 21,
        minute: 0,
        repeats: true,
      },
    });
    console.log("Nightly reminder scheduled (9:00 PM daily).");
  };

// DEPRECATED: Old logic that only worked if app was opened
export const updateNightlyReminder = async (hasMissingHabits) => {
  // Logic removed in favor of scheduleNightlyReminder
  console.log("updateNightlyReminder (deprecated) called - ignore.");
};

export const scheduleLowAttendanceReminder = async (lowSubjects) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const NOTIF_ID = "low-attendance-recurring-id";
  
  // 1. Cancel existing
  await Notifications.cancelScheduledNotificationAsync(NOTIF_ID);

  // 2. If there are low attendance subjects, schedule daily at 7 AM
  if (lowSubjects.length > 0) {
      const subjectNames = lowSubjects.map(s => s.name).join(", ");
      
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIF_ID,
        content: {
          title: "Attendance Alert 📉",
          body: `Your attendance is low in: ${subjectNames}. Don't miss classes!`,
          sound: true,
        },
        trigger: {
          hour: 7,
          minute: 0,
          repeats: true,
        },
      });
      console.log("Low attendance reminder scheduled for 7 AM daily.");
  } else {
      console.log("No low attendance subjects. Reminder cancelled.");
  }
};

export const scheduleTaskNotification = async (taskId, taskTitle, taskDate) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const notificationIds = [];
  
  // Handle "YYYY-MM-DD" string
  let targetDate = new Date(taskDate);
  if (typeof taskDate === 'string') {
      const parts = taskDate.split('-');
      // Note: new Date(y, m, d) treats month as 0-indexed
      targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  // Define Reminder Times: 6:00 AM
  const setTime = (d, h, m) => {
      const newD = new Date(d);
      newD.setHours(h, m, 0, 0);
      return newD;
  };

  const targetDay6AM = setTime(targetDate, 6, 0);
  const oneDayBefore6AM = new Date(targetDay6AM);
  oneDayBefore6AM.setDate(oneDayBefore6AM.getDate() - 1);
  
  const now = new Date();

  // 1. Schedule "One Day Before"
  if (now < oneDayBefore6AM) {
      const id = await Notifications.scheduleNotificationAsync({
          content: {
              title: `Upcoming Task: ${taskTitle}`,
              body: "You have a task scheduled for tomorrow. Get ready!",
              sound: true,
              data: { taskId }
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
               data: { taskId }
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
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Auto-Pay Alert ⚡",
                body: `${currency}${amount} for ${title} will be debited today.`,
                sound: true,
            },
            trigger: {
                day: day,
                hour: 9, 
                minute: 0,
                repeats: true,
            },
        });
        console.log(`Auto-Pay reminder scheduled for day ${day} (Monthly): ${id}`);
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
