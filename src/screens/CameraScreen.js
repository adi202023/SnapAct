import React, { useState, useRef } from 'react';
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
import ScanOverlay from '../components/ScanOverlay';
import { analyzeImageWithContext } from '../services/geminiService';
import { getProfile, saveScan } from '../services/storageService';
import { COLORS } from '../constants/colors';

/**
 * CameraScreen — full-screen camera with animated scan overlay.
 * Captures photo → single Gemini Vision call (reads text + understands object) → navigates to ResultScreen.
 * One API call per scan = no rate limit issues.
 */
const CameraScreen = ({ navigation, route }) => {
  const mode = route?.params?.mode || 'Auto';
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingText, setLoadingText] = useState('Capturing...');
  const cameraRef = useRef(null);
  const captureScaleAnim = useRef(new Animated.Value(1)).current;

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

  /** Main capture handler — single Gemini Vision call handles everything */
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

      setLoadingText('Analysing with AI...');
      const userProfile = await getProfile();

      // Single Gemini Vision call: reads text + understands object + checks profile
      const result = await analyzeImageWithContext(photo.base64, userProfile, mode);

      if (result?.error) {
        setIsCapturing(false);
        Alert.alert(
          'Analysis Failed',
          result.insight || 'Could not analyse this image. Please try again.',
          [{ text: 'Try Again', style: 'default' }]
        );
        return;
      }

      // Save to history and navigate
      await saveScan({ ...result, rawText: result.detected });

      setIsCapturing(false);
      navigation.navigate('Result', { result, mode });
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
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{mode}</Text>
        </View>
      </SafeAreaView>

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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modeBadge: {
    backgroundColor: 'rgba(245,197,24,0.18)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  modeBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
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
