import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  Alert,
  Linking,
  Image,
  Modal,
  Share,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TripSettingsModal } from '@/components/TripSettingsModal';

import { supabase } from '@/lib/supabase';
import { fetchTrip, Trip } from '@/lib/trips';
import { fetchLogistics, addLogisticsItem, toggleItemCompletion, updateLogisticsItem, deleteLogisticsItem, saveLogisticsTemplate, fetchLogisticsTemplates, applyLogisticsTemplate, LogisticsTemplate, LogisticsItem } from '@/lib/logistics';
import { fetchMessages, sendMessage, ChatMessage, uploadMediaFile } from '@/lib/chat';

type TabType = 'overview' | 'navigation' | 'logistics' | 'chat';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import { DashOverview } from '@/components/trip-dashboard/DashOverview';
import { DashNavigation } from '@/components/trip-dashboard/DashNavigation';
import { DashLogistics } from '@/components/trip-dashboard/DashLogistics';
import { DashChat } from '@/components/trip-dashboard/DashChat';

export default function TripDashboardScreen() {
  const { id } = useLocalSearchParams();
  const tripId = id as string;
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const appState = useRef(AppState.currentState);
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  
  const [trip, setTrip] = useState<any>(null);
  const isCreator = trip?.created_by === userId;
  const isManager = trip?.trip_attendees?.some((a: any) => a.user_id === userId && a.role === 'manager');
  const canManageTrip = isCreator || isManager;
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Logistics
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [logisticsCategory, setLogisticsCategory] = useState<'general' | 'rescue' | 'food'>('general');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [userTemplates, setUserTemplates] = useState<LogisticsTemplate[]>([]);
  
  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [weather, setWeather] = useState<{ temp: number; icon: string; desc: string } | null>(null);

  const activeTabRef = useRef(activeTab);
  const userIdRef = useRef(userId);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const getSenderName = (senderId: string) => {
    const attendee = trip?.trip_attendees?.find((a: any) => a.user_id === senderId);
    return attendee?.users?.full_name || 'User';
  };

  const formatNewMessage = (msg: any) => {
    if (msg.users) return msg;
    return {
      ...msg,
      users: { full_name: getSenderName(msg.sender_id) }
    };
  };

  useEffect(() => {
    async function load() {
      if (!tripId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);

        const data = await fetchTrip(tripId);
        setTrip(data);

        const logs = await fetchLogistics(tripId);
        setLogistics(logs);

        const msgs = await fetchMessages(tripId);
        setMessages(msgs);
      } catch (e) {
        console.error('Initial load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  useEffect(() => {
    if (activeTab === 'chat') setHasUnreadMessages(false);
  }, [activeTab]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => { appState.current = nextAppState; });
    const requestNotifications = async () => {
      try {
        if (!Notifications.getPermissionsAsync) return;
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') await Notifications.requestPermissionsAsync?.();
      } catch (e) { console.warn('Notifications permission error:', e); }
    };
    requestNotifications();
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!tripId) return;
    const logisticsSub = supabase.channel(`public:logistics_items:trip_id=eq.${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_items', filter: `trip_id=eq.${tripId}` }, () => {
        fetchLogistics(tripId).then(setLogistics);
      }).subscribe();

    const chatSub = supabase.channel(`chat:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` }, (payload) => {
        const newMsg = formatNewMessage(payload.new);
        if (activeTabRef.current !== 'chat' || appState.current !== 'active') {
          if (newMsg.sender_id !== userIdRef.current) {
            setHasUnreadMessages(true);
            try {
              if (Notifications.scheduleNotificationAsync) {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: `🚙 ${trip?.title || 'JeepTrip'}`,
                    body: `${newMsg.users?.full_name || 'User'}: ${newMsg.content || (newMsg.media_type === 'image' ? '📷 Photo' : '🎥 Video')}`,
                    data: { tripId },
                  }, trigger: null,
                }).catch(e => console.warn('Schedule notification fail:', e));
              }
            } catch (e) { console.warn('Notifications error:', e); }
          }
        }
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }).subscribe();

    return () => {
      supabase.removeChannel(logisticsSub);
      supabase.removeChannel(chatSub);
    };
  }, [tripId, trip]);

  useEffect(() => {
    if (trip?.lat && trip?.lng) setWeather({ temp: Math.floor(Math.random() * 15) + 15, icon: '⛅', desc: 'Partly Cloudy' });
  }, [tripId, trip?.lat, trip?.lng]);

  const handleRsvp = async (status: 'attending' | 'not_attending' | 'maybe') => {
    try {
      const { upsertRSVP } = await import('@/lib/trips');
      await upsertRSVP(tripId, userId, status);
      const updatedTrip = await fetchTrip(tripId);
      setTrip(updatedTrip);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleOpenTemplates = async () => {
    setShowTemplatesModal(true);
    fetchLogisticsTemplates().then(setUserTemplates).catch(console.error);
  };

  const handleSaveAsTemplate = () => {
    Alert.prompt(
      isRTL ? 'שמור תבנית מחשימת הלוגיסטיקה הנוכחית' : 'Save Template',
      isRTL ? 'הזן שם לתבנית זו' : 'Enter a name for this template',
      [
        { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
        { text: isRTL ? 'שמור' : 'Save', onPress: async (name?: string) => {
           if (!name) return;
           try {
             await saveLogisticsTemplate(name, logistics);
             Alert.alert('Success', isRTL ? 'תבנית נשמרה בהצלחה' : 'Template saved successfully');
             fetchLogisticsTemplates().then(setUserTemplates);
           } catch(e: any) { Alert.alert('Error', e.message); }
        }}
      ]
    );
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      await applyLogisticsTemplate(tripId, templateId);
      Alert.alert('Success', isRTL ? 'פריטי התבנית נוספו למסע' : 'Template items added to trip');
      setShowTemplatesModal(false);
      fetchLogistics(tripId).then(setLogistics);
    } catch(e: any) { Alert.alert('Error', e.message); }
  };

  const handleAddToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Please allow calendar access'); return; }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      let calendarId = calendars.find(c => c.allowsModifications)?.id;
      if (!calendarId) {
        const defaultCalendarSource = Platform.OS === 'ios' ? await Calendar.getDefaultCalendarAsync() : { isLocalAccount: true, name: 'JeepTrip' };
        calendarId = await Calendar.createCalendarAsync({
          title: 'JeepTrip', color: Palette.olive, entityType: Calendar.EntityTypes.EVENT,
          sourceId: Platform.OS === 'ios' ? (defaultCalendarSource as any).source.id : undefined,
          source: Platform.OS === 'ios' ? (defaultCalendarSource as any).source : (defaultCalendarSource as any),
          name: 'JeepTrip Internal', ownerAccount: 'personal', accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
      }
      await Calendar.createEventAsync(calendarId!, {
        title: `🚙 ${trip?.title || 'Jeep Trip'}`, startDate: new Date(trip.start_date), endDate: new Date(trip.end_date),
        location: trip?.location_area || '', notes: 'Arranged via JeepTrip App',
      });
      Alert.alert('Success', 'Trip successfully added to your calendar!');
    } catch (e) { Alert.alert('Error', 'Could not add to calendar.'); }
  };

  const handleShareInvite = async () => {
    const group = trip?.trip_groups?.[0]?.groups;
    if (!group?.invite_token) { Alert.alert(isRTL ? 'שגיאה' : 'Error', 'Invite link not available.'); return; }
    const token = group.invite_token;
    try {
       await Clipboard.setStringAsync(token);
       await Share.share({ message: isRTL ? `🚙 הצטרף למסע "${trip.title}"!: https://jeeptrip.app/join/${token}` : `🚙 Join our mission "${trip.title}"!: https://jeeptrip.app/join/${token}` });
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (content: string) => {
    const tempId = Date.now().toString();
    const optimisticMsg: ChatMessage = {
      id: tempId, trip_id: tripId, sender_id: userId, content, media_url: null, media_type: null, image_url: null, created_at: new Date().toISOString(), users: { full_name: 'You' }
    };
    setMessages(prev => [...prev, optimisticMsg]);
    try {
      const sentMsg = await sendMessage(tripId, content);
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.id === sentMsg.id);
        if (alreadyExists) return prev.filter(m => m.id !== tempId);
        return prev.map(m => m.id === tempId ? sentMsg : m);
      });
    } catch (e: any) { 
      Alert.alert(isRTL ? 'שגיאה בשליחה' : 'Send Error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handlePickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0].uri) {
      try {
        const uploadedUrl = await uploadMediaFile(result.assets[0].uri, type);
        const sentMsg = await sendMessage(tripId, '', uploadedUrl, type);
        setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
      } catch (e: any) { Alert.alert('Error', e.message); }
    }
  };

  const handleDownloadMedia = async (url: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      Alert.alert(isRTL ? 'הורדת מדיה' : 'Download', isRTL ? 'לשמור לגלריה?' : 'Save to gallery?', [
        { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
        { text: isRTL ? 'שמור' : 'Save', onPress: async () => {
          const fs = FileSystem as any;
          const uri = (fs.cacheDirectory || fs.documentDirectory) + (url.split('/').pop() || 'download');
          await FileSystem.downloadAsync(url, uri);
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Success', 'Saved!');
        }}
      ]);
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
  };

  const handleOpenMap = (type: 'waze' | 'google' | 'apple', target: 'start' | 'dest' = 'dest') => {
    const lat = target === 'start' ? trip?.start_lat : trip?.lat;
    const lng = target === 'start' ? trip?.start_lng : trip?.lng;
    if (!lat || !lng) return;
    let url = type === 'waze' ? `waze://?ll=${lat},${lng}&navigate=yes` : type === 'google' ? (Platform.OS === 'ios' ? `comgooglemaps://?q=${lat},${lng}` : `google.navigation:q=${lat},${lng}`) : `maps://?q=${lat},${lng}`;
    Linking.canOpenURL(url).then(supported => supported ? Linking.openURL(url) : Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`));
  };

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator size="large" color={Palette.gold} /></View>;
  if (!trip) return <View style={[styles.root, styles.center]}><Text style={{ color: Palette.sand }}>Trip not found</Text></View>;

  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };
  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <StatusBar style="light" />
      <LinearGradient colors={[Palette.charcoal, '#1C1E16']} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, rowStyle]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left.forwardslash.chevron.right'} size={28} color={Palette.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSub, rtlText]}>DASHBOARD</Text>
          <Text style={[styles.headerTitle, rtlText]} numberOfLines={1}>{trip.title}</Text>
        </View>
      </View>
      <View style={styles.goldLine} />
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabScroll, rowStyle]}>
          {(['overview', 'navigation', 'logistics', 'chat'] as TabType[]).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} onPress={() => setActiveTab(tab)}>
              <View style={styles.tabContentWithBadge}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{t(`trip_${tab}` as any)}</Text>
                {tab === 'chat' && hasUnreadMessages && <View style={styles.tabBadge} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && <DashOverview trip={trip} isRTL={isRTL} t={t} userId={userId} canManageTrip={canManageTrip} weather={weather} handleRsvp={handleRsvp} setShowSettingsModal={setShowSettingsModal} handleShareInvite={handleShareInvite} handleAddToCalendar={handleAddToCalendar} />}
        {activeTab === 'navigation' && <DashNavigation trip={trip} isRTL={isRTL} t={t} activeTab={activeTab} handleOpenMap={handleOpenMap} />}
        {activeTab === 'logistics' && <DashLogistics tripId={tripId} userId={userId} logistics={logistics} canManageTrip={canManageTrip} isRTL={isRTL} t={t} logisticsCategory={logisticsCategory} setLogisticsCategory={setLogisticsCategory} setLogistics={setLogistics} handleOpenTemplates={handleOpenTemplates} showTemplatesModal={showTemplatesModal} setShowTemplatesModal={setShowTemplatesModal} userTemplates={userTemplates} handleLoadTemplate={handleLoadTemplate} handleSaveAsTemplate={handleSaveAsTemplate} />}
        {activeTab === 'chat' && <DashChat tripId={tripId} userId={userId} messages={messages} setMessages={setMessages} isRTL={isRTL} t={t} trip={trip} handleSendMessage={handleSendMessage} handlePickMedia={handlePickMedia} handleDownloadMedia={handleDownloadMedia} />}
      </View>
      <TripSettingsModal visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} trip={trip} userId={userId} onTripUpdated={() => fetchTrip(tripId).then(setTrip)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, alignItems: 'center', gap: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerSub: { fontSize: Typography.xs, color: Palette.gold, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '900', color: Palette.cream },
  goldLine: { height: 2, backgroundColor: Palette.gold, opacity: 0.6 },
  tabContainer: { borderBottomWidth: 1, borderBottomColor: Palette.charcoalLight, backgroundColor: Palette.charcoalMid },
  tabScroll: { paddingHorizontal: Spacing.sm },
  tabItem: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: Palette.gold },
  tabContentWithBadge: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  tabBadge: { position: 'absolute', top: -2, right: -8, width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.rust, borderWidth: 1.5, borderColor: Palette.gold },
  tabText: { fontSize: Typography.sm, color: Palette.mud, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  tabTextActive: { color: Palette.gold, fontWeight: '800' },
});
