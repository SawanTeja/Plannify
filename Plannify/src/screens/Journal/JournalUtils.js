// A vibrant palette that works well with both Dark (Midnight) and Light (Clean) themes
const MONTH_COLORS = [
  "#3B82F6", // January - Blue
  "#8B5CF6", // February - Violet
  "#EC4899", // March - Pink
  "#F43F5E", // April - Rose
  "#10B981", // May - Emerald
  "#F59E0B", // June - Amber
  "#EF4444", // July - Red
  "#F97316", // August - Orange
  "#EAB308", // September - Yellow
  "#14B8A6", // October - Teal
  "#6366F1", // November - Indigo
  "#06B6D4", // December - Cyan
];

export const getMonthColor = (monthIndex) => {
  // Ensure the index is within bounds (0-11)
  const safeIndex = Math.abs(monthIndex) % 12;
  return MONTH_COLORS[safeIndex];
};

export const getMonthName = (monthIndex) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex] || "Unknown";
};
