import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { saveProfile, getProfile } from '../services/storageService';
import ProfileTag from '../components/ProfileTag';
import ActionButton from '../components/ActionButton';
import { COLORS } from '../constants/colors';

const LANGUAGES = ['English', 'Hindi', 'Kannada', 'Telugu', 'Tamil'];

/**
 * ProfileSetupScreen — collects the user's personal health & contact context.
 * Works in both initial setup mode and edit mode (when navigated from ProfileScreen).
 */
const ProfileSetupScreen = ({ navigation, route }) => {
  const isEditMode = route?.params?.editMode === true;

  const [medicines, setMedicines] = useState([]);
  const [medicineInput, setMedicineInput] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [langOpen, setLangOpen] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing profile in edit mode
  useEffect(() => {
    if (isEditMode) {
      (async () => {
        const profile = await getProfile();
        if (profile) {
          setMedicines(profile.medicines || []);
          setAllergies(profile.allergies || []);
          setLanguage(profile.language || 'English');
          setEmergencyName(profile.emergencyContact?.name || '');
          setEmergencyPhone(profile.emergencyContact?.phone || '');
        }
      })();
    }
  }, [isEditMode]);

  /** Add a medicine tag */
  const addMedicine = () => {
    const val = medicineInput.trim();
    if (val && !medicines.includes(val)) {
      setMedicines([...medicines, val]);
      setMedicineInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  /** Remove a medicine tag */
  const removeMedicine = (item) => {
    setMedicines(medicines.filter((m) => m !== item));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /** Add an allergy tag */
  const addAllergy = () => {
    const val = allergyInput.trim();
    if (val && !allergies.includes(val)) {
      setAllergies([...allergies, val]);
      setAllergyInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  /** Remove an allergy tag */
  const removeAllergy = (item) => {
    setAllergies(allergies.filter((a) => a !== item));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /** Save profile and navigate to Home */
  const handleSave = async () => {
    // Auto-add any text still in the input fields (user typed but didn't press +)
    const finalMedicines = [...medicines];
    if (medicineInput.trim() && !finalMedicines.includes(medicineInput.trim())) {
      finalMedicines.push(medicineInput.trim());
    }
    const finalAllergies = [...allergies];
    if (allergyInput.trim() && !finalAllergies.includes(allergyInput.trim())) {
      finalAllergies.push(allergyInput.trim());
    }

    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      Alert.alert('Missing Info', 'Please add an emergency contact name and phone number.');
      return;
    }
    setSaving(true);
    const profile = {
      medicines: finalMedicines,
      allergies: finalAllergies,
      language,
      emergencyContact: {
        name: emergencyName.trim(),
        phone: emergencyPhone.trim(),
      },
    };
    await saveProfile(profile);
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isEditMode) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>
              {isEditMode ? 'Edit Profile' : 'Set Up Your Profile'}
            </Text>
            <Text style={styles.subheading}>
              This is how SnapAct knows you personally
            </Text>
          </View>

          {/* Section 1 — Medicines */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>💊 Your current medicines</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={medicineInput}
                onChangeText={setMedicineInput}
                placeholder="e.g. Metformin 500mg"
                placeholderTextColor={COLORS.textMuted}
                onSubmitEditing={addMedicine}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addBtn} onPress={addMedicine}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsRow}>
              {medicines.map((m) => (
                <ProfileTag
                  key={m}
                  label={m}
                  color="gold"
                  onRemove={() => removeMedicine(m)}
                />
              ))}
            </View>
          </View>

          {/* Section 2 — Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>⚠️ Your allergies</Text>
            <Text style={styles.sectionHint}>Food, drug, environmental</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="e.g. Penicillin, Peanuts"
                placeholderTextColor={COLORS.textMuted}
                onSubmitEditing={addAllergy}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addBtn} onPress={addAllergy}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsRow}>
              {allergies.map((a) => (
                <ProfileTag
                  key={a}
                  label={a}
                  color="red"
                  onRemove={() => removeAllergy(a)}
                />
              ))}
            </View>
          </View>

          {/* Section 3 — Language */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🌐 Preferred language</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setLangOpen(!langOpen);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.dropdownText}>{language}</Text>
              <Text style={styles.dropdownChevron}>{langOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {langOpen && (
              <View style={styles.dropdownMenu}>
                {LANGUAGES.map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[
                      styles.dropdownItem,
                      l === language && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setLanguage(l);
                      setLangOpen(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        l === language && styles.dropdownItemTextActive,
                      ]}
                    >
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Section 4 — Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🚨 Emergency contact</Text>
            <TextInput
              style={[styles.input, styles.inputFull]}
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="Contact name"
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.inputFull, { marginTop: 10 }]}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="Phone number (with country code)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>

          {/* Section 5 — Documents Note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteIcon}>📄</Text>
            <Text style={styles.noteText}>
              Point the camera at any document — SnapAct will compare it against
              the context from your profile and highlight what matters to YOU.
            </Text>
          </View>

          {/* Save button */}
          <View style={styles.saveArea}>
            <ActionButton
              title={isEditMode ? 'Save Changes' : 'Save & Continue'}
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  header: {
    marginTop: 16,
    marginBottom: 28,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputFlex: {
    flex: 1,
    marginRight: 10,
  },
  inputFull: {
    width: '100%',
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.background,
    lineHeight: 28,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dropdown: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dropdownText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownChevron: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  dropdownMenu: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(245,197,24,0.12)',
  },
  dropdownItemText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245,197,24,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.2)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    alignItems: 'flex-start',
  },
  noteIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  saveArea: {
    marginTop: 4,
  },
});

export default ProfileSetupScreen;
