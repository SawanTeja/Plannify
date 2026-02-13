import React, { useContext, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Platform 
} from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { AppContext } from '../context/AppContext';
import { useAlert } from '../context/AlertContext';

const { width } = Dimensions.get('window');

const PremiumAlert = () => {
    const { colors, theme } = useContext(AppContext);
    const { alertState, closeAlert } = useAlert();
    const { visible, title, message, buttons, type, onDismiss } = alertState;
    
    // Animation Values
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15 });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            scale.value = withTiming(0.8, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    if (!visible) return null;

    // Type Configuration
    const getTypeConfig = () => {
        switch (type) {
            case 'success':
                return { icon: 'check-circle', color: colors.success || '#4CAF50', bg: colors.success + '20' }; // light bg
            case 'error':
                return { icon: 'alert-circle', color: colors.error || '#F44336', bg: colors.error + '20' };
            case 'warning':
                return { icon: 'alert', color: colors.warning || '#FFC107', bg: colors.warning + '20' };
            case 'info':
            default:
                return { icon: 'information', color: colors.primary, bg: colors.primary + '20' };
        }
    };

    const config = getTypeConfig();
    const isDark = theme === 'dark';

    const handleButtonPress = (btn) => {
        // Run any provided callback
        if (btn.onPress) {
            btn.onPress(); 
        }
        // If it's a destructive action or just a normal press, we usually close unless prevented?
        // Standard Alert closes on press.
        closeAlert();
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={closeAlert} // Optional: allow tap outside to dismiss? Android Alert doesn't usually
            onBackButtonPress={closeAlert}
            useNativeDriver
            hideModalContentWhileAnimating
            backdropOpacity={0.4}
            animationIn="fadeIn"
            animationOut="fadeOut"
            style={{ alignItems: 'center', justifyContent: 'center', margin: 0 }}
        >
             <Animated.View style={[styles.container, animatedStyle, { 
                 backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
                 borderColor: colors.border,
                 borderWidth: 1,
                 shadowColor: config.color, // Glow based on type
             }]}>
                {/* Blur Effect for Glassmorphism */}
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

                <View style={styles.content}>
                    {/* Icon Header */}
                    <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                        <MaterialCommunityIcons name={config.icon} size={32} color={config.color} />
                    </View>

                    {/* Text Content */}
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    {message ? (
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                    ) : null}

                    {/* Buttons - Support up to 3 buttons? Or scrollable if more? Native supports 3 usually. */}
                    <View style={styles.buttonContainer}>
                        {buttons.map((btn, index) => {
                             // Check for destructive style
                             const isDestructive = btn.style === 'destructive';
                             const isCancel = btn.style === 'cancel';
                             
                             // Primary button logic: usually the last one (Positive action), unless it's cancel
                             const isPrimary = !isCancel && !isDestructive && index === buttons.length - 1;

                             return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[
                                        styles.button, 
                                        isPrimary ? { backgroundColor: colors.primary } : { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 }
                                    ]}
                                    onPress={() => handleButtonPress(btn)}
                                >
                                    <Text style={[
                                        styles.buttonText, 
                                        isPrimary ? { color: '#fff' } : { color: colors.textPrimary },
                                        isDestructive && { color: colors.error || 'red' }
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                             )
                        })}
                    </View>
                </View>
             </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center', // Center if 1, space-between if 2
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1, // Grow to fill space
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});

export default PremiumAlert;
