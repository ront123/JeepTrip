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

const VideoMessage = React.memo(({ url, style }: { url: string; style: any }) => {
  const player = useVideoPlayer(url, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <VideoView 
      style={style} 
      player={player} 
      allowsFullscreen 
      allowsPictureInPicture 
      contentFit="cover"
    />
  );
});

const LogisticsItemRow = React.memo(({ item, isRTL, handleEditRequest }: any) => {
  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };

  return (
    <TouchableOpacity 
      style={[styles.card, { paddingVertical: Spacing.md }]}
      onPress={() => handleEditRequest(item)}
      activeOpacity={0.7}
      delayPressIn={0}
    >
      <Text style={[styles.sectionTitle, rtlText, { marginBottom: 0, color: Palette.cream }]}>
        {item.item_name}
      </Text>
    </TouchableOpacity>
  );
});

const ChatMessageItem = React.memo(({ item, userId, isRTL, handleDownloadMedia, onMediaLoad }: any) => {
  const isMe = item.user_id === userId || item.sender_id === userId;
  const mediaUrl = item.media_url || item.image_url;
  const isVideo = item.media_type === 'video';
  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };

  return (
    <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperOther]}>
      {!isMe && <Text style={[styles.msgAuthor, rtlText]}>{item.users?.full_name}</Text>}
      <TouchableOpacity 
        activeOpacity={0.9}
        onLongPress={() => mediaUrl && handleDownloadMedia(mediaUrl)}
        style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}
      >
        {mediaUrl ? (
          isVideo ? (
            <VideoMessage
              url={mediaUrl}
              style={{ width: 240, height: 240, borderRadius: 8, marginBottom: item.content ? 8 : 0 }}
            />
          ) : (
            <Image 
              source={{ uri: mediaUrl }} 
              style={{ width: 220, height: 220, borderRadius: 8, marginBottom: item.content ? 8 : 0 }} 
              resizeMode="cover" 
              onLoad={onMediaLoad}
            />
          )
        ) : null}
        {item.content ? <Text style={[styles.msgText, rtlText]}>{item.content}</Text> : null}
      </TouchableOpacity>
    </View>
  );
}, (prev, next) => prev.item.id === next.item.id);

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
  
  // Admins & Managers
  const isCreator = trip?.created_by === userId;
  const isManager = trip?.trip_attendees?.some((a: any) => a.user_id === userId && a.role === 'manager');
  const canManageTrip = isCreator || isManager;
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Logistics
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [logisticsCategory, setLogisticsCategory] = useState<'general' | 'rescue' | 'food'>('general');
  const [editingItem, setEditingItem] = useState<LogisticsItem | null>(null);
  
  // Logistics Templates
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [userTemplates, setUserTemplates] = useState<LogisticsTemplate[]>([]);
  
  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [weather, setWeather] = useState<{ temp: number; icon: string; desc: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const chatScrollRef = useRef<FlatList>(null);
  const activeTabRef = useRef(activeTab);
  const userIdRef = useRef(userId);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Helper to find name from trip attendees
  const getSenderName = (senderId: string) => {
    const attendee = trip?.trip_attendees?.find((a: any) => a.user_id === senderId);
    return attendee?.users?.full_name || 'User';
  };

  const formatNewMessage = (msg: any) => {
    if (msg.users) return msg; // Already formatted
    return {
      ...msg,
      users: { full_name: getSenderName(msg.sender_id) }
    };
  };

  // Initial Load (One-time)
  useEffect(() => {
    async function load() {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tripId)) {
        setLoading(false);
        return;
      }

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

  // Handle unread dot clear when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      setHasUnreadMessages(false);
    }
  }, [activeTab]);

  // Notifications and AppState Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
    });

    const requestNotifications = async () => {
      try {
        if (!Notifications.getPermissionsAsync) return;
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync?.();
        }
      } catch (e) {
        console.warn('Notifications permission error:', e);
      }
    };
    requestNotifications();

    return () => {
      subscription.remove();
    };
  }, []);

  // Real-time Subscriptions
  useEffect(() => {
    if (!tripId) return;

    const logisticsSub = supabase
      .channel(`public:logistics_items:trip_id=eq.${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_items', filter: `trip_id=eq.${tripId}` }, () => {
        fetchLogistics(tripId).then(setLogistics);
      })
      .subscribe();

    const chatSub = supabase
      .channel(`chat:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` }, (payload) => {
        const newMsg = formatNewMessage(payload.new);
        
        // Show red dot and notification if user is not on chat tab OR app is in background
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
                  },
                  trigger: null,
                }).catch(e => console.warn('Schedule notification fail:', e));
              }
            } catch (e) {
              console.warn('Notifications error:', e);
            }
          }
        }

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logisticsSub);
      supabase.removeChannel(chatSub);
    };
  }, [tripId, trip]);

  const scrollToBottom = (animated = true) => {
    if (activeTab === 'chat' && messages.length > 0) {
      chatScrollRef.current?.scrollToEnd({ animated });
    }
  };

  // Scroll to bottom when messages update OR entering chat tab
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      // Multiple attempts to ensure it works across layout cycles
      scrollToBottom(false); // Instant
      const timer = setTimeout(() => scrollToBottom(true), 150); // Animated
      return () => clearTimeout(timer);
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (trip?.lat && trip?.lng) {
      fetchWeather(trip.lat, trip.lng);
    }
  }, [tripId, trip?.lat, trip?.lng]);

  const fetchWeather = async (lat: number, lng: number) => {
    try {
      // Mocking a real API fetch for now or using a free provider like OpenWeather
      // In a real app, you'd use a key. For this demo, let's simulate the data.
      setWeather({ temp: Math.floor(Math.random() * 15) + 15, icon: '⛅', desc: 'Partly Cloudy' });
    } catch (e) {
      console.error('Weather fetch error:', e);
    }
  };

  const mapContent = React.useMemo(() => {
    if (!trip?.lat || !trip?.lng) return null;
    return (
      <View style={[styles.card, { height: 260, padding: 0, overflow: 'hidden' }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: trip.start_lat || trip.lat,
            longitude: trip.start_lng || trip.lng,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          customMapStyle={mapStyle}
        >
          <Marker coordinate={{ latitude: trip.lat, longitude: trip.lng }} title="Destination" pinColor="red" />
          {trip.start_lat && (
            <Marker coordinate={{ latitude: trip.start_lat, longitude: trip.start_lng }} title="Start of Route" pinColor="green" />
          )}
        </MapView>
      </View>
    );
  }, [trip?.lat, trip?.lng, trip?.start_lat, trip?.start_lng]);

  const handleAddLogistics = async () => {
    if (!newItemName.trim()) return;
    try {
      await addLogisticsItem(tripId, logisticsCategory, newItemName.trim());
      setNewItemName('');
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const handleDeleteLogistics = async (id: string) => {
    try {
      await deleteLogisticsItem(id);
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const handleUpdateLogistics = async (item: LogisticsItem, newName: string) => {
    try {
      await updateLogisticsItem(item.id, { item_name: newName });
      setEditingItem(null);
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const handleToggleLogistics = async (item: LogisticsItem) => {
    try {
      await toggleItemCompletion(item.id, item.is_completed, userId);
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const handleRsvp = async (status: 'attending' | 'not_attending' | 'maybe') => {
    try {
      const { upsertRSVP } = await import('@/lib/trips');
      await upsertRSVP(tripId, userId, status);
      // Refresh trip data locally
      const updatedTrip = await fetchTrip(tripId);
      setTrip(updatedTrip);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleOpenTemplates = async () => {
    setShowTemplatesModal(true);
    fetchLogisticsTemplates().then(setUserTemplates).catch(console.error);
  };

  const handleSaveAsTemplate = () => {
    Alert.prompt(
      isRTL ? 'שמור תבנית מחשימת הלוגיסטיקה הנוכחית' : 'Save Template from current list',
      isRTL ? 'הזן שם לתבנית זו' : 'Enter a name for this template',
      [
        { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
        { text: isRTL ? 'שמור' : 'Save', onPress: async (name?: string) => {
           if (!name) return;
           try {
             await saveLogisticsTemplate(name, logistics);
             Alert.alert('Success', isRTL ? 'תבנית נשמרה בהצלחה' : 'Template saved successfully');
             fetchLogisticsTemplates().then(setUserTemplates);
           } catch(e: any) {
             Alert.alert('Error', e.message);
           }
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
    } catch(e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAddToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow calendar access in your settings.');
        return;
      }

      const defaultCalendarSource = Platform.OS === 'ios'
        ? await Calendar.getDefaultCalendarAsync()
        : { isLocalAccount: true, name: 'JeepTrip' };

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      let calendarId = calendars.find(c => c.allowsModifications)?.id;

      if (!calendarId) {
         // Fallback: try to create a calendar if none exists with modification permissions
         try {
           const newCalendarId = await Calendar.createCalendarAsync({
             title: 'JeepTrip',
             color: Palette.olive,
             entityType: Calendar.EntityTypes.EVENT,
             sourceId: Platform.OS === 'ios' ? (defaultCalendarSource as any).source.id : undefined,
             source: Platform.OS === 'ios' ? (defaultCalendarSource as any).source : (defaultCalendarSource as any),
             name: 'JeepTrip Internal',
             ownerAccount: 'personal',
             accessLevel: Calendar.CalendarAccessLevel.OWNER,
           });
           calendarId = newCalendarId;
         } catch (createErr) {
           // If we can't create one, try to use the default one directly even if not ideal
           calendarId = (defaultCalendarSource as any).id;
         }
      }

      await Calendar.createEventAsync(calendarId!, {
        title: `🚙 ${trip?.title || 'Jeep Trip'}`,
        startDate: new Date(trip.start_date),
        endDate: new Date(trip.end_date),
        location: trip?.location_area || '',
        notes: 'Arranged via JeepTrip App',
      });
      
      Alert.alert('Success', 'Trip successfully added to your calendar!');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Could not add to calendar.');
    }
  };

  const handleShareInvite = async () => {
    // We expect trip.trip_groups[0].groups to have the invite_token
    const group = trip?.trip_groups?.[0]?.groups;
    if (!group?.invite_token) {
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error', 
        isRTL ? 'לינק להזמנה לא זמין עבור קבוצה זו.' : 'Invite link not available for this crew.'
      );
      return;
    }
    
    const token = group.invite_token;
    const joinUrl = `https://jeeptrip.app/join/${token}`;
    
    try {
       await Clipboard.setStringAsync(token);
       await Share.share({
         message: isRTL 
           ? `🚙 הצטרף למסע "${trip.title}" שלנו ב-JeepTrip!\n\nהקוד שלך: ${token}\n\nלחץ על הלינק להצטרפות:\n${joinUrl}`
           : `🚙 Join our mission "${trip.title}" on JeepTrip!\n\nYour code: ${token}\n\nClick the link to join:\n${joinUrl}`,
       });
    } catch (e) {
       console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !uploadingImage) return;
    const msgText = newMessage.trim();
    const tempId = Date.now().toString();
    
    // 1. Optimistic Update
    const optimisticMsg: ChatMessage = {
      id: tempId,
      trip_id: tripId,
      sender_id: userId,
      content: msgText,
      media_url: null,
      media_type: null,
      image_url: null,
      created_at: new Date().toISOString(),
      users: { full_name: 'You' }
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    
    try {
      const sentMsg = await sendMessage(tripId, msgText);
      // 2. Replace optimistic message with real message from DB, 
      // but only if it's not already added by the Realtime listener
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.id === sentMsg.id);
        if (alreadyExists) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map(m => m.id === tempId ? sentMsg : m);
      });
    } catch (e: any) { 
      console.error(e);
      Alert.alert(isRTL ? 'שגיאה בשליחה' : 'Send Error', isRTL ? 'לא ניתן לשלוח את ההודעה. נסה שוב.' : 'Could not send message. Please try again.');
      // 3. Revert optimistic update and restore text
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(msgText);
    }
  };

  const handlePickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need camera roll permissions to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploadingImage(true);
        const uploadedUrl = await uploadMediaFile(result.assets[0].uri, type);
        
        const sentMsg = await sendMessage(tripId, '', uploadedUrl, type);
        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleDownloadMedia = async (url: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Need permission to save to gallery');
        return;
      }

      Alert.alert(
        isRTL ? 'הורדת מדיה' : 'Download Media',
        isRTL ? 'האם לשמור את התמונה/סרטון לגלריה?' : 'Save this image/video to your gallery?',
        [
          { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
          { 
            text: isRTL ? 'שמור' : 'Save', 
            onPress: async () => {
              const fs = FileSystem as any;
              const baseDir = fs.cacheDirectory || fs.documentDirectory;
              if (!baseDir) throw new Error('No writable directory found');
              const fileUri = baseDir + (url.split('/').pop() || 'download');
              const { uri } = await FileSystem.downloadAsync(url, fileUri);
              await MediaLibrary.saveToLibraryAsync(uri);
              Alert.alert('Success', isRTL ? 'נשמר בגלריה!' : 'Saved to gallery!');
            }
          }
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save media');
    }
  };

  const handleOpenMap = (type: 'waze' | 'google' | 'apple', target: 'start' | 'dest' = 'dest') => {
    const lat = target === 'start' ? trip?.start_lat : trip?.lat;
    const lng = target === 'start' ? trip?.start_lng : trip?.lng;

    if (!lat || !lng) {
      Alert.alert('Error', 'Coordinates not set.');
      return;
    }
    
    let url = '';
    if (type === 'waze') url = `waze://?ll=${lat},${lng}&navigate=yes`;
    if (type === 'google') url = Platform.OS === 'ios' ? `comgooglemaps://?q=${lat},${lng}` : `google.navigation:q=${lat},${lng}`;
    if (type === 'apple') url = `maps://?q=${lat},${lng}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(webUrl);
      }
    });
  };

  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={Palette.gold} />
      </View>
    );
  }

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, rtlText]}>{trip?.title}</Text>
          <Text style={[styles.cardSub, rtlText]}>
            📍 {trip?.location_area}   |   👥 {trip?.groups?.name}
            {trip?.meeting_time && `   |   🕒 ${trip.meeting_time}`}
          </Text>
        </View>

        {canManageTrip && (
          <View style={[rowStyle, { gap: Spacing.md, marginBottom: Spacing.md }]}>
            <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1, paddingVertical: 10 }]} onPress={() => setShowSettingsModal(true)}>
              <Text style={[styles.actionBtnTextSecondary, { color: Palette.cream }]}>⚙️ {isRTL ? 'הגדרות' : 'Settings'}</Text>
            </TouchableOpacity>
            {!trip?.is_archived && (
              <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1, paddingVertical: 10, borderColor: Palette.gold }]} onPress={handleShareInvite}>
                <Text style={[styles.actionBtnTextSecondary, { color: Palette.gold }]}>🔗 {isRTL ? 'שלח הזמנה' : 'Invite Link'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {trip?.is_archived && (
          <View style={styles.archiveBanner}>
            <Text style={styles.archiveBannerText}>
              🏁 {isRTL ? 'המסע הסתיים. הצאט במצב קריאה בלבד.' : 'Mission accomplished. Chat is read-only.'}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.actionBtn} onPress={handleAddToCalendar}>
          <Text style={styles.actionBtnText}>📅 {t('btn_add_calendar')}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: Spacing.sm }]}>
            <Text style={[styles.sectionTitle, rtlText, { marginBottom: 0 }]}>{t('rsvp_status')}</Text>
            {trip?.max_participants && (
              <Text style={{ color: Palette.sand, fontSize: 12 }}>
                {trip.trip_attendees?.filter((a: any) => a.status === 'attending').length || 0} / {trip.max_participants}
              </Text>
            )}
          </View>
          
          <View style={[styles.rsvpRow, rowStyle]}>
            {(() => {
              const attendeesCount = trip.trip_attendees?.filter((a: any) => a.status === 'attending').length || 0;
              const isFull = trip.max_participants && attendeesCount >= trip.max_participants;
              const myRsvp = trip.trip_attendees?.find((a: any) => a.user_id === userId)?.status;

              return (
                <>
                  <TouchableOpacity 
                    style={[styles.rsvpBtn, myRsvp === 'attending' && styles.rsvpBtnActive, isFull && myRsvp !== 'attending' && { opacity: 0.5 }]}
                    disabled={isFull && myRsvp !== 'attending'}
                    onPress={() => !isFull || myRsvp === 'attending' ? handleRsvp('attending') : null}
                  >
                    <Text style={myRsvp === 'attending' ? styles.rsvpBtnText : styles.rsvpBtnTextInactive}>
                      {isFull && myRsvp !== 'attending' ? 'FULL' : `✅ ${t('rsvp_attending')}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rsvpBtn, myRsvp === 'maybe' && styles.rsvpBtnActive]}
                    onPress={() => handleRsvp('maybe')}
                  >
                    <Text style={myRsvp === 'maybe' ? styles.rsvpBtnText : styles.rsvpBtnTextInactive}>❓ {t('rsvp_maybe')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rsvpBtn, myRsvp === 'not_attending' && styles.rsvpBtnActive]}
                    onPress={() => handleRsvp('not_attending')}
                  >
                    <Text style={myRsvp === 'not_attending' ? styles.rsvpBtnText : styles.rsvpBtnTextInactive}>❌ {t('rsvp_not_attending')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, rtlText]}>☀️ {isRTL ? 'מזג אוויר חזוי' : 'Forecast'}</Text>
          {weather ? (
             <View style={[rowStyle, { alignItems: 'center', gap: 10 }]}>
               <Text style={{ fontSize: 32 }}>{weather.icon}</Text>
               <View>
                 <Text style={{ color: Palette.cream, fontSize: 24, fontWeight: '800' }}>{weather.temp}°C</Text>
                 <Text style={{ color: Palette.sand, fontSize: 14 }}>{weather.desc}</Text>
               </View>
             </View>
          ) : (
            <Text style={[styles.bodyText, rtlText]}>{t('weather_loading')}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderNavigation = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.tabContent}>
        {activeTab === 'navigation' && (trip?.lat && trip?.lng) ? mapContent : (
          <View style={[styles.card, { height: 160, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 40, opacity: 0.5 }}>🧭</Text>
            <Text style={{ color: Palette.sand, marginTop: 10 }}>
               {!(trip?.lat && trip?.lng) ? 'Map not configured' : 'Loading Map...'}
            </Text>
          </View>
        )}

        <View style={[rowStyle, { gap: 10 }]}>
           <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => handleOpenMap('waze', 'start')}>
             <Text style={styles.actionBtnTextSecondary}>🏁 {isRTL ? 'נווט להתחלת המסלול' : 'Start Point'}</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => handleOpenMap('waze', 'dest')}>
             <Text style={styles.actionBtnTextSecondary}>🚩 {isRTL ? 'נווט ליעד' : 'Destination'}</Text>
           </TouchableOpacity>
        </View>

        {trip?.off_road_url && (
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => Linking.openURL(trip.off_road_url)}>
            <LinearGradient colors={['#FF5722', '#F44336']} style={styles.ctaGradient}>
              <Text style={styles.actionBtnTextPrimary}>🚙 {isRTL ? 'פתח ב-OffRoad' : 'Open in OffRoad'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </View>
    </ScrollView>
  );

  const renderLogistics = () => {
    const filtered = logistics.filter(l => l.category === logisticsCategory);
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.categoryTabs, rowStyle]}>
          {(['general', 'rescue', 'food'] as const).map(cat => (
            <TouchableOpacity key={cat} style={[styles.categoryTab, logisticsCategory === cat && styles.categoryTabActive]} onPress={() => setLogisticsCategory(cat)}>
              <Text style={[styles.categoryTabText, logisticsCategory === cat && styles.categoryTabTextActive]}>
                {cat === 'general' ? (isRTL ? 'ברכב' : 'In Car') : cat === 'rescue' ? (isRTL ? 'חילוץ' : 'Rescue') : (isRTL ? 'אוכל/שתיה' : 'Food/Drink')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {canManageTrip && (
          <View style={[rowStyle, { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={handleOpenTemplates}>
              <Text style={{ color: Palette.gold, fontWeight: '700', fontSize: Typography.sm }}>📄 {isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <LogisticsItemRow 
              item={item} 
              isRTL={isRTL} 
              handleToggleLogistics={handleToggleLogistics} 
              handleDeleteLogistics={handleDeleteLogistics}
              handleEditRequest={(itemRow: any) => {
                Alert.alert(
                  isRTL ? 'ניהול פריט' : 'Manage Item',
                  itemRow.item_name,
                  [
                    { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
                    { text: isRTL ? 'מחיקה' : 'Delete', style: 'destructive', onPress: () => handleDeleteLogistics(itemRow.id) },
                    { text: isRTL ? 'עריכה' : 'Edit', onPress: () => {
                      setEditingItem(itemRow);
                      setNewItemName(itemRow.item_name);
                    }}
                  ]
                );
              }}
            />
          )}
        />

          <View style={[styles.inputRow, rowStyle]}>
            <TextInput
              style={[styles.textInput, rtlText, { paddingVertical: Platform.OS === 'ios' ? 12 : 8, minHeight: 48, maxHeight: 120 }]}
              placeholderTextColor={Palette.mud}
              placeholder={editingItem ? (isRTL ? 'ערוך שם פריט...' : 'Edit name...') : (isRTL ? 'הוסף פריט...' : 'Add item...')}
              value={newItemName}
              onChangeText={setNewItemName}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => editingItem ? handleUpdateLogistics(editingItem, newItemName) : handleAddLogistics()}>
            <Text style={{ color: Palette.charcoal, fontWeight: '800' }}>{editingItem ? '✓' : '+'}</Text>
          </TouchableOpacity>
        </View>

        {/* Templates Modal */}
        <Modal visible={showTemplatesModal} animationType="slide" transparent>
           <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
             <View style={{ backgroundColor: Palette.charcoal, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.xl, height: '70%' }}>
                <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: Spacing.lg }]}>
                  <Text style={[styles.sectionTitle, rtlText]}>{isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}</Text>
                  <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                    <Text style={{ color: Palette.sand, fontWeight: '700' }}>{isRTL ? 'סגור' : 'Close'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.actionBtn, { marginBottom: Spacing.xl }]} onPress={handleSaveAsTemplate}>
                  <Text style={styles.actionBtnText}>💾 {isRTL ? 'שמור רשימה נוכחית כתבנית' : 'Save current list as template'}</Text>
                </TouchableOpacity>

                <Text style={[styles.label, rtlText, { marginBottom: Spacing.md }]}>{isRTL ? 'טען תבנית קיימת' : 'Load Existing Template'}</Text>
                
                <FlatList
                  data={userTemplates}
                  keyExtractor={t => t.id}
                  ListEmptyComponent={<Text style={{ color: Palette.sand, ...rtlText }}>{isRTL ? 'אין תבניות שמורות' : 'No saved templates'}</Text>}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.card, { padding: Spacing.md, marginBottom: Spacing.md }]} onPress={() => handleLoadTemplate(item.id)}>
                      <Text style={[styles.cardTitle, rtlText]}>{item.name}</Text>
                      <Text style={{ color: Palette.gold, fontSize: 10, fontWeight: '700', marginTop: 4, ...rtlText }}>{isRTL ? 'לחץ לטעינה למסע הזה' : 'Tap to load into this trip'}</Text>
                    </TouchableOpacity>
                  )}
                />
             </View>
           </View>
        </Modal>
      </View>
    );
  };

  const renderChat = () => {
    return (
      <View style={{ flex: 1 }}>
        <FlatList
          ref={chatScrollRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => (
            <ChatMessageItem 
              item={item} 
              userId={userId} 
              isRTL={isRTL} 
              handleDownloadMedia={handleDownloadMedia} 
              onMediaLoad={() => scrollToBottom(true)}
            />
          )}
          contentContainerStyle={styles.chatList}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          onContentSizeChange={() => {
            if (activeTab === 'chat' && messages.length > 0) {
              chatScrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />
        {!trip?.is_archived ? (
          <View style={[styles.inputRow, rowStyle]}>
            <TouchableOpacity style={{ padding: 5 }} onPress={() => handlePickMedia('image')} disabled={uploadingImage}>
              <Text style={{ fontSize: 24, opacity: uploadingImage ? 0.5 : 1 }}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 5 }} onPress={() => handlePickMedia('video')} disabled={uploadingImage}>
              <Text style={{ fontSize: 24, opacity: uploadingImage ? 0.5 : 1 }}>📹</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, rtlText, { minHeight: 48, paddingTop: 12, paddingBottom: 12 }]}
              placeholder={t('chat_placeholder')}
              placeholderTextColor={Palette.mud}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Text style={{ color: Palette.charcoal, fontWeight: '800' }}>➤</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.readOnlyChat}>
            <Text style={styles.readOnlyText}>{isRTL ? 'הצאט נעול לקריאה בלבד' : 'Chat is locked (read-only)'}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <StatusBar style="light" />
      <LinearGradient colors={[Palette.charcoal, '#1C1E16']} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, rowStyle]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left.forwardslash.chevron.right'} size={28} color={Palette.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSub, rtlText]}>DASHBOARD</Text>
          <Text style={[styles.headerTitle, rtlText]} numberOfLines={1}>{trip?.title || 'Trip'}</Text>
        </View>
      </View>

      <View style={styles.goldLine} />

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabScroll, rowStyle]}>
          {(['overview', 'navigation', 'logistics', 'chat'] as TabType[]).map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} 
              onPress={() => setActiveTab(tab)}
            >
              <View style={styles.tabContentWithBadge}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {t(`trip_${tab}` as any)}
                </Text>
                {tab === 'chat' && hasUnreadMessages && <View style={styles.tabBadge} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'navigation' && renderNavigation()}
        {activeTab === 'logistics' && renderLogistics()}
        {activeTab === 'chat' && renderChat()}
      </View>

      <TripSettingsModal 
        visible={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        trip={trip} 
        userId={userId} 
        onTripUpdated={() => fetchTrip(tripId).then(setTrip)} 
      />
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
  tabContentWithBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.rust,
    borderWidth: 1.5,
    borderColor: Palette.gold,
  },
  tabText: { fontSize: Typography.sm, color: Palette.mud, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  tabTextActive: { color: Palette.gold, fontWeight: '800' },

  scrollContent: { padding: Spacing.md, paddingBottom: 50 },
  tabContent: { gap: Spacing.lg },

  card: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.charcoalLight, padding: Spacing.lg },
  cardHeader: { alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: Typography.xl, fontWeight: '800', color: Palette.cream, marginBottom: Spacing.xs },
  cardSub: { fontSize: Typography.sm, color: Palette.sand },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Palette.gold, marginBottom: Spacing.sm },
  bodyText: { fontSize: Typography.sm, color: Palette.sand },

  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Palette.gold, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Palette.gold },

  actionBtn: { backgroundColor: Palette.charcoalLight, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#3A3A32' },
  actionBtnText: { color: Palette.cream, fontSize: Typography.base, fontWeight: '600' },
  actionBtnPrimary: { borderRadius: Radius.md, overflow: 'hidden' },
  ctaGradient: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  actionBtnTextPrimary: { color: Palette.cream, fontWeight: '800', fontSize: Typography.base, letterSpacing: 1 },
  actionBtnSecondary: { backgroundColor: Palette.charcoalLight, paddingVertical: Spacing.md, paddingHorizontal: 4, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.gold + '44' },
  actionBtnTextSecondary: { color: Palette.gold, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  rsvpRow: { gap: Spacing.xs, flexDirection: 'row' },
  rsvpBtn: { flex: 1, backgroundColor: Palette.charcoalLight, paddingVertical: 10, paddingHorizontal: 4, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  rsvpBtnActive: { backgroundColor: Palette.olive, borderColor: Palette.oliveLight, borderWidth: 1 },
  rsvpBtnText: { color: Palette.cream, fontWeight: '800', fontSize: 11 },
  rsvpBtnTextInactive: { color: Palette.sand, fontWeight: '600', fontSize: 11 },

  inputRow: { backgroundColor: Palette.charcoalMid, padding: 10, borderTopWidth: 1, borderTopColor: Palette.charcoalLight, gap: 10, alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: Palette.charcoal, color: Palette.cream, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.charcoalLight },
  sendBtn: { backgroundColor: Palette.gold, width: 45, height: 45, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },

  chatList: { padding: Spacing.md, paddingBottom: 20 },
  msgWrapper: { marginBottom: 15, maxWidth: '80%' },
  msgWrapperMe: { alignSelf: 'flex-end' },
  msgWrapperOther: { alignSelf: 'flex-start' },
  msgAuthor: { color: Palette.gold, fontSize: 10, marginBottom: 4, fontWeight: '700' },
  msgBubble: { padding: 12, borderRadius: Radius.lg },
  msgBubbleMe: { backgroundColor: Palette.olive, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: Palette.charcoalMid, borderWidth: 1, borderColor: Palette.charcoalLight, borderBottomLeftRadius: 4 },
  msgText: { color: Palette.cream, fontSize: Typography.sm },

  categoryTabs: { flexDirection: 'row', backgroundColor: Palette.charcoalMid, borderBottomWidth: 1, borderBottomColor: Palette.charcoalLight },
  categoryTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  categoryTabActive: { borderBottomColor: Palette.gold },
  categoryTabText: { color: Palette.mud, fontSize: 12, fontWeight: '700' },
  categoryTabTextActive: { color: Palette.gold },

  chatTypeTabs: { flexDirection: 'row', backgroundColor: Palette.charcoalMid, borderBottomWidth: 1, borderBottomColor: Palette.charcoalLight },
  chatTypeTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  chatTypeTabActive: { borderBottomColor: Palette.gold },
  chatTypeText: { color: Palette.mud, fontSize: 13, fontWeight: '700' },
  chatTypeTextActive: { color: Palette.gold },

  memberRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: Palette.charcoalLight },
  avatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, color: Palette.gold, fontWeight: '700' },
  
  archiveBanner: { backgroundColor: 'rgba(255, 149, 0, 0.1)', padding: 12, borderRadius: Radius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255, 149, 0, 0.2)', alignItems: 'center' },
  archiveBannerText: { color: '#ff9500', fontSize: 12, fontWeight: '700' },
  readOnlyChat: { padding: 20, backgroundColor: Palette.charcoalMid, alignItems: 'center', borderTopWidth: 1, borderTopColor: Palette.charcoalLight },
  readOnlyText: { color: Palette.sand, fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  mediaBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

const mapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];
