import React, { useRef, useEffect, useState } from 'react';
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
import { COLORS } from '../constants/colors';
import { getProfile } from '../services/storageService';

/**
 * ExpandableText Component — limits visible content to 3 lines
 * and renders an inline toggle if the text is long.
 */
const ExpandableText = ({ text, style }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > 130;

  return (
    <View>
      <Text
        style={style}
        numberOfLines={expanded ? undefined : 3}
        ellipsizeMode="tail"
      >
        {text}
      </Text>
      {isLong && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={{ marginTop: 6, alignSelf: 'flex-start' }}
        >
          <Text style={styles.expandToggle}>
            {expanded ? '[ SHOW_LESS ]' : '[ SEE_MORE ]'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * ResultScreen — redesigned with strict UI discipline. Max 5 cards.
 * Integrates Snap Buddy context and specialized medical report formats.
 */
const ResultScreen = ({ navigation, route }) => {
  const { result, mode } = route?.params || {};
  const [profile, setProfile] = useState(null);

  const pillSlideAnim = useRef(new Animated.Value(-100)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadProfile() {
      const p = await getProfile();
      setProfile(p);
    }
    loadProfile();

    // Entry animations
    Animated.sequence([
      Animated.timing(pillSlideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.stagger(100, [
        Animated.timing(card1Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(card2Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(card3Opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();

    if (result?.status === 'danger') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (result?.status === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // Hidden dev console log for telemetry
  useEffect(() => {
    console.log('[SnapAct Dev Debug Log]', {
      detected: result?.detected,
      status: result?.status,
      condition: result?.condition,
      conditionDetail: result?.conditionDetail,
      urgency: result?.urgency,
      source: result?.source,
      localMetrics: result?.localMetrics,
      buddyNote: result?.buddyNote,
      objectType: result?.objectType,
    });
  }, [result]);

  const hasError = !result || result.isError || !result.detected || !result.status || !result.insight;

  // ── ERROR SCREEN ───────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>ANALYSIS_ERROR // READ_FAILED</Text>
          <Text style={styles.errorText}>Couldn't read this clearly — try again with better lighting</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Camera', { mode: mode || 'Auto' });
            }}
          >
            <Text style={styles.retryBtnText}>RETRY SCAN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { detected, status, insight, action, actionType, actionPayload, temporarySolution } = result;

  const getStatusText = () => {
    if (status === 'danger') return 'UNSAFE';
    if (status === 'warning' || status === 'needs_attention') return 'CAUTION';
    return 'SAFE';
  };

  const getStatusBgColor = () => {
    if (status === 'danger') return '#ff0000';
    if (status === 'warning' || status === 'needs_attention') return '#F5C518';
    return '#44DD88';
  };

  const getStatusTextColor = () => {
    if (status === 'danger') return '#ffffff';
    return '#000000';
  };

  const isMedical =
    mode === 'Medicine' ||
    result?.scanMode === 'Medicine' ||
    result?.objectType === 'medical_report' ||
    detected.toLowerCase().includes('medicine') ||
    detected.toLowerCase().includes('pill') ||
    detected.toLowerCase().includes('tablet') ||
    detected.toLowerCase().includes('capsule') ||
    detected.toLowerCase().includes('dose') ||
    detected.toLowerCase().includes('dolo') ||
    detected.toLowerCase().includes('syrup');

  const consultButtonLabel = isMedical ? 'Consult Doctor' : 'Consult Expert';

  const handleConsult = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const phone = profile?.emergencyContact?.phone || '';
    const name = profile?.emergencyContact?.name || '';

    if (!phone) {
      Alert.alert(
        'NO_CONTACT',
        'No emergency contact phone number configured. Please set it up in your Profile settings.',
        [
          {
            text: 'Configure Profile',
            onPress: () => navigation.navigate('ProfileSetup', { editMode: true }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const message = `Hello ${name || 'Emergency Contact'},\n\nI am sharing a SnapAct alert regarding the scan of "${detected}".\n\nInsight: ${insight}\n\nRecommendation: ${result.recommendation || action || 'None'}`;
    const url = `whatsapp://send?phone=${phone.replace(/[^0-9+]/g, '')}&text=${encodeURIComponent(message)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      const webUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      const canOpenWeb = await Linking.canOpenURL(webUrl);
      if (canOpenWeb) {
        await Linking.openURL(webUrl);
      } else {
        Alert.alert('LINK_FAILED', 'Could not launch WhatsApp messenger.');
      }
    }
  };

  const showTempSolution =
    (status === 'danger' || status === 'warning' || status === 'needs_attention' ||
     ['needs_cleaning', 'needs_repair', 'needs_replacement', 'expired', 'unsafe'].includes(result?.condition)) &&
    !!temporarySolution;

  // ── CUSTOM RENDER FOR MEDICAL REPORT ROWS ──────────────────────────────────
  const renderRecommendationText = () => {
    const recommendationText = result.recommendation || action || 'No specific action required.';
    
    if (result.objectType === 'medical_report') {
      const lines = recommendationText.split('\n').filter(l => l.trim().length > 0);
      return (
        <View style={styles.medicalReportRows}>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.medicalReportRow}>
              <Text style={styles.medicalBullet}>•</Text>
              <Text style={styles.medicalText}>{line.trim()}</Text>
            </View>
          ))}
        </View>
      );
    }
    
    return <ExpandableText text={recommendationText} style={styles.sectionBody} />;
  };

  // ── MERGED BUDDY / TEMP SOLUTION CARD RENDER ──────────────────────────────
  const renderBuddyOrTempSolutionCard = () => {
    const hasBuddyNote = !!result.buddyNote;
    if (!hasBuddyNote && !showTempSolution) return null;

    return (
      <View style={styles.tempSolCard}>
        <Text style={styles.tempSolTitle}>// DO THIS NOW</Text>
        {hasBuddyNote && (
          <Text style={styles.buddyNoteText}>
            👋 {result.buddyNote}
          </Text>
        )}
        {hasBuddyNote && showTempSolution && <View style={{ height: 10 }} />}
        {showTempSolution && (
          <ExpandableText text={temporarySolution} style={styles.tempSolBody} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Navigation Row — back button only, no system title */}
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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: PRODUCT/ITEM NAME & STATUS BANNER */}
        <Animated.View style={{ opacity: card1Opacity }}>
          <Text style={styles.detectedHeading}>{detected.toUpperCase()}</Text>
          
          <View style={[styles.statusBannerFull, { backgroundColor: getStatusBgColor() }]}>
            <Text style={[styles.statusTextFull, { color: getStatusTextColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </Animated.View>

        {/* Card 2: AI INSIGHT & Card 3: RECOMMENDATION */}
        <Animated.View style={{ opacity: card2Opacity }}>
          {/* Card 2: AI Insight */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>// INSIGHT</Text>
            <ExpandableText text={insight} style={styles.sectionBody} />
          </View>

          {/* Card 3: Recommendation */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>// RECOMMENDED ACTION</Text>
            {renderRecommendationText()}
          </View>
        </Animated.View>

        {/* Card 4: BUDDY NOTE / TEMP SOLUTION & Card 5: ACTION BUTTON */}
        <Animated.View style={{ opacity: card3Opacity }}>
          {/* Card 4: Buddy note / Temp solution (Merged) */}
          {renderBuddyOrTempSolutionCard()}

          {/* Card 5: Action Button (Consultation) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>// NEED HELP?</Text>
            <TouchableOpacity style={styles.consultBtn} onPress={handleConsult}>
              <Text style={styles.consultBtnText}>{consultButtonLabel}</Text>
              <Text style={styles.consultBtnText}>{`→`}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom navigation utilities (aligned with terminal styling) */}
          <View style={styles.bottomNavSection}>
            <TouchableOpacity
              style={styles.navBtnSecondary}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Camera', { mode: mode || 'Auto' });
              }}
            >
              <Text style={styles.navBtnTextSecondary}>RECAPTURE TARGET</Text>
              <Text style={styles.navBtnArrowSecondary}>↺</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtnSecondary}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Camera', { isHome: true });
              }}
            >
              <Text style={styles.navBtnTextSecondary}>EXIT TO CAMERA</Text>
              <Text style={styles.navBtnArrowSecondary}>⌂</Text>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  detectedHeading: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  statusBannerFull: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statusTextFull: {
    fontFamily: 'Courier New',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sectionCard: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C518',
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Courier New',
    fontSize: 11,
    fontWeight: '900',
    color: '#F5C518',
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionBody: {
    fontFamily: 'Courier New',
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 19,
  },
  expandToggle: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#F5C518',
    fontWeight: 'bold',
  },
  consultBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5C518',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  consultBtnText: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  tempSolCard: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#44DD88',
    padding: 16,
    marginBottom: 20,
  },
  tempSolTitle: {
    fontFamily: 'Courier New',
    fontSize: 11,
    fontWeight: '900',
    color: '#44DD88',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tempSolBody: {
    fontFamily: 'Courier New',
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
  },
  buddyNoteText: {
    fontFamily: 'Courier New',
    color: '#E8F318',
    fontSize: 13,
    lineHeight: 18,
  },
  bottomNavSection: {
    gap: 8,
    marginTop: 12,
  },
  navBtnSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  navBtnTextSecondary: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
  },
  navBtnArrowSecondary: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '700',
    color: '#888888',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '900',
    color: '#ff0000',
    marginBottom: 10,
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: 'Courier New',
    color: '#888888',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 32,
  },
  retryBtn: {
    backgroundColor: '#F5C518',
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  retryBtnText: {
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  medicalReportRows: {
    gap: 6,
    marginTop: 4,
  },
  medicalReportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  medicalBullet: {
    color: '#F5C518',
    fontSize: 14,
    lineHeight: 18,
  },
  medicalText: {
    fontFamily: 'Courier New',
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

export default ResultScreen;
