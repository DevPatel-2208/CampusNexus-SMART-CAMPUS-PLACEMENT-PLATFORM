import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, Briefcase, ChevronDown, ChevronRight, Home as HomeIcon,
  Info, LogOut, Mail, Menu, Moon, Sparkles, Sun, UserCircle2, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUnread } from '../../hooks/useUnread';
import api from '../../services/api';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/about', label: 'About', icon: Info },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/contact', label: 'Contact', icon: Mail },
];

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(then).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function PublicHeader() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnread();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef(null);
  const navRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 4 } });
      setNotifs(data.data || []);
    } catch { /* ignore */ } finally { setNotifsLoading(false); }
  }, []);

  const openNotifs = () => {
    setProfileOpen(false);
    setNotifOpen((v) => {
      const next = !v;
      if (next) loadNotifs();
      return next;
    });
  };

  const openProfile = () => {
    setNotifOpen(false);
    setDrawerOpen(false);
    setProfileOpen((v) => !v);
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (drawerOpen && drawerRef.current && !drawerRef.current.contains(e.target) && !navRef.current?.contains(e.target)) {
        setDrawerOpen(false);
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onEsc = () => { setDrawerOpen(false); setNotifOpen(false); setProfileOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [drawerOpen, notifOpen, profileOpen]);

  const closeAll = () => { setDrawerOpen(false); setNotifOpen(false); setProfileOpen(false); };

  const signOut = async () => {
    closeAll();
    await logout();
    navigate('/');
  };

  const home = user ? ((r) => (r === 'student' ? '/student' : r === 'company' ? '/company' : '/tpo'))(user.role) : '/';
  const notifUrl = user ? `/${user.role}/notifications` : '/';
  const initials = String(user?.name || '?').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';

  const toggleTheme = () => {
    toggle();
  };

  const notificationsMenu = () => (
    <div className="cc-nav-bell-wrap" ref={notifRef}>
      <button
        type="button"
        className="cc-nav-btn cc-nav-btn-icon cc-nav-bell"
        onClick={openNotifs}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={notifOpen}
        title="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && <span className="cc-nav-bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      <AnimatePresence>
        {notifOpen && (
          <motion.div
            className="cc-notif-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
          >
            <div className="cc-notif-dd-head">
              <span className="fw-semibold">Notifications</span>
              {unread > 0 && <span className="cc-notif-dd-count">{unread} New</span>}
            </div>
            {notifsLoading ? (
              <div className="cc-notif-dd-empty">Loading notifications...</div>
            ) : notifs.length ? (
              notifs.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  className={`cc-notif-dd-item${n.isRead ? '' : ' is-unread'}`}
                  onClick={() => { closeAll(); navigate(notifUrl); }}
                >
                  <b className="d-block">{n.title}</b>
                  <small className="text-muted">{timeAgo(n.createdAt)}</small>
                </button>
              ))
            ) : (
              <div className="cc-notif-dd-empty">You're all caught up!</div>
            )}
            <button type="button" className="cc-notif-dd-foot" onClick={() => { closeAll(); navigate(notifUrl); }}>
              View All Notifications &rarr;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const desktopActions = () => {
    if (!user) {
      return (
        <div className="d-flex align-items-center gap-2">
          <Link to="/login" className="cc-nav-btn cc-nav-btn-outline">Sign in</Link>
          <Link to="/register" className="cc-nav-btn cc-nav-btn-primary">
            <Sparkles size={14} className="me-1" />
            <span>Register</span>
          </Link>
          <button
            type="button"
            className="cc-nav-btn cc-nav-btn-icon cc-theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} className="cc-theme-sun" /> : <Moon size={17} className="cc-theme-moon" />}
          </button>
        </div>
      );
    }
    return (
      <div className="d-flex align-items-center gap-2">
        <Link to={home} className="cc-nav-btn cc-nav-btn-outline" onClick={closeAll}>
          <Briefcase size={15} className="cc-btn-icon" /> Dashboard
        </Link>
        {notificationsMenu()}
        <div className="cc-nav-user-wrap" ref={profileRef}>
          <button
            type="button"
            className="cc-nav-btn cc-nav-btn-outline cc-profile-trigger"
            onClick={openProfile}
            aria-label="Account menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            title="Account menu"
          >
            <span className="cc-nav-avatar-mini">{initials}</span>
            <span className="cc-nav-user-name">{user.name}</span>
            <ChevronDown size={14} className={`cc-nav-user-chevron${profileOpen ? ' is-open' : ''}`} />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                className="cc-nav-user-menu"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.16 }}
              >
                <div className="cc-nav-menu-head">
                  <span className="cc-nav-avatar">{initials}</span>
                  <div>
                    <b className="cc-nav-menu-name">{user.name}</b>
                    <span className="cc-nav-menu-role">{user.role?.toUpperCase()}</span>
                    <span className="cc-nav-menu-email">{user.email}</span>
                  </div>
                </div>
                <div className="cc-nav-menu-body">
                  <button type="button" className="cc-nav-menu-item" onClick={() => { closeAll(); navigate(home); }}>
                    <Briefcase size={15} className="cc-btn-icon text-primary" /> Dashboard
                  </button>
                  <button type="button" className="cc-nav-menu-item cc-nav-menu-item-danger" onClick={signOut}>
                    <LogOut size={15} className="cc-btn-icon" /> Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          className="cc-nav-btn cc-nav-btn-icon cc-theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={17} className="cc-theme-sun" /> : <Moon size={17} className="cc-theme-moon" />}
        </button>
      </div>
    );
  };

  return (
    <>
      <header className={`cc-public-header${scrolled ? ' is-scrolled' : ''}`} ref={navRef}>
        <div className="cc-header-inner">
          {/* Brand Logo (Left Section) */}
          <div className="cc-header-left">
            <Link to="/" className="cc-brand" aria-label="CareerConnect home" onClick={closeAll}>
              <span className="cc-brand-mark">
                <span className="cc-brand-letter">C</span>
              </span>
              <span className="cc-brand-name">
                Career<span>Connect</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation (Center Section) */}
          <nav className="cc-header-center cc-nav-desktop" aria-label="Primary navigation">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `cc-nav-link${isActive ? ' cc-nav-link-active' : ''}`}
                  onClick={closeAll}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="publicNavActivePill"
                          className="cc-nav-active-pill"
                          transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                        />
                      )}
                      {Icon && <Icon size={15} className="cc-nav-icon" aria-hidden="true" />}
                      <span className="cc-nav-label">{link.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop Actions (Right Section) */}
          <div className="cc-header-right cc-desktop-actions">{desktopActions()}</div>

          {/* Mobile Actions Bar (Only rendered on screens < 992px) */}
          <div className="cc-mobile-actions">
            <button
              type="button"
              className="cc-nav-btn cc-nav-btn-icon cc-theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={17} className="cc-theme-sun" /> : <Moon size={17} className="cc-theme-moon" />}
            </button>

            {user && (
              <Link to={notifUrl} className="cc-nav-btn cc-nav-btn-icon cc-nav-bell position-relative" aria-label="Notifications" title="Notifications">
                <Bell size={17} />
                {unread > 0 && <span className="cc-nav-bell-badge">{unread > 9 ? '9+' : unread}</span>}
              </Link>
            )}

            <button
              type="button"
              className="cc-menu-toggle"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
              aria-haspopup="menu"
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Responsive Slide-over Menu) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="cc-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.nav
              ref={drawerRef}
              className="cc-drawer"
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Mobile navigation"
            >
              <div className="cc-drawer-head">
                <Link to="/" className="cc-brand" onClick={closeAll}>
                  <span className="cc-brand-mark">
                    <span className="cc-brand-letter">C</span>
                  </span>
                  <span className="cc-brand-name">
                    Career<span>Connect</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="cc-drawer-close"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Logged in User Card inside Drawer */}
              {user && (
                <div className="cc-drawer-user-box mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <span className="cc-nav-avatar">{initials}</span>
                    <div className="min-w-0 flex-1">
                      <b className="d-block text-truncate fw-bold">{user.name}</b>
                      <span className="cc-nav-menu-role">{user.role?.toUpperCase()}</span>
                      <small className="text-muted d-block text-truncate">{user.email}</small>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="cc-drawer-nav">
                {NAV_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) => `cc-drawer-link${isActive ? ' cc-drawer-link-active' : ''}`}
                      onClick={closeAll}
                    >
                      <div className="d-flex align-items-center gap-3">
                        {Icon && <Icon size={19} className="cc-drawer-icon" aria-hidden="true" />}
                        <span className="cc-drawer-label">{link.label}</span>
                      </div>
                      <ChevronRight size={16} className="text-muted cc-drawer-chevron" />
                    </NavLink>
                  );
                })}
              </div>

              {/* Bottom Actions inside Drawer */}
              <div className="cc-drawer-actions mt-auto pt-3">
                <button
                  type="button"
                  className="cc-drawer-theme"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun size={18} className="cc-theme-sun" /> : <Moon size={18} className="cc-theme-moon" />}
                  <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </button>

                {!user ? (
                  <div className="d-flex flex-column gap-2 mt-2 w-100">
                    <Link to="/login" className="cc-mobile-btn cc-mobile-btn-outline" onClick={closeAll}>
                      Sign in
                    </Link>
                    <Link to="/register" className="cc-mobile-btn cc-mobile-btn-primary" onClick={closeAll}>
                      <Sparkles size={16} className="me-1" /> Create Free Account
                    </Link>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2 mt-2 w-100">
                    <Link to={home} className="cc-mobile-btn cc-mobile-btn-outline" onClick={closeAll}>
                      <Briefcase size={16} className="cc-btn-icon text-primary" /> Open Dashboard
                    </Link>
                    <button type="button" className="cc-mobile-btn cc-mobile-btn-danger" onClick={signOut}>
                      <LogOut size={16} className="cc-btn-icon" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
