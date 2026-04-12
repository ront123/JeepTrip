import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, TextInput, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { fetchUserProfile } from '@/lib/auth';

export default function ProfileScreen() {
  const { t, isRTL } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const p = await fetchUserProfile(user.id);
          setProfile({ ...user, ...p });
          setEditName(p.full_name || '');
          setEditVehicle(p.vehicle_details || '');
        } catch (e) { console.error(e); }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editName,
          vehicle_details: editVehicle,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, full_name: editName, vehicle_details: editVehicle }));
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert('Error updating profile', e.message);
    } finally {
      setSaving(false);
    }
  };

  const rtlText = isRTL ? { textAlign: 'right' as const } : {};
  
  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.gold} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[Palette.charcoal, '#1C1E16']} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSub, rtlText]}>{isRTL ? 'נהג שטח' : 'OPERATOR'}</Text>
          <Text style={[styles.headerTitle, rtlText]}>{isRTL ? 'הפרופיל שלי' : 'Profile'}</Text>
        </View>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={{ color: Palette.gold, fontWeight: '700' }}>{isRTL ? 'עריכה' : 'Edit'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Text style={{ color: Palette.sand, fontWeight: '700' }}>{isRTL ? 'ביטול' : 'Cancel'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.goldLine} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() || 'J'}</Text>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <Text style={[styles.label, rtlText]}>{isRTL ? 'שם מלא' : 'FULL NAME'}</Text>
            <TextInput
              style={[styles.input, rtlText]}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={Palette.mud}
            />

            <Text style={[styles.label, rtlText, { marginTop: Spacing.md }]}>{isRTL ? 'פרטי רכב שטח' : 'VEHICLE DETAILS'}</Text>
            <TextInput
              style={[styles.input, rtlText]}
              value={editVehicle}
              onChangeText={setEditVehicle}
              placeholderTextColor={Palette.mud}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Palette.charcoal} /> : <Text style={styles.saveBtnText}>{isRTL ? 'שמור שינויים' : 'Save Changes'}</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.nameText, rtlText]}>{profile?.full_name}</Text>
            <Text style={[styles.emailText, rtlText]}>{profile?.email}</Text>

            <View style={[styles.card, { marginTop: Spacing.xl }]}>
              <Text style={[styles.label, rtlText]}>{isRTL ? 'רכב שטח' : 'VEHICLE'}</Text>
              <Text style={[styles.value, rtlText]}>🚙 {profile?.vehicle_details || (isRTL ? 'לא צוין' : 'N/A')}</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.label, rtlText]}>{isRTL ? 'תפקיד' : 'ROLE'}</Text>
              <Text style={[styles.value, rtlText]}>🛡️ {isRTL && profile?.role === 'admin' ? 'מנהל' : profile?.role?.toUpperCase()}</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{isRTL ? 'התנתק מהמערכת' : 'Logout'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  headerSub: { fontSize: Typography.sm, color: Palette.gold, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '900', color: Palette.cream },
  goldLine: { height: 2, backgroundColor: Palette.gold, marginHorizontal: Spacing.lg, borderRadius: 1, opacity: 0.6 },
  
  content: { padding: Spacing.xl, alignItems: 'center' },
  
  avatarBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: Palette.olive, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, borderWidth: 3, borderColor: Palette.oliveLight },
  avatarText: { fontSize: 40, color: Palette.cream, fontWeight: '800' },
  nameText: { fontSize: Typography.xl, fontWeight: '800', color: Palette.cream },
  emailText: { fontSize: Typography.sm, color: Palette.sand, marginTop: 4 },

  card: { width: '100%', backgroundColor: Palette.charcoalMid, padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.charcoalLight, marginBottom: Spacing.md },
  label: { fontSize: Typography.xs, color: Palette.gold, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: Typography.md, color: Palette.cream, fontWeight: '600' },

  logoutBtn: { width: '100%', marginTop: Spacing['2xl'], padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.rustLight, alignItems: 'center' },
  logoutText: { color: Palette.rustLight, fontWeight: '700', fontSize: Typography.base },

  editForm: { width: '100%', marginTop: Spacing.xl },
  input: { width: '100%', backgroundColor: Palette.charcoalMid, borderWidth: 1, borderColor: Palette.charcoalLight, color: Palette.cream, padding: 15, borderRadius: Radius.md, fontSize: Typography.md },
  saveBtn: { width: '100%', backgroundColor: Palette.gold, padding: 15, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnText: { color: Palette.charcoal, fontWeight: '800', fontSize: Typography.base },
});
