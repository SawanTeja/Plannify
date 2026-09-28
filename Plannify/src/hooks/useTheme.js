import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';

/**
 * Custom hook to access theme tokens and utility values.
 * Centralizes theme resolution following DRY and Single Responsibility.
 */
export const useTheme = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useTheme must be used within an AppProvider');
  }

  const { colors, theme, toggleTheme, appStyles } = context;
  const isDark = theme === 'dark';

  return useMemo(
    () => ({
      colors,
      theme,
      isDark,
      toggleTheme,
      appStyles,
    }),
    [colors, theme, isDark, toggleTheme, appStyles]
  );
};

export default useTheme;
