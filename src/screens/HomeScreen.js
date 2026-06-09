import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getProfile, getScanHistory } from '../services/storageService';
import ResultCard from '../components/ResultCard';
import { COLORS } from '../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const SCAN_MODES = [
  { label: 'Medicine', icon: '💊', mode: 'Medicine', desc: 'Interaction check' },
  { label: 'Food/Menu', icon: '🍽️', mode: 'Food/Menu', desc: 'Allergen check' },
  { label: 'Bill', icon: '💡', mode: 'Bill', desc: 'Overcharge detect' },
  { label: 'Document', icon: '📄', mode: 'Document', desc: 'Clause analysis' },
];

/**
 * HomeScreen — greeting, big scan CTA, 4 mode cards, and recent scan history.
 */
const HomeScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);

  /** Reload data every time this tab comes into focus */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getProfile();
        const h = await getScanHistory();
        setProfile(p);
        setHistory(h.slice(0, 5));
      })();
    }, [])
  );

  /** Returns greeting based on current hour */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleScanMode = async (mode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Camera', { mode });
  };

  const handleMainScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('Camera', { mode: 'Auto' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}{profile?.emergencyContact?.name ? ',' : ''}
            </Text>
            <Text style={styles.subgreeting}>What do you want to scan today?</Text>
          </View>
          <View style={styles.logoChip}>
            <Text style={styles.logoChipText}>S</Text>
          </View>
        </View>

        {/* Big Scan Button */}
        <TouchableOpacity
          style={styles.bigScanBtn}
          onPress={handleMainScan}
          activeOpacity={0.85}
        >
          <View style={styles.bigScanInner}>
            <Text style={styles.bigScanIcon}>📷</Text>
            <Text style={styles.bigScanLabel}>TAP TO SCAN</Text>
            <Text style={styles.bigScanSub}>Point at anything</Text>
          </View>
          {/* Glow ring */}
          <View style={styles.glowRing} />
        </TouchableOpacity>

        {/* 4 Mode Cards */}
        <Text style={styles.sectionTitle}>Scan Modes</Text>
        <View style={styles.modesGrid}>
          {SCAN_MODES.map((item) => (
            <TouchableOpacity
              key={item.mode}
              style={styles.modeCard}
              onPress={() => handleScanMode(item.mode)}
              activeOpacity={0.75}
            >
              <Text style={styles.modeIcon}>{item.icon}</Text>
              <Text style={styles.modeLabel}>{item.label}</Text>
              <Text style={styles.modeDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Scans */}
        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            {history.map((scan) => (
              <ResultCard key={scan.id} scan={scan} />
            ))}
          </>
        )}

        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No scans yet</Text>
            <Text style={styles.emptyHint}>
              Tap the button above to make your first scan
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const CARD_WIDTH = (width - 22 * 2 - 12) / 2;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subgreeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChipText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.background,
  },
  bigScanBtn: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 18,
  },
  bigScanInner: {
    alignItems: 'center',
  },
  bigScanIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  bigScanLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.background,
    letterSpacing: 2,
  },
  bigScanSub: {
    fontSize: 11,
    color: 'rgba(10,10,10,0.6)',
    marginTop: 3,
    fontWeight: '600',
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  modeCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
  },
  modeIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  modeDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default HomeScreen;
