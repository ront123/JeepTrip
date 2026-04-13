import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { fetchMyTrips } from '../lib/trips';

interface NotificationContextType {
  unreadTrips: Set<string>;
  pendingCount: number;
  markAsRead: (tripId: string) => void;
  setActiveTrip: (tripId: string | null) => void;
  setActiveTab: (tab: string) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [unreadTrips, setUnreadTrips] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTripId, _setActiveTrip] = useState<string | null>(null);
  const [activeTab, _setActiveTab] = useState<string>('overview');
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
      if (!prev.has(tripId)) return prev;
      const next = new Set(prev);
      next.delete(tripId);
      return next;
    });
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setPermission(res);
  };

  // Global Realtime Listener
  useEffect(() => {
    if (!user) {
      setUnreadTrips(new Set());
      setPendingCount(0);
      userTripIds.current = new Set();
      return;
    }

    let channel: any = null;

    async function setupListener() {
      try {
        // Fetch trips once on mount/auth change to know which trips to listen to
        const trips = await fetchMyTrips(true);
        userTripIds.current = new Set(trips.map(t => t.id));
        
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
            // NO FILTER here - we filter client-side for "in" logic reliability
          }, (payload) => {
            const newMsg = payload.new;
            const tripId = newMsg.trip_id;

            // CLIENT-SIDE FILTERING: Check if this trip belongs to the user
            if (!userTripIds.current.has(tripId)) return;

            const isMe = newMsg.sender_id === userIdRef.current;
            const isCurrentlyViewingChat = activeTripIdRef.current === tripId && activeTabRef.current === 'chat';
            
            if (!isMe && (!isCurrentlyViewingChat || document.hidden)) {
              setUnreadTrips(prev => new Set(prev).add(tripId));
              if ('Notification' in window && Notification.permission === 'granted') {
                const tripTitle = trips.find(t => t.id === tripId)?.title || 'JeepTrip';
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
              // old/new available? Supabase sometimes doesn't send old payload for updates unless replica identity is Full.
              // We'll trust the payload status or we can re-fetch count to be safe.
              const newStatus = payload.new.status;
              const oldRecord = payload.old as any;
              
              if (oldRecord && oldRecord.status === 'pending' && newStatus !== 'pending') {
                setPendingCount(prev => Math.max(0, prev - 1));
              } else if (oldRecord && oldRecord.status !== 'pending' && newStatus === 'pending') {
                setPendingCount(prev => prev + 1);
              } else if (!oldRecord) {
                // If old record is missing, we re-fetch to stay accurate
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => {
                  setPendingCount(count || 0);
                });
              }
            }
          })
          .subscribe();
      } catch (err) {
        console.error('Error setting up global notifications:', err);
      }
    }

    setupListener();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.role]); // Re-run when user or their role is determined

  return (
    <NotificationContext.Provider value={{ unreadTrips, pendingCount, markAsRead, setActiveTrip, setActiveTab, permission, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
