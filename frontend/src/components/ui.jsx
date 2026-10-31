import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowDown, ArrowUp, BadgeCheck, Briefcase, ChevronLeft, ChevronRight,
  Clock, Inbox, IndianRupee, Laptop, Loader2, MapPin, RotateCw, Search, SlidersHorizontal, X,
} from 'lucide-react';
import { fileUrl } from '../services/api';

/* ------------------------------------------------------------------ *
 * Status badge — premium, consistent semantic colors
 * ------------------------------------------------------------------ */
export function StatusBadge({ value, dot = true }) {
  const v = String(value || '');
  const cls = /selected|placed|accepted|verified|approved|active|joined|passed|eligible|resolved|open|read/i.test(v) ? 'green'
    : /pending|applied|under review|scheduled|issued|viewed|not_placed|upcoming|registration_open|draft|new|in progress/i.test(v) ? 'amber'
    : /reject|cancel|fail|block|expir|withdraw|suspend/i.test(v) ? 'red'
    : /interview|assessment|shortlist|offer|ongoing|published/i.test(v) ? 'violet'
    : /hold|on hold|info/i.test(v) ? 'blue' : 'gray';
  return <span className={`cc-badge ${cls}`}>{dot && <span className="cc-dot" />}{v || '—'}</span>;
}

/* ------------------------------------------------------------------ *
 * Empty / Loading / Error — premium states with motion
 * ------------------------------------------------------------------ */
