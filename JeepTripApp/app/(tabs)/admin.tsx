import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useNotifications } from '@/context/NotificationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  AdminStats,
  AdminTrip,
  UserProfile,
  UserTripCount,
  fetchAdminStats,
  fetchAllTrips,
  fetchPendingUsers,
  fetchTripsPerUser,
  updateUserStatus,
} from '@/lib/admin';
import { LinearGradient } from 'expo-linear-gradient';

type Tab = 'overview' | 'trips' | 'users' | 'pending';

export default function AdminScreen() {
  const { t, isRTL } = useLanguage();
  const { pendingCount } = useNotifications();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allTrips, setAllTrips] = useState<AdminTrip[]>([]);
  const [tripsPerUser, setTripsPerUser] = useState<UserTripCount[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, tData, u, p] = await Promise.all([
        fetchAdminStats(),
        fetchAllTrips(),
        fetchTripsPerUser(),
        fetchPendingUsers(),
      ]);
      setStats(s);
      setAllTrips(tData);
      setTripsPerUser(u);
      setPendingUsers(p);
    } catch (e) {
      console.error('Admin Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUserAction = async (userId: string, action: 'approved' | 'rejected') => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, action);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      loadData(); // Refresh stats
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  const filteredTrips = allTrips.filter(trip => {
    const q = searchQuery.toLowerCase();
    return (
      trip.title.toLowerCase().includes(q) ||
      trip.location_area?.toLowerCase().includes(q) ||
      trip.creator_name?.toLowerCase().includes(q) ||
      trip.creator_email?.toLowerCase().includes(q)
    );
  });

  const renderTabButton = (tab: Tab, label: string, icon: string, badge?: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tabBtn, isActive && styles.tabBtnActive]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>{isRTL ? 'מפקדה ראשית' : 'HEADQUARTERS'}</Text>
          <Text style={styles.headerTitle}>{isRTL ? 'חפ״ק ניהול' : 'ADMIN HQ'}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <IconSymbol name="arrow.clockwise" size={24} color={Palette.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.goldLine} />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {renderTabButton('overview', t('admin_tab_overview'), '📊')}
          {renderTabButton('trips', t('admin_tab_trips'), '🗺️', allTrips.length)}
          {renderTabButton('users', t('admin_tab_users'), '👥')}
          {renderTabButton('pending', t('admin_tab_pending'), '⏳', pendingUsers.length)}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && stats && (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.gold} />}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.statsGrid}>
              <StatCard label={t('admin_stats_total_users')} value={stats.totalUsers} icon="person.3.fill" color="#D4AF37" />
              <StatCard label={t('admin_stats_total_trips')} value={stats.totalTrips} icon="map.fill" color="#5C85BB" />
              <StatCard label={t('admin_stats_approved')} value={stats.approvedUsers} icon="checkmark.shield.fill" color="#4F7942" />
              <StatCard label={t('admin_stats_pending')} value={stats.pendingUsers} icon="clock.fill" color="#E67E22" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 {t('admin_top_creators')}</Text>
              {tripsPerUser.slice(0, 5).map((u, i) => (
                <View key={u.user_id} style={styles.creatorRow}>
                    <Text style={styles.creatorRank}>#{i+1}</Text>
                    <View style={styles.creatorAvatar}>
                        <Text style={styles.avatarText}>{u.full_name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.creatorInfo}>
                        <Text style={styles.creatorName}>{u.full_name}</Text>
                        <Text style={styles.creatorCount}>{u.trip_count} {isRTL ? 'טיולים' : 'trips'}</Text>
                    </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {activeTab === 'trips' && (
          <View style={styles.flex}>
            <View style={styles.searchBar}>
               <TextInput
                 style={styles.searchInput}
                 placeholder={t('admin_search_trips')}
                 placeholderTextColor={Palette.mud}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
               />
            </View>
            <FlatList
              data={filteredTrips}
              keyExtractor={item => item.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.gold} />}
              renderItem={({ item }) => (
                <View style={styles.tripCard}>
                    <View style={styles.tripHeader}>
                        <Text style={styles.tripTitle}>{item.title}</Text>
                        <View style={[styles.statusPill, item.is_archived && styles.statusPillPast]}>
                           <Text style={styles.statusText}>{item.is_archived ? t('admin_ended') : t('admin_active')}</Text>
                        </View>
                    </View>
                    <Text style={styles.tripMeta}>{item.location_area || '—'}  •  {formatDate(item.start_date)}</Text>
                    <View style={styles.tripFooter}>
                        <IconSymbol name="person.fill" size={14} color={Palette.mud} />
                        <Text style={styles.tripCreator}>{item.creator_name}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.attendeeCount}>{item.attendee_count} {isRTL ? 'משתתפים' : 'attendees'}</Text>
                    </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>{isRTL ? 'לא נמצאו טיולים' : 'No trips found'}</Text>}
            />
          </View>
        )}

        {activeTab === 'users' && (
           <FlatList
             data={tripsPerUser}
             keyExtractor={item => item.user_id}
             refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.gold} />}
             renderItem={({ item }) => (
                <View style={styles.userCard}>
                    <View style={styles.uaAvatar}>
                        <Text style={styles.uaAvatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.uaInfo}>
                        <Text style={styles.uaName}>{item.full_name}</Text>
                        <Text style={styles.uaEmail}>{item.email}</Text>
                        <View style={styles.uaBarBg}>
                            <View style={[styles.uaBar, { width: `${Math.min(100, (item.trip_count / Math.max(1, tripsPerUser[0]?.trip_count || 1)) * 100)}%` }]} />
                        </View>
                    </View>
                    <Text style={styles.uaCount}>{item.trip_count}</Text>
                </View>
             )}
             contentContainerStyle={styles.listContent}
           />
        )}

        {activeTab === 'pending' && (
          <FlatList
            data={pendingUsers}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.gold} />}
            renderItem={({ item }) => (
              <View style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingAvatar}>
                    <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingName}>{item.full_name}</Text>
                    <Text style={styles.pendingEmail}>{item.email}</Text>
                    <Text style={styles.pendingVehicle}>🚙 {item.vehicle_details}</Text>
                  </View>
                </View>
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleUserAction(item.id, 'rejected')}
                    disabled={!!actionLoading}
                  >
                    <Text style={styles.rejectBtnText}>{t('btn_reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleUserAction(item.id, 'approved')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === item.id ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.approveBtnText}>{t('btn_approve')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol name="shield.fill" size={60} color={Palette.charcoalLight} />
                <Text style={styles.emptyText}>{t('no_pending_users')}</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: color + '22' }]}>
        <IconSymbol name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.charcoal },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: { fontSize: 10, color: Palette.gold, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '900', color: Palette.cream },
  refreshBtn: { padding: 8 },
  goldLine: { height: 2, backgroundColor: Palette.gold, opacity: 0.6 },
  
  tabsContainer: {
    backgroundColor: Palette.charcoalMid,
    borderBottomWidth:1,
    borderBottomColor: Palette.charcoalLight,
  },
  tabsScroll: { paddingHorizontal: Spacing.md },
  tabBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabBtnActive: { borderBottomColor: Palette.gold },
  tabIcon: { fontSize: 16, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: Palette.mud, textTransform: 'uppercase' },
  tabLabelActive: { color: Palette.gold, fontWeight: '800' },
  tabBadge: {
    backgroundColor: Palette.rust,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },

  content: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  listContent: { padding: Spacing.md, paddingBottom: 40 },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  statIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: Typography.xl, fontWeight: '900', color: Palette.cream },
  statLabel: { fontSize: 10, color: Palette.sand, fontWeight: '600', textTransform: 'uppercase' },
  
  section: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  sectionTitle: { fontSize: Typography.md, fontWeight: '800', color: Palette.gold, marginBottom: Spacing.md },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  creatorRank: { fontSize: 12, fontWeight: '800', color: Palette.mud, width: 20 },
  creatorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.charcoalLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Palette.gold, fontWeight: '900', fontSize: 12 },
  creatorInfo: { flex: 1 },
  creatorName: { color: Palette.cream, fontWeight: '700', fontSize: 14 },
  creatorCount: { color: Palette.sand, fontSize: 11 },

  searchBar: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchInput: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.md,
    padding: 12,
    color: Palette.cream,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  
  tripCard: {
     backgroundColor: Palette.charcoalMid,
     borderRadius: Radius.lg,
     padding: Spacing.md,
     marginBottom: Spacing.md,
     borderWidth: 1,
     borderColor: Palette.charcoalLight,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tripTitle: { fontSize: 15, fontWeight: '800', color: Palette.cream, flex: 1 },
  statusPill: { backgroundColor: Palette.olive + '33', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: Palette.olive + '66' },
  statusPillPast: { backgroundColor: Palette.charcoalLight, borderColor: Palette.mud },
  statusText: { fontSize: 10, fontWeight: '900', color: Palette.cream },
  tripMeta: { fontSize: 12, color: Palette.sand, marginBottom: 10 },
  tripFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripCreator: { fontSize: 12, color: Palette.gold, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Palette.mud },
  attendeeCount: { fontSize: 12, color: Palette.mud },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  uaAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center' },
  uaAvatarText: { color: Palette.charcoal, fontWeight: '900', fontSize: 16 },
  uaInfo: { flex: 1 },
  uaName: { color: Palette.cream, fontWeight: '700', fontSize: 14 },
  uaEmail: { color: Palette.mud, fontSize: 11, marginBottom: 6 },
  uaBarBg: { height: 4, backgroundColor: Palette.charcoal, borderRadius: 2 },
  uaBar: { height: 4, backgroundColor: Palette.gold, borderRadius: 2 },
  uaCount: { fontSize: 18, fontWeight: '900', color: Palette.gold, width: 30, textAlign: 'right' },

  pendingCard: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
  },
  pendingHeader: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  pendingAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.charcoalLight, alignItems: 'center', justifyContent: 'center' },
  pendingInfo: { flex: 1 },
  pendingName: { fontSize: 16, fontWeight: '800', color: Palette.cream },
  pendingEmail: { fontSize: 12, color: Palette.mud, marginBottom: 4 },
  pendingVehicle: { fontSize: 13, color: Palette.sand, fontWeight: '600' },
  pendingActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: Palette.charcoalLight, borderWidth: 1, borderColor: Palette.rust + '44' },
  approveBtn: { backgroundColor: Palette.olive },
  rejectBtnText: { color: Palette.rustLight, fontWeight: '700' },
  approveBtnText: { color: 'white', fontWeight: '800' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: Palette.mud, marginTop: 10, fontSize: 14, fontWeight: '600' },
});
