import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '@/context/LanguageContext';
import { createTrip } from '@/lib/trips';
import { supabase } from '@/lib/supabase';

const { height } = Dimensions.get('window');

export default function PendingScreen() {
  const { t, isRTL } = useLanguage();
  const rtlText = isRTL ? { textAlign: 'right' as const } : {};

  const STEPS = [
    { icon: '📬', key: 'step1' as const },
    { icon: '🔔', key: 'step2' as const },
    { icon: '🟢', key: 'step3' as const },
  ];

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTrip = async () => {
    if (!title || !date || !location) {
      Alert.alert(isRTL ? 'שגיאה' : 'Error', isRTL ? 'אנא מלא את כל השדות' : 'Please fill out all fields.');
      return;
    }
    setLoading(true);
    try {
      await createTrip({
        title,
        start_date: new Date(date).toISOString(),
        end_date: new Date(date).toISOString(),
        location_area: location,
        is_hidden: false,
        max_participants: 20,
        lat: null, lng: null, start_lat: null, start_lng: null,
        off_road_url: null, meeting_time: null
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('users').update({ status: 'approved' }).eq('id', session.user.id);
      }
      
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(isRTL ? 'שגיאה' : 'Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const stepAnims = STEPS.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.stagger(
      200,
      stepAnims.map((anim) =>
        Animated.spring(anim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true })
      )
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[Palette.charcoal, '#1C1E16', Palette.charcoalMid]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.goldBar} />

      {/* Language toggle removed */}

      <View style={styles.container}>
        {/* Pulsing badge */}
        <Animated.View style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={[Palette.olive, Palette.oliveMid]}
            style={styles.badgeInner}
          >
            <Text style={styles.badgeIcon}>⏳</Text>
          </LinearGradient>
          <View style={styles.badgeRing} />
        </Animated.View>

        <Text style={[styles.status, rtlText]}>{t('awaiting')}</Text>
        <Text style={[styles.title, rtlText]}>{t('pending_title')}</Text>

        <View style={styles.divider} />

        <Text style={[styles.subtitle, rtlText]}>{t('pending_subtitle')}</Text>

        {/* Steps */}
        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <Animated.View
              key={i}
              style={[
                styles.stepRow,
                isRTL && styles.stepRowRTL,
                {
                  opacity: stepAnims[i],
                  transform: [
                    {
                      translateX: stepAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [isRTL ? 30 : -30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.stepIconBox}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <Text style={[styles.stepLabel, rtlText]}>{t(step.key)}</Text>
            </Animated.View>
          ))}
        </View>

        {!showCreate ? (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={{ color: Palette.sand, fontSize: 13, marginBottom: Spacing.md, textAlign: 'center' }}>
              {isRTL ? 'רוצה לארגן מסע משלך במקום להמתין?' : 'Want to organize your own trip instead of waiting?'}
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.createBtnText}>{isRTL ? 'צור מסע חדש כמנהל' : 'Create New Trip as Manager'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.createForm}>
            <Text style={[styles.createTitle, rtlText]}>{isRTL ? 'מסע חדש' : 'New Trip'}</Text>
            
            <Text style={[styles.label, rtlText]}>{isRTL ? 'שם המסע' : 'Trip Title'}</Text>
            <TextInput 
              style={[styles.input, rtlText]} 
              placeholder={isRTL ? 'שם המסע' : 'Title'} 
              placeholderTextColor={Palette.mud}
              value={title} onChangeText={setTitle} 
            />

            <Text style={[styles.label, rtlText]}>{isRTL ? 'תאריך (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'}</Text>
            <TextInput 
              style={[styles.input, rtlText]} 
              placeholder="2026-04-12" 
              placeholderTextColor={Palette.mud}
              value={date} onChangeText={setDate} 
            />

            <Text style={[styles.label, rtlText]}>{isRTL ? 'אזור' : 'Location Area'}</Text>
            <TextInput 
              style={[styles.input, rtlText]} 
              placeholder={isRTL ? 'אזור' : 'Area'} 
              placeholderTextColor={Palette.mud}
              value={location} onChangeText={setLocation} 
            />

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTrip} disabled={loading}>
                {loading ? <ActivityIndicator color={Palette.charcoal} /> : <Text style={styles.submitBtnText}>{isRTL ? 'יצירה' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, rtlText]}>{t('pending_info')}</Text>
        </View>

        {/* Back to login */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/login' as any)}>
          <Text style={styles.backText}>{t('back_to_login')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
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
  langToggle: {
    position: 'absolute',
    top: 52,
    zIndex: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  badge: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 100, height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeRing: {
    position: 'absolute',
    width: 118, height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: Palette.gold,
    opacity: 0.4,
  },
  badgeIcon: { fontSize: 44 },
  status: {
    fontSize: Typography.xs,
    color: Palette.gold,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  title: {
    fontSize: Typography['3xl'],
    fontWeight: '900',
    color: Palette.cream,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 40,
  },
  divider: {
    width: 50, height: 3,
    backgroundColor: Palette.gold,
    borderRadius: 2,
    marginVertical: Spacing.lg,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Palette.sand,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  steps: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.charcoalLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Palette.olive,
  },
  stepRowRTL: {
    flexDirection: 'row-reverse',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: Palette.olive,
  },
  stepIconBox: {
    width: 36, height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: { fontSize: 22 },
  stepLabel: {
    color: Palette.cream,
    fontSize: Typography.sm,
    fontWeight: '500',
    flex: 1,
  },
  infoBox: {
    backgroundColor: `${Palette.olive}22`,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Palette.olive}55`,
    marginBottom: Spacing.xl,
  },
  infoText: {
    color: Palette.sand,
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: { paddingVertical: Spacing.sm },
  backText: {
    color: Palette.mud,
    fontSize: Typography.sm,
    letterSpacing: 1,
  },
  createBtn: {
    backgroundColor: Palette.gold,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  createBtnText: {
    color: Palette.charcoal,
    fontWeight: '800',
    fontSize: Typography.base,
  },
  createForm: {
    width: '100%',
    backgroundColor: Palette.charcoalMid,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
    marginBottom: Spacing.xl,
  },
  createTitle: { color: Palette.cream, fontSize: Typography.lg, fontWeight: '700', marginBottom: Spacing.sm },
  label: { color: Palette.sand, fontSize: Typography.xs, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Palette.charcoal,
    color: Palette.cream,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
    padding: 12,
    borderRadius: Radius.sm,
    fontSize: Typography.base,
  },
  cancelBtn: { flex: 1, padding: 14, borderWidth: 1, borderColor: Palette.charcoalLight, borderRadius: Radius.sm, alignItems: 'center' },
  cancelBtnText: { color: Palette.sand, fontWeight: '600' },
  submitBtn: { flex: 1, padding: 14, backgroundColor: Palette.gold, borderRadius: Radius.sm, alignItems: 'center' },
  submitBtnText: { color: Palette.charcoal, fontWeight: '800' },
});
