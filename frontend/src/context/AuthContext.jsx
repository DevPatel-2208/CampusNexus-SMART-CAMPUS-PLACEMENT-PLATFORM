import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { getAccessToken, refreshSession, setAccessToken } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const USER_STORAGE_KEY = 'cc_user';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => !getStoredUser() && !getAccessToken());
  // Set while a post-login welcome dialog is in flight so PublicOnly does not
  // auto-redirect to the dashboard before the welcome flow completes.
  const [postLogin, setPostLogin] = useState(false);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);
    try {
      if (nextUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
      return data.data;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, [setUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = getAccessToken() || await refreshSession();
        if (token) {
          const fresh = await fetchMe();
          if (!fresh && mounted) {
            setUser(null);
            setAccessToken(null);
          }
        } else if (mounted) {
          setUser(null);
          setAccessToken(null);
        }
      } catch {
        /* no session */
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const onLogout = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('cc:logout', onLogout);
    return () => {
      mounted = false;
      window.removeEventListener('cc:logout', onLogout);
    };
  }, [fetchMe, setUser]);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    setAccessToken(data.data.accessToken);
    // Do NOT setUser here: the welcome dialog must complete before the profile
    // is visible and navigation occurs (handled by the caller via handleLoginSuccess).
    return data.data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe: fetchMe, setUser, postLogin, setPostLogin }}>
      {children}
    </AuthContext.Provider>
  );
}
