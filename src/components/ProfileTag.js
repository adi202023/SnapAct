import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * Profile tag pill — shows a single medicine, allergy, or label.
 * color prop controls the fill: 'gold' | 'red' | 'green' | 'grey'
 */
const ProfileTag = ({ label, color = 'gold', onRemove }) => {
  const getBgColor = () => {
    switch (color) {
      case 'red':    return 'rgba(255,68,68,0.15)';
      case 'green':  return 'rgba(68,221,136,0.15)';
      case 'grey':   return 'rgba(136,136,136,0.15)';
      default:       return 'rgba(245,197,24,0.15)';
    }
  };

  const getBorderColor = () => {
    switch (color) {
      case 'red':    return COLORS.danger;
      case 'green':  return COLORS.success;
      case 'grey':   return COLORS.textSecondary;
      default:       return COLORS.primary;
    }
  };

  const getTextColor = () => {
    switch (color) {
      case 'red':    return COLORS.danger;
      case 'green':  return COLORS.success;
      case 'grey':   return COLORS.textSecondary;
      default:       return COLORS.primary;
    }
  };

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: getBgColor(), borderColor: getBorderColor() },
      ]}
    >
      <Text style={[styles.label, { color: getTextColor() }]}>{label}</Text>
      {onRemove && (
        <Text
          style={[styles.remove, { color: getTextColor() }]}
          onPress={onRemove}
        >
          {' ✕'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  remove: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ProfileTag;
