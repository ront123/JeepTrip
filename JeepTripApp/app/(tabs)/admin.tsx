import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { LangToggle } from '@/components/LangToggle';
import { supabase } from '@/lib/supabase';
import { fetchUserProfile } from '@/lib/auth';
import { fetchPendingUsers, updateUserStatus, UserProfile } from '@/lib/admin';

export default function AdminScreen() {
  const { t, isRTL } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // userId being processed

  const checkAdminAndLoad = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setIsAdmin(false);
        return;
      }

      const profile = await fetchUserProfile(user.id);
      if (profile.role !== 'admin') {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
      const users = await fetchPendingUsers();
      setPendingUsers(users);
    } catch (e) {
      console.error(e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    checkAdminAndLoad();
  };

  const handleAction = async (userId: string, action: 'approved' | 'rejected') => {
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, action);
      // Remove from list
      setPendingUsers((prev) => prev.filter(u => u.id !== userId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const rtlText = isRTL ? { textAlign: 'right' as const } : {};
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={Palette.gold} />
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={{ fontSize: 50, marginBottom: 20 }}>🚫</Text>
        <Text style={[styles.errorText, rtlText]}>{t('admin_unauthorized')}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.card}>
      <View style={[styles.cardHeader, rowStyle]}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, rtlText]}>{item.full_name}</Text>
          <Text style={[styles.cardSub, rtlText]}>{item.email}</Text>
          <Text style={[styles.cardCar, rtlText]}>🚙 {item.vehicle_details || 'No vehicle info'}</Text>
        </View>
      </View>

      <View style={[styles.actionRow, rowStyle]}>
        <TouchableOpacity
          style={[styles.btn, styles.btnReject]}
          disabled={actionLoading === item.id}
          onPress={() => handleAction(item.id, 'rejected')}
        >
          <Text style={styles.btnTextReject}>✖ {t('btn_reject')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnApprove]}
          disabled={actionLoading === item.id}
          onPress={() => handleAction(item.id, 'approved')}
        >
          {actionLoading === item.id ? (
             <ActivityIndicator size="small" color={Palette.cream} />
          ) : (
             <Text style={styles.btnTextApprove}>✔ {t('btn_approve')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Background */}
      <LinearGradient
        colors={[Palette.charcoal, '#1C1E16']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View>
          <Text style={[styles.headerSub, rtlText]}>{t('admin_title')}</Text>
          <Text style={[styles.headerTitle, rtlText]}>{t('admin_subtitle')}</Text>
        </View>
        <LangToggle />
      </View>

      <View style={styles.goldLine} />

      {/* Content */}
      <View style={styles.listHeader}>
        <Text style={[styles.sectionTitle, rtlText]}>
          {t('pending_users')}
          <Text style={{ color: Palette.sand, fontWeight: '400' }}>  ({pendingUsers.length})</Text>
        </Text>
      </View>

      <FlatList
        data={pendingUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>{t('no_pending_users')}</Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  headerSub: {
    fontSize: Typography.sm,
    color: Palette.gold,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '900',
    color: Palette.cream,
  },
  goldLine: {
    height: 2,
    backgroundColor: Palette.gold,
    marginHorizontal: Spacing.lg,
    borderRadius: 1,
    opacity: 0.6,
  },

  listHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: Palette.cream,
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  card: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
    padding: Spacing.md,
  },
  cardHeader: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Palette.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.cream,
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardTitle: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: Palette.cream,
  },
  cardSub: {
    fontSize: Typography.sm,
    color: Palette.sand,
    marginTop: 2,
  },
  cardCar: {
    fontSize: Typography.xs,
    color: Palette.gold,
    marginTop: 4,
    fontWeight: '600',
  },

  actionRow: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.charcoalLight,
    paddingTop: Spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnApprove: {
    backgroundColor: Palette.olive,
  },
  btnReject: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  btnTextApprove: {
    color: Palette.cream,
    fontWeight: '700',
    fontSize: Typography.sm,
  },
  btnTextReject: {
    color: Palette.rustLight,
    fontWeight: '700',
    fontSize: Typography.sm,
  },

  empty: { alignItems: 'center', paddingTop: Spacing['3xl'] },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Palette.sand,
    textAlign: 'center',
  },
  errorText: {
    fontSize: Typography.md,
    color: Palette.rustLight,
    textAlign: 'center',
    lineHeight: 24,
  },
});
