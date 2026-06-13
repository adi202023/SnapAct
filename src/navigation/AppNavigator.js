import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import ResultScreen from '../screens/ResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../constants/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Bottom tab icon component — simple icons only, no labels, 16px active underline.
 */
const TabIcon = ({ icon, focused }) => (
  <View style={tabStyles.iconWrapper}>
    <Text style={tabStyles.iconEmoji}>{icon}</Text>
    {focused && <View style={tabStyles.activeUnderline} />}
  </View>
);

/**
 * Bottom tab navigator — wraps Home, Camera (center gold), Profile.
 */
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: tabStyles.bar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon icon="🏠" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Camera"
      component={CameraScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <View style={tabStyles.centerBtn}>
            <Text style={tabStyles.centerBtnIcon}>📷</Text>
          </View>
        ),
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              props.onPress?.();
            }}
            style={tabStyles.centerBtnTouchable}
          />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon icon="👤" focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

/**
 * Root stack navigator — handles splash, onboarding, profile setup, and the main tab bar.
 * Camera and Result screens sit here so they can appear full-screen over tabs.
 */
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#0a0a0a',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 64,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconEmoji: {
    fontSize: 22,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 4,
    width: 16,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  centerBtnIcon: {
    fontSize: 22,
  },
  centerBtnTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});

export default AppNavigator;
