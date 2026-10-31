import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { swalBase } from '../services/alerts';
import api, { apiErrorMessage, downloadFile } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import {
  Empty, Loading, ErrorState, KpiCard, KpiGrid, PageHeader, SectionCard,
  StatusBadge, salaryText, Pager, DetailGrid, SearchInput, SelectFilter, Toolbar, DataTable,
} from '../components/ui';
import {
  Briefcase, FileText, Video, Award, MapPin, Users, Download,
  GraduationCap, Plus, Trash2, ToggleLeft, ToggleRight, ArrowRight, ArrowLeft, Building2,
  Clock, CalendarDays, CheckCircle2, BarChart3, TrendingUp, ExternalLink, Sparkles, XCircle, Laptop, AlertCircle, Check,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const CHART_COLORS = ['var(--cc-primary)', 'var(--cc-info)', 'var(--cc-accent)', 'var(--cc-warning)', 'var(--cc-success)', 'var(--cc-danger)', 'var(--cc-violet)', 'var(--cc-primary-2)'];
const chartTip = {
  contentStyle: { background: 'var(--cc-surface)', border: '1px solid var(--cc-border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--cc-text)' },
  itemStyle: { color: 'var(--cc-text)' },
};
const tick = { fill: 'currentColor', fontSize: 11 };

function chartBars(rows, color, vertical) {
  if (!rows?.length) return <Empty title="No data" hint="Nothing to chart yet." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * (vertical ? 34 : 28))}>
      <BarChart data={rows} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-border)" />
        {vertical
          ? <><XAxis type="number" tick={tick} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={130} tick={tick} axisLine={false} tickLine={false} /></>
          : <><XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval={0} angle={-18} dy={8} height={52} /><YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} /></>}
        <Tooltip {...chartTip} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dashboard() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/company/dashboard')).data.data, []);
  const jobsRes = useFetch(async () => (await api.get('/company/jobs')).data.data, []);
  const ivRes = useFetch(async () => (await api.get('/interviews/company')).data.data, []);
  if (res.loading) return <Loading rows={3} height={80} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const { profile, kpis, recentApps } = res.data;
  const upcoming = (ivRes.data || [])
    .filter((iv) => iv.status === 'scheduled' && new Date(iv.interviewDate) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate))
    .slice(0, 5);
  const recentJobs = (jobsRes.data || []).slice(0, 5);
  return (
    <div className="cc-page">
      <PageHeader
        icon={<Building2 size={20} />}
        title={profile?.companyName || 'Company dashboard'}
        description="Recruitment overview — jobs, applications, interviews and offers at a glance."
        eyebrow="Company / Overview"
        actions={
          <>
            {profile?.verificationStatus !== 'verified' && (
              <Link className="btn btn-warning btn-sm" to="/company/verification">
                Complete verification
              </Link>
            )}
            <Link className="btn btn-primary btn-sm" to="/company/jobs/new">
              <Plus size={15} /> Post job
            </Link>
          </>
        }
      />
      {profile?.verificationStatus !== 'verified' && (
        <div className="alert alert-warning py-2 mb-3">
          Verification status: <b>{profile?.verificationStatus}</b>. Complete{' '}
          <Link to="/company/verification">verification</Link> to post jobs.
        </div>
      )}
      {kpis.pendingJobs > 0 && (
        <div className="alert alert-info py-2 mb-3">
          <b>{kpis.pendingJobs} job{kpis.pendingJobs === 1 ? '' : 's'}</b> awaiting TPO approval.
        </div>
      )}
      <KpiGrid>
        <KpiCard icon={<Briefcase size={18} />} value={kpis.jobs} label="Total jobs" tone="primary" to="/company/jobs" />
        <KpiCard icon={<CheckCircle2 size={18} />} value={kpis.approvedJobs} label="Approved jobs" tone="success" to="/company/jobs" />
        <KpiCard icon={<Clock size={18} />} value={kpis.pendingJobs} label="Pending approval" tone="amber" to="/company/jobs" />
        <KpiCard icon={<FileText size={18} />} value={kpis.applications} label="Applications" tone="info" to="/company/applications" />
        <KpiCard icon={<FileText size={18} />} value={kpis.newApps} label="New applications" tone="amber" to="/company/applications" />
        <KpiCard icon={<Users size={18} />} value={kpis.shortlisted} label="Shortlisted" tone="violet" to="/company/shortlisted" />
        <KpiCard icon={<Video size={18} />} value={kpis.interviews} label="Interviews" tone="violet" to="/company/interviews" />
        <KpiCard icon={<Award size={18} />} value={kpis.offers} label="Pending offers" tone="success" to="/company/offers" />
      </KpiGrid>
      <div className="cc-quick-actions mb-3">
        <Link className="cc-quick-action" to="/company/jobs/new"><Plus size={16} /> Post a job</Link>
        <Link className="cc-quick-action" to="/company/applications"><FileText size={16} /> Review applications</Link>
        <Link className="cc-quick-action" to="/company/interviews/new"><Video size={16} /> Schedule interview</Link>
        <Link className="cc-quick-action" to="/company/offers/new"><Award size={16} /> Draft offer</Link>
        <Link className="cc-quick-action" to="/company/reports"><BarChart3 size={16} /> View reports</Link>
      </div>
      <div className="cc-grid-2">
        <SectionCard
          title="Recent applications"
          subtitle="Latest candidate activity across your jobs"
          icon={<FileText size={16} />}
          actions={<Link className="btn btn-outline-primary btn-sm" to="/company/applications">View all <ArrowRight size={14} /></Link>}
        >
          {!recentApps?.length ? (
            <Empty title="No applications yet" hint="Applications will appear here once candidates apply to your jobs." />
          ) : (
            <div className="d-flex flex-column gap-2">
              {recentApps.map((a) => (
                <Link
                  key={a._id}
                  to={`/company/applications/${a._id}`}
                  className="d-flex justify-content-between align-items-center gap-2 flex-wrap py-2 border-bottom text-decoration-none"
                  style={{ color: 'inherit' }}
                >
                  <span>
                    <b>{a.student?.name}</b>
                    <span className="text-muted small ms-2">→ {a.job?.title}</span>
                  </span>
                  <StatusBadge value={a.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
        <div className="d-flex flex-column gap-3">
          <SectionCard
            title="Recent jobs"
            icon={<Briefcase size={16} />}
            actions={<Link className="btn btn-outline-primary btn-sm" to="/company/jobs">All jobs</Link>}
          >
            {!recentJobs.length ? (
              <Empty title="No jobs yet" hint="Post your first job to start recruiting." />
            ) : (
              <div className="d-flex flex-column gap-1">
                {recentJobs.map(({ job, applications }) => (
                  <Link key={job._id} to={`/company/jobs/${job._id}`} className="d-flex justify-content-between align-items-center py-1 border-bottom text-decoration-none small" style={{ color: 'inherit' }}>
                    <span className="text-truncate" style={{ minWidth: 0 }}>{job.title}</span>
                    <span className="d-flex gap-1 flex-shrink-0"><StatusBadge value={job.status} /> <span className="text-muted">{applications}</span></span>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard
            title="Upcoming interviews"
            icon={<CalendarDays size={16} />}
            actions={<Link className="btn btn-outline-primary btn-sm" to="/company/interviews">All</Link>}
          >
            {ivRes.loading ? <Loading rows={2} height={40} /> : !upcoming.length ? (
              <div className="small text-muted">No upcoming interviews scheduled.</div>
            ) : (
              <div className="d-flex flex-column gap-1">
                {upcoming.map((iv) => (
                  <div key={iv._id} className="d-flex justify-content-between align-items-center py-1 border-bottom small">
                    <span className="text-truncate" style={{ minWidth: 0 }}>{iv.student?.name} · {iv.roundName}</span>
                    <span className="text-muted flex-shrink-0 ms-2">{String(iv.interviewDate).slice(0, 10)} {iv.interviewTime}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export function Jobs() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/company/jobs')).data.data, []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [approval, setApproval] = useState('');
  const [jobType, setJobType] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const toggle = async (id) => { try { await api.post(`/company/jobs/${id}/toggle`); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } };
  const del = async (id) => {
    const r = await Swal.fire(swalBase({ title: 'Delete job?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e11d48' }));
    if (!r.isConfirmed) return;
    try { await api.delete(`/company/jobs/${id}`); toast.success('Job deleted.'); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  if (res.loading) return <Loading rows={4} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const all = res.data || [];
  const search = q.trim().toLowerCase();
  const locations = [...new Set(all.map(({ job }) => job.location).filter(Boolean))];
  let filtered = all.filter(({ job }) => (!status || job.status === status) && (!approval || job.approvalStatus === approval)
    && (!jobType || job.jobType === jobType) && (!location || job.location === location)
    && (!search || job.title.toLowerCase().includes(search) || (job.location || '').toLowerCase().includes(search) || (job.jobType || '').toLowerCase().includes(search)));
  const dir = sort.dir === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((a, b) => {
    const ja = a.job; const jb = b.job;
    if (sort.key === 'applications') return (a.applications - b.applications) * dir;
    const va = ja[sort.key] ?? ''; const vb = jb[sort.key] ?? '';
    if (sort.key === 'deadline' || sort.key === 'createdAt') return (new Date(va) - new Date(vb)) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
  const limit = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
  const count = (k, v) => all.filter(({ job }) => job[k] === v).length;
  const clearFilters = () => { setQ(''); setStatus(''); setApproval(''); setJobType(''); setLocation(''); setPage(1); };
  const hasFilters = !!(q || status || approval || jobType || location);
  const columns = [
    { key: 'title', header: 'Job', sortable: true, render: ({ job }) => (
      <div style={{ minWidth: 0 }}>
        <Link to={`/company/jobs/${job._id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--cc-text)' }}>{job.title}</Link>
        <div className="small text-muted">{job.jobType} · {job.workMode}</div>
        {job.approvalStatus === 'rejected' && job.rejectionReason && <div className="small text-danger">Reason: {job.rejectionReason}</div>}
      </div>
    ) },
    { key: 'location', header: 'Location', sortable: true, render: ({ job }) => <span className="small"><MapPin size={13} className="me-1" style={{ verticalAlign: '-2px' }} />{job.location || '—'}</span> },
    { key: 'applications', header: 'Apps', sortable: true, align: 'right', render: ({ applications }) => <b>{applications}</b> },
    { key: 'deadline', header: 'Deadline', sortable: true, render: ({ job }) => <span className="small">{String(job.deadline).slice(0, 10)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: ({ job }) => <div className="d-flex gap-1 flex-wrap"><StatusBadge value={job.status} /><StatusBadge value={job.approvalStatus} /></div> },
    { key: 'actions', header: '', render: ({ job }) => (
      <div className="d-flex gap-1 flex-wrap">
        <Link className="btn btn-sm btn-outline-primary" to={`/company/jobs/${job._id}/edit`}>Edit</Link>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => toggle(job._id)}>
          {job.status === 'Open' ? <><ToggleLeft size={14} /> Close</> : <><ToggleRight size={14} /> Reopen</>}
        </button>
        <button className="btn btn-sm btn-outline-danger" onClick={() => del(job._id)} aria-label="Delete job"><Trash2 size={14} /></button>
      </div>
    ) },
  ];
  return (
    <div className="cc-page">
      <PageHeader
        icon={<Briefcase size={20} />}
        title="Jobs"
        description="Manage your job postings, approvals and application counts."
        eyebrow="Company / Jobs"
        actions={<Link className="btn btn-primary btn-sm" to="/company/jobs/new"><Plus size={15} /> Post job</Link>}
      />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className={`cc-badge ${status === '' && approval === '' && !jobType && !location ? 'primary' : 'gray'} border-0`} onClick={clearFilters} style={{ cursor: 'pointer' }}>All {all.length}</button>
        <button className={`cc-badge ${status === 'Open' ? 'green' : 'gray'} border-0`} onClick={() => { setStatus(status === 'Open' ? '' : 'Open'); setPage(1); }} style={{ cursor: 'pointer' }}>Open {count('status', 'Open')}</button>
        <button className={`cc-badge ${status === 'Closed' ? 'red' : 'gray'} border-0`} onClick={() => { setStatus(status === 'Closed' ? '' : 'Closed'); setPage(1); }} style={{ cursor: 'pointer' }}>Closed {count('status', 'Closed')}</button>
        <button className={`cc-badge ${approval === 'approved' ? 'green' : 'gray'} border-0`} onClick={() => { setApproval(approval === 'approved' ? '' : 'approved'); setPage(1); }} style={{ cursor: 'pointer' }}>Approved {count('approvalStatus', 'approved')}</button>
        <button className={`cc-badge ${approval === 'pending' ? 'amber' : 'gray'} border-0`} onClick={() => { setApproval(approval === 'pending' ? '' : 'pending'); setPage(1); }} style={{ cursor: 'pointer' }}>Pending {count('approvalStatus', 'pending')}</button>
        <button className={`cc-badge ${approval === 'rejected' ? 'red' : 'gray'} border-0`} onClick={() => { setApproval(approval === 'rejected' ? '' : 'rejected'); setPage(1); }} style={{ cursor: 'pointer' }}>Rejected {count('approvalStatus', 'rejected')}</button>
      </div>
      <Toolbar showClear={hasFilters} onClear={clearFilters}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search title, location or type…" />
        <SelectFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['Open', 'Closed']} placeholder="All statuses" label="status" />
        <SelectFilter value={approval} onChange={(v) => { setApproval(v); setPage(1); }} options={['pending', 'approved', 'rejected']} placeholder="All approvals" label="approval" />
        <SelectFilter value={jobType} onChange={(v) => { setJobType(v); setPage(1); }} options={['Full Time', 'Part Time', 'Internship', 'Fresher', 'Experienced']} placeholder="All types" label="type" />
        <SelectFilter value={location} onChange={(v) => { setLocation(v); setPage(1); }} options={locations} placeholder="All locations" label="location" />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={rows}
        loading={false}
        empty={all.length ? 'No jobs match your filters' : 'No jobs posted yet'}
        emptyHint={all.length ? 'Try clearing filters.' : 'Post your first job to start recruiting.'}
        sort={sort}
        onSort={(key, dir2) => setSort({ key, dir: dir2 })}
      />
      {!all.length && (
        <div className="mt-3"><Link className="btn btn-primary btn-sm" to="/company/jobs/new"><Plus size={14} /> Post job</Link></div>
      )}
      <Pager page={cur} pages={pages} onPage={setPage} />
    </div>
  );
}

export function JobDetails() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/company/jobs/${id}`)).data.data, [id]);
  const appsRes = useFetch(async () => (await api.get('/company/applications', { params: { jobId: id } })).data.data, [id]);
  if (res.loading) return <Loading rows={4} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const { job, skills, applications } = res.data;
  const items = [
    { label: 'Location', value: job.location || '—' },
    { label: 'Experience', value: job.experience || '—' },
    { label: 'Salary', value: salaryText(job) },
    { label: 'Vacancies', value: job.vacancies ?? '—' },
    { label: 'Deadline', value: String(job.deadline).slice(0, 10) },
    { label: 'Applications', value: applications },
    { label: 'Job type', value: job.jobType },
    { label: 'Work mode', value: job.workMode },
  ];
  const appColumns = [
    { key: 'student', header: 'Candidate', render: ({ application: a }) => (
      <div style={{ minWidth: 0 }}>
        <Link to={`/company/applications/${a._id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--cc-text)' }}>{a.student?.name}</Link>
        <div className="small text-muted">{a.student?.email}</div>
      </div>
    ) },
    { key: 'appliedAt', header: 'Applied', render: ({ application: a }) => <span className="small">{String(a.appliedAt).slice(0, 10)}</span> },
    { key: 'match', header: 'Match', align: 'right', render: ({ match }) => <span className="cc-badge violet">{match?.score ?? 0}%</span> },
    { key: 'status', header: 'Status', render: ({ application: a }) => <StatusBadge value={a.status} /> },
    { key: 'open', header: '', render: ({ application: a }) => <Link className="btn btn-sm btn-outline-primary" to={`/company/applications/${a._id}`}>View</Link> },
  ];
  return (
    <div className="cc-page">
      <Link className="small fw-semibold text-decoration-none" to="/company/jobs">← Back to jobs</Link>
      <PageHeader
        icon={<Briefcase size={20} />}
        title={job.title}
        description={job.description?.slice(0, 140)}
        eyebrow="Company / Jobs / Details"
        actions={
          <>
            <Link className="btn btn-primary btn-sm" to={`/company/jobs/${job._id}/edit`}>Edit job</Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/company/jobs">Back</Link>
          </>
        }
      />
      <div className="d-flex gap-2 flex-wrap mb-3">
        <StatusBadge value={job.status} />
        <StatusBadge value={job.approvalStatus} />
        <StatusBadge value={job.jobType} />
        <StatusBadge value={job.workMode} />
      </div>
      {job.approvalStatus === 'rejected' && job.rejectionReason && (
        <div className="alert alert-danger py-2 mb-3">Rejection reason: {job.rejectionReason}</div>
      )}
      <SectionCard title="Job information" icon={<Briefcase size={16} />}>
        <DetailGrid items={items} columns={2} />
        {job.qualification && <p className="small mt-3 mb-0"><b>Qualification:</b> {job.qualification}</p>}
        {!!skills?.length && <p className="small mt-2 mb-0"><b>Required skills:</b> {skills.map((s) => s.skill?.skillName).filter(Boolean).join(', ')}</p>}
        {job.description && (
          <>
            <h3 className="h6 mt-3">Description</h3>
            <p className="small mb-0" style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </>
        )}
      </SectionCard>
      <SectionCard
        title={`Applications (${applications})`}
        subtitle="All candidates who applied to this job"
        icon={<FileText size={16} />}
        actions={<Link className="btn btn-outline-primary btn-sm" to="/company/applications">View all</Link>}
      >
        <DataTable
          columns={appColumns}
          rows={appsRes.data || []}
          loading={appsRes.loading}
          empty="No applications yet"
          emptyHint="Applications will appear here once candidates apply."
        />
      </SectionCard>
    </div>
  );
}

export function JobForm() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [f, setF] = useState({
    title: '', description: '', qualification: '', experience: 'Fresher',
    salaryMin: '', salaryMax: '', location: '', jobType: 'Full Time',
    workMode: 'Onsite', vacancies: 1, deadline: '', internshipDuration: '', stipend: '',
  });
  const [skillList, setSkillList] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loaded, setLoaded] = useState(!isEdit);
  const [busy, setBusy] = useState(false);

  useFetch(async () => {
    if (isEdit) {
      const { data } = await api.get(`/jobs/${id}`);
      const j = data.data.job;
      setF({
        ...j,
        deadline: j.deadline?.slice(0, 10),
        salaryMin: j.salaryMin || '',
        salaryMax: j.salaryMax || '',
        internshipDuration: j.internshipDuration || '',
        stipend: j.stipend || '',
        experience: j.experience || 'Fresher',
      });
      setSkillList((data.data.skills || []).map((s) => s.skill?.skillName).filter(Boolean));
      setLoaded(true);
    }
    return null;
  }, [id]);

  const addSkill = () => {
    const v = skillInput.trim().replace(/,$/, '');
    if (v && !skillList.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSkillList([...skillList, v]);
    }
    setSkillInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = {
      ...f,
      salaryMin: f.salaryMin ? +f.salaryMin : null,
      salaryMax: f.salaryMax ? +f.salaryMax : null,
      vacancies: +f.vacancies || 1,
      internshipDuration: f.jobType === 'Internship' ? (f.internshipDuration || null) : null,
      stipend: f.jobType === 'Internship' ? (f.stipend || null) : null,
      skills: skillList.length ? skillList.map((s) => ({ skillName: s })) : undefined,
    };
    try {
      if (isEdit) await api.patch(`/company/jobs/${id}`, body);
      else await api.post('/company/jobs', body);
      toast.success(isEdit ? 'Job updated successfully.' : 'Job submitted for TPO approval.');
      navigate('/company/jobs');
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <Loading rows={4} height={80} />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="w-100" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link className="small fw-semibold d-inline-flex align-items-center gap-1 text-decoration-none text-muted" to="/company/jobs">
          <ArrowLeft size={15} /> Back to Job Listings
        </Link>
        <span className="cc-badge violet d-inline-flex align-items-center gap-1">
          <Sparkles size={12} /> {isEdit ? 'Edit Role Specification' : 'Campus Hiring Creator'}
        </span>
      </div>

      <PageHeader
        icon={<Briefcase size={22} />}
        title={isEdit ? `Edit Job: ${f.title || 'Untitled'}` : 'Post a New Job Opportunity'}
        description="New job postings are automatically submitted for TPO review and approval before becoming visible to student applicants."
        eyebrow="Company / Jobs"
      />

      <form onSubmit={submit} className="w-100" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="row g-4 w-100 m-0">
          {/* Main 8-col form fields */}
          <div className="col-12 col-xl-8 p-0 pe-xl-3">
            {/* 1. Basics Card */}
            <SectionCard
              title="Role Overview & Description"
              subtitle="Job title, comprehensive role responsibilities, qualification and location"
              icon={<Briefcase size={18} />}
              className="mb-4"
            >
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Job Title <span className="text-danger">*</span></label>
                  <input
                    required
                    className="form-control"
                    placeholder="e.g. Associate Software Engineer / Data Analyst"
                    value={f.title}
                    onChange={set('title')}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Job Description & Responsibilities <span className="text-danger">*</span></label>
                  <textarea
                    required
                    className="form-control"
                    rows={5}
                    placeholder="Provide a detailed description of the day-to-day responsibilities, tech stack, and ideal candidate profile..."
                    value={f.description}
                    onChange={set('description')}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Job Location <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent text-muted"><MapPin size={16} /></span>
                    <input
                      required
                      className="form-control"
                      placeholder="e.g. Bangalore, Mumbai or Remote"
                      value={f.location}
                      onChange={set('location')}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Minimum Educational Qualification</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent text-muted"><GraduationCap size={16} /></span>
                    <input
                      className="form-control"
                      placeholder="e.g. B.Tech / BE in CSE, IT, ECE or MCA"
                      value={f.qualification || ''}
                      onChange={set('qualification')}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* 2. Employment & Schedule */}
            <SectionCard
              title="Employment Terms & Application Window"
              subtitle="Job classification, work model, experience requirements, and submission deadline"
              icon={<Users size={18} />}
              className="mb-4"
            >
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Job Type</label>
                  <select className="form-select" value={f.jobType} onChange={set('jobType')}>
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Internship</option>
                    <option>Fresher</option>
                    <option>Experienced</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Work Mode</label>
                  <select className="form-select" value={f.workMode} onChange={set('workMode')}>
                    <option>Onsite</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Target Experience</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Fresher / 0-2 years"
                    value={f.experience || ''}
                    onChange={set('experience')}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Application Deadline <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent text-muted"><CalendarDays size={16} /></span>
                    <input
                      required
                      type="date"
                      className="form-control"
                      value={f.deadline}
                      onChange={set('deadline')}
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Open Vacancies</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={f.vacancies}
                    onChange={set('vacancies')}
                  />
                </div>

                {f.jobType === 'Internship' && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Internship Duration</label>
                      <input
                        className="form-control"
                        placeholder="e.g. 6 Months"
                        value={f.internshipDuration}
                        onChange={set('internshipDuration')}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Monthly Stipend</label>
                      <input
                        className="form-control"
                        placeholder="e.g. ₹25,000 / month"
                        value={f.stipend}
                        onChange={set('stipend')}
                      />
                    </div>
                  </>
                )}
              </div>
            </SectionCard>

            {/* 3. Compensation & Skills */}
            <SectionCard
              title="Compensation Package & Skill Requirements"
              subtitle="Salary range brackets in LPA and keyword skills required from applicants"
              icon={<Award size={18} />}
              className="mb-4"
            >
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Minimum CTC / Salary (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    placeholder="e.g. 6.0"
                    value={f.salaryMin}
                    onChange={set('salaryMin')}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Maximum CTC / Salary (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    placeholder="e.g. 12.0"
                    value={f.salaryMax}
                    onChange={set('salaryMax')}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Required Technical Skills & Competencies</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {skillList.map((s) => (
                      <span key={s} className="cc-badge violet d-inline-flex align-items-center gap-1 py-1 px-2">
                        {s}
                        <button
                          type="button"
                          className="border-0 bg-transparent p-0 ms-1 text-danger fw-bold"
                          onClick={() => setSkillList(skillList.filter((x) => x !== s))}
                          aria-label={`Remove ${s}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {!skillList.length && (
                      <span className="text-muted small">No skills added yet. Type below and press Enter.</span>
                    )}
                  </div>
                  <input
                    className="form-control"
                    placeholder="Type skill (e.g. React, Python, Docker) and press Enter or comma"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    onBlur={addSkill}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Sticky 4-col live summary & submission panel */}
          <div className="col-12 col-xl-4 p-0 ps-xl-2">
            <div className="cc-card cc-section position-sticky" style={{ top: '88px' }}>
              <div className="p-4">
                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                  <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">Role Live Summary</h6>
                    <small className="text-muted">Live applicant preview</small>
                  </div>
                </div>

                <div className="d-flex flex-column gap-3 mb-4 small">
                  <div>
                    <span className="text-muted d-block mb-1">Target Position:</span>
                    <strong className="fs-6 text-body">{f.title || 'Untitled Opening'}</strong>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Type & Mode:</span>
                    <span className="fw-semibold">{f.jobType} • {f.workMode}</span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Location:</span>
                    <span className="fw-semibold">{f.location || 'Not set'}</span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Compensation:</span>
                    <span className="fw-semibold text-success">
                      {f.salaryMax ? `₹${f.salaryMin ? `${f.salaryMin} - ` : ''}${f.salaryMax} LPA` : (f.stipend || 'Competitive')}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Openings:</span>
                    <span className="fw-semibold">{f.vacancies || 1} {+f.vacancies === 1 ? 'Opening' : 'Openings'}</span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Application Deadline:</span>
                    <span className="fw-semibold">{f.deadline || 'Pending'}</span>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Tagged Skills:</span>
                    <span className="cc-badge sky">{skillList.length} skills</span>
                  </div>
                </div>

                <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>Submitted jobs are reviewed by institutional TPOs before publication on campus boards.</span>
                </div>

                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 py-2" disabled={busy}>
                    {busy ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> Saving...</> : <><CheckCircle2 size={16} /> {isEdit ? 'Save Changes' : 'Submit Job to TPO'}</>}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/company/jobs')}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}


export function Applications() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const navigate = useNavigate();
  const [q, setQ] = useState({ status: '', jobId: '', search: '' });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'appliedAt', dir: 'desc' });
  const res = useFetch(async () => (await api.get('/company/applications', { params: { status: q.status || undefined, jobId: q.jobId || undefined } })).data.data, [q.status, q.jobId]);
  const jobsRes = useFetch(async () => (await api.get('/company/jobs')).data.data, []);
  const all = res.data || [];
  const search = q.search.trim().toLowerCase();
  let filtered = all.filter(({ application: a }) => !search || (a.student?.name || '').toLowerCase().includes(search) || (a.student?.email || '').toLowerCase().includes(search) || (a.job?.title || '').toLowerCase().includes(search));
  const dir = sort.dir === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((x, y) => {
    if (sort.key === 'match') return (x.match.score - y.match.score) * dir;
    const ax = x.application[sort.key] ?? ''; const ay = y.application[sort.key] ?? '';
    if (sort.key === 'appliedAt') return (new Date(ax) - new Date(ay)) * dir;
    return String(ax).localeCompare(String(ay)) * dir;
  });
  const limit = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
  const clearFilters = () => { setQ({ status: '', jobId: '', search: '' }); setPage(1); };
  const hasFilters = !!(q.status || q.jobId || q.search);
  const columns = [
    { key: 'student', header: 'Candidate', render: ({ application: a }) => (
      <div style={{ minWidth: 0 }}>
        <Link to={`/company/applications/${a._id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--cc-text)' }}>{a.student?.name}</Link>
        <div className="small text-muted">{a.student?.email}</div>
      </div>
    ) },
    { key: 'job', header: 'Job', render: ({ application: a }) => <span className="small">{a.job?.title}</span> },
    { key: 'appliedAt', header: 'Applied', sortable: true, render: ({ application: a }) => <span className="small">{String(a.appliedAt).slice(0, 10)}</span> },
    { key: 'match', header: 'Match', sortable: true, align: 'right', render: ({ match }) => <span className="cc-badge violet">{match.score}%</span> },
    { key: 'status', header: 'Status', render: ({ application: a }) => <StatusBadge value={a.status} /> },
  ];
  return (
    <div className="cc-page">
      <PageHeader
        icon={<FileText size={20} />}
        title="Applications"
        description="Review and manage candidate applications across your jobs."
        eyebrow="Company / Applications"
      />
      <Toolbar showClear={hasFilters} onClear={clearFilters}>
        <SearchInput value={q.search} onChange={(v) => { setQ({ ...q, search: v }); setPage(1); }} placeholder="Search name, email or job…" />
        <SelectFilter value={q.status} onChange={(v) => { setQ({ ...q, status: v }); setPage(1); }} options={['Applied', 'Under Review', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Rejected', 'Offer', 'Placed']} placeholder="All statuses" label="status" />
        <SelectFilter value={q.jobId} onChange={(v) => { setQ({ ...q, jobId: v }); setPage(1); }} options={(jobsRes.data || []).map(({ job }) => ({ value: job._id, label: job.title }))} placeholder="All jobs" label="job" />
      </Toolbar>
      <div className="small text-muted mb-2">{filtered.length} application{filtered.length === 1 ? '' : 's'}</div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={res.loading}
        empty={all.length ? 'No applications match your filters' : 'No applications'}
        emptyHint={all.length ? 'Try clearing filters.' : 'Applications appear here once candidates apply to your jobs.'}
        sort={sort}
        onSort={(key, dir2) => setSort({ key, dir: dir2 })}
        onRowClick={(r) => navigate(`/company/applications/${r.application._id}`)}
      />
      <Pager page={cur} pages={pages} onPage={setPage} />
    </div>
  );
}

export function ApplicationDetails() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/company/applications/${id}`)).data.data, [id]);
  const [busy, setBusy] = useState(false);

  const decide = async (status) => {
    let remarks = '';
    if (status === 'Rejected') {
      const r = await Swal.fire(swalBase({
        title: 'Provide Rejection Reason',
        text: 'This feedback will be recorded in the candidate evaluation history.',
        input: 'textarea',
        inputPlaceholder: 'e.g. Insufficient React experience, mismatch in expected salary or location...',
        inputValidator: (v) => (!v || v.trim().length < 5 ? 'Please enter at least 5 characters.' : null),
        showCancelButton: true,
        confirmButtonText: 'Confirm Rejection',
        confirmButtonColor: '#e11d48',
      }));
      if (!r.isConfirmed) return;
      remarks = r.value;
    } else {
      const r = await Swal.fire(swalBase({
        title: `Mark Candidate as ${status}?`,
        text: `Update candidate status to ${status} in the campus placement records.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: `Yes, Mark ${status}`,
        confirmButtonColor: '#4f46e5',
      }));
      if (!r.isConfirmed) return;
    }
    setBusy(true);
    try {
      await api.post('/selections', { applicationId: id, status, remarks });
      toast.success(`Application marked as ${status}.`);
      res.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    const r = await Swal.fire(swalBase({
      title: `Advance to "${status}"?`,
      text: `Update candidate status in recruitment pipeline.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      confirmButtonColor: '#4f46e5',
    }));
    if (!r.isConfirmed) return;
    setBusy(true);
    try {
      await api.patch(`/applications/${id}/status`, { status });
      toast.success(`Candidate status advanced to ${status}.`);
      res.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (res.loading) return <div className="cc-page"><Loading rows={4} height={140} /></div>;
  if (res.error) return <div className="cc-page"><ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} /></div>;

  const { application: a, profile, match, education = [], projects = [], certifications = [], resumes = [], skills = [] } = res.data;
  const dlResume = (r) => downloadFile(`/resumes/${r._id}/download`, r.fileName).catch((e) => toast.error(apiErrorMessage(e)));
  const initial = String(a.student?.name || 'C')[0]?.toUpperCase() || 'C';

  const academicItems = [
    { label: 'Enrollment No', value: profile?.enrollmentNo },
    { label: 'Current Degree', value: profile?.course },
    { label: 'Branch / Dept', value: profile?.branch },
    { label: 'Current Semester', value: profile?.semester ? `Sem ${profile.semester}` : '—' },
    { label: 'Academic CGPA', value: profile?.cgpa ? `${profile.cgpa} / 10` : '—' },
    { label: 'Active Backlogs', value: profile?.backlogs != null ? String(profile.backlogs) : '0' },
    { label: 'Passing Year', value: profile?.passingYear },
    { label: 'Gender', value: profile?.gender },
    { label: 'Date of Birth', value: profile?.dob?.slice(0, 10) },
    { label: 'Current City', value: profile?.city },
  ];

  const history = a.history || [];

  return (
    <div className="cc-page cc-candidate-details-page">
      {/* Top Back Navigation Bar */}
      <div className="cc-detail-back-bar d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link className="cc-detail-back-link d-inline-flex align-items-center gap-2" to="/company/applications">
          <ArrowLeft size={16} /> Back to Candidate Applications
        </Link>
        <div className="d-flex align-items-center gap-2">
          <Link className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1.5" to="/company/interviews/new" state={{ applicationId: id }}>
            <Video size={14} /> Schedule Interview Round
          </Link>
        </div>
      </div>

      {/* Candidate Hero Card */}
      <div className="cc-candidate-hero-card">
        <div className="cc-candidate-hero-body">
          <div className="cc-candidate-profile-meta">
            <div className="cc-candidate-avatar" aria-hidden="true">
              {initial}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="cc-candidate-role-target">
                <Briefcase size={15} />
                <span>Applied for: <strong>{a.job?.title || 'Placement Position'}</strong></span>
              </div>
              <h1 className="cc-candidate-name">{a.student?.name || 'Candidate Profile'}</h1>
              <div className="cc-candidate-contact-row">
                <span>{a.student?.email}</span>
                {profile?.phone && <span>• 📞 {profile.phone}</span>}
                {profile?.city && <span>• 📍 {profile.city}</span>}
                <span>• Applied on {a.appliedAt ? new Date(a.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <StatusBadge value={a.status} />
            {a.status === 'Placed' && (
              <span className="badge bg-success text-white rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1">
                <CheckCircle2 size={14} /> Placed Candidate
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI Skill Match Gauge Banner */}
      <div className="cc-match-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="cc-match-score-badge">
            <Sparkles size={16} className="text-warning" />
            <span>{match.score}% Skill Match</span>
          </span>
          <span className="small text-secondary">
            Candidate matches <strong>{match.matched}</strong> out of <strong>{match.required}</strong> skills specified in the job posting requirements.
          </span>
        </div>
        {!!resumes.length && (
          <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1.5" onClick={() => dlResume(resumes[0])}>
            <Download size={14} /> Download Resume ({resumes[0].fileName})
          </button>
        )}
      </div>

      {/* Main 2-Column Responsive Information Layout */}
      <div className="row g-4 mb-4">
        {/* Left Column (8 cols): Academic, Projects, Education */}
        <div className="col-12 col-lg-8">
          {/* Academic & University Profile */}
          <SectionCard title="Academic Profile & Qualifications" icon={<GraduationCap size={16} />} className="mb-4">
            <DetailGrid items={academicItems} columns={2} />
            {profile?.address && (
              <div className="mt-3 pt-3 border-top small text-secondary">
                <span className="fw-semibold text-dark">Permanent Address: </span>
                <span>{profile.address}</span>
              </div>
            )}
            {profile?.about && (
              <div className="mt-2 pt-2 border-top small text-secondary">
                <span className="fw-semibold text-dark d-block mb-1">About Candidate: </span>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{profile.about}</p>
              </div>
            )}
          </SectionCard>

          {/* Education Records */}
          <SectionCard title={`Education Background (${education.length})`} icon={<GraduationCap size={16} />} className="mb-4">
            {!education.length ? (
              <div className="small text-muted py-2">No past institutions listed.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {education.map((e) => (
                  <div key={e._id} className="p-2.5 rounded-3 border bg-light-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <strong className="text-dark d-block">{e.qualification}</strong>
                      <span className="small text-muted">{e.institute}{e.passingYear ? ` • Year of Completion: ${e.passingYear}` : ''}</span>
                    </div>
                    {(e.percentage || e.cgpa) && (
                      <span className="badge bg-light text-dark border rounded-pill px-2.5 py-1 fw-bold">
                        {e.percentage ? `${e.percentage}%` : ''}{e.cgpa ? `CGPA: ${e.cgpa}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Portfolio Projects */}
          <SectionCard title={`Portfolio Projects (${projects.length})`} icon={<FileText size={16} />} className="mb-4">
            {!projects.length ? (
              <div className="small text-muted py-2">No projects recorded in profile.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {projects.map((p) => (
                  <div key={p._id} className="p-3 rounded-3 border bg-light-subtle">
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-1 flex-wrap">
                      <strong className="text-dark fs-6">{p.title}</strong>
                      {p.projectUrl && (
                        <a href={p.projectUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary py-0.5 px-2 rounded-pill d-inline-flex align-items-center gap-1" style={{ fontSize: '0.74rem' }}>
                          <span>Live Demo</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {p.technologies && (
                      <div className="small text-primary fw-medium mb-1.5">Stack: {p.technologies}</div>
                    )}
                    {p.description && (
                      <p className="small text-secondary mb-0" style={{ lineHeight: 1.6 }}>{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Cover Letter */}
          <SectionCard title="Candidate Statement & Cover Letter" icon={<FileText size={16} />} className="mb-4">
            <p className="small text-secondary mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {a.coverLetter || 'No cover letter was submitted with this application.'}
            </p>
            {a.rejectionReason && (
              <div className="alert alert-warning py-2 px-3 mt-3 small mb-0 rounded-3">
                <span className="fw-bold">Previous Evaluation Remarks: </span>{a.rejectionReason}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column (4 cols): Skills, Resumes, History */}
        <div className="col-12 col-lg-4">
          {/* Verified Skills */}
          <SectionCard title={`Technical Skills (${skills.length})`} icon={<Award size={16} />} className="mb-4">
            {!skills.length ? (
              <div className="small text-muted py-2">No skills registered.</div>
            ) : (
              <div className="d-flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s._id} className="badge bg-light text-dark border rounded-pill px-2.5 py-1 small">
                    <strong>{s.skill?.skillName}</strong>
                    {s.proficiency && <span className="text-muted ms-1">({s.proficiency})</span>}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Resume Documents */}
          <SectionCard title={`Resume Documents (${resumes.length})`} icon={<Download size={16} />} className="mb-4">
            {!resumes.length ? (
              <div className="small text-muted py-2">No resume uploaded.</div>
            ) : (
              resumes.map((r) => (
                <div key={r._id} className="cc-resume-tile">
                  <div className="min-w-0 flex-grow-1">
                    <span className="fw-semibold text-dark text-truncate d-block small">{r.fileName}</span>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>Verified Candidate Resume</span>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1" onClick={() => dlResume(r)} title="Download resume">
                    <Download size={13} />
                  </button>
                </div>
              ))
            )}
          </SectionCard>

          {/* Certifications */}
          <SectionCard title={`Certifications (${certifications.length})`} icon={<Award size={16} />} className="mb-4">
            {!certifications.length ? (
              <div className="small text-muted py-2">No certifications listed.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {certifications.map((c) => (
                  <div key={c._id} className="p-2 rounded-2 border bg-light-subtle small">
                    <strong className="text-dark d-block">{c.name}</strong>
                    <span className="text-muted">{c.issuingOrganization}{c.issueDate ? ` (${c.issueDate.slice(0, 10)})` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Application Timeline Audit */}
          <SectionCard title={`Application Timeline (${history.length})`} icon={<Clock size={16} />} className="mb-4">
            {!history.length ? (
              <div className="small text-muted py-2">No timeline entries yet.</div>
            ) : (
              <div className="cc-timeline">
                {history.map((h, i) => (
                  <div key={i} className="cc-timeline-item">
                    <span className="cc-timeline-dot" />
                    <div className="cc-timeline-body">
                      <div className="d-flex justify-content-between gap-2 flex-wrap">
                        <strong className="small text-dark">{h.status}</strong>
                        <span className="small text-muted">{h.at ? new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      </div>
                      {h.note && <div className="small text-muted mt-0.5">{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Sticky Bottom Evaluation Decision Bar */}
      <div className="cc-decide-toolbar sticky-bottom mb-4">
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted fw-bold">Evaluation Decision:</span>
          <StatusBadge value={a.status} />
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button disabled={busy} className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={() => setStatus('Under Review')}>
            Mark Under Review
          </button>
          <button disabled={busy} className="btn btn-primary btn-sm rounded-pill px-3 fw-bold" onClick={() => setStatus('Shortlisted')}>
            <CheckCircle2 size={14} className="me-1" /> Shortlist Candidate
          </button>
          <Link className="btn btn-outline-info btn-sm rounded-pill px-3 fw-bold" to="/company/interviews/new" state={{ applicationId: id }}>
            <Video size={14} className="me-1" /> Schedule Interview
          </Link>
          <button disabled={busy} className="btn btn-success btn-sm rounded-pill px-3 fw-bold" onClick={() => decide('Selected')}>
            <Award size={14} className="me-1" /> Select for Offer
          </button>
          <button disabled={busy} className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => decide('On Hold')}>
            Place on Hold
          </button>
          <button disabled={busy} className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={() => decide('Rejected')}>
            <XCircle size={14} className="me-1" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export function Shortlisted() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const res = useFetch(async () => (await api.get('/company/shortlisted')).data.data, []);
  const all = res.data || [];
  const search = q.trim().toLowerCase();
  const filtered = all.filter((a) => !search || (a.student?.name || '').toLowerCase().includes(search) || (a.job?.title || '').toLowerCase().includes(search));
  const limit = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
  const columns = [
    { key: 'student', header: 'Candidate', render: (a) => (
      <div style={{ minWidth: 0 }}>
        <Link to={`/company/applications/${a._id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--cc-text)' }}>{a.student?.name}</Link>
        <div className="small text-muted">{a.student?.email}</div>
      </div>
    ) },
    { key: 'job', header: 'Job', render: (a) => <span className="small">{a.job?.title}</span> },
    { key: 'appliedAt', header: 'Applied', render: (a) => <span className="small">{String(a.appliedAt).slice(0, 10)}</span> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge value={a.status} /> },
    { key: 'open', header: '', render: (a) => <Link className="btn btn-sm btn-outline-primary" to={`/company/applications/${a._id}`}>View</Link> },
  ];
  return (
    <div className="cc-page">
      <PageHeader icon={<Award size={20} />} title="Shortlisted candidates" description="Candidates shortlisted for your open roles." eyebrow="Company / Shortlisted" />
      {all.length > 0 && (
        <Toolbar showClear={!!q} onClear={() => { setQ(''); setPage(1); }}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search candidate or job…" />
        </Toolbar>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        loading={res.loading}
        empty={all.length ? 'No matches' : 'No shortlisted candidates'}
        emptyHint={all.length ? 'Try a different search.' : 'Shortlist candidates from Applications to see them here.'}
      />
      <Pager page={cur} pages={pages} onPage={setPage} />
    </div>
  );
}

export function CompanyReports() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const jobsRes = useFetch(async () => (await api.get('/company/jobs')).data.data, []);
  const appsRes = useFetch(async () => (await api.get('/company/applications')).data.data, []);
  const ivRes = useFetch(async () => (await api.get('/interviews/company')).data.data, []);
  const offersRes = useFetch(async () => (await api.get('/offers/company')).data.data, []);
  const plRes = useFetch(async () => (await api.get('/placements', { params: { limit: 500 } })).data.data, []);
  const assessRes = useFetch(async () => (await api.get('/assessments')).data.data, []);

  const loading = jobsRes.loading || appsRes.loading;
  const error = jobsRes.error || appsRes.error;

  const data = useMemo(() => {
    const apps = (appsRes.data || []).map((x) => x.application || x);
    const jobs = jobsRes.data || [];
    const interviews = ivRes.data || [];
    const offers = offersRes.data || [];
    const placements = plRes.data || [];
    const assessments = assessRes.data || [];

    // 1. Applications by Status
    const byStatusMap = {};
    apps.forEach((a) => {
      const k = a.status || 'Applied';
      byStatusMap[k] = (byStatusMap[k] || 0) + 1;
    });

    // 2. Applications by Job Title (Top 8)
    const byJobMap = {};
    apps.forEach((a) => {
      const k = a.job?.title || 'General Opening';
      byJobMap[k] = (byJobMap[k] || 0) + 1;
    });

    // 3. Jobs by Work Mode / Nature
    const byTypeMap = {};
    jobs.forEach(({ job }) => {
      const k = job.jobType || 'Full Time';
      byTypeMap[k] = (byTypeMap[k] || 0) + 1;
    });

    // 4. Jobs by Work Mode
    const byModeMap = {};
    jobs.forEach(({ job }) => {
      const k = job.workMode || 'Onsite';
      byModeMap[k] = (byModeMap[k] || 0) + 1;
    });

    // 5. Offers by Status
    const byOfferStatus = {};
    offers.forEach((o) => {
      const k = o.status ? (o.status[0].toUpperCase() + o.status.slice(1)) : 'Pending';
      byOfferStatus[k] = (byOfferStatus[k] || 0) + 1;
    });

    // 6. Interview Rounds Distribution
    const byIvModeMap = {};
    interviews.forEach((iv) => {
      const k = iv.mode || 'Online';
      byIvModeMap[k] = (byIvModeMap[k] || 0) + 1;
    });

    // 7. Hiring Funnel Stages Conversion
    const totalApps = apps.length;
    const shortlistedCount = apps.filter((a) => ['Shortlisted', 'Assessment', 'Interview', 'Selected', 'Offer', 'Placed'].includes(a.status)).length;
    const interviewedCount = interviews.length;
    const offeredCount = offers.length;
    const placedCount = placements.length || apps.filter((a) => a.status === 'Placed').length;

    const funnelStages = [
      { name: '1. Total Applications', count: totalApps, pct: 100, fill: '#4f46e5' },
      { name: '2. Profile Shortlisted', count: shortlistedCount, pct: totalApps ? Math.round((shortlistedCount / totalApps) * 100) : 0, fill: '#6366f1' },
      { name: '3. Technical Interviews', count: interviewedCount, pct: totalApps ? Math.round((interviewedCount / totalApps) * 100) : 0, fill: '#8b5cf6' },
      { name: '4. Offers Released', count: offeredCount, pct: totalApps ? Math.round((offeredCount / totalApps) * 100) : 0, fill: '#f59e0b' },
      { name: '5. Campus Placements', count: placedCount, pct: totalApps ? Math.round((placedCount / totalApps) * 100) : 0, fill: '#10b981' },
    ];

    // 8. Application Timeline Velocity
    const byMonthMap = {};
    apps.forEach((a) => {
      const d = a.appliedAt || a.createdAt;
      if (!d) return;
      const k = new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      byMonthMap[k] = (byMonthMap[k] || 0) + 1;
    });

    // Sort timeline by date
    const monthTimeline = Object.entries(byMonthMap).map(([name, applications]) => ({ name, applications }));

    return {
      byStatus: Object.entries(byStatusMap).map(([name, value]) => ({ name, value })),
      byJob: Object.entries(byJobMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })),
      byType: Object.entries(byTypeMap).map(([name, value]) => ({ name, value })),
      byMode: Object.entries(byModeMap).map(([name, value]) => ({ name, value })),
      byOfferStatus: Object.entries(byOfferStatus).map(([name, value]) => ({ name, value })),
      byIvMode: Object.entries(byIvModeMap).map(([name, value]) => ({ name, value })),
      funnelStages,
      monthTimeline,
      totals: {
        jobs: jobs.length,
        approved: jobs.filter(({ job }) => job.approvalStatus === 'approved').length,
        apps: apps.length,
        shortlisted: shortlistedCount,
        interviews: interviews.length,
        offers: offers.length,
        placements: placedCount,
        assessments: assessments.length,
        conversionRate: totalApps ? ((placedCount / totalApps) * 100).toFixed(1) : '0.0',
      },
    };
  }, [jobsRes.data, appsRes.data, ivRes.data, offersRes.data, plRes.data, assessRes.data]);

  if (loading) return <div className="cc-page"><Loading rows={4} height={140} /></div>;
  if (error) return <div className="cc-page"><ErrorState message={apiErrorMessage(error)} onRetry={() => { jobsRes.reload(); appsRes.reload(); ivRes.reload(); offersRes.reload(); }} /></div>;

  return (
    <div className="cc-page cc-reports-page">
      <PageHeader
        icon={<BarChart3 size={24} />}
        title="Recruitment Analytics & Reports"
        description="Live data telemetry from your job applications, screening pipeline, test attempts, interview rounds, and campus offers."
        eyebrow="Company / Reports"
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 rounded-pill px-3"
              onClick={() => { jobsRes.reload(); appsRes.reload(); ivRes.reload(); offersRes.reload(); plRes.reload(); toast.info('Refreshed reports data.'); }}
            >
              <span>Refresh Metrics</span>
            </button>
          </div>
        }
      />

      {/* 8 Executive KPI Stat Tiles */}
      <KpiGrid>
        <KpiCard icon={<Briefcase size={18} />} value={data.totals.jobs} label="Active Jobs" hint={`${data.totals.approved} approved openings`} tone="primary" />
        <KpiCard icon={<FileText size={18} />} value={data.totals.apps} label="Total Applications" hint="Received from campus drives" tone="info" />
        <KpiCard icon={<Users size={18} />} value={data.totals.shortlisted} label="Shortlisted" hint="Advanced past initial screening" tone="violet" />
        <KpiCard icon={<Video size={18} />} value={data.totals.interviews} label="Interviews" hint="Scheduled & conducted" tone="violet" />
        <KpiCard icon={<Award size={18} />} value={data.totals.offers} label="Offers Released" hint="Formal employment letters" tone="amber" />
        <KpiCard icon={<TrendingUp size={18} />} value={data.totals.placements} label="Confirmed Placements" hint="Accepted hiring records" tone="success" />
        <KpiCard icon={<Sparkles size={18} />} value={`${data.totals.conversionRate}%`} label="Pipeline Conversion" hint="Total applicants to placed" tone="success" />
        <KpiCard icon={<CheckCircle2 size={18} />} value={data.totals.assessments} label="Assessments Active" hint="Online screening evaluations" tone="primary" />
      </KpiGrid>

      {/* Recruitment Pipeline Conversion Funnel Section */}
      <div className="cc-chart-card mb-4">
        <div className="cc-chart-head">
          <h2 className="cc-chart-title">
            <TrendingUp size={18} className="text-primary" />
            <span>End-to-End Recruitment Funnel & Conversion Rates</span>
          </h2>
          <span className="badge bg-primary-subtle text-primary border rounded-pill px-3 py-1 font-monospace" style={{ fontSize: '0.78rem' }}>
            Overall Placement Ratio: {data.totals.conversionRate}%
          </span>
        </div>

        <div className="row g-3 py-2">
          {data.funnelStages.map((stage, idx) => (
            <div key={stage.name} className="col-12 col-md">
              <div className="p-3 rounded-3 border bg-light-subtle h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                    <span className="small text-muted fw-bold">{stage.name}</span>
                    <strong className="fs-5" style={{ color: stage.fill }}>{stage.count}</strong>
                  </div>
                  <div className="progress mt-2" style={{ height: 8 }}>
                    <div
                      className="progress-bar rounded-pill"
                      role="progressbar"
                      style={{ width: `${stage.pct}%`, backgroundColor: stage.fill }}
                      aria-valuenow={stage.pct}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                  </div>
                </div>
                <div className="small text-muted mt-2 text-end fw-semibold">
                  {stage.pct}% of total
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-Column Analytical Charts Grid */}
      <div className="cc-grid-2 mb-4">
        {/* Chart 1: Applications by Status (Donut Pie) */}
        <div className="cc-chart-card">
          <div className="cc-chart-head">
            <h2 className="cc-chart-title">
              <PieChart size={17} className="text-primary" />
              <span>Applications by Recruitment Stage</span>
            </h2>
          </div>
          {data.byStatus.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {data.byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...chartTip} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty title="No applications yet" hint="Data will render once candidates apply." bare />
          )}
        </div>

        {/* Chart 2: Top Applied Openings (Horizontal Bar) */}
        <div className="cc-chart-card">
          <div className="cc-chart-head">
            <h2 className="cc-chart-title">
              <Briefcase size={17} className="text-primary" />
              <span>Top Positions by Applicant Demand</span>
            </h2>
          </div>
          {chartBars(data.byJob, '#4f46e5', true)}
        </div>

        {/* Chart 3: Candidate Inflow Timeline (Area Curve) */}
        <div className="cc-chart-card">
          <div className="cc-chart-head">
            <h2 className="cc-chart-title">
              <CalendarDays size={17} className="text-primary" />
              <span>Application Inflow Velocity Over Time</span>
            </h2>
          </div>
          {data.monthTimeline.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-border)" />
                <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...chartTip} />
                <Area type="monotone" dataKey="applications" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty title="Timeline data unavailable" hint="Inflow trend calculates from application submission dates." bare />
          )}
        </div>

        {/* Chart 4: Job Offer Responses (Donut Pie) */}
        <div className="cc-chart-card">
          <div className="cc-chart-head">
            <h2 className="cc-chart-title">
              <Award size={17} className="text-success" />
              <span>Offer Acceptance & Candidate Response</span>
            </h2>
          </div>
          {data.byOfferStatus.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byOfferStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.byOfferStatus.map((entry, i) => {
                    const clr = entry.name.toLowerCase().includes('accept')
                      ? '#10b981'
                      : entry.name.toLowerCase().includes('reject') || entry.name.toLowerCase().includes('decline')
                        ? '#ef4444'
                        : '#f59e0b';
                    return <Cell key={i} fill={clr} />;
                  })}
                </Pie>
                <Tooltip {...chartTip} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty title="No job offers drafted yet" hint="Release offer letters to track student acceptance." bare />
          )}
        </div>

        {/* Chart 5: Openings by Nature & Commitment */}
        <div className="cc-chart-card">
          <div className="cc-chart-head">
            <h2 className="cc-chart-title">
              <Laptop size={17} className="text-primary" />
              <span>Openings by Job Nature (Full Time / Intern)</span>
            </h2>
          </div>
          {chartBars(data.byType, '#7c3aed')}
        </div>

        {/* Chart 6: Work Arrangement Distribution */}
        <div className="cc-chart-card">
          <div className="cc-chart-head">
            <h2 className="cc-chart-title">
              <Building2 size={17} className="text-primary" />
              <span>Working Arrangement (Onsite / Remote / Hybrid)</span>
            </h2>
          </div>
          {chartBars(data.byMode, '#06b6d4')}
        </div>
      </div>
    </div>
  );
}
