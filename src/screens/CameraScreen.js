import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Animated,
  Dimensions,
  BackHandler,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ScanOverlay from '../components/ScanOverlay';
import ModePanel, { SCAN_MODES } from '../components/ModePanel';
import ProfilePanel from '../components/ProfilePanel';
import { analyzeImageWithContext } from '../services/geminiService';
import { analyzeLocally } from '../services/localAIService';
import { getProfile, saveScan, getLastScan, saveScanWithTimestamp, getRecentScansByType } from '../services/storageService';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CameraScreen — the permanent home shell for returning users.
 * Full-screen camera with HUD overlays, slide-in mode panel, slide-in profile panel.
 * Freezes the view on the captured photo with an "// ANALYZING..." overlay during analysis.
 */
const CameraScreen = ({ navigation, route }) => {
  // Determine if this screen is the root (launched directly, no back stack)
  const isHomeMode = route?.params?.isHome === true;

  // Selected mode — defaults to 'auto'
  const [selectedModeId, setSelectedModeId] = useState('auto');
  const currentModeObj = SCAN_MODES.find((m) => m.id === selectedModeId) || SCAN_MODES[0];

  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingText, setLoadingText] = useState('Capturing...');
  const [onDeviceMode, setOnDeviceMode] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  // Freezes screen with static captured image during processing
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Panel visibility
  const [modePanelVisible, setModePanelVisible] = useState(false);
  const [profilePanelVisible, setProfilePanelVisible] = useState(false);

  const cameraRef = useRef(null);
  const captureScaleAnim = useRef(new Animated.Value(1)).current;

  // ── Load profile & last scan on focus ──────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const userProfile = await getProfile();
        setOnDeviceMode(!!userProfile?.onDeviceMode);
        const last = await getLastScan();
        setLastScan(last);
        setCapturedPhotoUri(null); // Reset freeze on screen focus so camera goes live
      })();
    }, [])
  );

  // ── Android hardware back — if isHome, minimise app instead of navigating ──
  useFocusEffect(
    useCallback(() => {
      if (!isHomeMode) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => sub.remove();
    }, [isHomeMode])
  );

  // ── Pulse animation for "// ANALYZING..." text ─────────────────────────────
  useEffect(() => {
    let animation;
    if (isCapturing) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1.0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isCapturing]);

  // ── Capture button bounce animation ────────────────────────────────────────
  const animateCaptureBtn = () => {
    Animated.sequence([
      Animated.timing(captureScaleAnim, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.timing(captureScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // ── Main capture handler ────────────────────────────────────────────────────
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

      // Immediately freeze the camera view with the captured image overlay
      setCapturedPhotoUri(photo.uri);
      setLoadingText('Analysing with AI...');

      const userProfile = await getProfile();
      const modeLabel = currentModeObj.mode; // e.g. 'Medicine', 'Auto'
      let result;

      // ── FEATURE 1: Snap Buddy Context Query ──
      let buddyContext = '';
      if (modeLabel === 'Food/Menu' || modeLabel === 'Auto') {
        const recentFoodScans = await getRecentScansByType('food', 5);
        if (recentFoodScans && recentFoodScans.length > 0) {
          const previousItem = recentFoodScans[0].detected;
          const hoursAgo = Math.round((Date.now() - new Date(recentFoodScans[0].timestamp).getTime()) / (1000 * 60 * 60) * 10) / 10;
          buddyContext = `BUDDY CONTEXT: User had "${previousItem}" ${hoursAgo}h ago. If this is unhealthy to repeat (sugar, caffeine, fried food, or conflicts with their health profile), add ONE short friendly line as "buddyNote". Otherwise leave buddyNote empty.`;
        }
      }

      if (userProfile?.onDeviceMode) {
        setLoadingText('Local AI Engine processing...');
        result = await analyzeLocally(userProfile, modeLabel);
      } else {
        result = await analyzeImageWithContext(photo.base64, userProfile, modeLabel, buddyContext);

        if (result?.error || result?.isError) {
          console.warn('[SnapAct] Cloud analysis failed. Falling back to local AI engine...');
          setLoadingText('On-device fallback active...');
          result = await analyzeLocally(userProfile, modeLabel);
          result.insight = `📶 Offline fallback active. Switched to On-Device AI.\n\n${result.insight}`;
        }
      }

      const savedEntry = {
        ...result,
        rawText: result.detected,
        objectType: modeLabel === 'Food/Menu' ? 'food' : (result.objectType || 'other')
      };
      await saveScanWithTimestamp(savedEntry);
      setLastScan(savedEntry);

      setIsCapturing(false);
      navigation.navigate('Result', { result, mode: modeLabel, fromHome: isHomeMode });
    } catch (error) {
      console.error('CameraScreen.handleCapture error:', error);
      setIsCapturing(false);
      setCapturedPhotoUri(null); // Clear image freeze on error
      Alert.alert("Couldn't read this", 'Something went wrong. Please try again.', [
        { text: 'Retry', style: 'default' },
      ]);
    }
  };

  // ── Open last result ────────────────────────────────────────────────────────
  const handleOpenLastScan = () => {
    if (!lastScan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Result', { result: lastScan, mode: lastScan.mode || 'Auto', fromHome: isHomeMode });
  };

  // ── Permission screens ──────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

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
        {!isHomeMode && (
          <TouchableOpacity style={styles.permBack} onPress={() => navigation.goBack()}>
            <Text style={styles.permBackText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
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

      {/* Dark vignette */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Animated corner bracket scan frame */}
      <ScanOverlay />

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <SafeAreaView style={styles.topBar}>
        {/* TOP LEFT — SnapAct logo identity */}
        <View style={styles.logoBlock}>
          {/* Geometric logo icon: square + corner brackets */}
          <View style={styles.logoIconBox}>
            <View style={styles.logoBracketTL} />
            <View style={styles.logoBracketTR} />
            <View style={styles.logoBracketBL} />
            <View style={styles.logoBracketBR} />
            <View style={styles.logoCenter} />
          </View>
          <Text style={styles.logoWordmark}>SNAPACT</Text>
        </View>

        {/* TOP CENTER — Active mode pill */}
        <View style={styles.modePillBox}>
          <Text style={styles.modePillText}>
            // {currentModeObj.label}
          </Text>
        </View>

        {/* TOP RIGHT — Hamburger / grid icon → opens mode panel */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModePanelVisible(true);
          }}
        >
          {/* 3×3 grid icon drawn manually */}
          <View style={styles.gridIcon}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.gridRow}>
                {[0, 1, 2].map((col) => (
                  <View key={col} style={styles.gridDot} />
                ))}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── RIGHT HUD ───────────────────────────────────────────────── */}
      <View style={styles.rightHud} pointerEvents="none">
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>RES</Text>
          <Text style={styles.hudValue}>4K</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>AI</Text>
          <Text style={styles.hudValue}>{onDeviceMode ? 'LOCAL' : 'CLOUD'}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>MODE</Text>
          <Text style={styles.hudValue}>{currentModeObj.id.toUpperCase().slice(0, 4)}</Text>
        </View>
      </View>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        {/* BOTTOM LEFT — Last scan thumbnail */}
        <TouchableOpacity
          style={styles.lastScanThumb}
          onPress={handleOpenLastScan}
          disabled={!lastScan}
          activeOpacity={lastScan ? 0.7 : 1}
        >
          {lastScan ? (
            <>
              <Text style={styles.lastScanEmoji}>
                {lastScan.status === 'danger' ? '🔴' :
                 lastScan.status === 'warning' ? '🟡' : '🟢'}
              </Text>
              <Text style={styles.lastScanLabel} numberOfLines={1}>
                LAST
              </Text>
            </>
          ) : (
            <Text style={styles.lastScanEmpty}>—</Text>
          )}
        </TouchableOpacity>

        {/* CENTER — Shutter button or loading indicator */}
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

        {/* BOTTOM RIGHT — Profile icon → opens profile panel */}
        <TouchableOpacity
          style={styles.profileIconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setProfilePanelVisible(true);
          }}
        >
          <Text style={styles.profileIconText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Captured photo freeze (full screen overlay, hides live camera view during analysis) */}
      {capturedPhotoUri && (
        <Image
          source={{ uri: capturedPhotoUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}

      {/* Full screen loading/analyzing overlay on top of frozen captured photo */}
      {capturedPhotoUri && isCapturing && (
        <View style={styles.analysisOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Animated.Text style={[styles.analysisText, { opacity: pulseAnim }]}>
            // ANALYZING...
          </Animated.Text>
          <Text style={styles.analysisSubText}>{loadingText}</Text>
        </View>
      )}

      {/* ── SLIDE-IN PANELS (rendered on top of everything) ─────────── */}
      <ModePanel
        visible={modePanelVisible}
        selectedMode={selectedModeId}
        onSelectMode={(modeObj) => setSelectedModeId(modeObj.id)}
        onClose={() => setModePanelVisible(false)}
      />

      <ProfilePanel
        visible={profilePanelVisible}
        onClose={() => setProfilePanelVisible(false)}
        onEditProfile={() => navigation.navigate('ProfileSetup', { editMode: true })}
      />
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

  // ── Top bar ───────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  // Logo
  logoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBox: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: COLORS.primary,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBracketTL: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 6,
    height: 6,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: COLORS.primary,
  },
  logoBracketTR: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: COLORS.primary,
  },
  logoBracketBL: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    width: 6,
    height: 6,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: COLORS.primary,
  },
  logoBracketBR: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 6,
    height: 6,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: COLORS.primary,
  },
  logoCenter: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  logoWordmark: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },

  // Mode pill (center)
  modePillBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: SCREEN_WIDTH * 0.38,
  },
  modePillText: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // Grid icon button
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    gap: 3,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gridDot: {
    width: 4,
    height: 4,
    backgroundColor: COLORS.primary,
  },

  // ── Right HUD ─────────────────────────────────────────────────────
  rightHud: {
    position: 'absolute',
    right: 16,
    top: '35%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 8,
    gap: 10,
    zIndex: 10,
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
    color: COLORS.primary,
    fontWeight: '900',
  },

  // ── Bottom bar ────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingBottom: 48,
    paddingTop: 20,
  },

  // Last scan thumbnail
  lastScanThumb: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastScanEmoji: {
    fontSize: 18,
  },
  lastScanLabel: {
    fontFamily: 'Courier New',
    fontSize: 7,
    color: '#555555',
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  lastScanEmpty: {
    color: '#333333',
    fontSize: 18,
    fontFamily: 'Courier New',
  },

  // Shutter button
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    gap: 8,
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Courier New',
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Profile icon button
  profileIconBtn: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconText: {
    fontSize: 22,
  },

  // ── Permission screens ────────────────────────────────────────────
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
    fontFamily: 'Courier New',
  },
  permBack: {
    paddingVertical: 12,
  },
  permBackText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },

  // ── Analysis loading screen overlays ──────────────────────────────
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 999,
  },
  analysisText: {
    fontFamily: 'Courier New',
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  analysisSubText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default CameraScreen;
