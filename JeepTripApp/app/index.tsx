import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Palette, Typography, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { t } = useLanguage();
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    };

    const timer = setTimeout(() => {
      checkSession();
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[Palette.charcoal, Palette.charcoalMid, '#1F2118']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={styles.topAccent} />
      <View style={styles.bottomAccent} />

      {/* Language toggle removed */}

      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.emblem}>
          <Text style={styles.emblemLetter}>🚙</Text>
        </View>
        <Text style={styles.appName}>JeepTrip</Text>
        <View style={styles.divider} />
      </Animated.View>

      <Animated.View
        style={[
          styles.taglineContainer,
          { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
        ]}
      >
        <Text style={styles.tagline}>{t('splash_plan')}</Text>
        <Text style={styles.taglineAccent}>{t('splash_conquer')}</Text>
      </Animated.View>

      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>{t('splash_badge')}</Text>
        <View style={styles.badgeDot} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: Palette.gold,
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: Palette.olive,
  },
  langToggle: {
    position: 'absolute',
    top: 52,
    right: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emblem: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: Palette.charcoalLight,
    borderWidth: 2,
    borderColor: Palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Palette.gold,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  emblemLetter: { fontSize: 52 },
  appName: {
    fontSize: Typography['4xl'],
    fontWeight: '900',
    color: Palette.cream,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  divider: {
    marginTop: Spacing.sm,
    width: 60,
    height: 3,
    backgroundColor: Palette.gold,
    borderRadius: 2,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  tagline: {
    fontSize: Typography.md,
    color: Palette.sand,
    letterSpacing: 5,
    fontWeight: '400',
  },
  taglineAccent: {
    fontSize: Typography.md,
    color: Palette.gold,
    letterSpacing: 5,
    fontWeight: '700',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 5, height: 5,
    borderRadius: 3,
    backgroundColor: Palette.olive,
  },
  badgeText: {
    color: Palette.mud,
    fontSize: Typography.xs,
    letterSpacing: 3,
    fontWeight: '600',
  },
});
