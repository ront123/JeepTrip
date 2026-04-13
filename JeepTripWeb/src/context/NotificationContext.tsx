import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { fetchMyTrips } from '../lib/trips';

interface NotificationContextType {
  unreadTrips: Set<string>;
  markAsRead: (tripId: string) => void;
  setActiveTrip: (tripId: string | null) => void;
  setActiveTab: (tab: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadTrips, setUnreadTrips] = useState<Set<string>>(new Set());
  const [activeTripId, _setActiveTrip] = useState<string | null>(null);
  const [activeTab, _setActiveTab] = useState<string>('overview');
  
  const activeTripIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<string>('overview');
  const userIdRef = useRef<string | null>(null);

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

  // Global Realtime Listener
  useEffect(() => {
    if (!user) {
      setUnreadTrips(new Set());
      return;
    }

    let channel: any = null;

    async function setupListener() {
      try {
        const trips = await fetchMyTrips(true);
        const tripIds = trips.map(t => t.id);
        if (tripIds.length === 0) return;

        channel = supabase.channel('global_notifications')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'trip_messages',
            filter: `trip_id=in.(${tripIds.join(',')})`
          }, (payload) => {
            const newMsg = payload.new;
            const tripId = newMsg.trip_id;

            // Conditions for showing notification/red dot:
            // 1. Not from current user
            // 2. Not currently looking at this trip's chat tab
            // 3. (Optional) Document is hidden
            
            const isMe = newMsg.sender_id === userIdRef.current;
            const isCurrentlyViewingChat = activeTripIdRef.current === tripId && activeTabRef.current === 'chat';
            
            if (!isMe && (!isCurrentlyViewingChat || document.hidden)) {
              setUnreadTrips(prev => new Set(prev).add(tripId));

              // Browser Notification
              if ('Notification' in window && Notification.permission === 'granted') {
                const tripTitle = trips.find(t => t.id === tripId)?.title || 'JeepTrip';
                new Notification(`🚙 ${tripTitle}`, {
                  body: `${newMsg.content || 'New media message'}`,
                  icon: '/jeep.svg'
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

    // Permission request on first interaction (already handled in TripDashboard but good to have here too)
    const handleGesture = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      window.removeEventListener('click', handleGesture);
    };
    window.addEventListener('click', handleGesture);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('click', handleGesture);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadTrips, markAsRead, setActiveTrip, setActiveTab }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
