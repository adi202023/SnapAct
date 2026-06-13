import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ProfileTag from '../components/ProfileTag';
import ResultCard from '../components/ResultCard';
import { getProfile, saveProfile, getScanHistory, clearHistory } from '../services/storageService';
import { COLORS } from '../constants/colors';

/**
 * ProfileScreen — redesigned in Raw Terminal / Precision Instrument style.
 */
const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getProfile();
        const h = await getScanHistory();
        setProfile(p);
        setHistory(h.slice(0, 10));
      })();
    }, [])
  );

  const handleToggleOnDevice = async (value) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updatedProfile = { ...profile, onDeviceMode: value };
    const success = await saveProfile(updatedProfile);
    if (success) {
      setProfile(updatedProfile);
    } else {
      Alert.alert('SYS_ERR', 'Failed to update system buffer settings.');
    }
  };

  const handleEdit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ProfileSetup', { editMode: true });
  };

  const handleClearHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'PURGE HISTORY',
      'This will permanently delete all scan records from memory. Purge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'PURGE',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>NO PROFILE FOUND IN BUFFER</Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text style={styles.setupBtnText}>INITIALIZE PROFILE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>USER_PROFILE</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Text style={styles.editBtnText}>EDIT ✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Medicines */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>💊 Medicines</Text>
          {profile.medicines?.length > 0 ? (
            <View style={styles.tagsRow}>
              {profile.medicines.map((m) => (
                <ProfileTag key={m} label={m} color="gold" />
              ))}
            </View>
          ) : (
            <Text style={styles.none}>NO MEDICINES ON RECORD</Text>
          )}
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚠️ Allergies</Text>
          {profile.allergies?.length > 0 ? (
            <View style={styles.tagsRow}>
              {profile.allergies.map((a) => (
                <ProfileTag key={a} label={a} color="red" />
              ))}
            </View>
          ) : (
            <Text style={styles.none}>NO ALLERGIES ON RECORD</Text>
          )}
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🌐 Language</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{profile.language || 'English'}</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚙️ Settings</Text>
          <View style={styles.infoCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsLabelCol}>
                <Text style={styles.settingsTitle}>On-Device AI Mode</Text>
                <Text style={styles.settingsDesc}>
                  Process everything locally on your device without an internet connection.
                </Text>
              </View>
              <Switch
                value={profile.onDeviceMode || false}
                onValueChange={handleToggleOnDevice}
                trackColor={{ false: '#111111', true: 'rgba(68, 221, 136, 0.4)' }}
                thumbColor={profile.onDeviceMode ? COLORS.success : '#555555'}
                ios_backgroundColor="#111111"
              />
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🚨 Emergency Contact</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>
              {profile.emergencyContact?.name || '—'}
            </Text>
            <Text style={[styles.infoLabel, { marginTop: 8 }]}>Phone</Text>
            <Text style={styles.infoValue}>
              {profile.emergencyContact?.phone || '—'}
            </Text>
          </View>
        </View>

        {/* Scan History */}
        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionLabel}>🕒 History</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearText}>PURGE ALL</Text>
              </TouchableOpacity>
            )}
          </View>

          {history.length > 0 ? (
            history.map((scan) => <ResultCard key={scan.id} scan={scan} />)
          ) : (
            <View style={styles.historyEmpty}>
              <Text style={styles.none}>NO SCAN HISTORICAL DATA FOUND</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  heading: {
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  editBtn: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Courier New',
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
    paddingTop: 8,
  },
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '900',
    color: '#F5C518',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  none: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'Courier New',
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C518',
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontFamily: 'Courier New',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLabelCol: {
    flex: 1,
    marginRight: 16,
  },
  settingsTitle: {
    color: COLORS.textPrimary,
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingsDesc: {
    color: COLORS.textSecondary,
    fontFamily: 'Courier New',
    fontSize: 10,
    lineHeight: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearText: {
    color: COLORS.danger,
    fontSize: 11,
    fontFamily: 'Courier New',
    fontWeight: '700',
  },
  historyEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  setupBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  setupBtnText: {
    color: '#000000',
    fontFamily: 'Courier New',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default ProfileScreen;
