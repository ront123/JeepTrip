import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './Profile.css';

export default function Profile() {
  const { isRTL } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editVehicle, setEditVehicle] = useState(profile?.vehicle_details || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditName(profile?.full_name || '');
    setEditVehicle(profile?.vehicle_details || '');
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('users').update({
        full_name: editName, vehicle_details: editVehicle,
      }).eq('id', user.id);
      if (err) throw err;
      await refreshProfile();
      setIsEditing(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const rtl = isRTL ? 'rtl' : '';
  const initial = profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'J';

  return (
    <div className="profile-screen screen-container">
      <div className={`screen-header ${rtl}`}>
        <div style={{ flex: 1 }}>
          <p className="header-sub">{isRTL ? 'נהג שטח' : 'OPERATOR'}</p>
          <h1 className="header-title">{isRTL ? 'הפרופיל שלי' : 'Profile'}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isEditing
            ? <button className="edit-btn" onClick={() => setIsEditing(true)}>{isRTL ? 'עריכה' : 'Edit'}</button>
            : <button className="edit-btn cancel" onClick={() => setIsEditing(false)}>{isRTL ? 'ביטול' : 'Cancel'}</button>
          }
        </div>
      </div>
      <div className="gold-line" />

      <div className="profile-content screen-content">
        <div className="profile-avatar">
          <span className="profile-avatar-letter">{initial}</span>
        </div>

        {isEditing ? (
          <div className="edit-form">
            <label className={`form-label ${rtl}`}>{isRTL ? 'שם מלא' : 'FULL NAME'}</label>
            <input className={`input ${rtl}`} value={editName} onChange={e => setEditName(e.target.value)} style={{ marginBottom: 16 }} />
            <label className={`form-label ${rtl}`}>{isRTL ? 'פרטי רכב שטח' : 'VEHICLE DETAILS'}</label>
            <input className={`input ${rtl}`} value={editVehicle} onChange={e => setEditVehicle(e.target.value)} style={{ marginBottom: 16 }} />
            {error && <p style={{ color: 'var(--rust-light)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
            <button className="btn btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : (isRTL ? 'שמור שינויים' : 'Save Changes')}
            </button>
          </div>
        ) : (
          <>
            <h2 className={`profile-name ${rtl}`}>{profile?.full_name || '—'}</h2>
            <p className={`profile-email ${rtl}`}>{user?.email}</p>

            <div className="card profile-card">
              <p className={`form-label ${rtl}`}>{isRTL ? 'רכב שטח' : 'VEHICLE'}</p>
              <p className={`profile-value ${rtl}`}>🚙 {profile?.vehicle_details || (isRTL ? 'לא צוין' : 'N/A')}</p>
            </div>

            <div className="card profile-card">
              <p className={`form-label ${rtl}`}>{isRTL ? 'תפקיד' : 'ROLE'}</p>
              <p className={`profile-value ${rtl}`}>
                🛡️ {isRTL && profile?.role === 'admin' ? 'מנהל' : profile?.role?.toUpperCase() || '—'}
              </p>
            </div>

            <div className="card profile-card">
              <p className={`form-label ${rtl}`}>{isRTL ? 'סטטוס' : 'STATUS'}</p>
              <p className={`profile-value ${rtl}`} style={{ color: profile?.status === 'approved' ? 'var(--olive-light)' : 'var(--gold)' }}>
                {profile?.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
              </p>
            </div>
          </>
        )}

        <button className="btn btn-danger-outline" style={{ marginTop: 'var(--sp-2xl)' }} onClick={handleLogout}>
          {isRTL ? 'התנתק מהמערכת' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
