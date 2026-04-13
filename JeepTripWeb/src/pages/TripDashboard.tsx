import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchTrip, upsertRSVP } from '../lib/trips';
import { fetchLogistics, addLogisticsItem, deleteLogisticsItem, updateLogisticsItem, fetchLogisticsTemplates, saveLogisticsTemplate, applyLogisticsTemplate } from '../lib/logistics';
import type { LogisticsItem, LogisticsTemplate } from '../lib/logistics';
import { fetchMessages, sendMessage, uploadMediaFile } from '../lib/chat';
import type { ChatMessage } from '../lib/chat';
import { supabase } from '../lib/supabase';
import './TripDashboard.css';

type TabType = 'overview' | 'navigation' | 'logistics' | 'chat';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function formatDate(d: string) { return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }

export default function TripDashboard() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id || '';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);

  const isCreator = trip?.created_by === userId;
  const isManager = trip?.trip_attendees?.some((a: any) => a.user_id === userId && a.role === 'manager');
  const canManage = isCreator || isManager;
  const myRsvp = trip?.trip_attendees?.find((a: any) => a.user_id === userId)?.status;

  // Logistics
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [logCat, setLogCat] = useState<'general' | 'rescue' | 'food'>('general');
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState<LogisticsItem | null>(null);
  const [templates, setTemplates] = useState<LogisticsTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const { unreadTrips, markAsRead, setActiveTrip, setActiveTab: setGlobalActiveTab } = useNotifications();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTabRef = useRef(activeTab);
  const userIdRef = useRef(userId);
  const tripTitleRef = useRef(trip?.title);
  const userNameMap = useRef<Record<string, string>>({});

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { tripTitleRef.current = trip?.title; }, [trip?.title]);

  const getSenderName = (senderId: string) => {
    if (userNameMap.current[senderId]) return userNameMap.current[senderId];
    const attendee = trip?.trip_attendees?.find((a: any) => a.user_id === senderId);
    const name = attendee?.users?.full_name || 'User';
    if (name !== 'User') userNameMap.current[senderId] = name;
    return name;
  };

  const formatNewMessage = (msg: any) => {
    if (msg.users) return msg;
    return {
      ...msg,
      users: { full_name: getSenderName(msg.sender_id) }
    };
  };

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await fetchTrip(tripId);
      setTrip(data);
      // Update name map from attendees
      if (data?.trip_attendees) {
        data.trip_attendees.forEach((a: any) => {
          if (a.users?.full_name) userNameMap.current[a.user_id] = a.users.full_name;
        });
      }
    } catch (e) { console.error(e); }
  }, [tripId]);

  const loadLogistics = useCallback(async () => {
    if (!tripId) return;
    const logs = await fetchLogistics(tripId);
    setLogistics(logs);
  }, [tripId]);


  // Initial Load (One-time)
  useEffect(() => {
    async function init() {
      await loadTrip();
      if (tripId) {
        await loadLogistics();
        const msgs = await fetchMessages(tripId);
        setMessages(msgs);
      }
      setLoading(false);
    }
    init();
  }, [tripId, loadTrip, loadLogistics]);


  // Sync active trip and tab to global context for notification silencing
  useEffect(() => {
    setActiveTrip(tripId || null);
    return () => setActiveTrip(null);
  }, [tripId]);

  useEffect(() => {
    setGlobalActiveTab(activeTab);
    if (activeTab === 'chat' && tripId) {
      markAsRead(tripId);
    }
  }, [activeTab, tripId]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!tripId) return;

    const logSub = supabase.channel(`logistics:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_items', filter: `trip_id=eq.${tripId}` }, loadLogistics)
      .subscribe();

    const chatSub = supabase.channel(`chat:${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${tripId}` }, (payload) => {
        const newMsgFormatted = formatNewMessage(payload.new);
        
        // Message rendering is still handled here locally to update the current chat view
        setMessages(prev => {
          if (prev.some(m => m.id === newMsgFormatted.id)) return prev;
          return [...prev, newMsgFormatted];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logSub);
      supabase.removeChannel(chatSub);
    };
  }, [tripId]);

  // Scroll logic
  // 1. Instant scroll when entering tab
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeTab]);

  // 2. Smooth scroll when messages arrive + update name map
  useEffect(() => {
    if (messages.length > 0) {
      // Populate name map from message history (which has joined user data)
      messages.forEach(m => {
        if (m.users?.full_name) userNameMap.current[m.sender_id] = m.users.full_name;
      });

      if (activeTab === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const scrollToBottom = (instant = false) => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }
  };

  const handleRsvp = async (status: 'attending' | 'not_attending' | 'maybe') => {
    if (!tripId || !userId) return;
    try { await upsertRSVP(tripId, userId, status); await loadTrip(); }
    catch (e) { console.error(e); }
  };

  const handleAddItem = async () => {
    if (!newItem.trim() || !tripId) return;
    if (editingItem) {
      await updateLogisticsItem(editingItem.id, { item_name: newItem.trim() });
      setEditingItem(null);
    } else {
      await addLogisticsItem(tripId, logCat, newItem.trim());
    }
    setNewItem('');
    loadLogistics();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm(isRTL ? 'למחוק פריט זה?' : 'Delete this item?')) return;
    await deleteLogisticsItem(itemId);
    loadLogistics();
  };

  const handleSendMsg = async () => {
    if (!newMsg.trim() || !tripId) return;
    const msgText = newMsg.trim();
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
      users: { full_name: t('you' as any) || 'You' }
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMsg('');

    try {
      const sentMsg = await sendMessage(tripId, msgText);
      // 2. Replace optimistic message with real message
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.id === sentMsg.id);
        if (alreadyExists) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map(m => m.id === tempId ? sentMsg : m);
      });
    } catch (err: any) {
      console.error(err);
      alert(isRTL ? 'שגיאה בשליחה. נסה שוב.' : 'Error sending message. Please try again.');
      // 3. Revert and restore text
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMsg(msgText);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tripId) return;
    const type = file.type.startsWith('video') ? 'video' : 'image';
    try {
      setUploading(true);
      const url = await uploadMediaFile(file);
      await sendMessage(tripId, '', url, type);
    } catch (e) { console.error(e); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const copyInvite = async () => {
    const token = trip?.trip_groups?.[0]?.groups?.invite_token;
    if (!token) return;
    const url = `${window.location.origin}/join/${token}`;
    await navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const openGoogleMaps = (target: 'start' | 'dest') => {
    const lat = target === 'start' ? trip?.start_lat : trip?.lat;
    const lng = target === 'start' ? trip?.start_lng : trip?.lng;
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const openWaze = (target: 'start' | 'dest') => {
    const lat = target === 'start' ? trip?.start_lat : trip?.lat;
    const lng = target === 'start' ? trip?.start_lng : trip?.lng;
    if (!lat || !lng) return;
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };

  const addToGoogleCalendar = () => {
    if (!trip) return;
    const start = new Date(trip.start_date).toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(trip.end_date).toISOString().replace(/-|:|\.\d+/g, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🚙 ${trip.title}`)}&dates=${start}/${end}&location=${encodeURIComponent(trip.location_area || '')}&details=Arranged+via+JeepTrip`;
    window.open(url, '_blank');
  };

  const rtl = isRTL ? 'rtl' : '';
  const row = isRTL ? 'row-reverse' : 'row';

  if (loading) return <div className="center-screen" style={{ flex: 1 }}><div className="spinner" /></div>;
  if (!trip) return <div className="center-screen" style={{ flex: 1 }}><p style={{ color: 'var(--rust-light)' }}>Trip not found</p></div>;

  const inviteToken = trip?.trip_groups?.[0]?.groups?.invite_token;

  // ── TABS CONTENT ──────────────────────────────────────────
  const renderOverview = () => (
    <div className="tab-content">
      <div className="card dash-info-card">
        <h2 className={`dash-title ${rtl}`}>{trip.title}</h2>
        <p className={`dash-sub ${rtl}`}>
          📍 {trip.location_area}
          {trip.meeting_time && `   |   🕒 ${trip.meeting_time}`}
        </p>
        <p className={`dash-sub ${rtl}`}>📅 {formatDate(trip.start_date)} → {formatDate(trip.end_date)}</p>
      </div>

      {trip.is_archived && (
        <div className="archive-banner">🏁 {isRTL ? 'המסע הסתיים. הצאט במצב קריאה בלבד.' : 'Mission accomplished. Chat is read-only.'}</div>
      )}

      {canManage && (
        <div className="dash-actions" style={{ flexDirection: row as any }}>
          {inviteToken && (
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowInvite(true)}>
              🔗 {isRTL ? 'שלח הזמנה' : 'Invite Link'}
            </button>
          )}
        </div>
      )}

      <button className="btn btn-olive" onClick={addToGoogleCalendar}>
        📅 {t('btn_add_calendar')}
      </button>

      {/* RSVP */}
      <div className="card" style={{ padding: 'var(--sp-md)' }}>
        <div className="dash-section-header" style={{ flexDirection: row as any }}>
          <p className="section-title" style={{ marginBottom: 0 }}>{t('rsvp_status')}</p>
          {trip.max_participants && (
            <span style={{ fontSize: 12, color: 'var(--sand)' }}>
              {trip.trip_attendees?.filter((a: any) => a.status === 'attending').length || 0} / {trip.max_participants}
            </span>
          )}
        </div>
        <div className="rsvp-row" style={{ flexDirection: row as any }}>
          {(['attending', 'maybe', 'not_attending'] as const).map(s => (
            <button
              key={s}
              className={`rsvp-btn${myRsvp === s ? ' active' : ''}`}
              onClick={() => handleRsvp(s)}
            >
              {s === 'attending' ? `✅ ${t('rsvp_attending')}` : s === 'maybe' ? `❓ ${t('rsvp_maybe')}` : `❌ ${t('rsvp_not_attending')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Weather (static for now) */}
      <div className="card" style={{ padding: 'var(--sp-md)' }}>
        <p className="section-title">☀️ {isRTL ? 'מזג אוויר חזוי' : 'Forecast'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36 }}>⛅</span>
          <div>
            <p style={{ color: 'var(--cream)', fontSize: 22, fontWeight: 800 }}>22°C</p>
            <p style={{ color: 'var(--sand)', fontSize: 13 }}>Partly Cloudy</p>
          </div>
        </div>
      </div>

      {/* Attendees list */}
      {trip.trip_attendees?.length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-md)' }}>
          <p className="section-title">👥 {isRTL ? 'משתתפים' : 'Attendees'}</p>
          {trip.trip_attendees.map((a: any) => (
            <div key={a.user_id} className="attendee-row" style={{ flexDirection: row as any }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                {a.users?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span style={{ color: 'var(--cream)', fontSize: 14 }}>{a.users?.full_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: a.status === 'attending' ? 'var(--olive-light)' : a.status === 'maybe' ? 'var(--gold)' : 'var(--mud)' }}>
                {a.status === 'attending' ? '✅' : a.status === 'maybe' ? '❓' : '❌'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderNavigation = () => {
    const hasCoords = trip.lat && trip.lng;
    const mapQuery = hasCoords ? `${trip.lat},${trip.lng}` : encodeURIComponent(trip.location_area || '');
    const showMap = hasCoords || trip.location_area;

    if (!GOOGLE_MAPS_KEY) {
      return (
        <div className="tab-content">
          <div className="card" style={{ padding: 'var(--sp-md)', border: '1px solid var(--rust)' }}>
            <p style={{ color: 'var(--rust-light)', fontWeight: 800 }}>⚠️ {isRTL ? 'מפתח Google Maps חסר' : 'Google Maps API Key Missing'}</p>
            <p style={{ color: 'var(--sand)', fontSize: 13, marginTop: 4 }}>
              {isRTL 
                ? 'יש להוסיף את המשתנה VITE_GOOGLE_MAPS_API_KEY בהגדרות של Vercel.' 
                : 'Please add VITE_GOOGLE_MAPS_API_KEY to your Vercel Environment Variables.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="tab-content">
        {showMap ? (
          <div className="map-container">
            <iframe
              title="trip-map"
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: 'var(--r-lg)' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${mapQuery}&zoom=10`}
            />
          </div>
        ) : (
          <div className="card" style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 40, opacity: 0.5 }}>🧭</span>
            <p style={{ color: 'var(--sand)', fontSize: 14 }}>{isRTL ? 'מיקום לא הוגדר' : 'Map not configured'}</p>
          </div>
        )}

      <div className="nav-btn-row" style={{ flexDirection: row as any }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openWaze('start')}>🏁 {isRTL ? 'נווט להתחלה' : 'Start Point'}</button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openWaze('dest')}>🚩 {isRTL ? 'נווט ליעד' : 'Destination'}</button>
      </div>
      <div className="nav-btn-row" style={{ flexDirection: row as any }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openGoogleMaps('start')}>📍 Google Maps Start</button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openGoogleMaps('dest')}>📍 Google Maps Dest</button>
      </div>

      {trip.off_road_url && (
        <a href={trip.off_road_url} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          🚙 {isRTL ? 'פתח ב-OffRoad' : 'Open in OffRoad'}
        </a>
      )}
      {trip.route_file_url && (
        <a href={trip.route_file_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          ⬇️ {t('download_route')}
        </a>
      )}
    </div>
    );
  };

  const filteredLogistics = logistics.filter(l => l.category === logCat);

  const renderLogistics = () => (
    <div className="logistics-screen">
      <div className="log-cat-tabs" style={{ flexDirection: row as any }}>
        {(['general', 'rescue', 'food'] as const).map(cat => (
          <button key={cat} className={`log-cat-tab ${logCat === cat ? 'active' : ''}`} onClick={() => setLogCat(cat)}>
            {cat === 'general' ? (isRTL ? 'ברכב' : 'In Car') : cat === 'rescue' ? (isRTL ? 'חילוץ' : 'Rescue') : (isRTL ? 'אוכל/שתיה' : 'Food')}
          </button>
        ))}
      </div>

      {canManage && (
        <div style={{ padding: '8px var(--sp-md) 0' }}>
          <button className="btn btn-outline" style={{ fontSize: 13, padding: '8px 12px', width: 'auto' }} onClick={() => { setShowTemplates(true); fetchLogisticsTemplates().then(setTemplates); }}>
            📄 {isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}
          </button>
        </div>
      )}

      <div className="log-list">
        {filteredLogistics.length === 0 ? (
          <p style={{ color: 'var(--mud)', fontSize: 14, textAlign: 'center', padding: 20 }}>{isRTL ? 'אין פריטים עדיין' : 'No items yet'}</p>
        ) : filteredLogistics.map(item => (
          <div key={item.id} className={`log-item ${rtl}`}>
            <span className="log-item-name">{item.item_name}</span>
            <div className="log-item-actions">
              <button onClick={() => { setEditingItem(item); setNewItem(item.item_name); }} className="log-action-btn">✏️</button>
              <button onClick={() => handleDeleteItem(item.id)} className="log-action-btn danger">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`log-input-row ${rtl}`}>
        <input
          className={`input ${rtl}`}
          style={{ flex: 1 }}
          placeholder={editingItem ? (isRTL ? 'ערוך שם פריט...' : 'Edit item name...') : (isRTL ? 'הוסף פריט...' : 'Add item...')}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()}
        />
        <button className="send-btn" onClick={handleAddItem}>{editingItem ? '✓' : '+'}</button>
        {editingItem && <button className="log-action-btn" onClick={() => { setEditingItem(null); setNewItem(''); }}>✕</button>}
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <p className="modal-title">{isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}</p>
            <button className="btn btn-olive" style={{ marginBottom: 'var(--sp-md)' }} onClick={async () => {
              const name = window.prompt(isRTL ? 'שם התבנית' : 'Template name');
              if (!name) return;
              await saveLogisticsTemplate(name, logistics);
              const updated = await fetchLogisticsTemplates();
              setTemplates(updated);
            }}>💾 {isRTL ? 'שמור רשימה נוכחית' : 'Save current list'}</button>
            {templates.length === 0 ? <p style={{ color: 'var(--sand)', fontSize: 14 }}>{isRTL ? 'אין תבניות שמורות' : 'No saved templates'}</p>
              : templates.map(tmpl => (
                <div key={tmpl.id} className="card" style={{ padding: 'var(--sp-md)', marginBottom: 10, cursor: 'pointer' }}
                  onClick={async () => { if (!tripId) return; await applyLogisticsTemplate(tripId, tmpl.id); setShowTemplates(false); loadLogistics(); }}>
                  <p style={{ color: 'var(--cream)', fontWeight: 700 }}>{tmpl.name}</p>
                  <p style={{ color: 'var(--gold)', fontSize: 11, marginTop: 4 }}>{isRTL ? 'לחץ לטעינה' : 'Tap to load'}</p>
                </div>
              ))}
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setShowTemplates(false)}>{t('btn_cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="chat-screen">
      <div className="chat-messages">
        {messages.map(msg => {
          const isMe = msg.sender_id === userId || (msg as any).user_id === userId;
          const mediaUrl = msg.media_url || msg.image_url;
          const isVideo = msg.media_type === 'video';
          return (
            <div key={msg.id} className={`msg-wrapper ${isMe ? 'me' : 'other'}`}>
              {!isMe && <p className="msg-author">{msg.users?.full_name}</p>}
              <div className={`msg-bubble ${isMe ? 'me' : 'other'}`}>
                {mediaUrl && (
                  isVideo
                    ? <video src={mediaUrl} controls onLoadedData={() => scrollToBottom()} style={{ width: 200, borderRadius: 8, display: 'block', marginBottom: msg.content ? 8 : 0 }} />
                    : <img src={mediaUrl} alt="media" onLoad={() => scrollToBottom()} style={{ width: 200, borderRadius: 8, display: 'block', marginBottom: msg.content ? 8 : 0 }} />
                )}
                {msg.content && <p className="msg-text">{msg.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {!trip.is_archived && (
        <div className={`chat-input-row ${rtl}`}>
          <input
            className={`input ${rtl}`}
            style={{ flex: 1 }}
            placeholder={t('chat_placeholder')}
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMsg()}
          />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="send-btn" style={{ fontSize: 16 }} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload media">
            {uploading ? <span className="spinner spinner-sm" /> : '📎'}
          </button>
          <button className="send-btn" onClick={handleSendMsg} disabled={!newMsg.trim()}>➤</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-screen">
      {/* Header */}
      <div className={`screen-header ${rtl}`} style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: row as any }}>
          <button className="back-btn" onClick={() => navigate('/trips')}>←</button>
          <div>
            <p className="header-sub">{isRTL ? 'מסע פעיל' : 'ACTIVE MISSION'}</p>
            <h1 className="header-title" style={{ fontSize: 20 }}>{trip.title}</h1>
          </div>
        </div>
      </div>
      <div className="gold-line" />

      {/* Tab bar */}
      <div className="dash-tabs" style={{ flexDirection: row as any }}>
        {(['overview', 'navigation', 'logistics', 'chat'] as TabType[]).map(tab => (
          <button key={tab} className={`dash-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            <div className="dash-tab-content">
              <span>{tab === 'overview' ? '📋' : tab === 'navigation' ? '🧭' : tab === 'logistics' ? '🏕️' : '💬'}</span>
              <span>{t(`trip_${tab}` as any)}</span>
              {tab === 'chat' && tripId && unreadTrips.has(tripId) && <div className="dash-tab-badge" />}
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`screen-content dash-content`}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'navigation' && renderNavigation()}
        {activeTab === 'logistics' && renderLogistics()}
        {activeTab === 'chat' && renderChat()}
      </div>

      {/* Invite Modal */}
      {showInvite && inviteToken && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <p className="modal-title">🔗 {isRTL ? 'קישור הזמנה' : 'Invite Link'}</p>
            <p className="modal-sub">{isRTL ? 'שתף את הקישור הבא עם חברי הצוות:' : 'Share this link with your crew members:'}</p>
            <div className="invite-token-box">
              <span className="invite-token" style={{ fontSize: 14, letterSpacing: 0, textTransform: 'none' }}>
                {window.location.origin}/join/{inviteToken}
              </span>
            </div>
            <button className="btn btn-gold" style={{ marginBottom: 10 }} onClick={copyInvite}>
              {inviteCopied ? '✅ Copied!' : (isRTL ? 'העתק קישור' : 'Copy Link')}
            </button>
            <button className="btn btn-outline" onClick={() => setShowInvite(false)}>{t('btn_cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
