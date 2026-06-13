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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import OnDevicePanel from '../components/OnDevicePanel';
import { COLORS } from '../constants/colors';

/**
 * ResultScreen — redesigned in Raw Terminal / Precision Instrument style.
 */
const ResultScreen = ({ navigation, route }) => {
  const { result, mode } = route?.params || {};

  const pillSlideAnim = useRef(new Animated.Value(-100)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;
  const card4Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Precise staggered animations on mount
    Animated.sequence([
      // 1. Status banner slides down from top
      Animated.timing(pillSlideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      // 2. Remaining segments fade in with 100ms stagger
      Animated.stagger(100, [
        Animated.timing(card1Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(card2Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(card3Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(card4Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();

    // Haptic response
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
        <Text style={styles.errorText}>NO RESULT IN BUFFER.</Text>
      </SafeAreaView>
    );
  }

  const { detected, status, insight, action, actionType, actionPayload } = result;

  /** Solid background configs according to specifications */
  const getStatusConfig = () => {
    switch (status) {
      case 'danger':
        return {
          bg: '#ff0000',
          border: '#ff0000',
          text: 'CRITICAL STATUS: DANGER',
          color: '#ffffff',
          riskColor: '#ff4444',
          riskVal: 85,
        };
      case 'warning':
        return {
          bg: '#F5C518',
          border: '#F5C518',
          text: 'CRITICAL STATUS: WARNING',
          color: '#000000',
          riskColor: '#F5C518',
          riskVal: 50,
        };
      case 'needs_attention':
        return {
          bg: '#E8F318',
          border: '#E8F318',
          text: 'CRITICAL STATUS: ATTENTION',
          color: '#000000',
          riskColor: '#E8F318',
          riskVal: 40,
        };
      default: // safe
        return {
          bg: '#44DD88',
          border: '#44DD88',
          text: 'CRITICAL STATUS: SAFE / SECURE',
          color: '#000000',
          riskColor: '#44DD88',
          riskVal: 10,
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

  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (actionType === 'whatsapp' && actionPayload) {
      const encoded = encodeURIComponent(actionPayload);
      const url = `whatsapp://send?text=${encoded}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('LINK_FAILED', 'WhatsApp messenger is not configured.');
      }
    } else if (actionType === 'url' && actionPayload) {
      const canOpen = await Linking.canOpenURL(actionPayload);
      if (canOpen) {
        await Linking.openURL(actionPayload);
      } else {
        Alert.alert('LINK_FAILED', `Cannot open payload: ${actionPayload}`);
      }
    }
  };

  const renderConditionBadge = () => {
    if (!result?.condition) return null;
    let badgeText = result.condition.replace('_', ' ').toUpperCase();
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>COND: {badgeText}</Text>
      </View>
    );
  };

  const renderUrgencyPill = () => {
    if (!result?.urgency) return null;
    return (
      <View style={[styles.badge, { marginLeft: 6 }]}>
        <Text style={styles.badgeText}>URG: {result.urgency.toUpperCase()}</Text>
      </View>
    );
  };

  const renderTemporarySolutionSection = () => {
    if (!result?.temporarySolution) return null;
    return (
      <View style={styles.tempSolCard}>
        <Text style={styles.tempSolTitle}>// DO THIS RIGHT NOW</Text>
        <Text style={styles.tempSolBody}>{result.temporarySolution}</Text>
      </View>
    );
  };

  const renderHowToSection = () => {
    if (!result?.howTo && !result?.conditionDetail) return null;
    return (
      <View style={styles.howToCard}>
        <Text style={styles.howToTitle}>// STEPS_TO_RESOLVE</Text>
        {result.conditionDetail ? (
          <Text style={styles.conditionDetailText}>
            OBS: {result.conditionDetail}
          </Text>
        ) : null}
        {result.howTo ? (
          <Text style={styles.howToBody}>{result.howTo}</Text>
        ) : null}
      </View>
    );
  };

  // Highlights first word in gold, rest in white
  const renderDetectedName = () => {
    const parts = detected.split(' ');
    if (parts.length > 1) {
      return (
        <Text style={styles.detectedText}>
          <Text style={{ color: '#F5C518' }}>{parts[0].toUpperCase()}</Text>{' '}
          {parts.slice(1).join(' ').toUpperCase()}
        </Text>
      );
    }
    return <Text style={styles.detectedText}>{detected.toUpperCase()}</Text>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top sliding solid banner */}
      <Animated.View style={[styles.statusBanner, { backgroundColor: statusConfig.bg, transform: [{ translateY: pillSlideAnim }] }]}>
        <Text style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </Animated.View>

      {/* Navigation Row */}
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
        <Text style={styles.navTitle}>SYSTEM_BUFFER_RESULT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Segment 1: Header / Detected Info */}
        <Animated.View style={{ opacity: card1Opacity }}>
          <View style={styles.detectedCard}>
            <Text style={styles.detectedIcon}>{getModeIcon()}</Text>
            <View style={styles.detectedRight}>
              <Text style={styles.detectedLabel}>// SCAN_TARGET_IDENTIFIED</Text>
              {renderDetectedName()}
              <View style={styles.badgeRow}>
                {renderConditionBadge()}
                {renderUrgencyPill()}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Segment 2: AI Insight & Risk Telemetry */}
        <Animated.View style={{ opacity: card2Opacity }}>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightTitle}>// AI INSIGHT</Text>
              <View style={[styles.aiChip, result.source === 'local' && styles.aiChipLocal]}>
                <Text style={[styles.aiChipText, result.source === 'local' && styles.aiChipTextLocal]}>
                  {result.source === 'local' ? '🤖 LOCAL_AI' : 'CLOUD_LINK'}
                </Text>
              </View>
            </View>
            <Text style={styles.insightText}>{insight}</Text>
          </View>

          {/* Risk Level Bar */}
          <View style={styles.riskContainer}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskLabel}>// RISK_LEVEL</Text>
              <Text style={[styles.riskValue, { color: statusConfig.riskColor }]}>
                {statusConfig.riskVal}%
              </Text>
            </View>
            <View style={styles.riskTrack}>
              <View style={[styles.riskFill, { width: `${statusConfig.riskVal}%`, backgroundColor: statusConfig.riskColor }]} />
            </View>
          </View>
        </Animated.View>

        {/* Segment 3: Performance Telemetry (if local) */}
        {result.source === 'local' && result.localMetrics && (
          <Animated.View style={{ opacity: card3Opacity }}>
            <OnDevicePanel metrics={result.localMetrics} />
          </Animated.View>
        )}

        {/* Segment 4: Resolution & Actions */}
        <Animated.View style={{ opacity: card4Opacity, marginTop: 12 }}>
          {renderTemporarySolutionSection()}
          {renderHowToSection()}

          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>// RECOMMENDATION_EXECUTION</Text>

            {actionType !== 'none' && action && (
              <TouchableOpacity
                style={styles.customActionBtn}
                onPress={handleAction}
              >
                <Text style={styles.customActionText}>{action}</Text>
                <Text style={styles.customActionArrow}>→</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.customActionBtnSecondary}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Camera', { mode: mode || 'Auto' });
              }}
            >
              <Text style={styles.customActionTextSecondary}>SCAN TARGET RECAPTURE</Text>
              <Text style={styles.customActionArrowSecondary}>↺</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customActionBtnSecondary}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Main');
              }}
            >
              <Text style={styles.customActionTextSecondary}>RETURN TO CENTRAL HUB</Text>
              <Text style={styles.customActionArrowSecondary}>⌂</Text>
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
    backgroundColor: '#000000',
  },
  statusBanner: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  navTitle: {
    color: '#F5C518',
    fontFamily: 'Courier New',
    fontSize: 12,
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
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C518',
  },
  detectedIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  detectedRight: {
    flex: 1,
  },
  detectedLabel: {
    fontSize: 9,
    fontFamily: 'Courier New',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  detectedText: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  badgeText: {
    fontSize: 8,
    fontFamily: 'Courier New',
    color: '#444444',
    fontWeight: '700',
  },
  insightCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C518',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '900',
    color: '#F5C518',
  },
  aiChip: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
  },
  aiChipText: {
    fontSize: 8,
    fontFamily: 'Courier New',
    color: COLORS.primary,
    fontWeight: '900',
  },
  aiChipLocal: {
    backgroundColor: 'rgba(68,221,136,0.12)',
    borderColor: 'rgba(68,221,136,0.35)',
  },
  aiChipTextLocal: {
    color: COLORS.success,
  },
  insightText: {
    color: '#888888',
    fontFamily: 'Courier New',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  riskContainer: {
    marginBottom: 20,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 14,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskLabel: {
    fontFamily: 'Courier New',
    fontSize: 9,
    fontWeight: '700',
    color: '#888888',
  },
  riskValue: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '900',
  },
  riskTrack: {
    height: 2,
    backgroundColor: '#111111',
  },
  riskFill: {
    height: '100%',
  },
  tempSolCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#44DD88',
  },
  tempSolTitle: {
    fontFamily: 'Courier New',
    fontSize: 11,
    fontWeight: '900',
    color: '#44DD88',
    marginBottom: 8,
  },
  tempSolBody: {
    fontFamily: 'Courier New',
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  howToCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  howToTitle: {
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '900',
    color: '#F5C518',
    marginBottom: 8,
  },
  conditionDetailText: {
    color: COLORS.textPrimary,
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  howToBody: {
    color: COLORS.textSecondary,
    fontFamily: 'Courier New',
    fontSize: 12,
    lineHeight: 18,
  },
  actionsSection: {
    gap: 8,
  },
  actionsTitle: {
    fontSize: 10,
    fontFamily: 'Courier New',
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  customActionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5C518',
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 4,
  },
  customActionText: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  customActionArrow: {
    fontFamily: 'Courier New',
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  customActionBtnSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 4,
  },
  customActionTextSecondary: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  customActionArrowSecondary: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontFamily: 'Courier New',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});

export default ResultScreen;
