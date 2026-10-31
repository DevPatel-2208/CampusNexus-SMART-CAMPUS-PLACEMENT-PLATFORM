import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { refreshSession, setAccessToken } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Set while a post-login welcome dialog is in flight so PublicOnly does not
  // auto-redirect to the dashboard before the welcome flow completes.
  const [postLogin, setPostLogin] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
      return data.data;
    } catch { setUser(null); setAccessToken(null); return null; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await refreshSession();
        if (token) await fetchMe();
      } catch { /* no session */ }
      setLoading(false);
    })();
    const onLogout = () => { setUser(null); setAccessToken(null); };
    window.addEventListener('cc:logout', onLogout);
    return () => window.removeEventListener('cc:logout', onLogout);
  }, [fetchMe]);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    setAccessToken(data.data.accessToken);
    // Do NOT setUser here: the welcome dialog must complete before the profile
    // is visible and navigation occurs (handled by the caller via handleLoginSuccess).
    return data.data;
  };
  const logout = async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    setUser(null); setAccessToken(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshMe: fetchMe, setUser, postLogin, setPostLogin }}>{children}</AuthContext.Provider>;
}
