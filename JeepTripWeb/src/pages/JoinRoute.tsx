import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { joinGroupByToken } from '../lib/groups';
import { supabase } from '../lib/supabase';

export default function JoinRoute() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();

  useEffect(() => {
    async function processInvite() {
      if (!token) {
        navigate('/');
        return;
      }

      if (!session) {
        // Unauthenticated -> Cache token and go to logic
        sessionStorage.setItem('inviteToken', token);
        navigate('/login');
        return;
      }

      // Authenticated users process token
      try {
        await joinGroupByToken(token);
        // Ensure user is not stuck in pending
        if (profile?.status === 'pending') {
          await supabase.from('users').update({ status: 'approved' }).eq('id', session.user.id);
          await refreshProfile();
        }
      } catch (e) {
        console.error('Error joining group:', e);
      } finally {
        sessionStorage.removeItem('inviteToken');
        navigate('/trips');
      }
    }

    processInvite();
  }, [token, session, profile, navigate, refreshProfile]);

  return (
    <div className="center-screen" style={{ flex: 1 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🚙</div>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: 16, color: 'var(--gold)' }}>Processing invite...</p>
      </div>
    </div>
  );
}
