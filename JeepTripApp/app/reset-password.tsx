import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

const { height } = Dimensions.get('window');

export default function ResetPasswordScreen() {
  const { t, isRTL } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setError(t('error_fill_all'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwords_dont_match'));
      return;
    }
    if (password.length < 6) {
      setError(t('error_weak_password'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      // Wait a bit before redirecting
      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    } catch (e: any) {
      setError(e.message || t('error_unknown'));
    } finally {
      setLoading(false);
    }
  };

  const rtlText = isRTL ? { textAlign: 'right' as const, writingDirection: 'rtl' as const } : {};

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Palette.charcoal, '#1C1E16', Palette.charcoalMid]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.goldBar} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <Text style={[styles.logoText, rtlText]}>🚙 JeepTrip</Text>
            <Text style={[styles.heroLine, rtlText]}>
              {isRTL ? 'שחזור סיסמה' : 'Reset Password'}
            </Text>
          </View>

          <View style={styles.card}>
            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{t('msg_password_reset_success')}</Text>
                <TouchableOpacity style={styles.cta} onPress={() => router.replace('/login')}>
                  <LinearGradient
                    colors={[Palette.oliveMid, Palette.olive]}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText}>{isRTL ? 'חזרה להתחברות' : 'Back to Login'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, rtlText]}>{t('new_password')}</Text>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder="••••••••"
                    placeholderTextColor={Palette.mud}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, rtlText]}>{t('confirm_password')}</Text>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder="••••••••"
                    placeholderTextColor={Palette.mud}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>

                {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

                <TouchableOpacity style={styles.cta} onPress={handleResetPassword} disabled={loading}>
                  <LinearGradient
                    colors={[Palette.gold, Palette.gold]}
                    style={styles.ctaGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Palette.charcoal} />
                    ) : (
                      <Text style={[styles.ctaText, { color: Palette.charcoal }]}>
                        {t('btn_update_password')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  flex: { flex: 1 },
  goldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 4,
    backgroundColor: Palette.gold, zIndex: 10,
  },
  scroll: {
    paddingTop: height * 0.1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: { marginBottom: Spacing.xl },
  headerRTL: { alignItems: 'flex-end' },
  logoText: {
    fontSize: Typography.md,
    color: Palette.sand,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  heroLine: {
    fontSize: Typography['2xl'],
    color: Palette.cream,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  inputGroup: { marginBottom: Spacing.md },
  label: {
    fontFamily: Typography.fontFamily,
    fontSize: 12,
    color: Palette.gold,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Palette.charcoal,
    borderRadius: Radius.md,
    height: 50,
    paddingHorizontal: 16,
    color: Palette.cream,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  inputRTL: { textAlign: 'right' },
  errorText: {
    color: Palette.rustLight,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  successText: {
    color: Palette.olive,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  cta: { borderRadius: Radius.md, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: Palette.cream,
    fontWeight: '800',
    fontSize: Typography.md,
    textTransform: 'uppercase',
  },
});
