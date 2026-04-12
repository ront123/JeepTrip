import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from '../components/Modal';
import { fetchMyTrips } from '../lib/trips';
import type { Trip } from '../lib/trips';
import { joinGroupByToken } from '../lib/groups';
import './Trips.css';

function formatDateRange(start: string, end: string, isRTL = false) {
  const s = new Date(start); const e = new Date(end);
  const month = s.toLocaleString(isRTL ? 'he-IL' : 'en-US', { month: 'long' });
  return `${s.getDate()}–${e.getDate()} ${month} ${s.getFullYear()}`;
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function TripCard({ trip, isRTL }: { trip: Trip & { trip_attendees?: any[] }; isRTL: boolean }) {
  const navigate = useNavigate();
  const days = daysUntil(trip.start_date);
  const isClose = days <= 7;
  const attending = (trip.trip_attendees || []).filter((a: any) => a.status === 'attending').length;
  const maybe = (trip.trip_attendees || []).filter((a: any) => a.status === 'maybe').length;

  return (
    <div className="trip-card slide-up" onClick={() => navigate(`/trips/${trip.id}`)}>
      <div className={`trip-card-accent ${isClose ? 'urgent' : ''}`} />
      <div className={`trip-card-body ${isRTL ? 'rtl' : ''}`}>
        <div className="trip-card-info">
          <h3 className={`trip-card-title ${isRTL ? 'text-right' : ''}`}>{trip.title}</h3>
          <div className={`trip-meta-row ${isRTL ? 'rtl' : ''}`}>
            <span>📍</span>
            <span className="trip-meta-text">{trip.location_area || '—'}</span>
          </div>
          <div className={`trip-meta-row ${isRTL ? 'rtl' : ''}`}>
            <span>📅</span>
            <span className="trip-meta-text">{formatDateRange(trip.start_date, trip.end_date, isRTL)}</span>
          </div>
        </div>
        <div className={`trip-countdown ${isClose ? 'urgent' : ''}`}>
          <span className="trip-countdown-num">{days}</span>
          <span className="trip-countdown-label">{isRTL ? 'ימים' : 'days'}</span>
        </div>
      </div>
      {(attending > 0 || maybe > 0) && (
        <div className={`trip-attendees ${isRTL ? 'rtl' : ''}`}>
          <span>✅</span>
          <span className="trip-attendees-text">{attending}{isRTL ? ' מגיעים' : ' attending'}</span>
          <span>❓</span>
          <span className="trip-attendees-text">{maybe}{isRTL ? ' מתלבטים' : ' maybe'}</span>
        </div>
      )}
    </div>
  );
}

export default function Trips() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const load = useCallback(async (forceRefresh = false) => {
    try {
      setError('');
      const data = await fetchMyTrips(forceRefresh);
      setTrips(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitJoinCode = async () => {
    if (!joinCode.trim()) return;
    setJoining(true); setJoinError(''); setJoinSuccess('');
    let token = joinCode.trim();
    if (token.includes('/')) { const parts = token.split('/'); token = parts[parts.length - 1].trim(); }
    if (token.length > 20) { const m = token.match(/[A-Za-z0-9-]{6,12}/); if (m) token = m[0]; }
    try {
      const group = await joinGroupByToken(token);
      setJoinSuccess(isRTL ? `הצטרפת למסע "${group.name}"!` : `You've joined the mission "${group.name}"!`);
      setJoinCode('');
      load(true);
    } catch (e: any) {
      setJoinError(isRTL ? 'קוד הצטרפות שגוי או שכבר הצטרפת.' : 'Invalid invite code or already joined.');
    } finally { setJoining(false); }
  };

  return (
    <div className="trips-screen screen-container">
      {/* Header */}
      <div className={`screen-header ${isRTL ? 'rtl' : ''}`}>
        <div>
          <p className="header-sub">{isRTL ? 'המסע הבא שלך' : 'YOUR NEXT ADVENTURE'}</p>
          <h1 className="header-title">{isRTL ? 'הטיולים שלי' : 'My Trips'}</h1>
        </div>
      </div>
      <div className="gold-line" />

      {/* Content */}
      <div className="screen-content">
        {/* Join Mission button */}
        <div style={{ padding: '16px 16px 0' }}>
          <button className="join-mission-btn" onClick={() => { setShowJoinModal(true); setJoinError(''); setJoinSuccess(''); }}>
            🎟️ {isRTL ? 'הצטרפות למסע עם קוד' : 'Join Mission with Code'}
          </button>
        </div>

        {loading ? (
          <div className="center-screen"><div className="spinner" /></div>
        ) : error ? (
          <div className="center-screen">
            <p style={{ color: 'var(--rust-light)', marginBottom: 16 }}>⚠ {error}</p>
            <button className="btn btn-olive" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => load(true)}>
              {isRTL ? 'נסה שוב' : 'Retry'}
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="center-screen" style={{ marginTop: 40 }}>
            <span style={{ fontSize: 56, marginBottom: 16 }}>🗺️</span>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>
              {isRTL ? 'אין טיולים מתוכננים' : 'No trips planned yet'}
            </p>
            <p style={{ fontSize: 14, color: 'var(--mud)', textAlign: 'center' }}>
              {isRTL ? 'מנהל הקבוצה יוסיף את הטיול הבא' : 'Your group admin will add the next trip'}
            </p>
          </div>
        ) : (
          <div className="trips-list">
            {trips.map(trip => <TripCard key={trip.id} trip={trip as any} isRTL={isRTL} />)}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/create-trip')} title={isRTL ? 'צור מסע חדש' : 'Create new trip'}>
        <span>+</span>
      </button>

      {/* Join Modal */}
      <Modal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title={isRTL ? 'הצטרפות למשימה' : 'Join Mission'}
        subtitle={isRTL ? 'הדבק את הקוד שקיבלת מהמארגן:' : 'Paste the code you received from the organizer:'}
      >
        <input
          id="join-code-input"
          className={`input ${isRTL ? 'rtl' : ''}`}
          placeholder={isRTL ? 'קוד או לינק...' : 'Code or link...'}
          value={joinCode}
          onChange={e => setJoinCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitJoinCode()}
          autoFocus
          style={{ marginBottom: 8 }}
        />
        {joinError && <p style={{ color: 'var(--rust-light)', fontSize: 13, marginBottom: 8 }}>{joinError}</p>}
        {joinSuccess && <p style={{ color: 'var(--olive-light)', fontSize: 13, marginBottom: 8 }}>{joinSuccess}</p>}
        <div className={`modal-actions ${isRTL ? 'rtl' : ''}`}>
          <button className="btn btn-outline" onClick={() => setShowJoinModal(false)}>{t('btn_cancel')}</button>
          <button className="btn btn-gold" onClick={submitJoinCode} disabled={joining || !joinCode.trim()}>
            {joining ? <span className="spinner spinner-sm" /> : (isRTL ? 'הצטרף עכשיו' : 'Join Now')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
