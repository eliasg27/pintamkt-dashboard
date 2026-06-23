import { createContext, useContext, useEffect, useState } from 'react';
import { sb } from '../lib/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_ev, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid) {
    const { data } = await sb.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
    setLoading(false);
  }

  async function updateProfile(updates) {
    const { data } = await sb
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return data;
  }

  async function signOut() {
    await sb.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthCtx.Provider value={{ session, profile, loading, signOut, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
