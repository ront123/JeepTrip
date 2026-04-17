import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchTrip, upsertRSVP, updateTrip, deleteTrip, archiveTrip, toggleTripManager } from '../lib/trips';
import { fetchLogistics, addLogisticsItem, deleteLogisticsItem, updateLogisticsItem, fetchLogisticsTemplates, saveLogisticsTemplate, applyLogisticsTemplate } from '../lib/logistics';
import type { LogisticsItem, LogisticsTemplate } from '../lib/logistics';
import { fetchMessages, sendMessage, uploadMediaFile } from '../lib/chat';
import type { ChatMessage } from '../lib/chat';
import { supabase } from '../lib/supabase';
import { DashOverview } from '../components/dashboard/DashOverview';
import { DashNavigation } from '../components/dashboard/DashNavigation';
import { DashLogistics } from '../components/dashboard/DashLogistics';
import { DashChat } from '../components/dashboard/DashChat';
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploading, setUploading] = useState(false);

  // Logistics states (needed by DashLogistics and Supabase listeners)
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [logCat, setLogCat] = useState<'general' | 'rescue' | 'food'>('general');
  const [templates, setTemplates] = useState<LogisticsTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const { unreadTrips, markAsRead, setActiveTrip, setActiveTab: setGlobalActiveTab } = useNotifications();
  
  const activeTabRef = useRef(activeTab);
  const userIdRef = useRef(userId);
  const tripTitleRef = useRef(trip?.title);
  const userNameMap = useRef<Record<string, string>>({});

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLoc, setEditLoc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editMax, setEditMax] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editOffroad, setEditOffroad] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (trip && showSettings) {
      setEditTitle(trip.title || '');
      setEditLoc(trip.location_area || '');
      setEditStart(trip.start_date ? new Date(trip.start_date).toISOString().split('T')[0] : '');
      setEditEnd(trip.end_date ? new Date(trip.end_date).toISOString().split('T')[0] : '');
      setEditMax(trip.max_participants?.toString() || '');
      setEditTime(trip.meeting_time || '');
      setEditOffroad(trip.off_road_url || '');
    }
  }, [trip, showSettings]);

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

  // Smooth scroll logic is now partially inside DashChat
  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach(m => {
        if (m.users?.full_name) userNameMap.current[m.sender_id] = m.users.full_name;
      });
    }
  }, [messages]);

  const handleRsvp = async (status: 'attending' | 'not_attending' | 'maybe') => {
    if (!tripId || !userId) return;
    try { await upsertRSVP(tripId, userId, status); await loadTrip(); }
    catch (e) { console.error(e); }
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

  const handleUpdateTrip = async () => {
    if (!tripId || !editTitle.trim()) return;
    setUpdating(true);
    try {
      await updateTrip(tripId, {
        title: editTitle.trim(),
        location_area: editLoc.trim(),
        start_date: new Date(editStart).toISOString(),
        end_date: new Date(editEnd).toISOString(),
        max_participants: editMax ? parseInt(editMax, 10) : null,
        meeting_time: editTime.trim() || null,
        off_road_url: editOffroad.trim() || null,
      });
      await loadTrip();
      setShowSettings(false);
    } catch (e: any) { alert(e.message); }
    finally { setUpdating(false); }
  };

  const handleDeleteTrip = async () => {
    if (!tripId) return;
    if (!window.confirm(isRTL ? 'האם אתה בטוח שברצונך למחוק את המסע לצמיתות?' : 'Are you sure you want to permanently delete this trip?')) return;
    try {
      await deleteTrip(tripId);
      navigate('/trips');
    } catch (e: any) { alert(e.message); }
  };

  const handleArchiveTrip = async () => {
    if (!tripId) return;
    if (!window.confirm(isRTL ? 'לסגור את המסע? הצאט יהפוך לקריאה בלבד.' : 'Archive trip? Chat will become read-only.')) return;
    try {
      await archiveTrip(tripId);
      await loadTrip();
      setShowSettings(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleToggleManager = async (targetId: string, currentRole: string) => {
    if (!tripId) return;
    try {
      await toggleTripManager(tripId, targetId, currentRole !== 'manager');
      await loadTrip();
    } catch (e: any) { alert(e.message); }
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

  // ── RENDER DELEGATES ──────────────────────────────────────────

  return (
    <div className="dashboard-screen screen-container">
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
        {activeTab === 'overview' && (
          <DashOverview
            trip={trip} isRTL={isRTL} t={t} canManage={canManage} myRsvp={myRsvp}
            handleRsvp={handleRsvp} setShowSettings={setShowSettings} setShowInvite={setShowInvite}
            addToGoogleCalendar={addToGoogleCalendar} formatDate={formatDate}
          />
        )}
        {activeTab === 'navigation' && (
          <DashNavigation
            trip={trip} isRTL={isRTL} t={t} GOOGLE_MAPS_KEY={GOOGLE_MAPS_KEY}
            openWaze={openWaze} openGoogleMaps={openGoogleMaps}
          />
        )}
        {activeTab === 'logistics' && (
          <DashLogistics
            tripId={tripId} logistics={logistics} logCat={logCat} setLogCat={setLogCat}
            loadLogistics={loadLogistics} canManage={canManage} isRTL={isRTL} t={t}
            templates={templates} showTemplates={showTemplates} setShowTemplates={setShowTemplates}
            fetchLogisticsTemplates={fetchLogisticsTemplates} setTemplates={setTemplates}
            handleDeleteItem={deleteLogisticsItem} updateLogisticsItem={updateLogisticsItem}
            addLogisticsItem={addLogisticsItem} saveLogisticsTemplate={saveLogisticsTemplate}
            applyLogisticsTemplate={applyLogisticsTemplate}
          />
        )}
        {activeTab === 'chat' && (
          <DashChat
            tripId={tripId} userId={userId} messages={messages} setMessages={setMessages}
            isRTL={isRTL} t={t} trip={trip} uploading={uploading} setUploading={setUploading}
            sendMessage={sendMessage} uploadMediaFile={uploadMediaFile}
          />
        )}
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
      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-box settings-modal" onClick={e => e.stopPropagation()}>
            <p className="modal-title">{isRTL ? 'הגדרות מסע' : 'Trip Settings'}</p>
            
            <div className="settings-scroll-area">
              <div className="form-group">
                <label className="form-label">{isRTL ? 'שם המסע' : 'Trip Title'}</label>
                <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              
              <div className="form-group">
                <label className="form-label">{isRTL ? 'מיקום/אזור' : 'Location'}</label>
                <input className="input" value={editLoc} onChange={e => setEditLoc(e.target.value)} />
              </div>

              <div className="form-row" style={{ flexDirection: row as any }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{isRTL ? 'תאריך יציאה' : 'Start Date'}</label>
                  <input type="date" className="input" value={editStart} onChange={e => setEditStart(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{isRTL ? 'תאריך חזרה' : 'End Date'}</label>
                  <input type="date" className="input" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'שעת מפגש' : 'Meeting Time'}</label>
                <input type="time" className="input" value={editTime} onChange={e => setEditTime(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'לינק ל-OffRoad' : 'OffRoad Link'}</label>
                <input className="input" value={editOffroad} onChange={e => setEditOffroad(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{isRTL ? 'מכסת משתתפים' : 'Participant Limit'}</label>
                <input type="number" className="input" value={editMax} onChange={e => setEditMax(e.target.value)} placeholder="Unlimited" />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button className="btn btn-outline" onClick={() => setShowSettings(false)}>{t('btn_cancel')}</button>
                <button className="btn btn-gold" onClick={handleUpdateTrip} disabled={updating}>
                  {updating ? <span className="spinner spinner-sm" /> : (isRTL ? 'שמור שינויים' : 'Save Changes')}
                </button>
              </div>

              {isCreator && (
                <div className="danger-zone">
                  <p className="section-title" style={{ color: 'var(--rust-light)', fontSize: 14 }}>Danger Zone</p>
                  <div className="dash-actions" style={{ gap: 10, marginTop: 10 }}>
                    {!trip.is_archived && (
                      <button className="btn btn-outline" style={{ borderColor: 'var(--gold)', color: 'var(--gold)', fontSize: 12 }} onClick={handleArchiveTrip}>
                        🏁 {isRTL ? 'סגור מסע (ארכיון)' : 'Archive Trip'}
                      </button>
                    )}
                    <button className="btn btn-outline" style={{ borderColor: 'var(--rust)', color: 'var(--rust-light)', fontSize: 12 }} onClick={handleDeleteTrip}>
                      🗑️ {isRTL ? 'מחק מסע לצמיתות' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              )}

              <div className="divider" style={{ margin: '20px 0' }} />
              <p className="section-title">👥 {isRTL ? 'ניהול הרשאות' : 'Manage Permissions'}</p>
              <div className="attendee-list" style={{ marginTop: 10 }}>
                {trip.trip_attendees?.map((a: any) => {
                  if (a.user_id === trip.created_by) return null;
                  const isMngr = a.role === 'manager';
                  return (
                    <div key={a.user_id} className="attendee-row" style={{ flexDirection: row as any, padding: '10px 0' }}>
                      <span style={{ color: 'var(--cream)', fontSize: 14 }}>{a.users?.full_name}</span>
                      {isCreator && (
                        <button 
                          className={`badge ${isMngr ? 'manager' : 'attendee'}`}
                          style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 }}
                          onClick={() => handleToggleManager(a.user_id, a.role)}
                        >
                          {isMngr ? (isRTL ? 'מנהל' : 'MANAGER') : (isRTL ? 'משתתף' : 'ATTENDEE')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
