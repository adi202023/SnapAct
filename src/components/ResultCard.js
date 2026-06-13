import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * A card showing an individual scan result summary.
 * Used in HomeScreen recent scans and ProfileScreen history.
 */
const ResultCard = ({ scan }) => {
  if (!scan) return null;

  const { detected, status, scanMode, timestamp, insight } = scan;

  const getStatusColor = () => {
    switch (status) {
      case 'danger':  return COLORS.danger;
      case 'warning': return COLORS.warning;
      default:        return COLORS.success;
    }
  };

  const getModeIcon = () => {
    switch (scanMode) {
      case 'Medicine':   return '💊';
      case 'Food/Menu':  return '🍽️';
      case 'Bill':       return '💡';
      case 'Document':   return '📄';
      default:           return '🔍';
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.icon}>{getModeIcon()}</Text>
        <View style={styles.content}>
          <Text style={styles.detected} numberOfLines={1}>{detected}</Text>
          <Text style={styles.insight} numberOfLines={2}>{insight}</Text>
          <Text style={styles.timestamp}>{formatDate(timestamp)}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 0,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  detected: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'Courier New',
    fontWeight: '700',
    marginBottom: 3,
  },
  insight: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'Courier New',
    lineHeight: 16,
    marginBottom: 4,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'Courier New',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    marginTop: 5,
    marginLeft: 8,
  },
});

export default ResultCard;
