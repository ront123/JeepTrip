import { memo } from 'react';

interface DashNavigationProps {
  trip: any;
  isRTL: boolean;
  t: (key: any) => string;
  GOOGLE_MAPS_KEY: string;
  openWaze: (target: 'start' | 'dest') => void;
  openGoogleMaps: (target: 'start' | 'dest') => void;
}

export const DashNavigation = memo(({
  trip,
  isRTL,
  t,
  GOOGLE_MAPS_KEY,
  openWaze,
  openGoogleMaps
}: DashNavigationProps) => {
  const hasCoords = trip.lat && trip.lng;
  const mapQuery = hasCoords ? `${trip.lat},${trip.lng}` : encodeURIComponent(trip.location_area || '');
  const showMap = hasCoords || trip.location_area;
  const row = isRTL ? 'row-reverse' : 'row';

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
});
