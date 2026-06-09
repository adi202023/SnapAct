import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = Math.min(width, height) * 0.72;
const CORNER_LENGTH = 40;
const CORNER_THICKNESS = 3;

/**
 * Animated gold corner-bracket scan overlay.
 * Renders 4 corner-only brackets (not a full rectangle) in the center of the screen.
 * Pulses opacity to give a live scanning feel.
 */
const ScanOverlay = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
  }, []);

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
    borderRadius: 2,
  },
  cornerV: {
    position: 'absolute',
    width: CORNER_THICKNESS,
    height: CORNER_LENGTH,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});

export default ScanOverlay;
