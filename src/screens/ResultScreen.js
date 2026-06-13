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
 * ResultScreen — simplified to only show key action items in precise order,
 * formatted in Raw Terminal / Precision Instrument style.
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

    // Staggered screen entry animations
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

    // Haptics response matching safety status
    if (result?.status === 'danger') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (result?.status === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // Hidden dev console log as requested
  useEffect(() => {
    console.log('[SnapAct Dev Debug Log]', {
      detected: result?.detected,
      status: result?.status,
      condition: result?.condition,
      conditionDetail: result?.conditionDetail,
      urgency: result?.urgency,
      source: result?.source,
      localMetrics: result?.localMetrics,
    });
  }, [result]);

  if (!result) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>NO RESULT IN BUFFER.</Text>
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
    if (status === 'danger') return '#ff0000'; // red
    if (status === 'warning' || status === 'needs_attention') return '#F5C518'; // amber
    return '#44DD88'; // green
  };

  const getStatusTextColor = () => {
    if (status === 'danger') return '#ffffff';
    return '#000000';
  };

  // Logic to determine medical/health vs general scan
  const isMedical =
    mode === 'Medicine' ||
    result?.scanMode === 'Medicine' ||
    detected.toLowerCase().includes('medicine') ||
    detected.toLowerCase().includes('pill') ||
    detected.toLowerCase().includes('tablet') ||
    detected.toLowerCase().includes('capsule') ||
    detected.toLowerCase().includes('dose') ||
    detected.toLowerCase().includes('dolo') ||
    detected.toLowerCase().includes('syrup');

  const consultButtonLabel = isMedical ? 'Consult Doctor' : 'Consult Expert';

  // Opens WhatsApp with a pre-filled contextual message based on the active scan
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

  // Only show if status is UNSAFE/CAUTION or object needs cleaning/repair
  const showTempSolution =
    (status === 'danger' || status === 'warning' || status === 'needs_attention' ||
     ['needs_cleaning', 'needs_repair', 'needs_replacement', 'expired', 'unsafe'].includes(result?.condition)) &&
    !!temporarySolution;

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
        {/* 1. PRODUCT/ITEM NAME */}
        <Animated.View style={{ opacity: card1Opacity }}>
          <Text style={styles.detectedHeading}>{detected.toUpperCase()}</Text>
          
          {/* 2. STATUS BANNER */}
          <View style={[styles.statusBannerFull, { backgroundColor: getStatusBgColor() }]}>
            <Text style={[styles.statusTextFull, { color: getStatusTextColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </Animated.View>

        {/* 3. AI INSIGHT & 4. RECOMMENDATION */}
        <Animated.View style={{ opacity: card2Opacity }}>
          {/* AI Insight */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>// INSIGHT</Text>
            <Text style={styles.sectionBody}>{insight}</Text>
          </View>

          {/* Recommendation */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>// RECOMMENDED ACTION</Text>
            <Text style={styles.sectionBody}>
              {result.recommendation || action || 'No specific action required.'}
            </Text>
          </View>
        </Animated.View>

        {/* 5. CONSULT BUTTON & 6. TEMPORARY SOLUTION */}
        <Animated.View style={{ opacity: card3Opacity }}>
          {/* Consult Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>// NEED HELP?</Text>
            <TouchableOpacity style={styles.consultBtn} onPress={handleConsult}>
              <Text style={styles.consultBtnText}>{consultButtonLabel}</Text>
              <Text style={styles.consultBtnArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Temporary Solution */}
          {showTempSolution && (
            <View style={styles.tempSolCard}>
              <Text style={styles.tempSolTitle}>// DO THIS NOW</Text>
              <Text style={styles.tempSolBody}>{temporarySolution}</Text>
            </View>
          )}

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
  consultBtnArrow: {
    fontFamily: 'Courier New',
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
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
  errorText: {
    color: '#888888',
    fontFamily: 'Courier New',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});

export default ResultScreen;
