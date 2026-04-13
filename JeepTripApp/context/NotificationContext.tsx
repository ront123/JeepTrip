import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { fetchMyTrips } from '@/lib/trips';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationContextType {
  unreadTrips: Set<string>;
  pendingCount: number;
  markAsRead: (tripId: string) => void;
  connectionStatus: 'loading' | 'connected' | 'error';
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const isMutedRef = { current: false };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: !isMutedRef.current,
    shouldSetBadge: true,
  }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadTrips, setUnreadTrips] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [isMuted, _setIsMuted] = useState(false);
  
  const userTripIds = useRef<Set<string>>(new Set());
  const appState = useRef(AppState.currentState);

  // 0. Load mute setting
  useEffect(() => {
    AsyncStorage.getItem('notif_muted').then(val => {
      const muted = val === 'true';
      _setIsMuted(muted);
      isMutedRef.current = muted;
    });
  }, []);

  const setIsMuted = async (muted: boolean) => {
    _setIsMuted(muted);
    isMutedRef.current = muted;
    await AsyncStorage.setItem('notif_muted', muted.toString());
  };

  // 1. AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // 2. Auth state listener ONLY tracks userId
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
      if (!session?.user) {
        setUnreadTrips(new Set());
        setPendingCount(0);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 3. Realtime listener driven by userId - Robust React Lifecycle
  useEffect(() => {
    if (!userId) {
      setConnectionStatus('loading');
      return;
    }

    let channel: any = null;
    let isMounted = true;

    const setup = async () => {
      try {
        setConnectionStatus('loading');
        
        // Fetch user trips for filtering
        const trips = await fetchMyTrips(true);
        if (!isMounted) return;
        userTripIds.current = new Set(trips.map(t => t.id.toLowerCase()));

        // Fetch pending count if admin
        const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single();
        if (isMounted && profile?.role === 'admin') {
          const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setPendingCount(count || 0);
        }

        if (!isMounted) return;

        // CREATE CHANNEL - NO RE-ENTRANCY HERE
        channel = supabase.channel(`mobile_global:${userId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_messages' }, (payload) => {
            const newMsg = payload.new;
            const tripId = (newMsg.trip_id || '').toLowerCase();

            if (!userTripIds.current.has(tripId)) return;
            if (newMsg.sender_id === userId) return;

            setUnreadTrips(prev => new Set(prev).add(tripId));

            // Browser/App notification logic
            const tripTitle = trips.find(t => t.id.toLowerCase() === tripId)?.title || 'JeepTrip';
            Notifications.scheduleNotificationAsync({
              content: {
                title: `🚙 ${tripTitle}`,
                body: newMsg.content || 'New media message',
                data: { tripId, type: 'chat' },
              },
              trigger: null,
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
            if (profile?.role !== 'admin') return;
            if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
              setPendingCount(prev => prev + 1);
              Notifications.scheduleNotificationAsync({
                content: { title: '🎫 New Join Request', body: `${payload.new.full_name} wants to join the crew` },
                trigger: null,
              });
            } else if (payload.eventType === 'UPDATE') {
              const oldRecord = payload.old as any;
              if (oldRecord?.status === 'pending' && payload.new.status !== 'pending') {
                setPendingCount(prev => Math.max(0, prev - 1));
              } else if (oldRecord?.status !== 'pending' && payload.new.status === 'pending') {
                setPendingCount(prev => prev + 1);
              }
            }
          })
          .subscribe((status) => {
            if (isMounted) {
              if (status === 'SUBSCRIBED') setConnectionStatus('connected');
              if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
            }
          });
      } catch (e) {
        console.error('Realtime setup error:', e);
        if (isMounted) setConnectionStatus('error');
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const markAsRead = (tripId: string) => {
    setUnreadTrips(prev => {
      const tid = tripId.toLowerCase();
      if (!prev.has(tid)) return prev;
      const next = new Set(prev);
      next.delete(tid);
      return next;
    });
  };

  return (
    <NotificationContext.Provider value={{ unreadTrips, pendingCount, markAsRead, connectionStatus, isMuted, setIsMuted }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
