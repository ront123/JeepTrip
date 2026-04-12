import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { Palette, Radius, Typography } from '@/constants/theme';

interface LangToggleProps {
  style?: object;
}

export function LangToggle({ style }: LangToggleProps) {
  const { lang, toggleLang } = useLanguage();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    toggleLang();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.8}>
        <Text style={styles.flag}>{lang === 'en' ? '🇮🇱' : '🇺🇸'}</Text>
        <Text style={styles.label}>{lang === 'en' ? 'עב' : 'EN'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.charcoalLight,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.gold + '55',
  },
  flag: {
    fontSize: 16,
  },
  label: {
    color: Palette.gold,
    fontSize: Typography.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
