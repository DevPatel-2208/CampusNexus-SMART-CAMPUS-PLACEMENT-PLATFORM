import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useUnread(pollMs = 30000) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    try { const { data } = await api.get('/notifications/unread-count'); setUnread(data.data.unread); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!user) { setUnread(0); return undefined; }
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs, user]);
  return unread;
}

/**
 * Fetch helper.
 * - `loading` is true only until the first response arrives.
 * - With `{ keepPrevious: true }`, subsequent reloads expose `refreshing`
 *   instead of unmounting the current data (no skeleton flash while typing).
 */
export function useFetch(fn, deps = [], opts = {}) {
  const { keepPrevious = false } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const settled = useRef(false);
  const load = useCallback(async () => {
    if (keepPrevious && settled.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try { setData(await fn()); settled.current = true; } catch (e) { setError(e); } finally { setLoading(false); setRefreshing(false); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refreshing, error, reload: load, setData };
}

/** Returns `value` after it has stopped changing for `delay` ms (search inputs). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
