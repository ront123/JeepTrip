import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { supabase } from '../lib/supabase';
import { fetchMyTrips } from '../lib/trips';
import { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionStatus = 'loading' | 'connected' | 'error';

interface NotificationContextType {
  unreadTrips: Set<string>;
  pendingCount: number;
  markAsRead: (tripId: string) => void;
  setActiveTrip: (tripId: string | null) => void;
  setActiveTab: (tab: string) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  connectionStatus: ConnectionStatus;
  sendTestNotification: () => void;
  monitoredTripCount: number;
  uid: string;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { isRTL } = useLanguage();
  const [unreadTrips, setUnreadTrips] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTripId, _setActiveTrip] = useState<string | null>(null);
  const [activeTab, _setActiveTab] = useState<string>('overview');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [monitoredTripCount, setMonitoredTripCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? (window.Notification?.permission || 'default') : 'default'
  );
  
  const activeTripIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<string>('overview');
  const userIdRef = useRef<string | null>(null);
  const userTripIds = useRef<Set<string>>(new Set());
  const tripTitles = useRef<Record<string, string>>({});
  const channelMap = useRef<Map<string, RealtimeChannel>>(new Map());

  // Sync refs for the realtime listener
  useEffect(() => { activeTripIdRef.current = activeTripId; }, [activeTripId]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { userIdRef.current = user?.id || null; }, [user]);

  const setActiveTrip = (id: string | null) => _setActiveTrip(id);
  const setActiveTab = (tab: string) => _setActiveTab(tab);

  const markAsRead = (tripId: string) => {
    setUnreadTrips(prev => {
      const tid = tripId.toLowerCase();
      if (!prev.has(tid)) return prev;
      const next = new Set(prev);
      next.delete(tid);
      return next;
    });
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        alert(isRTL 
          ? 'במכשירי iPhone/iPad יש להוסיף את האתר למסך הבית ("הוסף למסך הבית") ולפתוח אותו משם כדי לאפשר התראות.' 
          : 'On iOS, you must "Add to Home Screen" and open the app from there to enable notifications.');
      } else {
        alert(isRTL 
          ? 'התראות דורשות חיבור מאובטח (HTTPS). וודא שכתובת האתר מתחילה ב-https://.' 
          : 'Your browser does not support notifications or they are disabled in system settings.');
      }
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const sendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛡️ JeepTrip Test', {
        body: 'If you see this, browser notifications are working correctly!',
        icon: '/jeep.svg'
      });
    } else {
      alert('Notification permission not granted. Please click the button to enable or check browser settings.');
    }
  };

  // Realtime Lifecycle management
  useEffect(() => {
    if (!user) {
      setUnreadTrips(new Set());
      setPendingCount(0);
      userTripIds.current = new Set();
      setConnectionStatus('loading');
      setMonitoredTripCount(0);
      return;
    }

    let adminChannel: RealtimeChannel | null = null;

    async function setupListener() {
      try {
        setConnectionStatus('loading');
        
        // 1. ROBUST TRIP DISCOVERY:
        const trips = await fetchMyTrips(true);
        const currentTripIds = (trips || []).map(t => (t.id || '').toLowerCase());
        userTripIds.current = new Set(currentTripIds);
        setMonitoredTripCount(currentTripIds.length);

        // Update titles cache
        (trips || []).forEach(t => {
          if (t.id) {
            tripTitles.current[t.id.toLowerCase()] = t.title || 'JeepTrip';
          }
        });

        // 2. Lifecycle Management: Cleanup old channels
        channelMap.current.forEach((ch, id) => {
          if (!currentTripIds.includes(id)) {
            supabase.removeChannel(ch);
            channelMap.current.delete(id);
          }
        });

        // 3. Lifecycle Management: Setup new channels (ONE PER TRIP with FILTER)
        currentTripIds.forEach(tid => {
          if (channelMap.current.has(tid)) return;

          const ch = supabase.channel(`notif:${tid}`)
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'trip_messages', 
              filter: `trip_id=eq.${tid}` 
            }, (payload) => {
              const newMsg = payload.new;
              const isMe = newMsg.sender_id === userIdRef.current;
              const isCurrentlyViewingChat = activeTripIdRef.current?.toLowerCase() === tid && activeTabRef.current === 'chat';
              
              if (!isMe && (!isCurrentlyViewingChat || document.hidden)) {
                setUnreadTrips(prev => new Set(prev).add(tid));
                if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                  const title = tripTitles.current[tid] || 'JeepTrip';
                  new window.Notification(`🚙 ${title}`, { 
                    body: `${newMsg.content || 'New media message'}`, 
                    icon: '/jeep.svg' 
                  });
                }
              }
            })
            .subscribe();
          
          channelMap.current.set(tid, ch);
        });

        // 4. Admin Listener
        if (profile?.role === 'admin') {
          const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setPendingCount(count || 0);

          adminChannel = supabase.channel(`admin_global:${user!.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
              if (payload.new.status === 'pending') {
                setPendingCount(prev => prev + 1);
                if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                  new window.Notification('🎫 New Join Request', { body: `${payload.new.full_name} wants to join the crew`, icon: '/jeep.svg' });
                }
              }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
              const oldStatus = (payload.old as any)?.status;
              const newStatus = payload.new.status;
              if (oldStatus === 'pending' && newStatus !== 'pending') setPendingCount(prev => Math.max(0, prev - 1));
              else if (oldStatus !== 'pending' && newStatus === 'pending') setPendingCount(prev => prev + 1);
            })
            .subscribe();
        }

        setConnectionStatus('connected');
      } catch (err) {
        setConnectionStatus('error');
        console.error('Error setting up multi-channel notifications:', err);
      }
    }

    setupListener();

    return () => {
      if (adminChannel) supabase.removeChannel(adminChannel);
      channelMap.current.forEach(ch => supabase.removeChannel(ch));
      channelMap.current.clear();
    };
  }, [user?.id, profile?.role]);

  return (
    <NotificationContext.Provider value={{ 
      unreadTrips, pendingCount, markAsRead, setActiveTrip, setActiveTab, 
      permission, requestPermission, connectionStatus, sendTestNotification,
      monitoredTripCount, uid: user?.id || ''
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
