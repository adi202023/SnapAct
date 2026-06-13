import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getProfile, saveProfile } from '../services/storageService';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.75;

/**
 * ProfilePanel — slides in from the right over the camera feed.
 * Shows user name, medicine tags, allergy tags, on-device toggle, and edit button.
 * Props:
 *   visible: boolean
 *   onClose: () => void
 *   onEditProfile: () => void  — navigates to ProfileSetup
 */
const ProfilePanel = ({ visible, onClose, onEditProfile }) => {
  const translateX = useRef(new Animated.Value(PANEL_WIDTH + 40)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState(null);

  // Load profile every time panel becomes visible
  useEffect(() => {
    if (visible) {
      (async () => {
        const p = await getProfile();
        setProfile(p);
      })();

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

  const handleToggleOnDevice = async (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = { ...profile, onDeviceMode: value };
    await saveProfile(updated);
    setProfile(updated);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => onEditProfile(), 280); // wait for panel to slide out
  };

  if (!visible && translateX.__getValue() >= PANEL_WIDTH) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={visible ? 'box-none' : 'none'}>
      {/* Darkened backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Slide-in panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        {/* Header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>// USER_PROFILE</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {!profile ? (
          <View style={styles.noProfileBox}>
            <Text style={styles.noProfileText}>NO PROFILE IN BUFFER</Text>
            <TouchableOpacity style={styles.initBtn} onPress={handleEdit}>
              <Text style={styles.initBtnText}>INITIALIZE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Identity block */}
            <View style={styles.identityBlock}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {(profile.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.identityInfo}>
                <Text style={styles.userName}>{profile.name || 'UNNAMED USER'}</Text>
                <Text style={styles.userLang}>{profile.language || 'English'}</Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Medicines */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>💊 MEDICINES</Text>
              {profile.medicines && profile.medicines.length > 0 ? (
                <View style={styles.tagRow}>
                  {profile.medicines.map((med, i) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>{med}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyTagText}>none registered</Text>
              )}
            </View>

            <View style={styles.sectionDivider} />

            {/* Allergies */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>⚠️ ALLERGIES</Text>
              {profile.allergies && profile.allergies.length > 0 ? (
                <View style={styles.tagRow}>
                  {profile.allergies.map((allergy, i) => (
                    <View key={i} style={[styles.tag, styles.tagDanger]}>
                      <Text style={[styles.tagText, styles.tagTextDanger]}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyTagText}>none registered</Text>
              )}
            </View>

            <View style={styles.sectionDivider} />

            {/* On-Device AI toggle */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelCol}>
                  <Text style={styles.sectionLabel}>⚡ ON-DEVICE AI</Text>
                  <Text style={styles.toggleDesc}>offline · private · fast</Text>
                </View>
                <Switch
                  value={!!profile?.onDeviceMode}
                  onValueChange={handleToggleOnDevice}
                  trackColor={{ false: '#1a1a1a', true: 'rgba(245,197,24,0.35)' }}
                  thumbColor={profile?.onDeviceMode ? COLORS.primary : '#333333'}
                  ios_backgroundColor="#1a1a1a"
                />
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Emergency contact */}
            {(profile.emergencyName || profile.emergencyPhone) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🚨 EMERGENCY</Text>
                <Text style={styles.emergencyName}>{profile.emergencyName}</Text>
                <Text style={styles.emergencyPhone}>{profile.emergencyPhone}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Edit button */}
        <View style={styles.editBtnContainer}>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Text style={styles.editBtnText}>EDIT PROFILE ✏️</Text>
          </TouchableOpacity>
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
  },
  noProfileBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noProfileText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: '#444444',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  initBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  initBtnText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  identityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  avatarBox: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Courier New',
    fontWeight: '900',
    color: '#000000',
  },
  identityInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  userLang: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#444444',
    marginTop: 2,
    letterSpacing: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#111111',
    marginHorizontal: 0,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionLabel: {
    fontFamily: 'Courier New',
    fontSize: 10,
    fontWeight: '900',
    color: '#555555',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(245,197,24,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '900',
  },
  tagDanger: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderColor: 'rgba(255,68,68,0.25)',
  },
  tagTextDanger: {
    color: COLORS.danger,
  },
  emptyTagText: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#333333',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelCol: {
    flex: 1,
  },
  toggleDesc: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#333333',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  emergencyName: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  emergencyPhone: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  editBtnContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    padding: 20,
  },
  editBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editBtnText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
});

export default ProfilePanel;
