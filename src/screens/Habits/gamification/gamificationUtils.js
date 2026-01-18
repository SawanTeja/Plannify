// --- NEW XP CONFIGURATION ---
export const CATEGORY_XP = {
  "Health 💪": 30,
  "Study 📚": 25,
  "Work 💼": 25,
  "Skill 🎨": 20,
  "Mindfulness 🧘": 15,
  "General ⚡": 10,
};

export const XP_PER_STREAK_DAY = 5;
export const XP_PER_LEVEL = 100;

// Helper to get XP safely (defaults to 10 if category not found)
export const getXpForCategory = (category) => {
  return CATEGORY_XP[category] || 10;
};

// Define all available badges
export const BADGES = [
  {
    id: "first_step",
    icon: "🌱",
    title: "First Step",
    desc: "Complete your first habit",
    condition: (stats, streak) => stats.totalCompleted >= 1,
  },
  {
    id: "on_fire",
    icon: "🔥",
    title: "On Fire",
    desc: "Reach a 3-day streak",
    condition: (stats, streak) => streak >= 3,
  },
  {
    id: "unstoppable",
    icon: "🚀",
    title: "Unstoppable",
    desc: "Reach a 7-day streak",
    condition: (stats, streak) => streak >= 7,
  },
  {
    id: "master",
    icon: "👑",
    title: "Habit Master",
    desc: "Reach Level 5",
    condition: (stats, streak) => stats.level >= 5,
  },
  {
    id: "early_bird",
    icon: "🌅",
    title: "Early Bird",
    desc: "Complete a habit before 8 AM",
    condition: (stats, streak) => new Date().getHours() < 8,
  },
];

export const INITIAL_USER_STATS = {
  xp: 0,
  level: 1,
  badges: [],
  totalCompleted: 0,
};

export const checkNewBadges = (currentStats, currentStreak) => {
  const newUnlocked = [];
  BADGES.forEach((badge) => {
    if (
      !currentStats.badges.includes(badge.id) &&
      badge.condition(currentStats, currentStreak)
    ) {
      newUnlocked.push(badge.id);
    }
  });
  return newUnlocked;
};
