import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getProfile, getScanHistory } from '../services/storageService';
import ResultCard from '../components/ResultCard';
import { COLORS } from '../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const SCAN_MODES = [
  { num: '01 //', label: 'Medicine', mode: 'Medicine', desc: 'Interaction check' },
  { num: '02 //', label: 'Food/Menu', mode: 'Food/Menu', desc: 'Allergen check' },
  { num: '03 //', label: 'Bill', mode: 'Bill', desc: 'Overcharge detect' },
  { num: '04 //', label: 'Document', mode: 'Document', desc: 'Clause analysis' },
];

/**
 * Custom scrolling ticker strip — looping animated text.
 */
const TickerMarquee = () => {
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      scrollAnim.setValue(0);
      Animated.timing(scrollAnim, {
        toValue: -300,
        duration: 14000,
        useNativeDriver: true,
        isInteraction: false,
      }).start(() => startAnimation());
    };
    startAnimation();
  }, []);

  return (
    <View style={styles.tickerContainer}>
      <Animated.View style={[styles.tickerRow, { transform: [{ translateX: scrollAnim }] }]}>
        <Text style={styles.tickerText}>
          MEDICINE <Text style={styles.tickerCheck}>✓</Text>  FOOD <Text style={styles.tickerCheck}>✓</Text>  OBJECTS <Text style={styles.tickerCheck}>✓</Text>  BILLS <Text style={styles.tickerCheck}>✓</Text>  DOCUMENTS <Text style={styles.tickerCheck}>✓</Text>  
        </Text>
        <Text style={styles.tickerText}>
          MEDICINE <Text style={styles.tickerCheck}>✓</Text>  FOOD <Text style={styles.tickerCheck}>✓</Text>  OBJECTS <Text style={styles.tickerCheck}>✓</Text>  BILLS <Text style={styles.tickerCheck}>✓</Text>  DOCUMENTS <Text style={styles.tickerCheck}>✓</Text>  
        </Text>
        <Text style={styles.tickerText}>
          MEDICINE <Text style={styles.tickerCheck}>✓</Text>  FOOD <Text style={styles.tickerCheck}>✓</Text>  OBJECTS <Text style={styles.tickerCheck}>✓</Text>  BILLS <Text style={styles.tickerCheck}>✓</Text>  DOCUMENTS <Text style={styles.tickerCheck}>✓</Text>  
        </Text>
      </Animated.View>
    </View>
  );
};

/**
 * HomeScreen — redesigned in Raw Terminal / Precision Instrument style.
 */
const HomeScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);

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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow & Ready Header */}
        <View style={styles.header}>
          <Text style={styles.topEyebrow}>// SNAPACT v1.0 — READY</Text>
          <Text style={styles.headline}>
            WHAT DO {'\n'}YOU <Text style={{ color: '#F5C518' }}>NEED</Text> {'\n'}TO KNOW?
          </Text>
        </View>

        {/* Scan Button Target */}
        <View style={styles.scanWrapper}>
          <View style={[styles.outerHex, { transform: [{ rotate: '0deg' }] }]} />
          <View style={[styles.outerHex, { transform: [{ rotate: '45deg' }] }]} />
          
          <TouchableOpacity
            style={styles.bigScanBtn}
            onPress={handleMainScan}
            activeOpacity={0.85}
          >
            <View style={styles.innerCrosshairH} />
            <View style={styles.innerCrosshairV} />
            <Text style={styles.bigScanIcon}>📷</Text>
            <Text style={styles.bigScanLabel}>SCAN TARGET</Text>
            <Text style={styles.bigScanSub}>INITIATE SCAN</Text>
          </TouchableOpacity>
        </View>

        {/* Loop ticker marquee */}
        <TickerMarquee />

        {/* 2x2 Grid cards */}
        <Text style={styles.sectionTitle}>// ACTIVE_MODES</Text>
        <View style={styles.modesGrid}>
          {SCAN_MODES.map((item) => (
            <TouchableOpacity
              key={item.mode}
              style={styles.modeCard}
              onPress={() => handleScanMode(item.mode)}
              activeOpacity={0.75}
            >
              <Text style={styles.modeNum}>{item.num}</Text>
              <Text style={styles.modeLabel}>{item.label}</Text>
              <Text style={styles.modeDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent logs */}
        <Text style={styles.sectionTitle}>// SCAN_LOGS</Text>
        {history.length > 0 ? (
          history.map((scan) => (
            <ResultCard key={scan.id} scan={scan} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>NO DATA LOGGED</Text>
            <Text style={styles.emptyHint}>
              Perform scan capture to register logs.
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
    backgroundColor: '#000000',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  header: {
    marginTop: 16,
    marginBottom: 8,
  },
  topEyebrow: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '700',
    color: '#F5C518',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headline: {
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  scanWrapper: {
    alignSelf: 'center',
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerHex: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.15)',
    borderRadius: 0,
  },
  bigScanBtn: {
    width: 124,
    height: 124,
    borderRadius: 0,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCrosshairH: {
    position: 'absolute',
    width: 20,
    height: 1,
    backgroundColor: 'rgba(245, 197, 24, 0.4)',
    top: '50%',
    left: 10,
  },
  innerCrosshairV: {
    position: 'absolute',
    width: 1,
    height: 20,
    backgroundColor: 'rgba(245, 197, 24, 0.4)',
    left: '50%',
    top: 10,
  },
  bigScanIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  bigScanLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    color: '#F5C518',
    letterSpacing: -0.5,
  },
  bigScanSub: {
    fontSize: 9,
    fontFamily: 'Courier New',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tickerContainer: {
    height: 24,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginVertical: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 900,
  },
  tickerText: {
    fontFamily: 'Courier New',
    fontSize: 9,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 2,
    marginRight: 24,
  },
  tickerCheck: {
    color: '#F5C518',
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '700',
    color: '#F5C518',
    marginBottom: 10,
    letterSpacing: 1,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  modeCard: {
    width: CARD_WIDTH,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C518',
    borderRadius: 0,
    padding: 16,
    marginBottom: 12,
  },
  modeNum: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '700',
    color: '#F5C518',
    marginBottom: 8,
  },
  modeLabel: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  modeDesc: {
    fontSize: 10,
    fontFamily: 'Courier New',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Courier New',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 10,
    fontFamily: 'Courier New',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default HomeScreen;
