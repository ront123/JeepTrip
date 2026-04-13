import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { fetchMyTrips } from '@/lib/trips';
import { AppState, Platform } from 'react-native';

interface NotificationContextType {
  unreadTrips: Set<string>;
  pendingCount: number;
  markAsRead: (tripId: string) => void;
  connectionStatus: 'loading' | 'connected' | 'error';
}

const NotificationContext = createContext<NotificationContextType | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadTrips, setUnreadTrips] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  
  const userTripIds = useRef<Set<string>>(new Set());
  const currentUserId = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        currentUserId.current = user.id;
        setupRealtime(user.id);
      }
    }
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        currentUserId.current = session.user.id;
        setupRealtime(session.user.id);
      } else {
        setUserId(null);
        currentUserId.current = null;
        setUnreadTrips(new Set());
        setPendingCount(0);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const setupRealtime = async (uid: string) => {
    try {
      setConnectionStatus('loading');
      
      // 1. Fetch user trips for filtering
      const trips = await fetchMyTrips(true);
      userTripIds.current = new Set(trips.map(t => t.id.toLowerCase()));

      // 2. Fetch pending count if admin
      const { data: profile } = await supabase.from('users').select('role').eq('id', uid).single();
      if (profile?.role === 'admin') {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setPendingCount(count || 0);
      }

      // 3. Setup global channel
      const channel = supabase.channel('mobile_global_notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_messages' }, (payload) => {
          const newMsg = payload.new;
          const tripId = (newMsg.trip_id || '').toLowerCase();

          if (!userTripIds.current.has(tripId)) return;
          if (newMsg.sender_id === currentUserId.current) return;

          setUnreadTrips(prev => {
            const next = new Set(prev);
            next.add(tripId);
            return next;
          });

          // Trigger local notification if not in app or foreground but not in chat
          if (appState.current !== 'active' || true) { // For MVP, always show if it's a new message
             const tripTitle = trips.find(t => t.id.toLowerCase() === tripId)?.title || 'JeepTrip';
             Notifications.scheduleNotificationAsync({
               content: {
                 title: `🚙 ${tripTitle}`,
                 body: newMsg.content || 'New media message',
                 data: { tripId, type: 'chat' },
               },
               trigger: null,
             });
          }
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
          if (status === 'SUBSCRIBED') setConnectionStatus('connected');
          if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.error('Mobile notification setup error:', e);
      setConnectionStatus('error');
    }
  };

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
    <NotificationContext.Provider value={{ unreadTrips, pendingCount, markAsRead, connectionStatus }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
