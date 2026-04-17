import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { Loader } from '@googlemaps/js-api-loader';
import { useLanguage } from '../context/LanguageContext';
import { createTrip } from '../lib/trips';
import './CreateTrip.css';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function CreateTrip() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
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
  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_KEY,
      version: 'weekly',
      libraries: ['places']
    });
    loader.load().then(() => setMapsLoaded(true)).catch(e => console.error('Error loading maps', e));
  }, []);

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

          {/* Destination Search */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'בחירת יעד להגעה (Google Maps)' : 'Destination / Area'}</label>
            <PlacesAutocomplete
              placeholder={isRTL ? 'חפש מקום...' : 'Search for a place...'}
              onSelect={(val, coords) => {
                setLocation(val);
                if (coords) {
                  setLat(coords.lat.toString());
                  setLng(coords.lng.toString());
                }
              }}
              className={`input ${rtl}`}
              isRTL={isRTL}
              initialValue={location}
              mapsLoaded={mapsLoaded}
            />
          </div>

          {/* Start Point Search */}
          <div className="form-group">
            <label className={`form-label ${rtl}`}>{isRTL ? 'בחירת נקודת התחלה' : 'Search Start Point'}</label>
            <PlacesAutocomplete
              placeholder={isRTL ? 'חפש נקודת מפגש...' : 'Search for meeting point...'}
              onSelect={(_, coords) => {
                if (coords) {
                  setStartLat(coords.lat.toString());
                  setStartLng(coords.lng.toString());
                }
              }}
              className={`input ${rtl}`}
              isRTL={isRTL}
              mapsLoaded={mapsLoaded}
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

interface PlacesAutocompleteProps {
  placeholder: string;
  onSelect: (address: string, coords: { lat: number; lng: number } | null) => void;
  className: string;
  isRTL: boolean;
  initialValue?: string;
  mapsLoaded: boolean;
}

function PlacesAutocomplete({ placeholder, onSelect, className, isRTL, initialValue = '', mapsLoaded }: PlacesAutocompleteProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'il' },
    },
    debounce: 300,
  });

  const [displayValue, setDisplayValue] = useState(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialValue) setDisplayValue(initialValue);
  }, [initialValue]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    setValue(e.target.value);
  };

  const handleSelect = ({ description }: any) => () => {
    setDisplayValue(description);
    setValue(description, false);
    clearSuggestions();

    getGeocode({ address: description })
      .then((results) => getLatLng(results[0]))
      .then(({ lat, lng }) => {
        onSelect(description, { lat, lng });
      })
      .catch((error) => {
        console.error('Error: ', error);
        onSelect(description, null);
      });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        clearSuggestions();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSuggestions]);

  if (!mapsLoaded) return <input className={className} placeholder="Loading maps..." disabled />;

  return (
    <div className="autocomplete-container" ref={containerRef}>
      <input
        value={displayValue}
        onChange={handleInput}
        disabled={!ready}
        placeholder={placeholder}
        className={className}
      />
      {status === 'OK' && (
        <ul className={`autocomplete-dropdown ${isRTL ? 'rtl' : ''}`}>
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li key={place_id} onClick={handleSelect(suggestion)} className="autocomplete-item">
                <span className="suggestion-main">{main_text}</span>{' '}
                <small className="suggestion-secondary">{secondary_text}</small>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
