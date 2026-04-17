import { memo } from 'react';

interface DashOverviewProps {
  trip: any;
  isRTL: boolean;
  t: (key: any) => string;
  canManage: boolean;
  myRsvp: string | undefined;
  handleRsvp: (status: 'attending' | 'maybe' | 'not_attending') => void;
  setShowSettings: (show: boolean) => void;
  setShowInvite: (show: boolean) => void;
  addToGoogleCalendar: () => void;
  formatDate: (d: string) => string;
}

export const DashOverview = memo(({
  trip,
  isRTL,
  t,
  canManage,
  myRsvp,
  handleRsvp,
  setShowSettings,
  setShowInvite,
  addToGoogleCalendar,
  formatDate
}: DashOverviewProps) => {
  const rtl = isRTL ? 'rtl' : '';
  const row = isRTL ? 'row-reverse' : 'row';
  const inviteToken = trip?.trip_groups?.[0]?.groups?.invite_token;

  return (
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
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSettings(true)}>
            ⚙️ {isRTL ? 'הגדרות' : 'Settings'}
          </button>
          {!trip.is_archived && inviteToken && (
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
});
