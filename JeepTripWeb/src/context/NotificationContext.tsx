import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { fetchMyTrips } from '../lib/trips';

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
      } else if (!(window as any).isSecureContext) {
        alert(isRTL 
          ? 'התראות דורשות חיבור מאובטח (HTTPS). וודא שכתובת האתר מתחילה ב-https://.' 
          : 'Notifications require a secure context (HTTPS). please ensure your URL starts with https://.');
      } else {
        alert(isRTL 
          ? 'הדפדפן שלך לא תומך בהתראות או שהן חסומות בהגדרות המערכת.' 
          : 'Your browser does not support notifications or they are disabled in system settings.');
      }
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'denied') {
        alert(isRTL ? 'ההרשאה להתראות נחסמה. עליך לאשר אותן בהגדרות הדפדפן כדי לקבל עדכונים.' : 'Notification permission was denied. Please enable them in your browser settings.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      alert(isRTL ? 'שגיאה בבקשת הרשאה. ייתכן שהדפדפן חוסם בקשות אלו.' : 'Error requesting notification permission. Your browser may be blocking this request.');
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

  // Global Realtime Listener
  useEffect(() => {
    if (!user) {
      setUnreadTrips(new Set());
      setPendingCount(0);
      userTripIds.current = new Set();
      setConnectionStatus('loading');
      setMonitoredTripCount(0);
      return;
    }

    let channel: any = null;

    async function setupListener() {
      try {
        setConnectionStatus('loading');
        // Fetch ALL user trips for monitoring (less restrictive filter for alerts)
        const { data: tripData } = await supabase
          .from('trip_attendees')
          .select('trip_id, trips(title)')
          .eq('user_id', user!.id);
        
        const monitoredIds = (tripData || []).map(d => (d.trip_id || '').toLowerCase());
        userTripIds.current = new Set(monitoredIds);
        setMonitoredTripCount(monitoredIds.length);
        
        // Initial pending count for admin
        if (profile?.role === 'admin') {
          const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setPendingCount(count || 0);
        }

        channel = supabase.channel('global_notifications')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'trip_messages'
          }, (payload) => {
            const newMsg = payload.new;
            const tripId = (newMsg.trip_id || '').toLowerCase();

            // CLIENT-SIDE FILTERING: Check if this trip belongs to the user
            if (!userTripIds.current.has(tripId)) return;

            const isMe = newMsg.sender_id === userIdRef.current;
            const isCurrentlyViewingChat = activeTripIdRef.current?.toLowerCase() === tripId && activeTabRef.current === 'chat';
            
            if (!isMe && (!isCurrentlyViewingChat || document.hidden)) {
              setUnreadTrips(prev => new Set(prev).add(tripId));
              if ('Notification' in window && Notification.permission === 'granted') {
                const tripTitle = (tripData || []).find(d => d.trip_id.toLowerCase() === tripId)?.trips?.title || 'JeepTrip';
                new Notification(`🚙 ${tripTitle}`, { body: `${newMsg.content || 'New media message'}`, icon: '/jeep.svg' });
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
            if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
              setPendingCount(prev => prev + 1);
              if (profile?.role === 'admin' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('🎫 New Join Request', { body: `${payload.new.full_name} wants to join the crew`, icon: '/jeep.svg' });
              }
            } else if (payload.eventType === 'UPDATE') {
              const newStatus = payload.new.status;
              const oldRecord = payload.old as any;
              
              if (oldRecord && oldRecord.status === 'pending' && newStatus !== 'pending') {
                setPendingCount(prev => Math.max(0, prev - 1));
              } else if (oldRecord && oldRecord.status !== 'pending' && newStatus === 'pending') {
                setPendingCount(prev => prev + 1);
              } else if (!oldRecord) {
                // Refetch for accuracy if old record missing
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => {
                  setPendingCount(count || 0);
                });
              }
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') setConnectionStatus('connected');
            if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
          });
      } catch (err) {
        setConnectionStatus('error');
        console.error('Error setting up global notifications:', err);
      }
    }

    setupListener();

    return () => {
      if (channel) supabase.removeChannel(channel);
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
