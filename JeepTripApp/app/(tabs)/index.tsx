import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { fetchMyTrips, Trip } from '@/lib/trips';
import { joinGroupByToken } from '@/lib/groups';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

// Format date range e.g. "10–12 May 2026"
function formatDateRange(start: string, end: string, isRTL = false) {
  const s = new Date(start);
  const e = new Date(end);
  const month = s.toLocaleString(isRTL ? 'he-IL' : 'en-US', { month: 'long' });
  const year = s.getFullYear();
  return `${s.getDate()}–${e.getDate()} ${month} ${year}`;
}

// Days until a trip
function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}


const TripCard = React.memo(({ item, index, isRTL }: { item: any; index: number; isRTL: boolean }) => {
  const days = daysUntil(item.start_date);
  const isClose = days <= 7;
  const slideAnim = React.useRef(new Animated.Value(20)).current; // Reduced starting offset for snappier feel
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: Math.min(index * 50, 400), // Cap the delay to start lists faster
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 50, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
      <Link href={{ pathname: '/trip/[id]' as any, params: { id: item.id } }} asChild>
        <TouchableOpacity style={styles.card} activeOpacity={0.88}>
          {/* Color strip top */}
          <View style={[styles.cardAccent, isClose && styles.cardAccentUrgent]} />

          <View style={[styles.cardBody, isRTL && styles.cardBodyRTL]}>
            {/* Left info */}
            <View style={styles.cardInfo}>
              <Text
                style={[styles.cardTitle, isRTL && styles.textRight]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              <View style={[styles.metaRow, isRTL && styles.metaRowRTL]}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaMd} numberOfLines={1}>
                  {item.location_area || '—'}
                </Text>
              </View>

              <View style={[styles.metaRow, isRTL && styles.metaRowRTL]}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaMd}>
                  {formatDateRange(item.start_date, item.end_date, isRTL)}
                </Text>
              </View>
            </View>

            {/* Right: countdown pill */}
            <View style={styles.countdownContainer}>
              <LinearGradient
                colors={
                  isClose
                    ? [Palette.rust, Palette.rustLight]
                    : [Palette.olive, Palette.oliveMid]
                }
                style={styles.countdownPill}
              >
                <Text style={styles.countdownNum}>{days}</Text>
                <Text style={styles.countdownLabel}>{isRTL ? 'ימים' : 'days'}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Attendance chips */}
          {item.trip_attendees && item.trip_attendees.length > 0 && (
            <View style={[styles.attendeeRow, isRTL && styles.attendeeRowRTL]}>
              <Text style={styles.attendeeIcon}>✅</Text>
              <Text style={styles.attendeeText}>
                {item.trip_attendees.filter((a: any) => a.status === 'attending').length}
                {isRTL ? ' מגיעים' : ' attending'}
              </Text>
              <Text style={styles.attendeeIcon}>❓</Text>
              <Text style={styles.attendeeText}>
                {item.trip_attendees.filter((a: any) => a.status === 'maybe').length}
                {isRTL ? ' מתלבטים' : ' maybe'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Link>
    </Animated.View>
  );
}, (prev, next) => {
  return prev.item.id === next.item.id && 
         prev.item.title === next.item.title && 
         prev.item.trip_attendees?.length === next.item.trip_attendees?.length;
});

