/**
 * dateHelper.js
 *
 * Provides a consistent way to handle dates in LOCAL time,
 * avoiding UTC shifts that cause "off-by-one" day errors.
 */

/**
 * Returns the current date as "YYYY-MM-DD" string based on device's local time.
 */
export const getLocalToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  // Subtract the offset to align with local time in UTC representation
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().split("T")[0];
};

/**
 * Returns a "YYYY-MM-DD" string for any given Date object, in local time.
 * @param {Date} date
 */
export const getLocalDateString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().split("T")[0];
};

/**
 * Checks if two dates (strings or objects) represent the same local calendar day.
 */
export const isSameDay = (dateA, dateB) => {
  const a = typeof dateA === "string" ? dateA : getLocalDateString(dateA);
  const b = typeof dateB === "string" ? dateB : getLocalDateString(dateB);
  return a === b;
};

/**
 * Returns a human-readable day name (e.g. "Mon")
 */
export const getDayName = (date) => {
  return date.toLocaleDateString("en-US", { weekday: "short" });
};
