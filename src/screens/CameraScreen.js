import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ScanOverlay from '../components/ScanOverlay';
import { analyzeImageWithContext } from '../services/geminiService';
import { analyzeLocally } from '../services/localAIService';
import { getProfile, saveScan } from '../services/storageService';
import { COLORS } from '../constants/colors';

/**
 * CameraScreen — full-screen camera with animated scan overlay.
 * Captures photo → single Gemini Vision call (reads text + understands object) → navigates to ResultScreen.
 * One API call per scan = no rate limit issues.
 */
const CameraScreen = ({ navigation, route }) => {
  const [currentMode, setCurrentMode] = useState(route?.params?.mode || 'Auto');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingText, setLoadingText] = useState('Capturing...');
  const [onDeviceMode, setOnDeviceMode] = useState(false);
  const cameraRef = useRef(null);
  const captureScaleAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const userProfile = await getProfile();
        setOnDeviceMode(!!userProfile?.onDeviceMode);
      })();
    }, [])
  );

  /** Animate the capture button on press */
  const animateCaptureBtn = () => {
    Animated.sequence([
      Animated.timing(captureScaleAnim, {
        toValue: 0.88,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(captureScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /** Main capture handler — routes to local engine or cloud based on profile setting */
  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    animateCaptureBtn();
    setIsCapturing(true);

    try {
      setLoadingText('Capturing...');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: true,
      });

      const userProfile = await getProfile();
      let result;

      if (userProfile?.onDeviceMode) {
        // ── On-Device AI path (no internet needed) ──────────────────────────
        setLoadingText('Local AI Engine processing...');
        result = await analyzeLocally(userProfile, currentMode);
      } else {
        // ── Cloud AI path (Gemini Vision) ───────────────────────────────────
        setLoadingText('Analysing with AI...');
        result = await analyzeImageWithContext(photo.base64, userProfile, currentMode);

        // Auto fallback to on-device engine if API/network call fails
        if (result?.error) {
          console.warn('[SnapAct] Cloud analysis failed. Falling back to local AI engine...');
          setLoadingText('On-device fallback active...');
          result = await analyzeLocally(userProfile, currentMode);
          result.insight = `📶 Offline fallback active. Switched to On-Device AI.\n\n${result.insight}`;
        }
      }

      await saveScan({ ...result, rawText: result.detected });
      setIsCapturing(false);
      navigation.navigate('Result', { result, mode: currentMode });
    } catch (error) {
      console.error('CameraScreen.handleCapture error:', error);
      setIsCapturing(false);
      Alert.alert(
        "Couldn't read this",
        'Something went wrong. Please try again.',
        [{ text: 'Retry', style: 'default' }]
      );
    }
  };

  // --- Permission not yet determined ---
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // --- Permission denied ---
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permDenied}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSubtitle}>
          SnapAct needs your camera to scan medicines, menus, bills, and documents.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permBack}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        ratio="16:9"
      />

      {/* Dark vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Animated corner bracket scan frame */}
      <ScanOverlay />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.modePillsContainer}>
          {[
            { label: 'AUTO', val: 'Auto' },
            { label: 'MED', val: 'Medicine' },
            { label: 'OBJ', val: 'Food/Menu' },
            { label: 'DOC', val: 'Document' },
          ].map((item) => {
            const active = currentMode === item.val;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.modePill, active && styles.modePillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentMode(item.val);
                }}
              >
                <Text style={[styles.modePillText, active && styles.modePillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.topBarRight}>
          {onDeviceMode && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>⚡ LOC</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Right HUD column */}
      <View style={styles.rightHud} pointerEvents="none">
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>RES</Text>
          <Text style={styles.hudValue}>4K</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>AI</Text>
          <Text style={styles.hudValue}>ON</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>GPS</Text>
          <Text style={styles.hudValue}>OK</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>PRF</Text>
          <Text style={styles.hudValue}>LOADED</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {isCapturing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ scale: captureScaleAnim }] }}>
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={handleCapture}
              activeOpacity={0.85}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Text style={styles.hint}>Tap to capture</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 60,
    borderColor: 'rgba(0,0,0,0.55)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 50,
  },
  modePillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modePillActive: {
    borderColor: '#F5C518',
  },
  modePillText: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '900',
    color: '#444444',
  },
  modePillTextActive: {
    color: '#F5C518',
  },
  localBadge: {
    backgroundColor: 'rgba(68,221,136,0.18)',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  localBadgeText: {
    color: COLORS.success,
    fontSize: 9,
    fontFamily: 'Courier New',
    fontWeight: '900',
  },
  rightHud: {
    position: 'absolute',
    right: 16,
    top: '35%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 8,
    gap: 10,
    zIndex: 100,
  },
  hudItem: {
    alignItems: 'flex-end',
  },
  hudLabel: {
    fontFamily: 'Courier New',
    fontSize: 8,
    color: '#333333',
    fontWeight: '900',
  },
  hudValue: {
    fontFamily: 'Courier New',
    fontSize: 8,
    color: '#F5C518',
    fontWeight: '900',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 20,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 15,
  },
  captureBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 12,
    letterSpacing: 1,
  },
  permDenied: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  permIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  permTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  permBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
  },
  permBack: {
    paddingVertical: 12,
  },
  permBackText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
});

export default CameraScreen;
