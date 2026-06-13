import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { setOnboarded } from '../services/storageService';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '📷',
    title: 'POINT AT ANYTHING',
    subtitle:
      'Medicine packages, restaurant menus, utility invoices, legal contracts — SnapAct scans them all instantly.',
  },
  {
    icon: '🧠',
    title: 'CONTEXT AWARE',
    subtitle:
      'Your active prescriptions, food allergies, emergency contacts — the system processes everything in your personal context.',
  },
  {
    icon: '⚡',
    title: 'AUTOMATE ACTIONS',
    subtitle:
      'Detects dangerous drug interactions and draft doctor alerts. Identifies food allergens and warn your contacts.',
  },
];

/**
 * OnboardingScreen — redesigned in Raw Terminal / Precision Instrument style.
 */
const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const goToSlide = (index) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleContinue();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleContinue();
  };

  const handleContinue = async () => {
    await setOnboarded();
    navigation.replace('ProfileSetup');
  };

  const onScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>// SKIP</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            {/* Square Icon Container */}
            <View style={styles.iconSquare}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Rectangular progress pips */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA flat buttons */}
      <View style={styles.buttonArea}>
        {isLast ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
            <Text style={styles.primaryBtnText}>INITIALIZE HEALTH PROFILE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>CONTINUE STEP →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: '#F5C518',
    fontFamily: 'Courier New',
    fontSize: 12,
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
    marginTop: 60,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconSquare: {
    width: 90,
    height: 90,
    borderRadius: 0,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 38,
  },
  title: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Impact' : 'sans-serif-condensed',
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Courier New',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    height: 6,
    borderRadius: 0,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#F5C518',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#333333',
  },
  buttonArea: {
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  primaryBtn: {
    backgroundColor: '#F5C518',
    borderRadius: 0,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 13,
    fontFamily: 'Courier New',
    fontWeight: '900',
  },
});

export default OnboardingScreen;
