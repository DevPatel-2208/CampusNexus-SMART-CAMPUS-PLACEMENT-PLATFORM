import { useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Award, Bell, Briefcase, Building2, ChevronDown, ChevronRight, GraduationCap, Home, LogOut, Menu, Moon, PanelLeft, Settings, ShieldCheck, Sun, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUnread } from '../hooks/useUnread';
import Swal from 'sweetalert2';
import * as icons from './icons';

export const NAV = {
  student: [
    { section: 'Discovery & Jobs' },
    { to: '/student', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/student/jobs', label: 'Explore Jobs', icon: 'jobs' },
    { to: '/student/recommended', label: 'Recommended', icon: 'sparkles', badge: 'AI' },
    { to: '/student/external', label: 'External Listings', icon: 'globe' },
    { to: '/student/saved', label: 'Saved Bookmarks', icon: 'bookmark' },
    { section: 'Placement Hub' },
    { to: '/student/drives', label: 'Campus Drives', icon: 'calendar', badge: 'Live' },
    { to: '/student/applications', label: 'My Applications', icon: 'file' },
    { to: '/student/assessments', label: 'Assessments', icon: 'clipboard' },
    { to: '/student/interviews', label: 'Interviews', icon: 'video' },
    { to: '/student/offers', label: 'Job Offers', icon: 'award' },
    { to: '/student/placement', label: 'Placement Status', icon: 'trending' },
    { section: 'Profile & Assets' },
    { to: '/student/profile', label: 'Student Profile', icon: 'user' },
    { to: '/student/education', label: 'Education', icon: 'book' },
    { to: '/student/skills', label: 'Skills & Badges', icon: 'zap' },
    { to: '/student/projects', label: 'Portfolio Projects', icon: 'folder' },
    { to: '/student/certifications', label: 'Certifications', icon: 'badge' },
    { to: '/student/resume', label: 'Resume Documents', icon: 'upload' },
    { to: '/student/preferences', label: 'Career Preferences', icon: 'sliders' },
    { to: '/student/alerts', label: 'Job Alerts', icon: 'bell' },
    { to: '/student/notifications', label: 'Notifications', icon: 'bell', isNotif: true },
  ],
  company: [
    { section: 'Overview' },
    { to: '/company', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/company/reports', label: 'Reports', icon: 'chart' },
    { section: 'Jobs' },
    { to: '/company/jobs', label: 'Manage jobs', icon: 'jobs' },
    { to: '/company/jobs/new', label: 'Post job', icon: 'plus' },
    { section: 'Hiring pipeline' },
    { to: '/company/applications', label: 'Applications', icon: 'file' },
    { to: '/company/shortlisted', label: 'Shortlisted', icon: 'star' },
    { to: '/company/selection', label: 'Selection', icon: 'trending' },
    { to: '/company/assessments', label: 'Assessments', icon: 'clipboard' },
    { to: '/company/interviews', label: 'Interviews', icon: 'video' },
    { to: '/company/offers', label: 'Offers', icon: 'award' },
    { section: 'Company' },
    { to: '/company/profile', label: 'Profile', icon: 'building' },
    { to: '/company/verification', label: 'Verification', icon: 'shield' },
    { to: '/company/notifications', label: 'Notifications', icon: 'bell', isNotif: true },
    { to: '/company/settings', label: 'Settings', icon: 'settings' },
  ],
  tpo: [
    { section: 'Overview' },
    { to: '/tpo', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/tpo/analytics', label: 'Analytics', icon: 'chart' },
    { section: 'People' },
    { to: '/tpo/students', label: 'Students', icon: 'users' },
    { to: '/tpo/companies', label: 'Companies', icon: 'building' },
    { to: '/tpo/jobs', label: 'Jobs & Approvals', icon: 'jobs' },
    { section: 'Placements' },
    { to: '/tpo/drives', label: 'Drives', icon: 'calendar' },
    { to: '/tpo/calendar', label: 'Drive Calendar', icon: 'calendar' },
    { to: '/tpo/history', label: 'Drive History', icon: 'list' },
    { to: '/tpo/applications', label: 'Applications', icon: 'file' },
    { section: 'Process' },
    { to: '/tpo/assessments', label: 'Assessments', icon: 'clipboard' },
    { to: '/tpo/interviews', label: 'Interviews', icon: 'video' },
    { to: '/tpo/offers', label: 'Offers', icon: 'award' },
    { to: '/tpo/selections', label: 'Selections', icon: 'star' },
    { to: '/tpo/placements', label: 'Placements', icon: 'trending' },
    { section: 'Engage' },
    { to: '/tpo/announcements', label: 'Announcements', icon: 'megaphone' },
    { to: '/tpo/reports', label: 'Reports & Exports', icon: 'download' },
    { section: 'System' },
    { to: '/tpo/contacts', label: 'Contact Messages', icon: 'mail' },
    { to: '/tpo/audit', label: 'Audit Logs', icon: 'list' },
    { to: '/tpo/notifications', label: 'Notifications', icon: 'bell', isNotif: true },
    { to: '/tpo/settings', label: 'Settings', icon: 'settings' },
  ],
};

const ROLE_LABEL = { student: 'Student', company: 'Recruiter', tpo: 'TPO / Faculty' };

export const ROLE_META = {
  student: {
    icon: GraduationCap,
    label: 'Student Hub',
    roleName: 'Student',
    subtitle: 'Verified Student',
    home: '/student',
    profile: '/student/profile',
    colorClass: 'cc-brand-student',
    tagClass: 'cc-ss-tag-student',
  },
  company: {
    icon: Building2,
    label: 'Recruiter Suite',
    roleName: 'Recruiter',
    subtitle: 'Verified Employer',
    home: '/company',
    profile: '/company/profile',
    colorClass: 'cc-brand-company',
    tagClass: 'cc-ss-tag-company',
  },
  tpo: {
    icon: Award,
    label: 'TPO Placement Hub',
    roleName: 'TPO / Faculty',
    subtitle: 'Placement Officer',
    home: '/tpo',
    profile: '/tpo/settings',
    colorClass: 'cc-brand-tpo',
    tagClass: 'cc-ss-tag-tpo',
  },
};

function initialsOf(name) {
  return String(name || '?').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/**
 * Resolve exactly one active navigation entry for the current URL.
 * Plain `NavLink` prefix matching marks both `/company/jobs` and
 * `/company/jobs/new` active, so we pick the longest matching target instead.
 */
function activeTarget(items, pathname) {
  const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
  const path = norm(pathname);
  let best = null;
  for (const it of items) {
    if (!it.to) continue;
    const to = norm(it.to);
    const hit = it.end ? path === to : path === to || path.startsWith(`${to}/`);
    if (hit && (!best || to.length > norm(best.to).length)) best = it;
  }
  return best?.to || null;
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnread();
  const items = NAV[user?.role] || [];
  const role = user?.role || 'student';
  const roleMeta = ROLE_META[role] || ROLE_META.student;
  const RoleIcon = roleMeta.icon;
  const profileTo = roleMeta.profile;
  const active = useMemo(() => activeTarget(items, location.pathname), [items, location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const confirmLogout = async () => {
    const r = await Swal.fire({
      title: 'Sign out?',
      text: 'You will need to sign in again to access the portal.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sign out',
      cancelButtonText: 'Stay',
      confirmButtonColor: '#e11d48',
    });
    if (r.isConfirmed) {
      window.location.href = '/';
      await logout();
    }
  };

  return (
    <>
      {open && <div className="cc-sidebar-backdrop d-lg-none" onClick={onClose} aria-hidden="true" />}
      <aside
        id="cc-sidebar"
        className={`cc-sidebar cc-ss-${role}${open ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
        aria-label="Main navigation"
      >
        <div className="cc-ss-brand">
          <Link
            to={roleMeta.home}
            className="cc-ss-brand-link"
            onClick={collapsed ? onToggleCollapse : onClose}
            title={collapsed ? 'Expand sidebar' : 'CareerConnect Home'}
            data-tip={collapsed ? 'CareerConnect Home (Click to expand)' : undefined}
          >
            <span className={`cc-ss-logo ${roleMeta.colorClass}`} aria-hidden="true">
              <RoleIcon size={22} />
            </span>
            {!collapsed && (
              <span className="cc-ss-brand-txt">
                <b>CareerConnect</b>
                <span className={`cc-ss-brand-tag ${roleMeta.tagClass}`}>{roleMeta.label}</span>
              </span>
            )}
          </Link>
          <button className="cc-ss-collapse cc-mobile-only" onClick={onClose} aria-label="Close menu">
            <X size={16} />
          </button>
          {!collapsed && (
            <button
              className="cc-ss-collapse cc-desktop-only"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeft size={16} />
            </button>
          )}
        </div>

        <Link to={profileTo} className="cc-ss-profile" onClick={onClose} data-tip={`View ${roleMeta.roleName} Profile`}>
          <span className="cc-ss-avatar">
            {initialsOf(user?.name)}
            <span className="cc-ss-avatar-dot" title="Active verified session" />
          </span>
          <span className="cc-ss-profile-info">
            <b>{user?.name || roleMeta.roleName}</b>
            <span>{roleMeta.subtitle}</span>
          </span>
        </Link>

        <nav className="cc-ss-nav">
          {items.map((it, i) => it.section ? (
            <div key={`s${i}`} className="cc-ss-section">
              <span>{it.section}</span>
            </div>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              title={it.label}
              data-tip={it.label}
              className={() => `cc-ss-item${active === it.to ? ' active' : ''}`}
              aria-current={active === it.to ? 'page' : undefined}
              onClick={onClose}
            >
              <AnimatePresence initial={false}>
                {active === it.to && (
                  <motion.span
                    key="cc-ss-ind"
                    layoutId="cc-ss-ind"
                    className="cc-ss-ind"
                    aria-hidden="true"
                    initial={false}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </AnimatePresence>
              <span className="cc-ss-ico" aria-hidden="true">{icons.Icon({ name: it.icon, size: 18 })}</span>
              <span className="cc-ss-label">{it.label}</span>
              {it.badge && (
                <span className={`cc-nav-badge ${it.badge.toLowerCase()}`}>
                  {it.badge}
                </span>
              )}
              {it.isNotif && unread > 0 && (
                <span className="cc-nav-badge notif" title={`${unread} unread notifications`}>
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="cc-ss-foot">
          <button className="cc-ss-item cc-ss-logout" onClick={confirmLogout} title="Sign Out" data-tip="Sign Out">
            <span className="cc-ss-ico" aria-hidden="true"><LogOut size={16} /></span>
            <span className="cc-ss-label">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function Breadcrumbs({ crumb }) {
  const navigate = useNavigate();
  const parts = String(crumb || '').split('/').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const home = parts[0].toLowerCase();
  const homeTo = ['student', 'company', 'tpo'].includes(home) ? `/${home}` : '/';
  return (
    <nav className="cc-crumb" aria-label="Breadcrumb">
      <a href={homeTo} onClick={(e) => { e.preventDefault(); navigate(homeTo); }} aria-label="Home"><Home size={13} /></a>
      {parts.map((p, i) => (
        <span key={`${p}${i}`} className="cc-crumb-part">
          <ChevronRight size={13} className="cc-crumb-sep" aria-hidden="true" />
          <span className={i === parts.length - 1 ? 'is-current' : undefined} aria-current={i === parts.length - 1 ? 'page' : undefined}>{p}</span>
        </span>
      ))}
    </nav>
  );
}

export function Topbar({ onMenu, onToggleCollapse, title, crumb, collapsed }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const unread = useUnread();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const wrapRef = useRef(null);
  const role = user?.role || 'student';
  const roleMeta = ROLE_META[role] || ROLE_META.student;
  const RoleIcon = roleMeta.icon;

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenu(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled((window.scrollY || document.documentElement.scrollTop || 0) > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const confirmLogout = async () => {
    setMenu(false);
    const r = await Swal.fire({
      title: 'Sign out?',
      text: 'You will need to sign in again to access the portal.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sign out',
      cancelButtonText: 'Stay',
      confirmButtonColor: '#e11d48',
    });
    if (r.isConfirmed) {
      window.location.href = '/';
      await logout();
    }
  };

  const go = (path) => { setMenu(false); navigate(path); };

  return (
    <header className={`cc-topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <button className="cc-icon-btn cc-mobile-only" onClick={onMenu} aria-label="Open menu" aria-controls="cc-sidebar" aria-expanded={false}><Menu size={18} /></button>
      {collapsed && (
        <button className="cc-icon-btn cc-desktop-only" onClick={onToggleCollapse} aria-label="Expand sidebar" title="Expand sidebar"><PanelLeft size={18} /></button>
      )}
      <Link to={roleMeta.home} className="cc-topbar-brand cc-mobile-only" aria-label="CareerConnect home">
        <span className={`cc-brand-mark ${roleMeta.colorClass}`}>
          <RoleIcon size={18} />
        </span>
        <span className="cc-topbar-brand-title">CareerConnect</span>
      </Link>
      <div className="cc-topbar-heading">
        <h1>{title || 'CareerConnect'}</h1>
        <span className="cc-topbar-sub">Campus Placement Management</span>
      </div>
      <div className="cc-topbar-actions">
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} className="cc-icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle theme">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={theme} style={{ display: 'grid' }} initial={{ rotate: -90, opacity: 0, y: 6 }} animate={{ rotate: 0, opacity: 1, y: 0 }} exit={{ rotate: 90, opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} className="cc-icon-btn cc-bell" onClick={() => navigate(`/${user?.role}/notifications`)} aria-label="Notifications" title="Notifications">
          <Bell size={18} />{unread > 0 && <span className="cc-bell-dot">{unread > 9 ? '9+' : unread}</span>}
        </motion.button>
        <div className="cc-menu-wrap" ref={wrapRef}>
          <button
            className="cc-profile-btn"
            onClick={() => setMenu((v) => !v)}
            aria-label="Account menu"
            aria-expanded={menu}
            aria-haspopup="menu"
          >
            <div className="position-relative d-flex align-items-center">
              <span className="cc-avatar cc-profile-btn-avatar">{initialsOf(user?.name)}</span>
              <span className="cc-online-dot" />
            </div>
            <span className="cc-profile-btn-name d-none d-sm-inline">{user?.name ? user.name.split(' ')[0] : 'Account'}</span>
            <ChevronDown size={14} className="cc-profile-btn-arrow" style={{ transform: menu ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                className="cc-menu cc-menu-premium"
                role="menu"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div className="cc-menu-card-header">
                  <div className="d-flex align-items-center gap-3">
                    <div className="position-relative">
                      <span className="cc-avatar cc-menu-avatar">{initialsOf(user?.name)}</span>
                      <span className="cc-online-dot" title="Active session" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b className="d-block text-truncate cc-menu-name">{user?.name || 'User'}</b>
                      <span className="d-block text-truncate cc-menu-email">{user?.email}</span>
                      <div className="d-flex align-items-center gap-1 mt-1">
                        <span className={`cc-badge no-dot cc-menu-role-badge ${roleMeta.tagClass}`}>
                          <RoleIcon size={11} className="me-1" />
                          {roleMeta.roleName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cc-menu-body">
                  <button
                    className="cc-menu-item"
                    role="menuitem"
                    onClick={() => go(user?.role === 'student' || user?.role === 'company' ? `/${user.role}/profile` : `/${user?.role || ''}`)}
                  >
                    <User size={15} />
                    <span>My Profile</span>
                  </button>
                  {user?.role === 'student' && (
                    <button className="cc-menu-item" role="menuitem" onClick={() => go('/student/applications')}>
                      <Briefcase size={15} />
                      <span>My Applications</span>
                    </button>
                  )}
                  <button className="cc-menu-item" role="menuitem" onClick={() => go(`/${user?.role}/settings`)}>
                    <Settings size={15} />
                    <span>Account settings</span>
                  </button>
                </div>

                <div className="cc-menu-footer">
                  <button className="cc-menu-item danger" role="menuitem" onClick={confirmLogout}>
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children, crumb, title, subtitle, actions }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('cc-sidebar-collapsed') === '1'; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('cc-sidebar-collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`cc-layout${user?.role ? ` cc-role-${user.role}` : ''}`}>
        <Sidebar
          open={open}
          onClose={() => setOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <div className={`cc-main${collapsed ? ' expanded' : ''}`}>
          <Topbar onMenu={() => setOpen(true)} onToggleCollapse={() => setCollapsed((c) => !c)} title={title} crumb={crumb} collapsed={collapsed} />
          <main className="cc-content" id="cc-content">
            <div className="cc-page-shell">
              {crumb && <Breadcrumbs crumb={crumb} />}
              {(subtitle || actions) && (
                <div className="cc-page-head">
                  <div>{subtitle && <p className="mb-0">{subtitle}</p>}</div>
                  {actions && <div className="cc-page-head-actions">{actions}</div>}
                </div>
              )}
              <motion.div
                key={location.pathname}
                className="cc-page-motion"
                style={{ width: '100%', minWidth: 0 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
