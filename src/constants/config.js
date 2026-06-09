// API keys and app-wide configuration
// Replace these with your actual API keys before running

export const VISION_API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY || '';
export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export const APP_NAME = 'SnapAct';
export const VERSION = '1.0.0';

// Google Cloud Vision REST endpoint
export const VISION_ENDPOINT = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

// Model rotation — when one model hits rate limits the next is tried automatically
export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
];

// Base URL — model name is injected at call time
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Legacy single-model endpoint (kept for any code still referencing it)
export const GEMINI_ENDPOINT = `${GEMINI_BASE}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Scan modes
export const SCAN_MODES = {
  MEDICINE: 'Medicine',
  FOOD: 'Food/Menu',
  BILL: 'Bill',
  DOCUMENT: 'Document',
  AUTO: 'Auto',
};

// AsyncStorage keys
export const STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  SCAN_HISTORY: 'scanHistory',
  HAS_ONBOARDED: 'hasOnboarded',
};

// Max history items to store
export const MAX_HISTORY = 20;
