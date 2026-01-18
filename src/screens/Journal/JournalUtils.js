import colors from "../../constants/colors";

export const getMonthColor = (monthIndex) => {
  // monthIndex is 0 (Jan) to 11 (Dec)

  // November (10), December (11), January (0), February (1) -> Frosted Blue
  if (
    monthIndex === 10 ||
    monthIndex === 11 ||
    monthIndex === 0 ||
    monthIndex === 1
  ) {
    return colors.seasonWinter;
  }

  // March (2), April (3) -> Light Pink
  if (monthIndex === 2 || monthIndex === 3) {
    return colors.seasonSpring;
  }

  // May (4), June (5), July (6) -> Summer Yellow
  if (monthIndex === 4 || monthIndex === 5 || monthIndex === 6) {
    return colors.seasonSummer;
  }

  // August (7), September (8), October (9) -> Light Blue
  if (monthIndex >= 7 && monthIndex <= 9) {
    return colors.seasonAutumn;
  }

  return colors.cardBg;
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
  return months[monthIndex];
};
