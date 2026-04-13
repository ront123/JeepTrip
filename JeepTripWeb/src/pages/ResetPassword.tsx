import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import './ResetPassword.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      setError(t('error_fill_all'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwords_dont_match'));
      return;
    }
    if (password.length < 6) {
      setError(t('error_weak_password'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || t('error_unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-top-accent" />
      
      <div className="login-logo">
        <div className="login-emblem">🚙</div>
        <h1 className="login-app-name">JeepTrip</h1>
        <div className="login-divider" />
      </div>

      <div className={`login-header ${isRTL ? 'rtl' : ''}`}>
        <p className="login-header-line1">
           {isRTL ? 'שחזור סיסמה' : 'Reset Password'}
        </p>
      </div>

      <div className="login-form">
        {success ? (
          <div className="reset-success-box">
            <p className="login-success">{t('msg_password_reset_success')}</p>
            <button className="btn btn-gold" onClick={() => navigate('/login')}>
              {isRTL ? 'התחבר עכשיו' : 'Log In Now'}
            </button>
          </div>
        ) : (
          <>
            <label className={`form-label ${isRTL ? 'rtl' : ''}`}>{t('new_password')}</label>
            <input
              className={`input ${isRTL ? 'rtl' : ''}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <label className={`form-label ${isRTL ? 'rtl' : ''}`}>{t('confirm_password')}</label>
            <input
              className={`input ${isRTL ? 'rtl' : ''}`}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{ marginBottom: 20 }}
            />

            {error && <p className="login-error">{error}</p>}

            <button
              className="btn btn-gold"
              onClick={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? <span className="spinner spinner-sm" /> : t('btn_update_password')}
            </button>
          </>
        )}
      </div>

      <div className="login-bottom-accent" />
    </div>
  );
}
