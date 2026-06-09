import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, MAX_HISTORY } from '../constants/config';

/**
 * Saves the user profile object to AsyncStorage
 */
export const saveProfile = async (profileData) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profileData));
    return true;
  } catch (error) {
    console.error('storageService.saveProfile error:', error);
    return false;
  }
};

/**
 * Retrieves the user profile from AsyncStorage
 * Returns null if no profile exists
 */
export const getProfile = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('storageService.getProfile error:', error);
    return null;
  }
};

/**
 * Prepends a new scan result to the scan history array.
 * Keeps a maximum of MAX_HISTORY items.
 */
export const saveScan = async (scanResult) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    const history = existing ? JSON.parse(existing) : [];
    const newEntry = {
      ...scanResult,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('storageService.saveScan error:', error);
    return false;
  }
};

/**
 * Retrieves the full scan history array from AsyncStorage
 */
export const getScanHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('storageService.getScanHistory error:', error);
    return [];
  }
};

/**
 * Clears the entire scan history
 */
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
    return true;
  } catch (error) {
    console.error('storageService.clearHistory error:', error);
    return false;
  }
};

/**
 * Checks whether the user has already completed onboarding.
 * Returns true if this is a first launch.
 */
export const isFirstLaunch = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED);
    return value === null; // null means key doesn't exist → first launch
  } catch (error) {
    console.error('storageService.isFirstLaunch error:', error);
    return true;
  }
};

/**
 * Marks onboarding as complete so the app goes straight to Home next time
 */
export const setOnboarded = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, 'true');
    return true;
  } catch (error) {
    console.error('storageService.setOnboarded error:', error);
    return false;
  }
};
