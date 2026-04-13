import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './Navbar.css';

export function Navbar() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const { pendingCount } = useNotifications();
  const isAdmin = profile?.role === 'admin';

  return (
    <nav className={`tab-bar ${isRTL ? 'rtl' : ''}`}>
      <NavLink to="/trips" className={({ isActive }) => `tab-bar-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon">🗺️</span>
        <span>{t('tab_trips')}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `tab-bar-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon">👤</span>
        <span>{t('tab_profile')}</span>
      </NavLink>
      <NavLink to="/help" className={({ isActive }) => `tab-bar-item${isActive ? ' active' : ''}`}>
        <span className="tab-icon">❓</span>
        <span>{t('tab_help')}</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `tab-bar-item${isActive ? ' active' : ''}`}>
          <span className="tab-icon">
            🎖️
            {pendingCount > 0 && <div className="nav-badge" />}
          </span>
          <span>{t('tab_admin')}</span>
        </NavLink>
      )}
    </nav>
  );
}
