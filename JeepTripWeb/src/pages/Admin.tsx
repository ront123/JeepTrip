import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LangToggle } from '../components/LangToggle';
import {
  isAdminEmail,
  fetchPendingUsers,
  updateUserStatus,
  fetchAdminStats,
  fetchAllTrips,
  fetchTripsPerUser,
} from '../lib/admin';
import type { UserProfile, AdminTrip, UserTripCount, AdminStats } from '../lib/admin';
import './Admin.css';

type Tab = 'overview' | 'trips' | 'users' | 'pending';

export default function Admin() {
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allTrips, setAllTrips] = useState<AdminTrip[]>([]);
  const [tripsPerUser, setTripsPerUser] = useState<UserTripCount[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = isAdminEmail(user?.email);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, trips, perUser, pending] = await Promise.all([
        fetchAdminStats(),
        fetchAllTrips(),
        fetchTripsPerUser(),
        fetchPendingUsers(),
      ]);
      setStats(statsData);
      setAllTrips(trips);
      setTripsPerUser(perUser);
      setPendingUsers(pending);
    } catch (e) {
      console.error('Admin data load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
    else setLoading(false);
  }, [isAdmin, loadAll]);

  const handleAction = async (userId: string, action: 'approved' | 'rejected') => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, action);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      if (stats) {
        setStats({
          ...stats,
          pendingUsers: stats.pendingUsers - 1,
          approvedUsers: action === 'approved' ? stats.approvedUsers + 1 : stats.approvedUsers,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return d; }
  };

  const filteredTrips = allTrips.filter(trip => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      trip.title.toLowerCase().includes(q) ||
      trip.location_area?.toLowerCase().includes(q) ||
      trip.creator_name?.toLowerCase().includes(q) ||
      trip.creator_email?.toLowerCase().includes(q)
    );
  });

  const rtl = isRTL ? 'rtl' : '';

  // ── Access Denied ──
  if (!isAdmin && !loading) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <span className="denied-icon">🚫</span>
          <h2>{isRTL ? 'גישה נדחתה' : 'Access Denied'}</h2>
          <p>{isRTL ? 'אזור זה מוגבל למנהלי מערכת בלבד.' : 'This area is restricted to system administrators.'}</p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading-state">
          <div className="admin-spinner" />
          <p>{isRTL ? 'טוען נתוני מערכת...' : 'Loading system data...'}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: 'overview', label: isRTL ? 'סקירה כללית' : 'Overview', icon: '📊' },
    { key: 'trips', label: isRTL ? 'כל הטיולים' : 'All Trips', icon: '🗺️', count: allTrips.length },
    { key: 'users', label: isRTL ? 'פעילות משתמשים' : 'User Activity', icon: '👥', count: tripsPerUser.length },
    { key: 'pending', label: isRTL ? 'ממתינים לאישור' : 'Pending', icon: '⏳', count: pendingUsers.length },
  ];

  return (
    <div className="admin-page screen-container">
      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div>
            <p className="admin-eyebrow">{isRTL ? 'מערכת ניהול' : 'COMMAND CENTER'}</p>
            <h1 className="admin-title">{isRTL ? 'מפקדה ראשית' : 'Admin HQ'}</h1>
          </div>
          <div className="admin-header-actions">
            <button className="admin-refresh-btn" onClick={loadAll} title="Refresh">↻</button>
            <LangToggle />
          </div>
        </div>
        <div className="admin-gold-line" />
      </header>

      {/* ── Tabs ── */}
      <nav className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="admin-content screen-content">
        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && stats && (
          <div className="admin-overview">
            <div className="stats-grid">
              <div className="stat-card stat-gold">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <p className="stat-value">{stats.totalUsers}</p>
                  <p className="stat-label">{isRTL ? 'סה״כ משתמשים' : 'Total Users'}</p>
                </div>
              </div>
              <div className="stat-card stat-green">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <p className="stat-value">{stats.approvedUsers}</p>
                  <p className="stat-label">{isRTL ? 'מאושרים' : 'Approved'}</p>
                </div>
              </div>
              <div className="stat-card stat-orange">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <p className="stat-value">{stats.pendingUsers}</p>
                  <p className="stat-label">{isRTL ? 'ממתינים' : 'Pending'}</p>
                </div>
              </div>
              <div className="stat-card stat-blue">
                <div className="stat-icon">🗺️</div>
                <div className="stat-info">
                  <p className="stat-value">{stats.totalTrips}</p>
                  <p className="stat-label">{isRTL ? 'סה״כ טיולים' : 'Total Trips'}</p>
                </div>
              </div>
              <div className="stat-card stat-teal">
                <div className="stat-icon">🟢</div>
                <div className="stat-info">
                  <p className="stat-value">{stats.activeTrips}</p>
                  <p className="stat-label">{isRTL ? 'טיולים פעילים' : 'Active Trips'}</p>
                </div>
              </div>
              <div className="stat-card stat-dim">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <p className="stat-value">{stats.archivedTrips}</p>
                  <p className="stat-label">{isRTL ? 'ארכיון' : 'Archived'}</p>
                </div>
              </div>
            </div>

            {/* Quick glance: top creators */}
            <div className="overview-section">
              <h3 className={`section-heading ${rtl}`}>
                🏆 {isRTL ? 'מובילי טיולים' : 'Top Trip Creators'}
              </h3>
              <div className="top-creators">
                {tripsPerUser.slice(0, 5).map((u, i) => (
                  <div key={u.user_id} className="creator-row">
                    <span className="creator-rank">#{i + 1}</span>
                    <div className="creator-avatar">{u.full_name?.charAt(0).toUpperCase() || '?'}</div>
                    <div className="creator-info">
                      <p className="creator-name">{u.full_name}</p>
                      <p className="creator-email">{u.email}</p>
                    </div>
                    <span className="creator-count">{u.trip_count} {isRTL ? 'טיולים' : 'trips'}</span>
                  </div>
                ))}
                {tripsPerUser.length === 0 && (
                  <p className="empty-msg">{isRTL ? 'אין נתונים עדיין' : 'No data yet'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ALL TRIPS TAB ═══ */}
        {activeTab === 'trips' && (
          <div className="admin-trips">
            <div className="trips-toolbar">
              <input
                type="text"
                placeholder={isRTL ? '🔍 חפש טיולים...' : '🔍 Search trips...'}
                className={`trips-search ${rtl}`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <span className="trips-count">
                {filteredTrips.length} / {allTrips.length}
              </span>
            </div>

            <div className="trips-table-wrap">
              <table className="trips-table">
                <thead>
                  <tr>
                    <th>{isRTL ? 'שם הטיול' : 'Trip Name'}</th>
                    <th>{isRTL ? 'יוצר' : 'Creator'}</th>
                    <th>{isRTL ? 'מיקום' : 'Location'}</th>
                    <th>{isRTL ? 'תאריך' : 'Date'}</th>
                    <th>{isRTL ? 'משתתפים' : 'Attendees'}</th>
                    <th>{isRTL ? 'סטטוס' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map(trip => {
                    const now = new Date().toISOString();
                    const isActive = !trip.is_archived && trip.end_date >= now;
                    return (
                      <tr key={trip.id}>
                        <td>
                          <div className="trip-name-cell">
                            {trip.is_hidden && <span className="hidden-badge">🔒</span>}
                            {trip.title}
                          </div>
                        </td>
                        <td>
                          <div className="creator-cell">
                            <span className="creator-cell-name">{trip.creator_name}</span>
                            <span className="creator-cell-email">{trip.creator_email}</span>
                          </div>
                        </td>
                        <td>{trip.location_area || '—'}</td>
                        <td className="date-cell">{formatDate(trip.start_date)}</td>
                        <td>
                          <span className="attendee-badge">{trip.attendee_count}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${isActive ? 'active' : 'past'}`}>
                            {isActive ? (isRTL ? 'פעיל' : 'Active') : (isRTL ? 'הסתיים' : 'Ended')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTrips.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-table">
                        {isRTL ? 'לא נמצאו טיולים' : 'No trips found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ USER ACTIVITY TAB ═══ */}
        {activeTab === 'users' && (
          <div className="admin-users-activity">
            <h3 className={`section-heading ${rtl}`}>
              📈 {isRTL ? 'טיולים לפי משתמש' : 'Trips per User'}
            </h3>
            <div className="user-activity-list">
              {tripsPerUser.map(u => (
                <div key={u.user_id} className="user-activity-card">
                  <div className="ua-avatar">{u.full_name?.charAt(0).toUpperCase() || '?'}</div>
                  <div className="ua-info">
                    <p className="ua-name">{u.full_name}</p>
                    <p className="ua-email">{u.email}</p>
                  </div>
                  <div className="ua-bar-wrap">
                    <div
                      className="ua-bar"
                      style={{
                        width: `${Math.min(100, (u.trip_count / Math.max(1, tripsPerUser[0]?.trip_count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="ua-count">{u.trip_count}</span>
                </div>
              ))}
              {tripsPerUser.length === 0 && (
                <p className="empty-msg">{isRTL ? 'אין נתונים עדיין' : 'No data yet'}</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ PENDING APPROVALS TAB ═══ */}
        {activeTab === 'pending' && (
          <div className="admin-pending">
            <h3 className={`section-heading ${rtl}`}>
              ⏳ {isRTL ? 'ממתינים לאישור' : 'Pending Approvals'} ({pendingUsers.length})
            </h3>
            {pendingUsers.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🛡️</span>
                <p>{isRTL ? 'אין משתמשים ממתינים לאישור' : 'No pending approvals'}</p>
              </div>
            ) : (
              <div className="pending-list">
                {pendingUsers.map(u => (
                  <div key={u.id} className="pending-card">
                    <div className="pending-header">
                      <div className="pending-avatar">{u.full_name?.charAt(0).toUpperCase() || '?'}</div>
                      <div className="pending-info">
                        <p className="pending-name">{u.full_name}</p>
                        <p className="pending-email">{u.email}</p>
                        <p className="pending-vehicle">🚙 {u.vehicle_details || 'N/A'}</p>
                        <p className="pending-date">
                          {isRTL ? 'נרשם: ' : 'Registered: '}{formatDate(u.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="pending-actions">
                      <button
                        className="action-btn reject"
                        disabled={actionLoading === u.id}
                        onClick={() => handleAction(u.id, 'rejected')}
                      >
                        ✖ {isRTL ? 'דחה' : 'Reject'}
                      </button>
                      <button
                        className="action-btn approve"
                        disabled={actionLoading === u.id}
                        onClick={() => handleAction(u.id, 'approved')}
                      >
                        {actionLoading === u.id ? '...' : `✔ ${isRTL ? 'אשר' : 'Approve'}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
