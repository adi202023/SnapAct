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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { setOnboarded } from '../services/storageService';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '📷',
    title: 'Point at anything',
    subtitle:
      'Medicine strips, restaurant menus, electricity bills, legal documents — SnapAct reads them all instantly.',
  },
  {
    icon: '🧠',
    title: 'AI knows YOU',
    subtitle:
      'Your medicines, allergies, emergency contacts — the AI responds in your personal context, not generic advice.',
  },
  {
    icon: '⚡',
    title: 'Takes action',
    subtitle:
      'Dangerous drug interaction? Alerts your doctor. Allergen found? Warns your contact. Overcharge? Files the complaint.',
  },
];

/**
 * Onboarding screen with 3 swipeable slides, dot indicators, Next/Skip, and a final CTA.
 */
const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const dotAnim = useRef(SLIDES.map(() => new Animated.Value(0))).current;

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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
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
            {/* Icon circle */}
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
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

      {/* CTA buttons */}
      <View style={styles.buttonArea}>
        {isLast ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
            <Text style={styles.primaryBtnText}>Set Up My Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
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
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,24,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: COLORS.border,
  },
  buttonArea: {
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen;
