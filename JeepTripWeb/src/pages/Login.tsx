import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { refreshProfile } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showingForgot, setShowingForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  useEffect(() => {
    // Check for errors in the URL (from OAuth redirects)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorMsg = params.get('error_description') || hashParams.get('error_description') || 
                     params.get('error') || hashParams.get('error');
    if (errorMsg) {
       setError(decodeURIComponent(errorMsg).replace(/\+/g, ' '));
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError(t('error_fill_all')); return; }
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(t('error_invalid_credentials')); return; }
      if (!data.user) return;

      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle();
      
      if (!profile) { setError(t('error_profile_not_found')); return; }
      if (profile.status === 'rejected') { setError(t('error_rejected')); return; }
      if (profile.status === 'pending') { navigate('/pending'); return; }
      
      // Process any cached invite token
      const inviteToken = sessionStorage.getItem('inviteToken');
      if (inviteToken) {
        navigate(`/join/${inviteToken}`);
        return;
      }
      
      await refreshProfile();
      navigate('/trips');
    } catch { setError(t('error_unknown')); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName || !vehicle) { setError(t('error_fill_all')); return; }
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, vehicle_details: vehicle } },
      });
      if (authError) {
        if (authError.message.includes('already')) setError(t('error_email_taken'));
        else if (authError.message.includes('password')) setError(t('error_weak_password'));
        else setError(t('error_unknown'));
        return;
      }
      // Process cached invite token if successful registration
      if (data.user) {
        const inviteToken = sessionStorage.getItem('inviteToken');
        if (inviteToken) {
          navigate(`/join/${inviteToken}`);
          return;
        }
        navigate('/pending');
      }
    } catch { setError(t('error_unknown')); }
    finally { setLoading(false); }
  };

    }
  };

  const handleResetRequest = async () => {
    if (!email) { setError(t('error_fill_all')); return; }
    setLoading(true); setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || t('error_unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Top gold accent */}
      <div className="login-top-accent" />

      {/* Logo */}
      <div className="login-logo">
        <div className="login-emblem">🚙</div>
        <h1 className="login-app-name">JeepTrip</h1>
        <div className="login-divider" />
      </div>

      {/* Header */}
      <div className={`login-header ${isRTL ? 'rtl' : ''}`}>
        <p className="login-header-line1">
          {tab === 'login' ? (isRTL ? 'ברוכים הבאים' : 'Welcome') : (isRTL ? 'הצטרפות לצוות' : 'Join the Crew')}
        </p>
      </div>

      {/* Tabs */}
      <div className="login-tabs">
        <button className={`login-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
          {t('tab_login')}
        </button>
        <button className={`login-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
          {t('tab_register')}
        </button>
      </div>

      {/* Form */}
      <div className="login-form">
        {tab === 'register' && (
          <>
            <label className={`form-label ${isRTL ? 'rtl' : ''}`}>{t('label_full_name')}</label>
            <input
              id="login-fullname"
              className={`input ${isRTL ? 'rtl' : ''}`}
              placeholder={t('placeholder_full_name')}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <label className={`form-label ${isRTL ? 'rtl' : ''}`}>{t('label_car')}</label>
            <input
              id="login-vehicle"
              className={`input ${isRTL ? 'rtl' : ''}`}
              placeholder={t('placeholder_car')}
              value={vehicle}
              onChange={e => setVehicle(e.target.value)}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

        <label className={`form-label ${isRTL ? 'rtl' : ''}`}>{t('label_email')}</label>
        <input
          id="login-email"
          className={`input ${isRTL ? 'rtl' : ''}`}
          type="email"
          placeholder={t('placeholder_email')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ marginBottom: 12 }}
          onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
        />

        <label className={`form-label ${isRTL ? 'rtl' : ''}`}>{t('label_password')}</label>
        <input
          id="login-password"
          className={`input ${isRTL ? 'rtl' : ''}`}
          type="password"
          placeholder={t('placeholder_password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginBottom: 20 }}
          onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
        />

        {error && <p className="login-error">{error}</p>}
        {resetSent && <p className="login-success" style={{ color: 'var(--olive-light)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{t('reset_link_sent')}</p>}

        {showingForgot ? (
          <>
            <button
              className="btn btn-gold"
              onClick={handleResetRequest}
              disabled={loading}
              style={{ marginBottom: 12 }}
            >
              {loading ? <span className="spinner spinner-sm" /> : t('btn_send_reset')}
            </button>
            <div className="login-switch-mode" onClick={() => { setShowingForgot(false); setResetSent(false); setError(''); }}>
              {isRTL ? 'חזרה להתחברות' : 'Back to Login'}
            </div>
          </>
        ) : (
          <>
            <button
              id="login-submit"
              className="btn btn-gold"
              onClick={tab === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? <span className="spinner spinner-sm" /> : (tab === 'login' ? t('cta_enter') : t('cta_request'))}
            </button>

            {tab === 'login' && (
              <div 
                className="login-forgot-link" 
                onClick={() => { setShowingForgot(true); setError(''); }}
              >
                {t('forgot_password')}
              </div>
            )}

            <div className="login-or-row">
              <div className="login-or-line" />
              <span className="login-or-text">{t('or')}</span>
              <div className="login-or-line" />
            </div>

            <button
              className="btn btn-outline"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              style={{ marginBottom: 12, borderColor: '#3A3A32', background: 'var(--charcoal-light)' }}
            >
              {t('google_login')}
            </button>
            
            <div className="login-switch-mode" onClick={() => setTab(tab === 'login' ? 'register' : 'login')}>
              {tab === 'login' 
                ? (isRTL ? 'אין לך חשבון? הירשם כאן' : "Don't have an account? Register here")
                : (isRTL ? 'כבר יש לך חשבון? התחבר' : "Already have an account? Log in")}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <p className={`login-footer ${isRTL ? 'rtl' : ''}`}>{t('footer_access')}</p>

      {/* Bottom accent */}
      <div className="login-bottom-accent" />
    </div>
  );
}
