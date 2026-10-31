import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/* Session-scoped scroll positions keyed by location.key so browser
   back/forward restores where the user was instead of jumping to top. */
const positions = new Map();

export default function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === 'POP') {
      const pos = positions.get(location.key);
      if (pos) {
        window.scrollTo({ left: pos.x, top: pos.y, behavior: 'instant' });
        return undefined;
      }
    }
    if (!location.hash) {
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
    return undefined;
  }, [location, navType]);

  useEffect(() => {
    const save = () => positions.set(location.key, { x: window.scrollX, y: window.scrollY });
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      save();
      window.removeEventListener('scroll', save);
    };
  }, [location.key]);

  return null;
}
