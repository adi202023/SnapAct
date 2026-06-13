import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = Math.min(width, height) * 0.72;
const CORNER_LENGTH = 40;
const CORNER_THICKNESS = 3;

/**
 * Animated corner-bracket scan overlay in cyber-terminal style.
 */
const ScanOverlay = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing opacity animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sweep animation
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: FRAME_SIZE - 4,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const scanLineOpacity = sweepAnim.interpolate({
    inputRange: [0, FRAME_SIZE * 0.1, FRAME_SIZE * 0.9, FRAME_SIZE - 4],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.frame, { opacity: pulseAnim }]}>
        {/* Top-left corner */}
        <View style={[styles.corner, styles.topLeft]}>
          <View style={[styles.cornerH, { top: 0, left: 0 }]} />
          <View style={[styles.cornerV, { top: 0, left: 0 }]} />
        </View>

        {/* Top-right corner */}
        <View style={[styles.corner, styles.topRight]}>
          <View style={[styles.cornerH, { top: 0, right: 0 }]} />
          <View style={[styles.cornerV, { top: 0, right: 0 }]} />
        </View>

        {/* Center Crosshair */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Sweeping scan line */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{ translateY: sweepAnim }],
              opacity: scanLineOpacity,
            },
          ]}
        />

        {/* Bottom-left corner */}
        <View style={[styles.corner, styles.bottomLeft]}>
          <View style={[styles.cornerH, { bottom: 0, left: 0 }]} />
          <View style={[styles.cornerV, { bottom: 0, left: 0 }]} />
        </View>

        {/* Bottom-right corner */}
        <View style={[styles.corner, styles.bottomRight]}>
          <View style={[styles.cornerH, { bottom: 0, right: 0 }]} />
          <View style={[styles.cornerV, { bottom: 0, right: 0 }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  cornerH: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_THICKNESS,
    backgroundColor: COLORS.primary,
    borderRadius: 0,
  },
  cornerV: {
    position: 'absolute',
    width: CORNER_THICKNESS,
    height: CORNER_LENGTH,
    backgroundColor: COLORS.primary,
    borderRadius: 0,
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 1,
    backgroundColor: 'rgba(245,197,24,0.5)',
    marginLeft: -15,
    marginTop: -0.5,
  },
  crosshairV: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 30,
    backgroundColor: 'rgba(245,197,24,0.5)',
    marginLeft: -0.5,
    marginTop: -15,
  },
  scanLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: COLORS.primary,
  },
});

export default ScanOverlay;
