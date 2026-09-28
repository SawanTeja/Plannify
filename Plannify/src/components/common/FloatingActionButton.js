import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';

/**
 * Reusable Floating Action Button (FAB).
 * Eliminates repetitive absolute-positioned button boilerplate.
 */
export const FloatingActionButton = ({
  icon = 'plus',
  iconSize = 28,
  iconColor = '#ffffff',
  backgroundColor,
  onPress,
  bottom = 90,
  right = 24,
  style,
  ...props
}) => {
  const { colors } = useContext(AppContext);
  const bgColor = backgroundColor || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: bgColor,
          bottom,
          right,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      {...props}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 99,
  },
});

export default FloatingActionButton;
