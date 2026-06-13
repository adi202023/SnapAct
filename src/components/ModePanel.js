import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.75;

export const SCAN_MODES = [
  {
    id: 'auto',
    label: 'AUTO DETECT',
    emoji: '⚡',
    description: 'scans everything',
    mode: 'Auto',
  },
  {
    id: 'medicine',
    label: 'MEDICINE',
    emoji: '💊',
    description: 'interactions + ingredients',
    mode: 'Medicine',
  },
  {
    id: 'food',
    label: 'FOOD / MENU',
    emoji: '🍽️',
    description: 'allergen check',
    mode: 'Food/Menu',
  },
  {
    id: 'bill',
    label: 'BILL',
    emoji: '💡',
    description: 'overcharge detect',
    mode: 'Bill',
  },
  {
    id: 'document',
    label: 'DOCUMENT',
    emoji: '📄',
    description: 'clause analysis',
    mode: 'Document',
  },
  {
    id: 'object',
    label: 'OBJECT / REPAIR',
    emoji: '🔧',
    description: 'fix · clean · maintain',
    mode: 'Object',
  },
];

/**
 * ModePanel — slides in from the right over the camera feed.
 * Props:
 *   visible: boolean
 *   selectedMode: string (mode id)
 *   onSelectMode: (mode object) => void
 *   onClose: () => void
 */
const ModePanel = ({ visible, selectedMode, onSelectMode, onClose }) => {
  const translateX = useRef(new Animated.Value(PANEL_WIDTH + 40)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: PANEL_WIDTH + 40,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (modeObj) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectMode(modeObj);
    onClose();
  };

  if (!visible && translateX.__getValue() >= PANEL_WIDTH) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={visible ? 'box-none' : 'none'}>
      {/* Darkened backdrop — tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Slide-in panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>// SCAN_MODE</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Mode list */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {SCAN_MODES.map((item) => {
            const isActive = selectedMode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.modeItem, isActive && styles.modeItemActive]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.modeEmoji}>{item.emoji}</Text>
                <View style={styles.modeLabelCol}>
                  <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.modeDesc}>{item.description}</Text>
                </View>
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom stamp */}
        <View style={styles.panelFooter}>
          <Text style={styles.footerText}>SNAPACT_OS v2.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#0a0a0a',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.primary,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  panelTitle: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Courier New',
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 0,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  modeItemActive: {
    borderLeftColor: COLORS.primary,
    backgroundColor: 'rgba(245,197,24,0.06)',
  },
  modeEmoji: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  modeLabelCol: {
    flex: 1,
  },
  modeLabel: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '900',
    color: '#666666',
    letterSpacing: 0.5,
  },
  modeLabelActive: {
    color: COLORS.primary,
  },
  modeDesc: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#333333',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.primary,
  },
  panelFooter: {
    borderTopWidth: 1,
    borderTopColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footerText: {
    fontFamily: 'Courier New',
    fontSize: 9,
    color: '#222222',
    letterSpacing: 1,
    fontWeight: '900',
  },
});

export default ModePanel;
