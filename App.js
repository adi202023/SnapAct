import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';

console.log('[SnapAct] App.js module loaded successfully!');

// Global error handler to catch and display any startup crashes on the physical device
if (global.ErrorUtils) {
  const defaultHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[SnapAct] CRITICAL JS ERROR DETECTED:', error);
    Alert.alert(
      'JS Crash Detected',
      `${error.message}\n\n${error.stack?.substring(0, 300)}...`,
      [{ text: 'Dismiss' }]
    );
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// Keep the native splash screen visible until we're ready
try {
  console.log('[SnapAct] Preventing native splash autohide...');
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.error('[SnapAct] preventAutoHideAsync error:', e);
}

/**
 * Root App component — initialises providers and hides the native splash.
 */
export default function App() {
  console.log('[SnapAct] App component rendering...');

  useEffect(() => {
    console.log('[SnapAct] App component mounted, setting timer to hide splash...');
    // Give the app a moment to load fonts/data, then hide native splash
    const timer = setTimeout(() => {
      console.log('[SnapAct] Hiding native splash screen...');
      SplashScreen.hideAsync().catch((err) => {
        console.error('[SnapAct] Failed to hide splash screen:', err);
      });
    }, 500);
    return () => {
      console.log('[SnapAct] App component unmounting...');
      clearTimeout(timer);
    };
  }, []);

  try {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <AppNavigator />
      </SafeAreaProvider>
    );
  } catch (err) {
    console.error('[SnapAct] App rendering catch-all error:', err);
    return null;
  }
}
