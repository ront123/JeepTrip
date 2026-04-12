import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LangToggle } from '../components/LangToggle';
import { fetchPendingUsers, updateUserStatus } from '../lib/admin';
import type { UserProfile } from '../lib/admin';
import './Admin.css';

export default function Admin() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    try { const users = await fetchPendingUsers(); setPendingUsers(users); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin, load]);

  const handleAction = async (userId: string, action: 'approved' | 'rejected') => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, action);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const rtl = isRTL ? 'rtl' : '';
  const row = isRTL ? 'row-reverse' : 'row';

  return (
    <div className="admin-screen screen-container">
      <div className={`screen-header ${rtl}`}>
        <div>
          <p className="header-sub">{t('admin_title')}</p>
          <h1 className="header-title">{t('admin_subtitle')}</h1>
        </div>
        <LangToggle />
      </div>
      <div className="gold-line" />

      {loading ? (
        <div className="center-screen"><div className="spinner" /></div>
      ) : !isAdmin ? (
        <div className="center-screen">
          <span style={{ fontSize: 52, marginBottom: 20 }}>🚫</span>
          <p style={{ color: 'var(--rust-light)', textAlign: 'center', fontSize: 16 }}>{t('admin_unauthorized')}</p>
        </div>
      ) : (
        <div className="screen-content">
          <div className="admin-section-header">
            <p className="section-title">
              {t('pending_users')} <span style={{ color: 'var(--sand)', fontWeight: 400 }}>({pendingUsers.length})</span>
            </p>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="center-screen">
              <span style={{ fontSize: 52, marginBottom: 16 }}>🛡️</span>
              <p style={{ color: 'var(--sand)', fontSize: 15 }}>{t('no_pending_users')}</p>
            </div>
          ) : (
            <div className="admin-list">
              {pendingUsers.map(u => (
                <div key={u.id} className="admin-card card">
                  <div className="admin-card-header" style={{ flexDirection: row as any }}>
                    <div className="avatar" style={{ width: 50, height: 50, fontSize: 20 }}>
                      {u.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="admin-card-info">
                      <p className={`admin-card-name ${rtl}`}>{u.full_name}</p>
                      <p className={`admin-card-email ${rtl}`}>{u.email}</p>
                      <p className={`admin-card-car ${rtl}`}>🚙 {u.vehicle_details || 'No vehicle info'}</p>
                    </div>
                  </div>
                  <div className="admin-card-actions" style={{ flexDirection: row as any }}>
                    <button
                      className="btn btn-danger-outline"
                      style={{ flex: 1 }}
                      disabled={actionLoading === u.id}
                      onClick={() => handleAction(u.id, 'rejected')}
                    >
                      ✖ {t('btn_reject')}
                    </button>
                    <button
                      className="btn btn-olive"
                      style={{ flex: 1 }}
                      disabled={actionLoading === u.id}
                      onClick={() => handleAction(u.id, 'approved')}
                    >
                      {actionLoading === u.id ? <span className="spinner spinner-sm" /> : `✔ ${t('btn_approve')}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
