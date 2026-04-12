import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useLanguage } from '@/context/LanguageContext';
import { loginUser, registerUser, fetchUserProfile, getOrCreateProfile, getGoogleOAuthUrl, getAppleOAuthUrl } from '@/lib/auth';
import { mapAuthError } from '@/lib/errorMap';
import { supabase } from '@/lib/supabase';

// Required for web browser auth flow to complete
WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { t, isRTL } = useLanguage();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError(t('error_fill_all'));
      shake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        await registerUser({ email, password, fullName, vehicleDetails: vehicle });
        router.replace('/pending' as any);
      } else {
        const user = await loginUser(email, password);
        const profile = await fetchUserProfile(user.id);
        const inviteToken = await AsyncStorage.getItem('inviteToken');
        if (inviteToken) {
          router.replace(`/join/${inviteToken}` as any);
          return;
        }

        if (profile.status === 'pending') {
          router.replace('/pending' as any);
        } else if (profile.status === 'approved') {
          router.replace('/(tabs)');
        } else {
          setError(t('error_rejected'));
          shake();
        }
      }
    } catch (e: any) {
      console.log('--- AUTH ERROR ---', e?.message || e);
      setError(t(mapAuthError(e?.message ?? '')));
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError('');
      
      const { url, redirectUrl } = provider === 'google' 
        ? await getGoogleOAuthUrl() 
        : await getAppleOAuthUrl();
        
      if (!url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        
        // Robust manual parsing of both query strings and fragments
        const getParams = (urlStr: string) => {
          const params: Record<string, string> = {};
          // Parse ?query
          const queryString = urlStr.split('?')[1]?.split('#')[0];
          if (queryString) {
            queryString.split('&').forEach(pair => {
              const [k, v] = pair.split('=');
              if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
            });
          }
          // Parse #fragment
          const fragmentString = urlStr.split('#')[1];
          if (fragmentString) {
            fragmentString.split('&').forEach(pair => {
              const [k, v] = pair.split('=');
              if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
            });
          }
          return params;
        };

        const params = getParams(url);
        
        // 0. Check for errors returned in the URL
        if (params.error || params.error_description) {
          throw new Error(params.error_description || params.error || 'Identity provider error');
        }

        // 1. Handle tokens (Implicit/Hybrid Flow)
        if (params.access_token && params.refresh_token) {
          const { error: setSessionError } = await supabase.auth.setSession({ 
            access_token: params.access_token, 
            refresh_token: params.refresh_token 
          });
          if (setSessionError) throw setSessionError;
        }
        
        // 2. Handle code (PKCE Flow)
        if (params.code) {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (sessionError) throw sessionError;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const inviteToken = await AsyncStorage.getItem('inviteToken');
          if (inviteToken) {
            router.replace(`/join/${inviteToken}` as any);
            return;
          }

          // Check/Create profile logic
          const profile = await getOrCreateProfile(session.user);
          if (profile?.status === 'pending') {
             router.replace('/pending' as any);
          } else if (profile?.status === 'approved') {
             router.replace('/(tabs)');
          } else {
             setError(t('error_rejected'));
             shake();
          }
        }
      }
    } catch (e: any) {
      console.log(`--- ${provider.toUpperCase()} OAUTH ERROR ---`, e?.message || e);
      setError(e?.message || `${provider} Login failed.`);
      shake();
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
      <View style={[styles.trackLine, { top: 60 }]} />
      <View style={[styles.trackLine, { top: 68 }]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <Text style={[styles.logoText, rtlText]}>🚙 JeepTrip</Text>
            <Text style={[styles.heroLine, rtlText]}>
              {mode === 'login' ? (isRTL ? 'ברוכים הבאים' : 'Welcome') : (isRTL ? 'הצטרפות לצוות' : 'Join the Crew')}
            </Text>
          </View>

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
              onPress={() => switchMode('login')}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                {t('tab_login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
              onPress={() => switchMode('register')}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                {t('tab_register')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

            {mode === 'register' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, rtlText]}>{t('label_full_name')}</Text>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t('placeholder_full_name')}
                    placeholderTextColor={Palette.mud}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, rtlText]}>{t('label_car')}</Text>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t('placeholder_car')}
                    placeholderTextColor={Palette.mud}
                    value={vehicle}
                    onChangeText={setVehicle}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, rtlText]}>{t('label_email')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('placeholder_email')}
                placeholderTextColor={Palette.mud}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="left" // Email always LTR
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, rtlText]}>{t('label_password')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('placeholder_password')}
                placeholderTextColor={Palette.mud}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="left"
              />
            </View>

            {error ? <Text style={[styles.errorText, rtlText]}>⚠ {error}</Text> : null}

            <TouchableOpacity
              style={styles.cta}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <LinearGradient
                colors={[Palette.oliveMid, Palette.olive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                {loading ? (
                  <ActivityIndicator color={Palette.cream} />
                ) : (
                  <Text style={styles.ctaText}>
                    {mode === 'login' ? t('cta_enter') : t('cta_request')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>{t('or')}</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity style={[styles.socialBtn, { marginBottom: Spacing.sm }]} onPress={() => handleOAuthLogin('google')} disabled={loading}>
              <Text style={styles.socialText}>{t('google_login')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={() => handleOAuthLogin('apple')} disabled={loading}>
              <Text style={styles.socialText}>{t('apple_login')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchModeRow} onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              <Text style={styles.switchModeText}>
                {mode === 'login' 
                  ? (isRTL ? 'אין לך חשבון? הירשם כאן' : "Don't have an account? Register here")
                  : (isRTL ? 'כבר יש לך חשבון? התחבר' : "Already have an account? Log in")}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.footerText, rtlText]}>{t('footer_access')}</Text>

          {/* Dev Helper - Easy copy paste for Supabase whitelist */}
          <View style={{ marginTop: 20, padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
            <Text style={{ color: Palette.gold, fontSize: 10, textAlign: 'center', marginBottom: 5 }}>
              DEV HELPER - ADD THIS TO SUPABASE REDIRECT URLS:
            </Text>
            <Text selectable style={{ color: 'white', fontSize: 11, textAlign: 'center' }}>
              {Linking.createURL('/login')}
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  flex: { flex: 1 },
  goldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: Palette.gold,
    zIndex: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: Palette.olive,
  },
  trackLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: Palette.charcoalLight,
    opacity: 0.6,
  },
  scroll: {
    paddingTop: height * 0.1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: { marginBottom: Spacing.xl },
  headerRTL: { alignItems: 'flex-end' },
  logoText: {
    fontSize: Typography.md,
    color: Palette.sand,
    letterSpacing: 2,
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  heroLine: {
    fontSize: Typography['2xl'],
    color: Palette.sand,
    fontWeight: '300',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroAccent: {
    fontSize: Typography['3xl'],
    color: Palette.gold,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    backgroundColor: Palette.charcoalLight,
    borderRadius: Radius.md,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  toggleBtnActive: { backgroundColor: Palette.gold },
  toggleText: {
    color: Palette.mud,
    fontWeight: '600',
    fontSize: Typography.sm,
    letterSpacing: 1,
  },
  toggleTextActive: { color: Palette.charcoal },
  card: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: { marginBottom: Spacing.md },
  label: {
    color: Palette.gold,
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Palette.charcoalLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    color: Palette.cream,
    fontSize: Typography.md,
    borderWidth: 1,
    borderColor: '#3A3A32',
  },
  inputRTL: {
    textAlign: 'right',
  },
  errorText: {
    color: Palette.rustLight,
    fontSize: Typography.sm,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  cta: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.sm },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: Palette.cream,
    fontWeight: '800',
    fontSize: Typography.md,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Palette.charcoalLight },
  orText: { color: Palette.mud, fontSize: Typography.xs, letterSpacing: 2 },
  socialBtn: {
    backgroundColor: Palette.charcoalLight,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A32',
  },
  socialText: { color: Palette.sand, fontSize: Typography.base, fontWeight: '500' },
  footerText: {
    textAlign: 'center',
    color: Palette.mud,
    fontSize: Typography.xs,
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    lineHeight: 18,
  },
  switchModeRow: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchModeText: {
    color: Palette.gold,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
