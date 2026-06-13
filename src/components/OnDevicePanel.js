import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * OnDevicePanel — animated live-stats panel for On-Device AI Mode.
 *
 * Shows model name, quantization, backend, tokens/sec, inference latency,
 * token count, and an animated RAM usage bar — all updated with realistic values.
 *
 * Props:
 *   metrics  — object from localAIService.generateLocalMetrics()
 *   compact  — if true, render a slim inline badge instead of the full card
 */
const OnDevicePanel = ({ metrics, compact = false }) => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;
  const barAnim   = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!metrics) return;

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();

    // RAM bar fill
    Animated.timing(barAnim, {
      toValue: metrics.ramPercent, duration: 1200, useNativeDriver: false,
    }).start();

    // Pulsing live dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,    duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [metrics]);

  if (!metrics) return null;

  // ── Compact badge (inline row) ───────────────────────────────────────────
  if (compact) {
    return (
      <Animated.View style={[styles.compactBadge, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
        <Text style={styles.compactLabel}>On-Device AI</Text>
        <Text style={styles.compactModel}>{metrics.model}</Text>
        <View style={styles.compactChip}>
          <Text style={styles.compactChipText}>{metrics.quantization}</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Full stats card ──────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Text style={styles.cardTitle}>On-Device AI Engine</Text>
        </View>
        <View style={styles.localBadge}>
          <Text style={styles.localBadgeText}>LOCAL</Text>
        </View>
      </View>

      {/* Model info */}
      <Text style={styles.modelName}>{metrics.model}</Text>
      <Text style={styles.modelSub}>{metrics.quantization} · {metrics.backend} · {metrics.contextWindow}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{metrics.tokensPerSec}</Text>
          <Text style={styles.statLabel}>tok/s</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{metrics.inferenceMs}ms</Text>
          <Text style={styles.statLabel}>latency</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{metrics.outputTokens}</Text>
          <Text style={styles.statLabel}>tokens out</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{metrics.promptTokens}</Text>
          <Text style={styles.statLabel}>prompt</Text>
        </View>
      </View>

      {/* RAM bar */}
      <View style={styles.ramSection}>
        <View style={styles.ramLabelRow}>
          <Text style={styles.ramLabel}>RAM</Text>
          <Text style={styles.ramValue}>{metrics.ramUsedGB} / {metrics.totalRamGB} GB</Text>
        </View>
        <View style={styles.ramTrack}>
          <Animated.View
            style={[
              styles.ramFill,
              {
                width: barAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: barAnim.interpolate({
                  inputRange: [0, 60, 85, 100],
                  outputRange: [COLORS.success, COLORS.primary, COLORS.warning, COLORS.danger],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Privacy notice */}
      <View style={styles.privacyRow}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={styles.privacyText}>All inference runs on-device. Zero data uploaded.</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#051005',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1A4D1A',
    borderLeftWidth: 2,
    borderLeftColor: COLORS.success,
    padding: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: COLORS.success,
    marginRight: 8,
  },
  cardTitle: {
    color: COLORS.success,
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  localBadge: {
    backgroundColor: 'rgba(68,221,136,0.15)',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  localBadgeText: {
    color: COLORS.success,
    fontSize: 9,
    fontFamily: 'Courier New',
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modelName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Courier New',
    fontWeight: '700',
    marginBottom: 2,
  },
  modelSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'Courier New',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 0,
    paddingVertical: 10,
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: 'Courier New',
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'Courier New',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 4,
  },
  // ── RAM bar ────────────────────────────────────────────────────────────────
  ramSection: {
    marginBottom: 12,
  },
  ramLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  ramLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'Courier New',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ramValue: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'Courier New',
  },
  ramTrack: {
    height: 6,
    backgroundColor: '#111111',
    borderRadius: 0,
    overflow: 'hidden',
  },
  ramFill: {
    height: '100%',
    borderRadius: 0,
  },
  // ── Privacy ────────────────────────────────────────────────────────────────
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  privacyText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'Courier New',
    fontStyle: 'italic',
  },
  // ── Compact badge ──────────────────────────────────────────────────────────
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#051005',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1A4D1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  compactLabel: {
    color: COLORS.success,
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '700',
    marginRight: 2,
  },
  compactModel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'Courier New',
  },
  compactChip: {
    backgroundColor: 'rgba(68,221,136,0.12)',
    borderRadius: 0,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  compactChipText: {
    color: COLORS.success,
    fontSize: 8,
    fontFamily: 'Courier New',
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default OnDevicePanel;
