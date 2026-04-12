import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Typography, Radius, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { joinGroupByToken } from '@/lib/groups';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function JoinGroupScreen() {
  const { token } = useLocalSearchParams();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function checkGroup() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (token) {
             await AsyncStorage.setItem('inviteToken', token as string);
          }
          router.replace('/login');
          return;
        }

        const { data, error } = await supabase
          .from('groups')
          .select('id, name, description')
          .eq('invite_token', token as string)
          .single();

        if (error || !data) {
          Alert.alert('Error', 'Invalid or expired invite link.');
          router.replace('/(tabs)');
          return;
        }
        setGroup(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    checkGroup();
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinGroupByToken(token as string);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('users').update({ status: 'approved' }).eq('id', session.user.id);
      }
      await AsyncStorage.removeItem('inviteToken');
      Alert.alert('Success', `You have joined ${group.name}!`);
      router.replace('/(tabs)/trips');
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.gold} />
      </View>
    );
  }

  const rtlText = isRTL ? { textAlign: 'right' as const } : {};

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Palette.charcoal, '#1C1E16']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.card}>
        <Text style={styles.icon}>🤝</Text>
        <Text style={[styles.title, rtlText]}>
          {isRTL ? 'הוזמנת להצטרף לצוות!' : "You've been invited!"}
        </Text>
        <Text style={[styles.groupName, rtlText]}>{group.name}</Text>
        <Text style={[styles.description, rtlText]}>{group.description || 'No description provided.'}</Text>

        <TouchableOpacity 
          style={styles.joinBtn} 
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color={Palette.charcoal} />
          ) : (
            <Text style={styles.joinBtnText}>{isRTL ? 'הצטרף עכשיו' : 'Join Crew Now'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 20 }}>
          <Text style={{ color: Palette.sand }}>{isRTL ? 'אולי פעם אחרת' : 'Maybe later'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  center: { flex: 1, backgroundColor: Palette.charcoal, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  icon: { fontSize: 60, marginBottom: 20 },
  title: { fontSize: Typography.lg, color: Palette.gold, fontWeight: '800', marginBottom: 10 },
  groupName: { fontSize: Typography['2xl'], color: Palette.cream, fontWeight: '900', marginBottom: 15 },
  description: { fontSize: Typography.sm, color: Palette.sand, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  joinBtn: {
    backgroundColor: Palette.gold,
    width: '100%',
    padding: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  joinBtnText: { color: Palette.charcoal, fontWeight: '900', fontSize: Typography.base },
});
