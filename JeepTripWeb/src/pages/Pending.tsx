import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createTrip } from '../lib/trips';
import './Pending.css';

export default function Pending() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { session, refreshProfile } = useAuth();
  
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBack = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleCreateTrip = async () => {
    if (!title || !date || !location) {
      setError(t('error_fill_all') || 'Please fill out all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Create the trip
      await createTrip({
        title,
        start_date: new Date(date).toISOString(),
        end_date: new Date(date).toISOString(),
        location_area: location,
        is_hidden: false,
        max_participants: 20,
        lat: null, lng: null, start_lat: null, start_lng: null,
        off_road_url: null, meeting_time: null
      });

      // 2. Mark user as approved to bypass pending block
      if (session?.user) {
        await supabase.from('users').update({ status: 'approved' }).eq('id', session.user.id);
        await refreshProfile();
      }
      
      navigate('/trips');
    } catch (e: any) {
      setError(e.message || 'Error creating trip');
      setLoading(false);
    }
  };

  return (
    <div className="pending-screen">
      <div className="pending-top-accent" />

      <div className="pending-badge">
        <div className="pending-badge-dot" />
        <span>{t('awaiting')}</span>
        <div className="pending-badge-dot" />
      </div>

      <div className="pending-icon">🛡️</div>

      <h1 className={`pending-title ${isRTL ? 'rtl' : ''}`}>
        {t('pending_title')}
      </h1>
      <p className={`pending-subtitle ${isRTL ? 'rtl' : ''}`}>{t('pending_subtitle')}</p>

      <div className="pending-steps">
        {[t('step1'), t('step2'), t('step3')].map((step, i) => (
          <div key={i} className={`pending-step ${isRTL ? 'rtl' : ''}`}>
            <div className="pending-step-num">{i + 1}</div>
            <p className="pending-step-text">{step}</p>
          </div>
        ))}
      </div>

      <div className="pending-info-box">
        <p className={`pending-info-text ${isRTL ? 'rtl' : ''}`}>{t('pending_info')}</p>
      </div>

      <button className="btn btn-outline" onClick={handleBack} style={{ marginTop: 20 }}>
        {t('back_to_login')}
      </button>

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--sand)', fontSize: 13, marginBottom: 12 }}>
          {isRTL ? 'רוצה לארגן מסע משלך במקום להמתין?' : 'Want to organize your own trip instead of waiting?'}
        </p>
        {!showCreate ? (
          <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
            {isRTL ? 'צור מסע חדש כמנהל' : 'Create New Trip as Manager'}
          </button>
        ) : (
          <div className="card" style={{ padding: 'var(--sp-md)', textAlign: 'left', marginTop: 12 }}>
            <h3 style={{ color: 'var(--cream)', marginBottom: 12 }}>{isRTL ? 'מסע חדש' : 'New Trip'}</h3>
            {error && <p className="error-text" style={{ marginBottom: 12, textAlign: 'center' }}>{error}</p>}
            <div className="input-group">
              <label className="label">{isRTL ? 'שם המסע' : 'Trip Title'}</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="label">{isRTL ? 'תאריך' : 'Date'}</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
            <div className="input-group">
              <label className="label">{isRTL ? 'אזור' : 'Location Area'}</label>
              <input className="input" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>{t('btn_cancel')}</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={handleCreateTrip} disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : (isRTL ? 'יצירה' : 'Create')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pending-bottom-accent" />
    </div>
  );
}