export default function TripsScreen() {
  const { t, isRTL } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Join Link Code
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const loadTrips = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchMyTrips(forceRefresh);
      setTrips(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips(true);
  };

  const submitJoinCode = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    let token = joinCode.trim();
    
    if (token.includes('/')) {
      const parts = token.split('/');
      token = parts[parts.length - 1].trim(); 
    }
    
    if (token.length > 20) {
       const match = token.match(/[A-Za-z0-9-]{6,12}/);
       if (match) token = match[0];
    }
    
    try {
      const group = await joinGroupByToken(token);
      Alert.alert(
        isRTL ? 'הצטרפת בהצלחה!' : 'Joined Successfully!',
        isRTL 
          ? `הצטרפת למסע "${group.name}"!` 
          : `You've joined the mission "${group.name}"!`
      );
      setJoinCode('');
      setShowJoinModal(false);
      loadTrips(true); // Force refresh to show the new trip
    } catch (e: any) {
      Alert.alert('Error', isRTL ? 'קוד הצטרפות שגוי או שכבר הצטרפת.' : 'Invalid invite code or already joined.');
    } finally {
      setJoining(false);
    }
  };

  // Use real trips directly
  const displayTrips = trips;

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
          <Text style={[styles.headerSub, isRTL && styles.textRight]}>
            {isRTL ? 'המסע הבא שלך' : 'YOUR NEXT ADVENTURE'}
          </Text>
          <Text style={[styles.headerTitle, isRTL && styles.textRight]}>
            {isRTL ? 'הטיולים שלי' : 'My Trips'}
          </Text>
        </View>
      </View>

      {/* Gold bar under header */}
      <View style={styles.goldLine} />

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadTrips(true)}>
            <Text style={styles.retryText}>{isRTL ? 'נסה שוב' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayTrips}
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
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>
                {isRTL ? 'אין טיולים מתוכננים' : 'No trips planned yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isRTL ? 'מנהל הקבוצה יוסיף את הטיול הבא' : 'Your group admin will add the next trip'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => <TripCard item={item} index={index} isRTL={isRTL} />}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <TouchableOpacity 
                style={styles.joinMissionBtn} 
                onPress={() => setShowJoinModal(true)}
              >
                <Text style={styles.joinMissionBtnText}>
                  🎟️ {isRTL ? 'הצטרפות למסע עם קוד' : 'Join Mission with Code'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* JOIN MISSION MODAL */}
      <Modal visible={showJoinModal} animationType="fade" transparent={true}>
        <View style={styles.modalRoot}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <Text style={[styles.modalTitle, isRTL && styles.textRight]}>
              {isRTL ? 'הצטרפות למשימה' : 'Join Mission'}
            </Text>
            <Text style={[styles.modalSub, isRTL && styles.textRight]}>
              {isRTL ? 'הדבק את הקוד שקיבלת מהמארגן:' : 'Paste the code you received from the organizer:'}
            </Text>
            
            <TextInput 
              style={[styles.joinInput, isRTL && styles.textRight]} 
              placeholder={isRTL ? "קוד או לינק..." : "Code or link..."} 
              placeholderTextColor={Palette.mud}
              value={joinCode}
              onChangeText={setJoinCode}
              autoFocus
            />

            <View style={[styles.modalActions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoinModal(false)}>
                <Text style={styles.cancelBtnText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.joinBtn, !joinCode.trim() && { opacity: 0.5 }]} 
                onPress={submitJoinCode} 
                disabled={joining || !joinCode.trim()}
              >
                {joining ? (
                  <ActivityIndicator size="small" color={Palette.charcoal} />
                ) : (
                  <Text style={styles.joinBtnText}>{isRTL ? 'הצטרף עכשיו' : 'Join Now'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* FAB — create trip (admin only, shown for now) */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.85}
        onPress={() => router.push('/create-trip')}
      >
        <LinearGradient
          colors={[Palette.gold, '#A07830']}
          style={styles.fabInner}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  headerSub: {
    fontSize: Typography.xs,
    color: Palette.gold,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: Typography['2xl'],
    fontWeight: '900',
    color: Palette.cream,
    letterSpacing: 1,
  },
  textRight: { textAlign: 'right' },
  goldLine: {
    height: 2,
    backgroundColor: Palette.gold,
    marginHorizontal: Spacing.lg,
    borderRadius: 1,
    marginBottom: Spacing.md,
    opacity: 0.6,
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
    gap: Spacing.md,
  },

  // Trip card
  card: {
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardAccent: {
    height: 3,
    backgroundColor: Palette.olive,
  },
  cardAccentUrgent: {
    backgroundColor: Palette.rust,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardBodyRTL: { flexDirection: 'row-reverse' },
  cardInfo: { flex: 1, flexShrink: 1 },
  cardTitle: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: Palette.cream,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metaRowRTL: { flexDirection: 'row-reverse' },
  metaIcon: { fontSize: 13 },
  metaMd: {
    fontSize: Typography.sm,
    color: Palette.sand,
    flex: 1,
    flexShrink: 1,
  },

  // Countdown
  countdownContainer: { alignItems: 'center' },
  countdownPill: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNum: {
    fontSize: Typography.xl,
    fontWeight: '900',
    color: Palette.cream,
    lineHeight: Typography.xl + 2,
  },
  countdownLabel: {
    fontSize: 10,
    color: Palette.cream,
    opacity: 0.8,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Attendee row
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.charcoalLight,
    paddingTop: Spacing.sm,
  },
  attendeeRowRTL: { flexDirection: 'row-reverse' },
  attendeeIcon: { fontSize: 13 },
  attendeeText: {
    fontSize: Typography.xs,
    color: Palette.mud,
  },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Palette.rustLight, fontSize: Typography.base, marginBottom: Spacing.md },
  retryBtn: {
    backgroundColor: Palette.olive,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryText: { color: Palette.cream, fontWeight: '700', fontSize: Typography.sm },

  empty: { alignItems: 'center', paddingTop: Spacing['3xl'] },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Palette.cream,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    color: Palette.mud,
    textAlign: 'center',
  },

  // Modal
  modalRoot: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: Spacing.xl },
  modalContent: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Palette.charcoalLight },
  modalTitle: { fontSize: Typography.lg, fontWeight: '900', color: Palette.cream, marginBottom: 8 },
  modalSub: { fontSize: Typography.sm, color: Palette.sand, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  joinInput: { backgroundColor: Palette.charcoal, borderWidth: 1, borderColor: Palette.charcoalLight, color: Palette.cream, borderRadius: Radius.md, padding: 15, fontSize: Typography.md },
  cancelBtn: { flex: 1, padding: 15, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Palette.charcoalLight },
  cancelBtnText: { color: Palette.sand, fontWeight: '700' },
  joinBtn: { flex: 1, padding: 15, borderRadius: Radius.md, backgroundColor: Palette.gold, alignItems: 'center' },
  joinBtnText: { color: Palette.charcoal, fontWeight: '800' },
  
  listHeader: { marginBottom: Spacing.sm },
  joinMissionBtn: { backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 1, borderColor: `${Palette.gold}44`, padding: 15, borderRadius: Radius.md, alignItems: 'center' },
  joinMissionBtnText: { color: Palette.gold, fontWeight: '700', fontSize: Typography.sm },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 105 : 80,
    right: Spacing.lg,
    shadowColor: Palette.gold,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 30,
    color: Palette.charcoal,
    fontWeight: '300',
    lineHeight: 34,
  },
});