export function Empty({ title = 'Nothing here yet', hint, icon, action, bare = false, className = '' }) {
  const body = (
    <div className={`cc-empty ${className}`}>
      <span className="cc-empty-ic">{icon || <Inbox />}</span>
      <div className="cc-empty-title">{title}</div>
      {hint && <div className="cc-empty-hint">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
  if (bare) return body;
  return <div className="cc-card cc-card-static">{body}</div>;
}

export function Loading({ rows = 3, height = 56 }) {
  return (
    <div className="d-flex flex-column gap-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="cc-skel" style={{ height }} />)}
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="cc-spin" aria-hidden="true" />;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="cc-card cc-card-static">
      <div className="cc-empty" role="alert">
        <span className="cc-empty-ic" style={{ color: 'var(--cc-danger)' }}><AlertTriangle /></span>
        <div className="cc-empty-title">{message || 'Failed to load.'}</div>
        <div className="cc-empty-hint">The request could not be completed. Try again in a moment.</div>
        {onRetry && (
          <button className="btn btn-outline-primary btn-sm mt-3" onClick={onRetry}>
            <RotateCw size={15} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * KPI card — premium, tone-driven, dark/light safe
 * ------------------------------------------------------------------ */
const TONE_CLASS = {
  primary: 'cc-kpi-primary', success: 'cc-kpi-success', green: 'cc-kpi-success',
  info: 'cc-kpi-info', blue: 'cc-kpi-info', amber: 'cc-kpi-amber', warning: 'cc-kpi-amber',
  violet: 'cc-kpi-violet', danger: 'cc-kpi-danger', red: 'cc-kpi-danger', slate: 'cc-kpi-slate', gray: 'cc-kpi-slate',
};

export function KpiCard({ icon, value, label, tone = 'primary', hint, to, onClick }) {
  const cls = TONE_CLASS[tone] || 'cc-kpi-primary';
  const inner = (
    <>
      <span className="cc-kpi-icon">{icon}</span>
      <span className="cc-kpi-body">
        <span className="cc-kpi-v">{value ?? '—'}</span>
        <span className="cc-kpi-l">{label}</span>
        {hint && <span className="cc-kpi-hint">{hint}</span>}
      </span>
    </>
  );
  if (to) return <Link className={`cc-card cc-kpi ${cls} cc-kpi-link`} to={to}>{inner}</Link>;
  if (onClick) return <button type="button" className={`cc-card cc-kpi ${cls} cc-kpi-link`} onClick={onClick}>{inner}</button>;
  return <div className={`cc-card cc-kpi cc-card-static ${cls}`}>{inner}</div>;
}

/** Back-compat Stat (legacy color/bg overrides still supported). */
export function Stat({ icon, value, label, tone, color, bg, hint }) {
  if (tone) return <KpiCard icon={icon} value={value} label={label} tone={tone} hint={hint} />;
  return (
    <div className="cc-card cc-stat">
      <span className="cc-stat-ic" style={{ background: bg || 'var(--cc-primary-soft)', color: color || 'var(--cc-primary)' }}>{icon}</span>
      <span className="cc-stat-body">
        <span className="cc-stat-v">{value ?? '—'}</span>
        <span className="cc-stat-l">{label}</span>
      </span>
    </div>
  );
}

export function KpiGrid({ children, className = '' }) {
  return <div className={`cc-kpis ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Page header — premium page heading
 * ------------------------------------------------------------------ */
export function PageHeader({ title, description, icon, eyebrow, actions, meta, className = '' }) {
  return (
    <div className={`cc-page-header ${className}`.trim()}>
      <div className="cc-page-header-main">
        {icon && <span className="cc-page-header-icon">{icon}</span>}
        <div className="cc-page-header-text">
          {eyebrow && <span className="cc-page-header-eyebrow">{eyebrow}</span>}
          <h1 className="cc-page-header-title">{title}</h1>
          {description && <p className="cc-page-header-desc">{description}</p>}
          {meta && <div className="cc-page-header-meta">{meta}</div>}
        </div>
      </div>
      {actions && <div className="cc-page-header-actions">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section card — premium card with header/body split
 * ------------------------------------------------------------------ */
export function SectionCard({ title, subtitle, icon, actions, children, bodyClass = '', className = '', static: isStatic = true }) {
  return (
    <section className={`cc-card cc-section${isStatic ? ' cc-card-static' : ''} ${className}`.trim()}>
      {(title || actions) && (
        <header className="cc-section-head">
          <div className="cc-section-title">
            {icon && <span className="cc-section-ic">{icon}</span>}
            <span className="cc-section-text">
              <h2>{title}</h2>
              {subtitle && <small>{subtitle}</small>}
            </span>
          </div>
          {actions && <div className="cc-section-actions">{actions}</div>}
        </header>
      )}
      <div className={`cc-section-body ${bodyClass}`.trim()}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Field — labelled form control with inline error/help text
 * ------------------------------------------------------------------ */
export function Field({ label, required, hint, error, children, className = '', htmlFor }) {
  return (
    <div className={`cc-field ${className}`.trim()}>
      {label && (
        <label className="form-label" htmlFor={htmlFor}>
          {label}{required && <span className="cc-req" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? <div className="cc-field-error" role="alert">{error}</div>
        : hint ? <div className="form-text">{hint}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * FormActions — consistent, aligned submit/cancel row
 * ------------------------------------------------------------------ */
export function FormActions({ children, className = '' }) {
  return <div className={`cc-form-actions ${className}`.trim()}>{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Toolbar / filters — premium filter bar
 * ------------------------------------------------------------------ */
export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search', debounce = 0 }) {
  return (
    <div className="cc-search">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        className="cc-search-input"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="cc-search-clear" onClick={() => onChange('')} aria-label="Clear search"><X size={14} /></button>
      ) : null}
    </div>
  );
}

export function SelectFilter({ value, onChange, options = [], label, placeholder }) {
  const first = placeholder || (label ? `All ${label.toLowerCase()}` : 'All');
  const list = Array.isArray(options) ? options : [];
  return (
    <div className="cc-select-wrap">
      <select
        className={`form-select cc-select${value ? ' has-value' : ''}`}
        value={value ?? ''}
        aria-label={label || first}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{first}</option>
        {list.filter((o) => o != null && o !== '').map((o, idx) => {
          const val = typeof o === 'object' && o !== null ? (o.value ?? '') : String(o);
          const text = typeof o === 'object' && o !== null ? (o.label ?? val) : String(o);
          return <option key={`${val}-${idx}`} value={val}>{text}</option>;
        })}
      </select>
    </div>
  );
}

export function Toolbar({ children, onClear, showClear = false, className = '', label = 'Filters' }) {
  return (
    <div className={`cc-toolbar ${className}`.trim()} role="search" aria-label={label}>
      <span className="cc-toolbar-ic" aria-hidden="true"><SlidersHorizontal size={16} /></span>
      <div className="cc-toolbar-fields">{children}</div>
      {showClear && onClear && (
        <button type="button" className="cc-toolbar-clear" onClick={onClear}>
          <X size={14} /> Reset
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ResultMeta — count line above tables
 * ------------------------------------------------------------------ */
export function ResultMeta({ count, noun = 'result', filtered = false, children }) {
  return (
    <div className="cc-result-meta">
      <span>
        <b>{count}</b> {noun}{count === 1 ? '' : 's'}{filtered ? ' matching filters' : ''}
      </span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Data table — premium data table
 * ------------------------------------------------------------------ */
export function DataTable({
  columns, rows, rowKey = (r, i) => r?._id || r?.id || i,
  loading, empty, emptyHint, onRowClick, sort, onSort, footer, className = '',
}) {
  if (loading) return <Loading rows={4} />;
  if (!rows?.length) return <Empty title={empty || 'No records found'} hint={emptyHint} bare className="cc-empty-inline" />;
  return (
    <div className={`cc-table-wrap ${className}`.trim()}>
      <table className="cc-table">
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const sortable = c.sortable && onSort;
              return (
                <th
                  key={c.key}
                  scope="col"
                  data-num={c.align === 'right' ? '' : undefined}
                  data-col={c.key}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className={`cc-sort${active ? ' active' : ''}`}
                      onClick={() => onSort(c.key, active && sort.dir === 'asc' ? 'desc' : 'asc')}
                      aria-label={`Sort by ${typeof c.header === 'string' ? c.header : c.key}`}
                    >
                      {c.header}
                      {active ? (sort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : null}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              className={onRowClick ? 'cc-row-click' : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} data-num={c.align === 'right' ? '' : undefined} data-col={c.key}>
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Modal — premium framer-motion dialog
 * ------------------------------------------------------------------ */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cc-modal-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            className={`cc-modal cc-modal-${size}`} role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="cc-modal-head">
              <div>
                <h2>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <button type="button" className="cc-icon-btn" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
            </header>
            <div className="cc-modal-body">{children}</div>
            {footer && <footer className="cc-modal-foot">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ *
 * Detail grid — premium two-column detail list
 * ------------------------------------------------------------------ */
export function DetailGrid({ items, columns = 2 }) {
  return (
    <div className="cc-detail-grid" style={{ '--cc-detail-cols': columns }}>
      {items.filter(Boolean).map((it, i) => (
        <div key={`${it.label}${i}`} className="cc-detail-item">
          <span className="cc-detail-label">{it.label}</span>
          <span className="cc-detail-value">{it.value ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pagination — premium pagination
 * ------------------------------------------------------------------ */
export function Pager({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  const from = Math.max(1, page - 1);
  const to = Math.min(pages, from + 2);
  for (let p = Math.max(1, to - 2); p <= to; p++) nums.push(p);
  return (
    <nav className="cc-pager" aria-label="Pagination">
      <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft size={15} />
      </button>
      {nums[0] > 1 && <span className="cc-pager-gap">…</span>}
      {nums.map((n) => (
        <button key={n} className={`cc-pager-num${n === page ? ' active' : ''}`} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>
      ))}
      {nums[nums.length - 1] < pages && <span className="cc-pager-gap">…</span>}
      <button className="btn btn-outline-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight size={15} />
      </button>
      <span className="cc-pager-info">Page {page} of {pages}</span>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * Money helper
 * ------------------------------------------------------------------ */
export function salaryText(job) {
  if (!job) return '—';
  if (job.salaryMin || job.salaryMax) {
    const lpa = (v) => `₹${(v / 100000).toFixed(v % 100000 ? 1 : 0)} LPA`;
    return `${job.salaryMin ? lpa(job.salaryMin) : ''}${job.salaryMin && job.salaryMax ? ' – ' : ''}${job.salaryMax ? lpa(job.salaryMax) : ''}`;
  }
  return '—';
}

/* ------------------------------------------------------------------ *
 * Job card — premium job listing card
 * ------------------------------------------------------------------ */
export function JobCard({ job, to, badge, actions, footer, className = '' }) {
  if (!job) return null;
  const company = job.company || {};
  const name = company.companyName || 'Company';
  const initial = name.trim()[0]?.toUpperCase() || '?';
  const logo = company.logo ? fileUrl(company.logo) : null;

  // Consistent deadline formatting + genuine urgency highlighting.
  let deadlineLabel = null;
  let deadlineUrgent = false;
  let deadlineExpired = false;
  if (job.deadline) {
    const d = new Date(job.deadline);
    if (!isNaN(d.getTime())) {
      deadlineLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const now = new Date();
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      deadlineExpired = diffDays < 0;
      deadlineUrgent = !deadlineExpired && diffDays <= 7;
    } else {
      deadlineLabel = String(job.deadline).slice(0, 10);
    }
  }

  return (
    <article className={`cc-card cc-job-card ${className}`}>
      <div className="cc-card-body cc-job-card-body d-flex flex-column h-100">
        {/* Header */}
        <div className="cc-job-top">
          {logo
            ? <img className="cc-job-logo" src={logo} alt={`${name} logo`} loading="lazy" />
            : <span className="cc-job-logo" aria-label={`${name} logo`}>{initial}</span>}
          <div className="cc-job-head">
            {to ? <Link className="cc-job-title" to={to}>{job.title}</Link> : <span className="cc-job-title">{job.title}</span>}
            <div className="cc-job-company">
              {name}
              {company.verificationStatus === 'verified' && <BadgeCheck size={13} style={{ color: 'var(--cc-primary)' }} aria-label="Verified company" />}
            </div>
          </div>
          {badge && <div className="cc-job-badge">{badge}</div>}
        </div>

        {/* Metadata */}
        <div className="cc-job-meta">
          {job.location && <span><MapPin size={13} />{job.location}</span>}
          {job.jobType && <span><Briefcase size={13} />{job.jobType}</span>}
          {job.workMode && <span><Laptop size={13} />{job.workMode}</span>}
          <span><IndianRupee size={13} />{salaryText(job)}</span>
        </div>

        {/* Deadline */}
        {deadlineLabel && (
          <div className={`cc-job-deadline${deadlineUrgent ? ' is-urgent' : ''}${deadlineExpired ? ' is-expired' : ''}`}>
            <Clock size={13} /> {deadlineExpired ? 'Closed' : 'Apply by'} {deadlineLabel}
          </div>
        )}

        {/* Optional description */}
        {job.description && <p className="cc-job-desc">{job.description}</p>}

        {/* Skill chips / footer */}
        {footer && <div className="cc-job-foot">{footer}</div>}

        {/* Actions pushed to the bottom for consistent alignment */}
        {actions && <div className="cc-job-actions">{actions}</div>}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Full-width PageContainer — consistent shell for student pages
 * ------------------------------------------------------------------ */
export function PageContainer({ children, className = '' }) {
  return (
    <div className={`cc-page-container ${className}`.trim()} style={{ width: '100%', minWidth: 0 }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ProgressIndicator — animated bar with percentage & optional label
 * ------------------------------------------------------------------ */
export function ProgressIndicator({ value = 0, max = 100, label, tone = 'primary', showPercent = true }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const toneClass = {
    primary: 'cc-bar-primary',
    success: 'success',
    amber: 'amber',
    danger: 'danger',
  }[tone] || '';

  return (
    <div className="cc-progress-wrap w-100">
      {(label || showPercent) && (
        <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold text-muted">
          {label && <span>{label}</span>}
          {showPercent && <span className="ms-auto">{pct}%</span>}
        </div>
      )}
      <div className={`cc-bar ${toneClass}`}>
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ChoiceCard — interactive selectable card (e.g. work mode, job type)
 * ------------------------------------------------------------------ */
export function ChoiceCard({ selected, onClick, icon, title, description, badge }) {
  return (
    <button
      type="button"
      className={`cc-choice-card ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
    >
      <div className="d-flex align-items-center justify-content-between w-100 mb-1">
        <span className="cc-choice-icon">{icon}</span>
        {badge && <span className="cc-badge gray no-dot">{badge}</span>}
      </div>
      <b className="cc-choice-title">{title}</b>
      {description && <span className="cc-choice-desc">{description}</span>}
    </button>
  );
}
