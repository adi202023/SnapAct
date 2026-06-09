import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { isFirstLaunch } from '../services/storageService';
import { COLORS } from '../constants/colors';

/**
 * SplashScreen — shown for 2 seconds on every launch.
 * Logo fades in, tagline slides up.
 * Navigates to Onboarding on first launch, else Home.
 */
const SplashScreen = ({ navigation }) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslate = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo fade in
    Animated.sequence([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Animate tagline slide up + fade in
      Animated.parallel([
        Animated.timing(taglineTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // After 2 seconds, decide where to navigate
    const timer = setTimeout(async () => {
      try {
        console.log('[SnapAct] SplashScreen: Checking first launch...');
        
        // Race AsyncStorage check against a 500ms timeout to prevent hanging
        const checkPromise = isFirstLaunch();
        const timeoutPromise = new Promise((resolve) => setTimeout(() => {
          console.log('[SnapAct] SplashScreen: AsyncStorage check timed out, falling back to true');
          resolve(true);
        }, 500));
        
        const first = await Promise.race([checkPromise, timeoutPromise]);
        console.log('[SnapAct] SplashScreen: First launch result:', first);
        
        if (first) {
          console.log('[SnapAct] SplashScreen: Navigating to Onboarding');
          navigation.replace('Onboarding');
        } else {
          console.log('[SnapAct] SplashScreen: Navigating to Main');
          navigation.replace('Main');
        }
      } catch (error) {
        console.error('[SnapAct] SplashScreen: Navigation error:', error);
        try {
          navigation.replace('Onboarding');
        } catch (e) {
          console.error('[SnapAct] SplashScreen: Fallback navigation failed:', e);
        }
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <Animated.View style={[styles.logoWrapper, { opacity: logoOpacity }]}>
        {/* S icon in gold */}
        <View style={styles.logoIcon}>
          <Text style={styles.logoLetter}>S</Text>
        </View>
        <Text style={styles.logoText}>SnapAct</Text>
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslate }],
          },
        ]}
      >
        Point. Understand. Act.
      </Animated.Text>

      <Text style={styles.version}>v1.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // Subtle glow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  logoLetter: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.background,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    color: COLORS.textMuted,
    fontSize: 12,
  },
});

export default SplashScreen;
