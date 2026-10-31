import { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { apiErrorMessage, downloadFile, fileUrl } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import Swal from 'sweetalert2';
import { confirmAction, swalBase } from '../services/alerts';
import {
  PageHeader, KpiCard, KpiGrid, SectionCard, Toolbar, SearchInput, SelectFilter,
  DataTable, Pager, StatusBadge, Empty, Loading, ErrorState, DetailGrid, Spinner,
} from '../components/ui';
import {
  Users, Building2, Briefcase, CalendarDays, FileText, TrendingUp, GraduationCap,
  Download, Plus, Megaphone, CheckCircle2, Clock, Video, Award, MapPin, Mail,
  Phone, ExternalLink, ShieldCheck, ScrollText, ArrowLeft, UserCheck,
} from 'lucide-react';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/* ================================================================== *
 * Dashboard
 * ================================================================== */
export function Dashboard() {
  const dash = useFetch(async () => (await api.get('/tpo/dashboard')).data.data, []);
  const drives = useFetch(async () => (await api.get('/drives', { params: { limit: 100 } })).data.data, []);
  const apps = useFetch(async () => (await api.get('/tpo/applications', { params: { limit: 6 } })).data.data, []);
  const ivs = useFetch(async () => (await api.get('/interviews', { params: { status: 'scheduled', limit: 8 } })).data.data, []);
  const anns = useFetch(async () => (await api.get('/announcements')).data.data, []);

  if (dash.loading) return <Loading rows={4} height={92} />;
  if (dash.error) return <ErrorState message={apiErrorMessage(dash.error)} onRetry={dash.reload} />;
  const k = dash.data.kpis;

  const upcoming = (drives.data || [])
    .filter((d) => ['upcoming', 'registration_open', 'registration_closed'].includes(d.status))
    .sort((a, b) => new Date(a.driveDate) - new Date(b.driveDate)).slice(0, 5);
  const upcomingIvs = (ivs.data || []).filter((v) => new Date(v.interviewDate) >= today()).slice(0, 5);
  const recentAnn = [...(anns.data || [])].sort((a, b) => new Date(b.publishDate || b.createdAt) - new Date(a.publishDate || a.createdAt)).slice(0, 4);
  const isToday = (d) => { const x = new Date(d); const n = new Date(); return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate(); };
  const todayDrives = (drives.data || [])
    .filter((d) => d.status !== 'cancelled' && isToday(d.driveDate))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const pendingTotal = (k.pendingCompanies || 0) + (k.pendingJobs || 0) + (k.pendingApps || 0) + (k.onHold || 0);
  const attCards = [
    { to: '/tpo/companies', icon: Building2, tone: 'warning', title: 'Company Verification', count: k.pendingCompanies, unit: 'awaiting review', empty: 'All caught up', cta: 'Review' },
    { to: '/tpo/jobs', icon: ShieldCheck, tone: 'danger', title: 'Job Approvals', count: k.pendingJobs, unit: 'awaiting approval', empty: 'All caught up', cta: 'Review' },
    { to: '/tpo/applications', icon: FileText, tone: 'info', title: 'Pending Applications', count: k.pendingApps, unit: 'under review', empty: 'No pending', cta: 'View' },
    { to: '/tpo/selections', icon: UserCheck, tone: 'primary', title: 'Selections On Hold', count: k.onHold, unit: 'awaiting decision', empty: 'All clear', cta: 'View' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Training & Placement Office"
        title="Placement Dashboard"
        description="Live overview of students, recruiters, drives and placement outcomes across the campus."
        icon={<TrendingUp />}
        meta={<><StatusBadge value={`${k.openJobs} open jobs`} dot={false} /><StatusBadge value={`${k.interviews} interviews`} dot={false} /><StatusBadge value={`${k.placements} placements`} dot={false} /></>}
        actions={<>
          <Link className="btn btn-primary btn-sm" to="/tpo/drives/new"><Plus size={15} /> New drive</Link>
          <Link className="btn btn-outline-primary btn-sm" to="/tpo/announcements"><Megaphone size={15} /> Announce</Link>
          <Link className="btn btn-outline-secondary btn-sm" to="/tpo/reports"><Download size={15} /> Reports</Link>
        </>}
      />

      <KpiGrid>
        <KpiCard tone="primary" icon={<Users />} value={k.students} label="Total students" to="/tpo/students" />
        <KpiCard tone="success" icon={<UserCheck />} value={k.placed} label="Students placed" to="/tpo/placements" />
        <KpiCard tone="info" icon={<Building2 />} value={k.companies} label="Companies" hint={k.pendingCompanies ? `${k.pendingCompanies} pending verification` : 'All verified'} to="/tpo/companies" />
        <KpiCard tone="violet" icon={<Briefcase />} value={k.jobs} label="Jobs" hint={k.pendingJobs ? `${k.pendingJobs} awaiting approval` : `${k.openJobs} open`} to="/tpo/jobs" />
        <KpiCard tone="amber" icon={<FileText />} value={k.apps} label="Applications" hint={`+${k.appsToday} today`} to="/tpo/applications" />
        <KpiCard tone="info" icon={<CalendarDays />} value={k.drives} label="Placement drives" to="/tpo/drives" />
        <KpiCard tone="violet" icon={<Video />} value={k.interviews} label="Upcoming interviews" to="/tpo/interviews" />
        <KpiCard tone="success" icon={<Award />} value={k.placements} label="Placements" to="/tpo/placements" />
      </KpiGrid>

      <SectionCard title="Today's Placement Schedule" subtitle="Drives scheduled for today" icon={<CalendarDays />} className="mb-4"
        actions={<Link className="btn btn-primary btn-sm" to="/tpo/drives/new"><Plus size={15} /> Add another drive</Link>}>
        {drives.loading ? <Loading rows={3} height={48} /> : !todayDrives.length ? <Empty title="No placement drives scheduled for today." hint="Create a drive to schedule activity." /> : (
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr><th>Company / Drive</th><th>Time</th><th>Venue</th><th>Mode</th><th>Status</th></tr>
              </thead>
              <tbody>
                {todayDrives.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <Link className="fw-semibold text-decoration-none" to={`/tpo/drives/${d._id}`}>
                        {d.company?.companyName || 'Company'} — {d.driveTitle}
                      </Link>
                    </td>
                    <td>{d.startTime ? `${d.startTime}${d.endTime ? ` - ${d.endTime}` : ''}` : 'Time not assigned'}</td>
                    <td>{d.venue || '—'}</td>
                    <td>{d.mode || '—'}</td>
                    <td><StatusBadge value={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Needs your attention" subtitle="Items waiting on the placement cell"
        icon={<Clock />} className="mb-4"
        actions={pendingTotal > 0 ? <span className="cc-badge amber border-0 py-2 px-3" style={{ fontSize: '0.82rem' }}><span className="cc-dot" />{pendingTotal} pending</span> : null}>
        <div className="cc-att-grid">
          {attCards.map((a) => {
            const Icon = a.icon;
            const n = a.count || 0;
            return (
              <div key={a.title} className="cc-att-card">
                <span className={`cc-icon-box cc-icon-box-sm cc-icon-${a.tone}`}><Icon /></span>
                <span className="cc-att-body">
                  <b>{a.title}</b>
                  <small>{n > 0 ? `${n} ${a.unit}` : a.empty}</small>
                </span>
                <Link className={`btn btn-sm flex-shrink-0 ${n > 0 ? 'btn-primary' : 'btn-ghost'}`} to={a.to}>{n > 0 ? a.cta : 'View'}</Link>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="cc-grid-2 mb-4">
        <SectionCard title="Upcoming drives" subtitle={`${upcoming.length} scheduled`} icon={<CalendarDays />}
          actions={<Link className="btn btn-ghost btn-sm" to="/tpo/drives">View all</Link>}>
          {drives.loading ? <Loading rows={3} height={48} /> : !upcoming.length ? <Empty title="No upcoming drives" hint="Create a drive to get started." /> : (
            <div className="cc-stack">
              {upcoming.map((d) => (
                <Link key={d._id} to={`/tpo/drives/${d._id}`} className="cc-list-row">
                  <span className="cc-list-ic cc-tone-info"><CalendarDays /></span>
                  <span className="cc-list-body">
                    <b>{d.driveTitle}</b>
                    <small>{d.company?.companyName || '—'} · {fmtDate(d.driveDate)}{d.startTime ? ` · ${d.startTime}` : ''}</small>
                  </span>
                  <StatusBadge value={d.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming interviews" subtitle={`${upcomingIvs.length} scheduled`} icon={<Video />}
          actions={<Link className="btn btn-ghost btn-sm" to="/tpo/interviews">View all</Link>}>
          {ivs.loading ? <Loading rows={3} height={48} /> : !upcomingIvs.length ? <Empty title="No upcoming interviews" /> : (
            <div className="cc-stack">
              {upcomingIvs.map((v) => (
                <div key={v._id} className="cc-list-row">
                  <span className="cc-list-ic cc-tone-violet"><Video /></span>
                  <span className="cc-list-body">
                    <b>{v.student?.name || '—'}</b>
                    <small>{v.company?.companyName} · {v.roundName} · {fmtDateTime(v.interviewDate)}</small>
                  </span>
                  <StatusBadge value={v.result} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="cc-grid-2 mb-4">
        <SectionCard title="Recent applications" subtitle="Latest student applications" icon={<FileText />}
          actions={<Link className="btn btn-ghost btn-sm" to="/tpo/applications">View all</Link>}>
          {apps.loading ? <Loading rows={3} height={48} /> : !(apps.data || []).length ? <Empty title="No applications yet" /> : (
            <div className="cc-stack">
              {(apps.data || []).map((a) => (
                <Link key={a._id} to={`/tpo/applications/${a._id}`} className="cc-list-row">
                  <span className="cc-list-ic cc-tone-amber"><FileText /></span>
                  <span className="cc-list-body">
                    <b>{a.student?.name || '—'}</b>
                    <small>{a.job?.title} · {a.job?.company?.companyName || '—'}</small>
                  </span>
                  <StatusBadge value={a.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent announcements" subtitle="Recently published notices" icon={<Megaphone />}
          actions={<Link className="btn btn-ghost btn-sm" to="/tpo/announcements">Manage</Link>}>
          {anns.loading ? <Loading rows={3} height={48} /> : !recentAnn.length ? <Empty title="No announcements" /> : (
            <div className="cc-stack">
              {recentAnn.map((a) => (
                <div key={a._id} className="cc-list-row">
                  <span className="cc-list-ic cc-tone-primary"><Megaphone /></span>
                  <span className="cc-list-body">
                    <b>{a.title}</b>
                    <small>{fmtDate(a.publishDate || a.createdAt)} · {a.targetRole || 'all'}{a.targetBranch ? ` · ${a.targetBranch}` : ''}</small>
                  </span>
                  <StatusBadge value={a.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent activity" subtitle="Audit trail of placement cell actions" icon={<ScrollText />}>
        {!(dash.data.recent || []).length ? <Empty title="No recent activity" /> : (
          <div className="cc-timeline">
            {(dash.data.recent || []).map((a) => (
              <div key={a._id} className="cc-tl-item">
                <span className="cc-tl-dot cc-tone-primary"><ScrollText /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="small"><b>{a.user?.name || 'System'}</b> · {a.description}</div>
                  <div className="small text-muted">{a.module} · {fmtDateTime(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ================================================================== *
 * Analytics
 * ================================================================== */
const AnalyticsCharts = lazy(() => import('./AnalyticsCharts'));

export function Analytics() {
  const res = useFetch(async () => (await api.get('/tpo/analytics')).data.data, []);
  const s = res.data?.stats;
  return (
    <div>
      <PageHeader eyebrow="Insights" title="Placement Analytics" icon={<TrendingUp />}
        description="Aggregate placement performance across branches, companies, job types and statuses." />
      {res.loading ? <Loading rows={4} height={120} /> : res.error || !res.data
        ? <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
        : (
          <>
            {s && (
              <KpiGrid>
                <KpiCard tone="primary" icon={<Users />} value={s.students} label="Total students" to="/tpo/students" />
                <KpiCard tone="success" icon={<CheckCircle2 />} value={s.eligible} label="Eligible students" />
                <KpiCard tone="info" icon={<FileText />} value={s.apps} label="Applications" to="/tpo/applications" />
                <KpiCard tone="violet" icon={<UserCheck />} value={s.shortlisted} label="Shortlisted" />
                <KpiCard tone="info" icon={<Video />} value={s.interviews} label="Interviews" to="/tpo/interviews" />
                <KpiCard tone="amber" icon={<Award />} value={s.selections} label="Selections" to="/tpo/selections" />
                <KpiCard tone="info" icon={<Mail />} value={s.offers} label="Offers" />
                <KpiCard tone="success" icon={<GraduationCap />} value={s.placed} label="Final placements" to="/tpo/placements" />
                <KpiCard tone="success" icon={<TrendingUp />} value={`${s.rate}%`} label="Placement rate" />
              </KpiGrid>
            )}
            <Suspense fallback={<Loading rows={4} height={120} />}><AnalyticsCharts data={res.data} /></Suspense>
          </>
        )}
    </div>
  );
}

/* ================================================================== *
 * Students
 * ================================================================== */
const STUDENT_STATUS_OPTIONS = [
  { value: 'not_placed', label: 'Not Placed' },
  { value: 'placed', label: 'Placed' },
];

export function Students() {
  const [q, setQ] = useState({ search: '', branch: '', course: '', year: '', status: '', sort: 'name', page: 1 });
  const res = useFetch(async () => (await api.get('/tpo/students', { params: q })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const summary = res.data?.summary || {};
  const facets = res.data?.filters || { branches: [], courses: [], years: [] };
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const clear = () => setQ({ search: '', branch: '', course: '', year: '', status: '', sort: 'name', page: 1 });
  const hasFilter = q.search || q.branch || q.course || q.year || q.status;

  const setStatus = async (user, status) => {
    try {
      await api.patch(`/tpo/students/${user._id}/status`, { status });
      toast.success(`Marked ${user.name} ${status}.`);
      res.reload();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const sortKey = String(q.sort).replace(/^-/, '');
  const sortDir = String(q.sort).startsWith('-') ? 'desc' : 'asc';
  const onSort = (key, dir) => set({ sort: dir === 'desc' ? `-${key}` : key });

  const columns = [
    {
      key: 'name', header: 'Student', sortable: true, render: (r) => (
        <div className="d-flex align-items-center gap-2">
          {r.profile?.profilePhoto
            ? <img src={fileUrl(r.profile.profilePhoto)} alt="" className="cc-avatar" style={{ width: 34, height: 34 }} />
            : <span className="cc-avatar" style={{ width: 34, height: 34, fontSize: '0.75rem' }}>{r.user.name?.[0]?.toUpperCase()}</span>}
          <div style={{ minWidth: 0 }}>
            <Link className="fw-semibold d-block text-truncate" to={`/tpo/students/${r.user._id}`}>{r.user.name}</Link>
            <small className="text-muted d-block text-truncate">{r.user.email}{r.profile?.enrollmentNo ? ` · ${r.profile.enrollmentNo}` : ''}</small>
          </div>
        </div>
      ),
    },
    { key: 'branch', header: 'Branch / Course', sortable: true, render: (r) => (<><div className="fw-medium">{r.profile?.branch || '—'}</div><small className="text-muted">{r.profile?.course || '—'}</small></>) },
    { key: 'cgpa', header: 'CGPA', sortable: true, align: 'right', render: (r) => <b>{r.profile?.cgpa != null ? Number(r.profile.cgpa).toFixed(2) : '—'}</b> },
    { key: 'backlogs', header: 'Backlogs', align: 'right', render: (r) => (Number(r.profile?.backlogs) > 0 ? <span className="cc-badge red">{r.profile.backlogs}</span> : <span className="cc-badge green">0</span>) },
    { key: 'year', header: 'Passing year', sortable: true, render: (r) => r.profile?.passingYear || '—' },
    { key: 'placement', header: 'Placement', render: (r) => <StatusBadge value={r.profile?.placementStatus} /> },
    {
      key: 'actions', header: 'Actions', align: 'right', render: (r) => (
        <div className="d-flex gap-1 justify-content-end" onClick={(e) => e.stopPropagation()}>
          <Link className="btn btn-sm btn-outline-primary" to={`/tpo/students/${r.user._id}`}>View</Link>
          <select className="form-select form-select-sm" style={{ width: 108 }} value={r.user.status}
            aria-label={`Set status for ${r.user.name}`} onChange={(e) => setStatus(r.user, e.target.value)}>
            {['active', 'inactive', 'blocked'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader eyebrow="People" title="Students" icon={<Users />}
        description="Search the student directory, review academic details and manage placement eligibility."
        actions={<Link className="btn btn-outline-secondary btn-sm" to="/tpo/reports"><Download size={15} /> Export</Link>} />

      <KpiGrid>
        <KpiCard tone="primary" icon={<Users />} value={summary.total ?? '—'} label="Filtered students" />
        <KpiCard tone="success" icon={<UserCheck />} value={summary.placed ?? '—'} label="Placed" />
        <KpiCard tone="amber" icon={<Clock />} value={summary.notPlaced ?? '—'} label="Not placed" />
        <KpiCard tone="info" icon={<GraduationCap />} value={summary.avgCgpa ?? '—'} label="Average CGPA" />
      </KpiGrid>

      <Toolbar showClear={!!hasFilter} onClear={clear}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Name, email or enrollment no." label="Student search" />
        <SelectFilter label="Branch" value={q.branch} onChange={(v) => set({ branch: v })} options={facets.branches} />
        <SelectFilter label="Course" value={q.course} onChange={(v) => set({ course: v })} options={facets.courses} />
        <SelectFilter label="Passing year" value={q.year} onChange={(v) => set({ year: v })} options={facets.years} />
        <SelectFilter label="Placement" value={q.status} onChange={(v) => set({ status: v })} options={STUDENT_STATUS_OPTIONS} />
      </Toolbar>

      <DataTable
        columns={columns} rows={rows} loading={res.loading} sort={{ key: sortKey, dir: sortDir }} onSort={onSort}
        empty={hasFilter ? 'No students match your filters' : 'No students found'}
        emptyHint={hasFilter ? 'Try adjusting or clearing your filters.' : 'No student records yet.'}
      />
      <Pager page={res.data?.pagination?.page || 1} pages={res.data?.pagination?.pages} onPage={(p) => setQ({ ...q, page: p })} />
    </div>
  );
}

/* ================================================================== *
 * Student details
 * ================================================================== */
export function StudentDetails() {
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/tpo/students/${id}`)).data.data, [id]);
  const [photoError, setPhotoError] = useState(false);
  if (res.loading) return <Loading rows={4} height={90} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const d = res.data;
  const p = d.profile || {};
  const dlResume = (r) => downloadFile(`/resumes/${r._id}/download`, r.fileName).catch((e) => toast.error(apiErrorMessage(e)));

  const personal = [
    { label: 'Enrollment', value: p.enrollmentNo },
    { label: 'Phone', value: p.phone },
    { label: 'Gender', value: p.gender },
    { label: 'Date of birth', value: p.dob ? fmtDate(p.dob) : '—' },
    { label: 'City', value: p.city },
    { label: 'Address', value: p.address },
  ];
  const academic = [
    { label: 'Course', value: p.course },
    { label: 'Branch', value: p.branch },
    { label: 'Semester', value: p.semester },
    { label: 'Passing year', value: p.passingYear },
    { label: 'CGPA', value: p.cgpa != null ? Number(p.cgpa).toFixed(2) : '—' },
    { label: 'Backlogs', value: p.backlogs },
    { label: 'Profile completion', value: p.profileCompletion != null ? `${p.profileCompletion}%` : '—' },
  ];

  const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

  const photoSrc = !photoError && p.profilePhoto ? fileUrl(p.profilePhoto) : null;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger}>
      <motion.div variants={fadeUp}>
        <Link className="small fw-semibold d-inline-flex align-items-center gap-1 mb-3" to="/tpo/students"><ArrowLeft size={14} /> Back to students</Link>
      </motion.div>

      {/* Hero */}
      <motion.div variants={fadeUp} className="cc-card mb-4 overflow-hidden" style={{ border: '1px solid var(--cc-border)' }}>
        <div
          className="position-relative"
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(15,157,107,0.08) 100%)',
            padding: '24px',
          }}
        >
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <motion.div
              whileHover={{ scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              style={{
                width: 108,
                height: 108,
                borderRadius: '50%',
                padding: 4,
                background: 'linear-gradient(135deg, #4f46e5, #0f9d6b)',
                boxShadow: '0 12px 30px -8px rgba(79,70,229,0.45)',
                flex: '0 0 auto',
              }}
            >
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={`${d.user.name} profile`}
                  onError={() => setPhotoError(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    background: 'var(--cc-surface)',
                    display: 'block',
                  }}
                />
              ) : (
                <span
                  className="cc-avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    fontSize: '2.2rem',
                    borderRadius: '50%',
                    background: 'var(--cc-surface)',
                    color: 'var(--cc-primary)',
                    fontWeight: 700,
                  }}
                >
                  {d.user.name?.[0]?.toUpperCase() || 'S'}
                </span>
              )}
            </motion.div>

            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="h3 mb-1"
                style={{ fontWeight: 750, letterSpacing: '-0.02em' }}
              >
                {d.user.name}
              </motion.h1>
              <div className="d-flex gap-3 flex-wrap small" style={{ color: 'var(--cc-text-2)' }}>
                <span className="d-inline-flex align-items-center gap-1"><Mail size={13} /> {d.user.email}</span>
                {p.phone && <span className="d-inline-flex align-items-center gap-1"><Phone size={13} /> {p.phone}</span>}
                {p.city && <span className="d-inline-flex align-items-center gap-1"><MapPin size={13} /> {p.city}</span>}
              </div>
              <div className="d-flex gap-2 flex-wrap mt-3">
                <StatusBadge value={d.user.status} />
                <StatusBadge value={p.placementStatus} />
                {p.profileCompletion != null && (
                  <span className="cc-badge info border-0">
                    <span className="cc-dot" />{p.profileCompletion}% profile
                  </span>
                )}
              </div>
            </div>
          </div>
          {p.about && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="small mb-0 mt-3"
              style={{ whiteSpace: 'pre-wrap', color: 'var(--cc-text-2)', lineHeight: 1.6, maxWidth: '72ch' }}
            >
              {p.about}
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp}>
        <KpiGrid>
          <KpiCard tone="amber" icon={<FileText />} value={(d.applications || []).length} label="Applications" />
          <KpiCard tone="violet" icon={<Video />} value={(d.interviews || []).length} label="Interviews" />
          <KpiCard tone="info" icon={<Award />} value={(d.offers || []).length} label="Offers" />
          <KpiCard tone="success" icon={<UserCheck />} value={(d.placements || []).length} label="Placements" />
        </KpiGrid>
      </motion.div>

      {/* Info */}
      <motion.div variants={fadeUp} className="cc-grid-2 mb-4">
        <SectionCard title="Personal information" icon={<Users />}>
          <DetailGrid items={personal} columns={1} />
        </SectionCard>
        <SectionCard title="Academic information" icon={<GraduationCap />}>
          <DetailGrid items={academic} columns={1} />
        </SectionCard>
      </motion.div>

      {/* Skills + Resumes */}
      <motion.div variants={fadeUp} className="cc-grid-2 mb-4">
        <SectionCard title={`Skills (${(d.skills || []).length})`} icon={<CheckCircle2 />}>
          {!(d.skills || []).length ? <Empty title="No skills added" /> : (
            <div className="d-flex flex-wrap gap-2">
              {(d.skills || []).map((s, i) => (
                <motion.span
                  key={s._id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="cc-badge violet"
                  whileHover={{ scale: 1.06, y: -2 }}
                >
                  <span className="cc-dot" />{s.skill?.skillName} · {s.proficiency}
                </motion.span>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title={`Resumes (${(d.resumes || []).length})`} icon={<Download />}>
          {!(d.resumes || []).length ? <Empty title="No resume uploaded" /> : (
            <div className="cc-stack gap-1">
              {(d.resumes || []).map((r) => (
                <motion.button
                  key={r._id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => dlResume(r)}
                >
                  <Download size={14} /> <span className="text-truncate">{r.fileName}</span>
                </motion.button>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Education + Projects/Certs */}
      <motion.div variants={fadeUp} className="cc-grid-2 mb-4">
        <SectionCard title={`Education (${(d.education || []).length})`} icon={<GraduationCap />}>
          {!(d.education || []).length ? <Empty title="No education records" /> : (
            <div className="cc-stack">
              {(d.education || []).map((e, i) => (
                <motion.div
                  key={e._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="cc-list-row"
                >
                  <span className="cc-list-ic cc-tone-info"><GraduationCap /></span>
                  <span className="cc-list-body"><b>{e.qualification}</b><small>{e.institute}{e.passingYear ? ` · ${e.passingYear}` : ''}{e.result ? ` · ${e.result}` : ''}</small></span>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title={`Projects & Certifications`} icon={<ScrollText />}>
          <h3 className="cc-mini-title">Projects ({(d.projects || []).length})</h3>
          {!(d.projects || []).length ? <div className="small text-muted mb-3">—</div> : (
            <div className="cc-stack mb-3">
              {(d.projects || []).map((pr) => (
                <motion.div key={pr._id} whileHover={{ x: 3 }} className="border-bottom py-2">
                  <b className="d-block">{pr.title}</b>
                  {pr.technologies && <small className="text-muted d-block">{pr.technologies}</small>}
                </motion.div>
              ))}
            </div>
          )}
          <h3 className="cc-mini-title">Certifications ({(d.certifications || []).length})</h3>
          {!(d.certifications || []).length ? <div className="small text-muted">—</div> : (
            <div className="cc-stack">
              {(d.certifications || []).map((c) => (
                <motion.div key={c._id} whileHover={{ x: 3 }} className="border-bottom py-2">
                  <b>{c.name}</b><small className="text-muted d-block">{c.issuingOrganization}</small>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Applications + Interviews/Offers/Placements */}
      <motion.div variants={fadeUp} className="cc-grid-2">
        <SectionCard title={`Applications (${(d.applications || []).length})`} icon={<FileText />}>
          {!(d.applications || []).length ? <Empty title="No applications" /> : (
            <div className="cc-stack">
              {(d.applications || []).map((a, i) => (
                <motion.div
                  key={a._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="cc-list-row"
                >
                  <span className="cc-list-ic cc-tone-amber"><FileText /></span>
                  <span className="cc-list-body"><b>{a.job?.title || '—'}</b><small>{a.job?.company?.companyName || '—'} · {fmtDate(a.appliedAt || a.createdAt)}</small></span>
                  <StatusBadge value={a.status} />
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Interviews, offers & placements" icon={<Award />}>
          <h3 className="cc-mini-title">Interviews ({(d.interviews || []).length})</h3>
          {!(d.interviews || []).length ? <div className="small text-muted mb-3">—</div> : (d.interviews || []).map((iv, i) => (
            <motion.div
              key={iv._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="d-flex justify-content-between gap-2 border-bottom py-2 small"
            >
              <span>{iv.company?.companyName} · {iv.roundName} · {fmtDate(iv.interviewDate)}</span><StatusBadge value={iv.status} />
            </motion.div>
          ))}
          <h3 className="cc-mini-title mt-3">Offers ({(d.offers || []).length})</h3>
          {!(d.offers || []).length ? <div className="small text-muted mb-3">—</div> : (d.offers || []).map((o, i) => (
            <motion.div
              key={o._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="d-flex justify-content-between gap-2 border-bottom py-2 small"
            >
              <span>{o.position} · {o.company?.companyName}</span><StatusBadge value={o.status} />
            </motion.div>
          ))}
          <h3 className="cc-mini-title mt-3">Placements ({(d.placements || []).length})</h3>
          {!(d.placements || []).length ? <div className="small text-muted">—</div> : (d.placements || []).map((pl, i) => (
            <motion.div
              key={pl._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="d-flex justify-content-between gap-2 border-bottom py-2 small"
            >
              <span>{pl.position || pl.company?.companyName} · {pl.company?.companyName}</span><StatusBadge value={pl.status} />
            </motion.div>
          ))}
        </SectionCard>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== *
 * Companies
 * ================================================================== */
const COMPANY_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export function Companies() {
  const res = useFetch(async () => (await api.get('/tpo/companies')).data.data, []);
  const [q, setQ] = useState({ search: '', status: '', page: 1 });
  const verify = async (id, status) => {
    const ok = await confirmAction({ title: `Mark company as ${status}?`, text: 'This will notify the company and be recorded in the audit log.', icon: 'question', confirmButtonText: 'Confirm' });
    if (!ok) return;
    try { await api.post(`/tpo/companies/${id}/verify`, { status }); toast.success('Company status updated.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  if (res.loading) return <Loading rows={4} height={70} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const all = res.data || [];
  const s = q.search.trim().toLowerCase();
  const filtered = all.filter(({ company }) => (!q.status || company.verificationStatus === q.status) && (!s || company.companyName.toLowerCase().includes(s) || (company.user?.email || '').toLowerCase().includes(s)));
  const cnt = (v) => all.filter(({ company }) => company.verificationStatus === v).length;
  const limit = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(q.page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);

  return (
    <div>
      <PageHeader eyebrow="People" title="Companies" icon={<Building2 />}
        description="Review recruiter profiles, verify registrations and monitor hiring activity."
        meta={<> <StatusBadge value={`${cnt('pending')} pending`} dot={false} /> <StatusBadge value={`${cnt('verified')} verified`} dot={false} /> </>} />

      <KpiGrid>
        <KpiCard tone="primary" icon={<Building2 />} value={all.length} label="Total companies" />
        <KpiCard tone="amber" icon={<Clock />} value={cnt('pending')} label="Pending verification" onClick={() => setQ({ ...q, status: 'pending', page: 1 })} />
        <KpiCard tone="success" icon={<ShieldCheck />} value={cnt('verified')} label="Verified" onClick={() => setQ({ ...q, status: 'verified', page: 1 })} />
        <KpiCard tone="danger" icon={<Building2 />} value={cnt('rejected') + cnt('suspended')} label="Rejected / suspended" />
      </KpiGrid>

      <Toolbar showClear={!!(q.search || q.status)} onClear={() => setQ({ search: '', status: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => setQ({ ...q, search: v, page: 1 })} placeholder="Company name or email" label="Company search" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => setQ({ ...q, status: v, page: 1 })} options={COMPANY_STATUSES} />
      </Toolbar>

      <DataTable
        rows={rows} empty="No companies match"
        columns={[
          { key: 'name', header: 'Company', width: '250px', render: ({ company }) => (<div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}><span className="cc-avatar" style={{ width: 34, height: 34, fontSize: '0.75rem', flex: '0 0 auto' }}>{company.companyName?.[0]?.toUpperCase()}</span><div style={{ minWidth: 0, flex: 1 }}><Link className="fw-semibold d-block text-truncate" to={`/tpo/companies/${company._id}`} title={company.companyName}>{company.companyName}</Link><small className="text-muted d-block text-truncate" title={company.user?.email}>{company.user?.email || '—'}</small></div></div>) },
          { key: 'industry', header: 'Industry', width: '130px', render: ({ company }) => company.industry || '—' },
          { key: 'city', header: 'City', width: '110px', render: ({ company }) => company.city || '—' },
          { key: 'jobs', header: 'Approved jobs', align: 'right', width: '95px', render: ({ approvedJobs }) => approvedJobs },
          { key: 'docs', header: 'Docs', align: 'right', width: '70px', render: ({ docs }) => docs },
          { key: 'status', header: 'Status', width: '120px', render: ({ company }) => <StatusBadge value={company.verificationStatus} /> },
          { key: 'actions', header: 'Actions', align: 'right', width: '190px', render: ({ company }) => (
            <div className="d-flex gap-1 justify-content-end flex-wrap">
              <Link className="btn btn-sm btn-outline-primary" to={`/tpo/companies/${company._id}`}>View</Link>
              {company.verificationStatus !== 'verified' && <button className="btn btn-sm btn-success" onClick={() => verify(company._id, 'verified')}>Verify</button>}
              {company.verificationStatus !== 'rejected' && <button className="btn btn-sm btn-outline-danger" onClick={() => verify(company._id, 'rejected')}>Reject</button>}
            </div>
          ) },
        ]}
      />
      <Pager page={cur} pages={pages} onPage={(p) => setQ({ ...q, page: p })} />
    </div>
  );
}

/* ================================================================== *
 * Company details
 * ================================================================== */
export function CompanyDetails() {
  const { id } = useParams();
  const [logoError, setLogoError] = useState(false);
  const res = useFetch(async () => (await api.get(`/tpo/companies/${id}`)).data.data, [id]);
  const decide = async (status) => {
    const ok = await confirmAction({ title: `Mark company as ${status}?`, text: 'This will notify the company and be recorded in the audit log.', icon: 'question', confirmButtonText: 'Confirm' });
    if (!ok) return;
    try { await api.post(`/tpo/companies/${id}/verify`, { status }); toast.success('Company status updated.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  if (res.loading) return <Loading rows={4} height={90} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const { company: c, docs, jobs, drives, counts } = res.data;
  const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  const logoSrc = !logoError && c.logo ? fileUrl(c.logo) : null;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger}>
      <motion.div variants={fadeUp}>
        <Link className="small fw-semibold d-inline-flex align-items-center gap-1 mb-3" to="/tpo/companies"><ArrowLeft size={14} /> Back to companies</Link>
      </motion.div>

      {/* Hero */}
      <motion.div variants={fadeUp} className="cc-card mb-4 overflow-hidden" style={{ border: '1px solid var(--cc-border)' }}>
        <div
          className="p-4"
          style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.10) 0%, rgba(15,157,107,0.06) 100%)' }}
        >
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              style={{
                width: 88,
                height: 88,
                borderRadius: 18,
                padding: 4,
                background: 'linear-gradient(135deg, #4f46e5, #0f9d6b)',
                boxShadow: '0 12px 30px -8px rgba(79,70,229,0.45)',
                flex: '0 0 auto',
              }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={`${c.companyName} logo`}
                  onError={() => setLogoError(true)}
                  style={{ width: '100%', height: '100%', borderRadius: 14, objectFit: 'cover', background: 'var(--cc-surface)', display: 'block' }}
                />
              ) : (
                <span
                  className="cc-avatar"
                  style={{ width: '100%', height: '100%', borderRadius: 14, fontSize: '1.8rem', background: 'var(--cc-surface)', color: 'var(--cc-primary)', fontWeight: 700 }}
                >
                  {c.companyName?.[0]?.toUpperCase() || 'C'}
                </span>
              )}
            </motion.div>

            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="h3 mb-1"
                style={{ fontWeight: 750, letterSpacing: '-0.02em' }}
              >
                {c.companyName}
              </motion.h1>
              <div className="small" style={{ color: 'var(--cc-text-2)' }}>
                {c.user?.email}{c.phone ? ` · ${c.phone}` : ''}
              </div>
              <div className="small" style={{ color: 'var(--cc-text-2)' }}>
                {c.industry || '—'}{c.city ? ` · ${c.city}` : ''}
                {c.website ? <> · <a href={c.website} target="_blank" rel="noreferrer">Website <ExternalLink size={12} /></a></> : ''}
              </div>
              <div className="d-flex gap-2 flex-wrap mt-3">
                <StatusBadge value={c.verificationStatus} />
                <StatusBadge value={c.user?.status} />
              </div>
            </div>
          </div>
          {c.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="small mb-0 mt-3"
              style={{ color: 'var(--cc-text-2)', lineHeight: 1.6, maxWidth: '76ch' }}
            >
              {c.description}
            </motion.p>
          )}
          <div className="d-flex gap-2 mt-3 flex-wrap">
            {c.verificationStatus !== 'verified' && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn btn-sm btn-success" onClick={() => decide('verified')}>
                <ShieldCheck size={14} /> Verify
              </motion.button>
            )}
            {c.verificationStatus !== 'rejected' && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn btn-sm btn-outline-danger" onClick={() => decide('rejected')}>
                Reject
              </motion.button>
            )}
            {c.verificationStatus !== 'suspended' && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn btn-sm btn-outline-secondary" onClick={() => decide('suspended')}>
                Suspend
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp}>
        <KpiGrid>
          <KpiCard tone="info" icon={<Briefcase />} value={counts.approvedJobs} label="Approved jobs" />
          <KpiCard tone="success" icon={<Briefcase />} value={counts.openJobs} label="Open jobs" />
          <KpiCard tone="amber" icon={<FileText />} value={counts.appsTotal} label="Applications" />
          <KpiCard tone="violet" icon={<UserCheck />} value={counts.selectedCnt} label="Selected" />
          <KpiCard tone="primary" icon={<Award />} value={counts.placementsCnt} label="Placements" />
        </KpiGrid>
      </motion.div>

      {/* Docs + Drives */}
      <motion.div variants={fadeUp} className="cc-grid-2 mb-4">
        <SectionCard title={`Verification documents (${docs.length})`} icon={<ScrollText />}>
          {!docs.length ? <Empty title="No documents uploaded" /> : (
            <div className="cc-stack">
              {docs.map((d, i) => (
                <motion.div
                  key={d._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="cc-list-row"
                >
                  <span className="cc-list-ic cc-tone-info"><FileText /></span>
                  <span className="cc-list-body"><b>{d.documentType}</b><small>{d.documentName}</small></span>
                  <StatusBadge value={d.status || d.verificationStatus} />
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title={`Recent drives (${drives.length})`} icon={<CalendarDays />}>
          {!drives.length ? <Empty title="No drives yet" /> : (
            <div className="cc-stack">
              {drives.map((d, i) => (
                <motion.div
                  key={d._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="cc-list-row"
                >
                  <span className="cc-list-ic cc-tone-violet"><CalendarDays /></span>
                  <span className="cc-list-body"><b>{d.driveTitle}</b><small>{fmtDate(d.driveDate)}</small></span>
                  <StatusBadge value={d.status} />
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Jobs */}
      <motion.div variants={fadeUp}>
        <SectionCard title={`Jobs (${jobs.length})`} icon={<Briefcase />}>
          {!jobs.length ? <Empty title="No jobs posted" /> : (
            <DataTable
              rows={jobs}
              columns={[
                { key: 'title', header: 'Job title', render: (j) => <b>{j.title}</b> },
                { key: 'location', header: 'Location', render: (j) => j.location || '—' },
                { key: 'type', header: 'Type', render: (j) => j.jobType || '—' },
                { key: 'apps', header: 'Applications', align: 'right', render: (j) => j.appsCount ?? 0 },
                { key: 'approval', header: 'Approval', render: (j) => <StatusBadge value={j.approvalStatus} /> },
              ]}
            />
          )}
        </SectionCard>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== *
 * Jobs & approvals
 * ================================================================== */
export function Jobs() {
  const [f, setF] = useState({ approvalStatus: 'pending', jobType: '', search: '', page: 1 });
  const res = useFetch(async () => (await api.get('/tpo/jobs', { params: f })).data, [JSON.stringify(f)]);
  const rows = res.data?.data || [];
  const [busy, setBusy] = useState(null);

  const approve = async (job, status) => {
    let rejectionReason = '';
    if (status === 'rejected') {
      const r = await promptReject(job.title);
      if (r === null) return;
      rejectionReason = r;
    } else {
      const ok = await confirmAction({ title: `Approve "${job.title}"?`, text: 'The company will be notified and the job will go live.', icon: 'question', confirmButtonText: 'Approve' });
      if (!ok) return;
    }
    setBusy(job._id);
    try { await api.post(`/tpo/jobs/${job._id}/approve`, { status, rejectionReason }); toast.success(`Job ${status}.`); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(null); }
  };

  const set = (patch) => setF((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  return (
    <div>
      <PageHeader eyebrow="People" title="Jobs & Approvals" icon={<Briefcase />}
        description="Moderate recruiter job postings before they become visible to students." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<Briefcase />} value={res.data?.pagination?.total ?? '—'} label="Jobs in view" />
        <KpiCard tone="amber" icon={<FileText />} value={rows.reduce((n, j) => n + (j.appsCount || 0), 0)} label="Applications (page)" />
        <KpiCard tone="violet" icon={<TrendingUp />} value={res.data?.pagination?.pages ?? 1} label="Pages" />
      </KpiGrid>

      <Toolbar showClear={!!(f.search || f.jobType || f.approvalStatus !== 'pending')} onClear={() => setF({ approvalStatus: 'pending', jobType: '', search: '', page: 1 })}>
        <SearchInput value={f.search} onChange={(v) => set({ search: v })} placeholder="Search job title" label="Job search" />
        <SelectFilter label="Approval" placeholder="All" value={f.approvalStatus} onChange={(v) => set({ approvalStatus: v })} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
        <SelectFilter label="Type" value={f.jobType} onChange={(v) => set({ jobType: v })} options={['Full Time', 'Part Time', 'Internship', 'Fresher', 'Experienced']} />
      </Toolbar>

      <DataTable
        rows={rows} loading={res.loading} empty="No jobs match"
        columns={[
          { key: 'title', header: 'Job', render: (j) => (<div><b>{j.title}</b><small className="text-muted d-block">{j.company?.companyName} · {j.location || '—'}</small></div>) },
          { key: 'type', header: 'Type', render: (j) => <StatusBadge value={j.jobType} dot={false} /> },
          { key: 'apps', header: 'Applications', align: 'right', render: (j) => j.appsCount ?? 0 },
          { key: 'deadline', header: 'Deadline', render: (j) => fmtDate(j.deadline) },
          { key: 'status', header: 'Status', render: (j) => <div className="d-flex gap-1 flex-wrap"><StatusBadge value={j.approvalStatus} /><StatusBadge value={j.status} /></div> },
          { key: 'actions', header: 'Actions', align: 'right', render: (j) => (
            j.approvalStatus === 'pending' ? (
              <div className="d-flex gap-1 justify-content-end">
                <button className="btn btn-sm btn-success" disabled={busy === j._id} onClick={() => approve(j, 'approved')}>{busy === j._id ? <Spinner /> : 'Approve'}</button>
                <button className="btn btn-sm btn-outline-danger" disabled={busy === j._id} onClick={() => approve(j, 'rejected')}>Reject</button>
              </div>
            ) : j.rejectionReason ? <small className="text-danger">Reason: {j.rejectionReason}</small> : <span className="text-muted small">—</span>
          ) },
        ]}
      />
      <Pager page={res.data?.pagination?.page || 1} pages={res.data?.pagination?.pages} onPage={(p) => setF({ ...f, page: p })} />
    </div>
  );
}

async function promptReject(title) {
  const r = await Swal.fire(swalBase({
    title: `Reject "${title}"?`, input: 'textarea', inputLabel: 'Rejection reason (min 5 chars)',
    showCancelButton: true, confirmButtonText: 'Reject', cancelButtonText: 'Cancel',
    inputValidator: (v) => (v && v.trim().length >= 5 ? null : 'Please provide at least 5 characters.'),
  }));
  return r.isConfirmed ? r.value : null;
}
