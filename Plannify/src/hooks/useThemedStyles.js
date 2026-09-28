import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';

/**
 * Creates and memoizes StyleSheet objects based on current theme tokens.
 * Eliminates ad-hoc dynamic style recreation on every render.
 *
 * @param {(colors: object, isDark: boolean, theme: string) => object} stylesFactory
 * @returns {object} Memoized StyleSheet
 */
export const useThemedStyles = (stylesFactory) => {
  const { colors, isDark, theme } = useTheme();

  return useMemo(() => {
    const rawStyles = stylesFactory(colors, isDark, theme);
    return StyleSheet.create(rawStyles);
  }, [colors, isDark, theme, stylesFactory]);
};

export default useThemedStyles;
