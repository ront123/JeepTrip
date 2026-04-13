import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { supabase } from '../lib/supabase';

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
          ? 'הדפדפן שלך לא תומך בהתראות או שהן חסומות בהגדרות המערכת.' 
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

  // Global Realtime Listener - ALIGNED WITH MOBILE (Broad Listener)
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
        
        // 1. ROBUST TRIP DISCOVERY:
        const { data: groupData } = await supabase.from('group_members').select('group_id').eq('user_id', user!.id);
        const groupIds = (groupData || []).map(g => g.group_id);

        if (groupIds.length === 0) {
          userTripIds.current = new Set();
          setMonitoredTripCount(0);
        } else {
          const { data: tripGroupData } = await supabase.from('trip_groups').select('trip_id, trips(title)').in('group_id', groupIds);
          const monitoredIds = (tripGroupData || []).map(d => (d.trip_id || '').toLowerCase());
          userTripIds.current = new Set(monitoredIds);
          setMonitoredTripCount(monitoredIds.length);

          // Cache titles for notifications
          (tripGroupData || []).forEach(d => {
            if (d.trip_id) {
              const title = (Array.isArray(d.trips) ? d.trips[0]?.title : (d.trips as any)?.title) || 'JeepTrip';
              tripTitles.current[d.trip_id.toLowerCase()] = title;
            }
          });
        }
        
        // 2. Initial pending count for admin
        if (profile?.role === 'admin') {
          const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setPendingCount(count || 0);
        }

        // 3. SINGLE BROAD CHANNEL (No filters, aligned with successful mobile logic)
        channel = supabase.channel(`web_global:${user!.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_messages' }, (payload) => {
            const newMsg = payload.new;
            const tripId = (newMsg.trip_id || '').toLowerCase();

            // JS-SIDE FILTERING (IDENTICAL TO MOBILE)
            if (!userTripIds.current.has(tripId)) return;
            if (newMsg.sender_id === userIdRef.current) return;

            const isCurrentlyViewingChat = activeTripIdRef.current?.toLowerCase() === tripId && activeTabRef.current === 'chat';
            
            if (!isCurrentlyViewingChat || document.hidden) {
              setUnreadTrips(prev => new Set(prev).add(tripId));
              if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                const title = tripTitles.current[tripId] || 'JeepTrip';
                new window.Notification(`🚙 ${title}`, { 
                  body: `${newMsg.content || 'New media message'}`, 
                  icon: '/jeep.svg' 
                });
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
            if (profile?.role !== 'admin') return;

            if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
              setPendingCount(prev => prev + 1);
              if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                new window.Notification('🎫 New Join Request', { body: `${payload.new.full_name} wants to join the crew`, icon: '/jeep.svg' });
              }
            } else if (payload.eventType === 'UPDATE') {
              const newStatus = payload.new.status;
              const oldRecord = payload.old as any;
              
              if (oldRecord && oldRecord.status === 'pending' && newStatus !== 'pending') {
                setPendingCount(prev => Math.max(0, prev - 1));
              } else if (oldRecord && oldRecord.status !== 'pending' && newStatus === 'pending') {
                setPendingCount(prev => prev + 1);
              }
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') setConnectionStatus('connected');
            if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
          });
      } catch (err) {
        setConnectionStatus('error');
        console.error('Error setting up web notifications:', err);
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
