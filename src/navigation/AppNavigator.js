import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import ResultScreen from '../screens/ResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../constants/colors';
import { isFirstLaunch } from '../services/storageService';

const Stack = createStackNavigator();

/**
 * AppNavigator — smart routing based on onboarding status.
 *
 * First launch  (hasOnboarded = false) → Splash → Onboarding → ProfileSetup → Home
 * Return visits (hasOnboarded = true)  → Splash → Camera (isHome=true)
 *
 * The bottom tab bar is gone. ProfileScreen is reachable only via the ProfilePanel
 * slide-in (or from within ProfileSetup).  Home remains in the stack but is only
 * used on first launch.
 */
const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null); // null while loading

  useEffect(() => {
    (async () => {
      try {
        const first = await isFirstLaunch();
        setInitialRoute(first ? 'Splash' : 'Splash'); // always start at Splash
        // Actual routing decision is made inside SplashScreen after its animation.
      } catch {
        setInitialRoute('Splash');
      }
    })();
  }, []);

  // Wait until we have resolved the initial route
  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
          gestureEnabled: false, // disable swipe-back — camera is the root
        }}
      >
        {/* ── Onboarding flow (first launch only) ── */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />

        {/* ── Camera — permanent home for returning users ── */}
        <Stack.Screen name="Camera" component={CameraScreen} />

        {/* ── Result — pushed from Camera, back returns to Camera ── */}
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ gestureEnabled: true }}
        />

        {/* ── Profile — accessible from ProfilePanel inside Camera ── */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
