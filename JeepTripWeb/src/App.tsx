import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import Login from './pages/Login';
import Pending from './pages/Pending';
import Trips from './pages/Trips';
import TripDashboard from './pages/TripDashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import JoinRoute from './pages/JoinRoute';

function AppRoutes() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell">
        <div className="center-screen" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚙</div>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="/join/:token" element={<JoinRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // Logged in but pending
  if (profile?.status === 'pending') {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="/join/:token" element={<JoinRoute />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="*" element={<Navigate to="/pending" replace />} />
        </Routes>
      </div>
    );
  }

  // Logged in and approved
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/join/:token" element={<JoinRoute />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:id" element={<TripDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Navigate to="/trips" replace />} />
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
      <Navbar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
