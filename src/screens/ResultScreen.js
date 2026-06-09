import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ActionButton from '../components/ActionButton';
import { COLORS } from '../constants/colors';

/**
 * ResultScreen — the "money screen."
 * Displays detected item, status banner, personalized insight, condition badges, and action buttons.
 */
const ResultScreen = ({ navigation, route }) => {
  const { result, mode } = route?.params || {};
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up + fade in animation on mount
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback based on status
    if (result?.status === 'danger') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (result?.status === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  if (!result) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>No result to display.</Text>
      </SafeAreaView>
    );
  }

  const { detected, status, insight, action, actionType, actionPayload } = result;

  /** Returns banner color based on status */
  const getStatusConfig = () => {
    switch (status) {
      case 'danger':
        return {
          bg: 'rgba(255,68,68,0.18)',
          border: COLORS.danger,
          text: '🔴  DANGER',
          color: COLORS.danger,
        };
      case 'warning':
        return {
          bg: 'rgba(255,140,0,0.18)',
          border: COLORS.warning,
          text: '🟡  WARNING',
          color: COLORS.warning,
        };
      default:
        return {
          bg: 'rgba(68,221,136,0.18)',
          border: COLORS.success,
          text: '🟢  SAFE',
          color: COLORS.success,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const getModeIcon = () => {
    if (result.source === 'visual' || result.condition) {
      return '📷';
    }
    switch (mode) {
      case 'Medicine':  return '💊';
      case 'Food/Menu': return '🍽️';
      case 'Bill':      return '💡';
      case 'Document':  return '📄';
      default:          return '🔍';
    }
  };

  /** Handle the primary action button */
  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (actionType === 'whatsapp' && actionPayload) {
      const encoded = encodeURIComponent(actionPayload);
      const url = `whatsapp://send?text=${encoded}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this action.');
      }
      return;
    }

    if (actionType === 'url' && actionPayload) {
      const canOpen = await Linking.canOpenURL(actionPayload);
      if (canOpen) {
        await Linking.openURL(actionPayload);
      } else {
        Alert.alert('Cannot open URL', actionPayload);
      }
      return;
    }
  };

  /** Render condition badge if available */
  const renderConditionBadge = () => {
    if (!result?.condition) return null;

    let badgeText = '';
    let badgeColor = '';
    let badgeBg = '';

    switch (result.condition) {
      case 'needs_cleaning':
        badgeText = '🧹 Needs Cleaning';
        badgeColor = COLORS.warning;
        badgeBg = 'rgba(255,140,0,0.12)';
        break;
      case 'needs_repair':
        badgeText = '🔧 Needs Repair';
        badgeColor = '#FF8C00';
        badgeBg = 'rgba(255,140,0,0.12)';
        break;
      case 'needs_replacement':
        badgeText = '🔄 Needs Replacement';
        badgeColor = COLORS.danger;
        badgeBg = 'rgba(255,68,68,0.12)';
        break;
      case 'expired':
        badgeText = '⚠️ Expired';
        badgeColor = COLORS.danger;
        badgeBg = 'rgba(255,68,68,0.12)';
        break;
      case 'unsafe':
        badgeText = '🚨 Unsafe';
        badgeColor = COLORS.danger;
        badgeBg = 'rgba(255,68,68,0.18)';
        break;
      case 'excellent':
      case 'good':
        badgeText = '✅ Good Condition';
        badgeColor = COLORS.success;
        badgeBg = 'rgba(68,221,136,0.12)';
        break;
      default:
        badgeText = `ℹ️ ${result.condition.replace('_', ' ')}`;
        badgeColor = COLORS.textSecondary;
        badgeBg = 'rgba(150,150,150,0.12)';
    }

    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: badgeBg,
            borderColor: badgeColor,
            borderWidth: 1,
            alignSelf: 'flex-start',
            marginTop: 6,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: badgeColor, fontWeight: '700', fontSize: 12 }]}>
          {badgeText}
        </Text>
      </View>
    );
  };

  /** Render urgency pill if available */
  const renderUrgencyPill = () => {
    if (!result?.urgency) return null;

    let pillText = '';
    let pillColor = '';
    let pillBg = '';

    switch (result.urgency) {
      case 'immediate':
        pillText = 'Act Now';
        pillColor = COLORS.danger;
        pillBg = 'rgba(255,68,68,0.15)';
        break;
      case 'soon':
        pillText = 'Within a week';
        pillColor = COLORS.warning;
        pillBg = 'rgba(255,140,0,0.15)';
        break;
      case 'low':
        pillText = 'When convenient';
        pillColor = COLORS.textSecondary;
        pillBg = 'rgba(150,150,150,0.15)';
        break;
      default:
        pillText = result.urgency;
        pillColor = COLORS.textSecondary;
        pillBg = 'rgba(150,150,150,0.15)';
    }

    return (
      <View
        style={[
          styles.urgencyPill,
          {
            backgroundColor: pillBg,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
            alignSelf: 'flex-start',
            marginTop: 6,
          },
        ]}
      >
        <Text style={{ color: pillColor, fontSize: 11, fontWeight: '700' }}>
          ⏱️ {pillText}
        </Text>
      </View>
    );
  };

  /** Render Temporary Solution section if it exists */
  const renderTemporarySolutionSection = () => {
    if (!result?.temporarySolution) return null;

    return (
      <View style={styles.tempSolCard}>
        <Text style={styles.tempSolTitle}>⏱️ Do This Right Now</Text>
        <Text style={styles.tempSolBody}>{result.temporarySolution}</Text>
      </View>
    );
  };

  /** Render How-To section if custom details exist */
  const renderHowToSection = () => {
    if (!result?.howTo && !result?.conditionDetail) return null;

    return (
      <View style={styles.howToCard}>
        <Text style={styles.howToTitle}>🛠️ What to do</Text>
        {result.conditionDetail ? (
          <Text style={styles.conditionDetailText}>
            {result.conditionDetail}
          </Text>
        ) : null}
        {result.howTo ? (
          <Text style={styles.howToBody}>{result.howTo}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top nav row */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Analysis Result</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Detected item */}
          <View style={styles.detectedCard}>
            <Text style={styles.detectedIcon}>{getModeIcon()}</Text>
            <View style={styles.detectedRight}>
              <Text style={styles.detectedLabel}>Detected</Text>
              <Text style={styles.detectedText}>{detected}</Text>
              {renderConditionBadge()}
              {renderUrgencyPill()}
            </View>
          </View>

          {/* Status banner */}
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: statusConfig.bg,
                borderColor: statusConfig.border,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>

          {/* AI Insight */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightTitle}>SnapAct says</Text>
              <View style={styles.aiChip}>
                <Text style={styles.aiChipText}>AI • Personalized</Text>
              </View>
            </View>
            <Text style={styles.insightText}>{insight}</Text>
          </View>

          {/* Temporary Solution Section */}
          {renderTemporarySolutionSection()}

          {/* How-To Section */}
          {renderHowToSection()}

          {/* Action buttons */}
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>Recommended Action</Text>

            {actionType !== 'none' && action && (
              <View style={styles.actionBtnWrapper}>
                <ActionButton
                  title={`${action} →`}
                  onPress={handleAction}
                  variant={status === 'danger' ? 'danger' : 'primary'}
                />
              </View>
            )}

            {/* Scan Again */}
            <View style={styles.actionBtnWrapper}>
              <ActionButton
                title="Scan Again"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Camera', { mode: mode || 'Auto' });
                }}
                variant="secondary"
              />
            </View>

            {/* Back to Home */}
            <TouchableOpacity
              style={styles.homeLink}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Main');
              }}
            >
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  navTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  detectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detectedIcon: {
    fontSize: 38,
    marginRight: 16,
  },
  detectedRight: {
    flex: 1,
  },
  detectedLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detectedText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 25,
  },
  statusBanner: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 14,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  insightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  aiChip: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
  },
  aiChipText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  insightText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  actionsSection: {
    gap: 12,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionBtnWrapper: {
    marginBottom: 4,
  },
  homeLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  homeLinkText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
  },
  urgencyPill: {
    borderRadius: 8,
  },
  howToCard: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  howToTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  conditionDetailText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  howToBody: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  tempSolCard: {
    backgroundColor: 'rgba(245, 197, 24, 0.07)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 197, 24, 0.25)',
  },
  tempSolTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tempSolBody: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default ResultScreen;
