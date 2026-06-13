import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';

/**
 * Reusable primary action button with raw terminal style.
 */
const ActionButton = ({
  title,
  onPress,
  variant = 'primary',   // 'primary' | 'secondary' | 'danger'
  loading = false,
  disabled = false,
  style = {},
  textStyle = {},
}) => {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.base, styles.secondary, style];
      case 'danger':
        return [styles.base, styles.danger, style];
      default:
        return [styles.base, styles.primary, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.text, styles.textSecondary, textStyle];
      case 'danger':
        return [styles.text, styles.textDanger, textStyle];
      default:
        return [styles.text, styles.textPrimary, textStyle];
    }
  };

  return (
    <TouchableOpacity
      style={[...getContainerStyle(), (disabled || loading) && styles.disabled]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.background : COLORS.primary}
          size="small"
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 54,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  textPrimary: {
    color: '#000000',
  },
  textSecondary: {
    color: COLORS.primary,
  },
  textDanger: {
    color: '#FFFFFF',
  },
});

export default ActionButton;
