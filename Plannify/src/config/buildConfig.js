import Constants from 'expo-constants';

const APP_VARIANT = Constants.expoConfig?.extra?.appVariant || 'full';

export const IS_OFFLINE_BUILD = APP_VARIANT === 'offline';

export const FEATURES = {
  LOGIN: !IS_OFFLINE_BUILD,
  PREMIUM: !IS_OFFLINE_BUILD,
  CLOUD_BACKUP: !IS_OFFLINE_BUILD,
  NOTIFICATIONS: !IS_OFFLINE_BUILD,
  CLEAR_DATABASE: !IS_OFFLINE_BUILD,
  RESET_APP: !IS_OFFLINE_BUILD,
};
