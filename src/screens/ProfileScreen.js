import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ProfileTag from '../components/ProfileTag';
import ResultCard from '../components/ResultCard';
import { getProfile, getScanHistory, clearHistory } from '../services/storageService';
import { COLORS } from '../constants/colors';

/**
 * ProfileScreen — displays the user's full profile, scan history, and edit button.
 */
const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);

  /** Reload on every focus so edits reflect immediately */
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

  const handleEdit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ProfileSetup', { editMode: true });
  };

  const handleClearHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear History',
      'This will permanently delete all your scan history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
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
          <Text style={styles.emptyTitle}>No profile yet</Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text style={styles.setupBtnText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Text style={styles.editBtnText}>Edit ✏️</Text>
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
            <Text style={styles.none}>None added</Text>
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
            <Text style={styles.none}>None added</Text>
          )}
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🌐 Language</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{profile.language || 'English'}</Text>
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
            <Text style={styles.sectionLabel}>🕒 Scan History</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {history.length > 0 ? (
            history.map((scan) => <ResultCard key={scan.id} scan={scan} />)
          ) : (
            <View style={styles.historyEmpty}>
              <Text style={styles.none}>No scans yet</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  editBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  none: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  historyEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // No profile state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  setupBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  setupBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ProfileScreen;
