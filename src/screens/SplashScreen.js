import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { isFirstLaunch } from '../services/storageService';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');
const horizontalLines = Array.from({ length: Math.ceil(height / 32) });
const verticalLines = Array.from({ length: Math.ceil(width / 32) });

/**
 * SplashScreen — redesigned in raw terminal precision style.
 */
const SplashScreen = ({ navigation }) => {
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Precise animation sequence: grid -> logo scale -> tagline
    Animated.sequence([
      Animated.timing(gridOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(300),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // After animation, navigate based on onboarding status
    const timer = setTimeout(async () => {
      try {
        console.log('[SnapAct] SplashScreen: Checking first launch...');
        const checkPromise = isFirstLaunch();
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(true), 500));
        const first = await Promise.race([checkPromise, timeoutPromise]);

        if (first) {
          // First launch — go through onboarding flow
          navigation.replace('Onboarding');
        } else {
          // Returning user — jump straight to Camera (it IS the home now)
          navigation.replace('Camera', { isHome: true });
        }
      } catch (error) {
        console.error('[SnapAct] SplashScreen: Navigation error:', error);
        navigation.replace('Onboarding');
      }
    }, 1500); // 1.5s for returning users — fast entry

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Grid lines background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: gridOpacity }]} pointerEvents="none">
        {horizontalLines.map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: i * 32 }]} />
        ))}
        {verticalLines.map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: i * 32 }]} />
        ))}
      </Animated.View>

      {/* Concentric subtle circles behind logo */}
      <View style={styles.circleBackingOuter} />
      <View style={styles.circleBackingInner} />

      {/* Edge Brackets */}
      <View style={[styles.edgeBracket, { top: 40, left: 20, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[styles.edgeBracket, { top: 40, right: 20, borderTopWidth: 2, borderRightWidth: 2 }]} />
      <View style={[styles.edgeBracket, { bottom: 40, left: 20, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[styles.edgeBracket, { bottom: 40, right: 20, borderBottomWidth: 2, borderRightWidth: 2 }]} />

      {/* Main Logo & Identity Block */}
      <Animated.View
        style={[
          styles.logoBlock,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={styles.eyebrow}>— SYSTEM ACTIVE —</Text>

        {/* Geometric square icon */}
        <View style={styles.logoContainer}>
          <View style={[styles.innerBracket, { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[styles.innerBracket, { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 }]} />
          <View style={[styles.innerBracket, { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[styles.innerBracket, { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 }]} />
          <View style={styles.centerCircle}>
            <View style={styles.centerDot} />
          </View>
        </View>

        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkSnap}>SNAP</Text>
          <Text style={styles.wordmarkAct}>ACT</Text>
        </View>
      </Animated.View>

      {/* Subtitles & Tagline */}
      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
        <Text style={styles.newTagline}>POINT · UNDERSTAND · ACT</Text>

        {/* Custom gold pip progress bar */}
        <View style={styles.pipContainer}>
          <View style={styles.pipInactive} />
          <View style={styles.pipInactive} />
          <View style={styles.pipActive} />
          <View style={styles.pipInactive} />
          <View style={styles.pipInactive} />
        </View>

        <Text style={styles.version}>SYS.REV.1.0 // MONOSPACE_OK</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#0d0d0d',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#0d0d0d',
  },
  circleBackingOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 197, 24, 0.03)',
  },
  circleBackingInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245, 197, 24, 0.07)',
  },
  edgeBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#F5C51860',
  },
  logoBlock: {
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: 'Courier New',
    fontSize: 11,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 2,
    marginBottom: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: '#F5C518',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#000000',
  },
  innerBracket: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: '#F5C518',
  },
  centerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5C518',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkSnap: {
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontSize: 40,
    fontWeight: '900',
    color: '#F5C518',
    letterSpacing: -1,
  },
  wordmarkAct: {
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  newTagline: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  pipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  pipActive: {
    width: 24,
    height: 6,
    backgroundColor: '#F5C518',
    marginHorizontal: 4,
  },
  pipInactive: {
    width: 6,
    height: 6,
    backgroundColor: '#333333',
    marginHorizontal: 4,
  },
  version: {
    color: '#444444',
    fontFamily: 'Courier New',
    fontSize: 9,
    letterSpacing: 1,
  },
});

export default SplashScreen;
