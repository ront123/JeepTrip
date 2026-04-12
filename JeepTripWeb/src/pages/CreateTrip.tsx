import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { createTrip } from '../lib/trips';
import './CreateTrip.css';

export default function CreateTrip() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('08:00');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [offRoadUrl, setOffRoadUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  const rtl = isRTL ? 'rtl' : '';
  const row = isRTL ? 'row-reverse' : 'row';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      setError(isRTL ? 'אנא מלא שם ומיקום' : 'Please fill in the title and location.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createTrip({
        title: title.trim(),
        location_area: location.trim(),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        is_hidden: isHidden,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        start_lat: startLat ? parseFloat(startLat) : null,
        start_lng: startLng ? parseFloat(startLng) : null,
        off_road_url: offRoadUrl || null,
        meeting_time: meetingTime || null,
      });
      navigate('/trips');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-trip-screen screen-container">
      {/* Header */}
      <div className={`screen-header ${rtl}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: row as any }}>
          <button className="back-btn" onClick={() => navigate('/trips')}>←</button>
          <div>
            <p className="header-sub">MISSION CONTROL</p>
            <h1 className="header-title" style={{ fontSize: 20 }}>{isRTL ? 'תכנון מסע חדש' : 'Plan New Trip'}</h1>
          </div>
        </div>
      </div>
      <div className="gold-line" />

      <div className="screen-content">
        <form className="create-trip-form" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'שם המסע' : 'Trip Title'}</label>
            <input
              className={`input ${rtl}`}
              placeholder={isRTL ? 'למשל: חוצי נגב 2026' : 'e.g. Negev Crossing 2026'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'יעד / אזור' : 'Destination / Area'}</label>
            <input
              className={`input ${rtl}`}
              placeholder={isRTL ? 'למשל: מכתש רמון' : 'e.g. Ramon Crater'}
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            />
          </div>

          {/* Dates */}
          <div className="form-row" style={{ flexDirection: row as any }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className={`form-label ${rtl}`}>{isRTL ? 'תאריך יציאה' : 'Start Date'}</label>
              <input
                type="date"
                className={`input ${rtl}`}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className={`form-label ${rtl}`}>{isRTL ? 'תאריך חזרה' : 'End Date'}</label>
              <input
                type="date"
                className={`input ${rtl}`}
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Meeting Time */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'שעת מפגש' : 'Meeting Time'}</label>
            <input
              type="time"
              className={`input ${rtl}`}
              value={meetingTime}
              onChange={e => setMeetingTime(e.target.value)}
            />
          </div>

          {/* Coordinates */}
          <div className="form-row" style={{ flexDirection: row as any }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className={`form-label ${rtl}`}>{isRTL ? 'קו רוחב (יעד)' : 'Destination Lat'}</label>
              <input
                className={`input ${rtl}`}
                placeholder="31.0461"
                value={lat}
                onChange={e => setLat(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className={`form-label ${rtl}`}>{isRTL ? 'קו אורך (יעד)' : 'Destination Lng'}</label>
              <input
                className={`input ${rtl}`}
                placeholder="34.8516"
                value={lng}
                onChange={e => setLng(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row" style={{ flexDirection: row as any }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className={`form-label ${rtl}`}>{isRTL ? 'קו רוחב (התחלה)' : 'Start Lat'}</label>
              <input
                className={`input ${rtl}`}
                placeholder="31.2530"
                value={startLat}
                onChange={e => setStartLat(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className={`form-label ${rtl}`}>{isRTL ? 'קו אורך (התחלה)' : 'Start Lng'}</label>
              <input
                className={`input ${rtl}`}
                placeholder="34.7915"
                value={startLng}
                onChange={e => setStartLng(e.target.value)}
              />
            </div>
          </div>

          {/* Max Participants */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'מכסת משתתפים' : 'Participant Limit'}</label>
            <input
              className={`input ${rtl}`}
              type="number"
              placeholder={isRTL ? 'השאר ריק ללא הגבלה' : 'Unlimited if empty'}
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
            />
          </div>

          {/* OffRoad URL */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'קישור למסלול (Offroad)' : 'Offroad Route Link'}</label>
            <input
              className={`input ${rtl}`}
              placeholder="https://..."
              value={offRoadUrl}
              onChange={e => setOffRoadUrl(e.target.value)}
            />
          </div>

          {/* Hidden toggle */}
          <div className="form-toggle-row" style={{ flexDirection: row as any }}>
            <div>
              <span className={`form-label ${rtl}`} style={{ marginBottom: 2 }}>{isRTL ? 'מסע מוסתר' : 'Hidden Trip'}</span>
              <p className="form-hint">{isRTL ? 'יוצג רק למי שיקבל הזמנה' : 'Only visible to invitees'}</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={isHidden} onChange={e => setIsHidden(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn-gold create-trip-submit" type="submit" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : (isRTL ? '🚀 שגר מסע' : '🚀 Launch Mission')}
          </button>
        </form>
      </div>
    </div>
  );
}
