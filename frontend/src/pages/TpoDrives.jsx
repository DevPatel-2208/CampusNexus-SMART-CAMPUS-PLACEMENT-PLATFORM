import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { apiErrorMessage, downloadFile } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import { confirmAction, confirmDanger, promptText } from '../services/alerts';
import {
  PageHeader, KpiCard, KpiGrid, SectionCard, Toolbar, SearchInput, SelectFilter,
  DataTable, Pager, StatusBadge, Empty, Loading, ErrorState, DetailGrid, Modal, Spinner,
} from '../components/ui';
import {
  Activity, AlertCircle, Award, ArrowLeft, ArrowUpRight, BookOpen, Briefcase, Building2,
  Calendar, CalendarDays, Check, CheckCircle2, ChevronRight, Clock, Copy, Download,
  ExternalLink, Eye, FileText, Filter, GraduationCap, IndianRupee, Layers, ListOrdered,
  Mail, MapPin, Megaphone, Pencil, Plus, RefreshCw, ScrollText, Search, Send,
  ShieldCheck, Sparkles, Star, Trash2, TrendingUp, User,
  UserCheck, Users, Video, XCircle, Zap,
} from 'lucide-react';
import Swal from 'sweetalert2';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const num = (v) => (v == null || v === '' ? '—' : v);

const DRIVE_STATUSES = ['upcoming', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'];
const DRIVE_MODES = ['Online', 'Offline', 'Hybrid'];
const APP_STATUSES = ['Applied', 'Under Review', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Rejected', 'Offer', 'Placed'];
const INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
const INTERVIEW_RESULTS = ['Pending', 'Selected', 'Rejected', 'On Hold'];
const ROUND_NAMES = ['Technical Round', 'HR Round', 'Final Round', 'Other'];
const OFFER_STATUSES = ['draft', 'pending', 'issued', 'viewed', 'accepted', 'rejected', 'expired', 'withdrawn'];
const PLACEMENT_STATUSES = ['Placed', 'Joined', 'Not Joined'];
const CONTACT_STATUSES = ['New', 'Read', 'Resolved'];

/* Inline status changer used across TPO tables */
function InlineStatus({ value, options, onSave, width = 160, busy }) {
  return (
    <select className="form-select form-select-sm" style={{ width }} value={value} disabled={busy}
      aria-label="Change status" onClick={(e) => e.stopPropagation()} onChange={(e) => onSave(e.target.value)}>
      {options.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

/* ================================================================== *
 * Placement drives
 * ================================================================== */
export function Drives() {
  const [q, setQ] = useState({ search: '', status: '', mode: '', page: 1 });
  const [busy, setBusy] = useState(null);
  const res = useFetch(async () => (await api.get('/drives', { params: { limit: 12, q: q.search, status: q.status, mode: q.mode, page: q.page } })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const setStatus = async (id, status) => {
    setBusy(id);
    try { await api.patch(`/drives/${id}`, { status }); toast.success('Drive status updated.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(null); }
  };
  const del = async (d) => {
    const ok = await confirmDanger({ title: `Delete "${d.driveTitle}"?`, text: 'This permanently removes the drive and its registrations.', confirmButtonText: 'Delete drive' });
    if (!ok) return;
    try { await api.delete(`/drives/${d._id}`); toast.success('Drive deleted.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div>
      <PageHeader eyebrow="Placements" title="Placement Drives" icon={<CalendarDays />}
        description="Plan, schedule and manage campus recruitment drives and their registrations."
        actions={<>
          <Link className="btn btn-outline-secondary btn-sm" to="/tpo/calendar">Calendar</Link>
          <Link className="btn btn-outline-secondary btn-sm" to="/tpo/history">History</Link>
          <Link className="btn btn-primary btn-sm" to="/tpo/drives/new"><Plus size={15} /> New drive</Link>
        </>} />

      <KpiGrid>
        <KpiCard tone="primary" icon={<CalendarDays />} value={pag.total ?? '—'} label="Total drives" />
        <KpiCard tone="success" icon={<Clock />} value={rows.filter((d) => ['upcoming', 'registration_open'].includes(d.status)).length} label="Upcoming / open (page)" />
        <KpiCard tone="info" icon={<Users />} value={rows.reduce((n, d) => n + (d.regCount || 0), 0)} label="Registrations (page)" />
        <KpiCard tone="violet" icon={<ListOrdered />} value={pag.pages ?? 1} label="Pages" />
      </KpiGrid>

      <Toolbar showClear={!!(q.search || q.status || q.mode)} onClear={() => setQ({ search: '', status: '', mode: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search drive or company" label="Drive search" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => set({ status: v })} options={DRIVE_STATUSES} />
        <SelectFilter label="Mode" value={q.mode} onChange={(v) => set({ mode: v })} options={DRIVE_MODES} />
      </Toolbar>

      <DataTable
        rows={rows} loading={res.loading} empty="No drives match"
        columns={[
          { key: 'title', header: 'Drive', render: (d) => (<div><Link className="fw-semibold" to={`/tpo/drives/${d._id}`}>{d.driveTitle}</Link><small className="text-muted d-block">{d.company?.companyName || '—'}{d.job?.title ? ` · ${d.job.title}` : ''}</small></div>) },
          { key: 'date', header: 'Schedule', render: (d) => (<><div>{fmtDate(d.driveDate)}</div><small className="text-muted">{d.startTime || ''}{d.endTime ? `–${d.endTime}` : ''}</small></>) },
          { key: 'mode', header: 'Mode', render: (d) => (<><StatusBadge value={d.mode} dot={false} />{d.venue ? <small className="text-muted d-block">{d.venue}</small> : null}</>) },
          { key: 'regs', header: 'Registrations', align: 'right', render: (d) => d.regCount ?? 0 },
          { key: 'status', header: 'Status', render: (d) => <StatusBadge value={d.status} /> },
          { key: 'actions', header: 'Actions', align: 'right', render: (d) => (
            <div className="d-flex gap-1 justify-content-end align-items-center" onClick={(e) => e.stopPropagation()}>
              <InlineStatus value={d.status} options={DRIVE_STATUSES} busy={busy === d._id} onSave={(v) => setStatus(d._id, v)} width={150} />
              <Link className="btn btn-sm btn-outline-secondary" to={`/tpo/drives/${d._id}`}>Regs</Link>
              <Link className="btn btn-sm btn-outline-primary" to={`/tpo/drives/${d._id}/edit`}>Edit</Link>
              <button className="btn btn-sm btn-outline-danger" onClick={() => del(d)} aria-label={`Delete ${d.driveTitle}`}><Trash2 size={14} /></button>
            </div>
          ) },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />
    </div>
  );
}

/* ================================================================== *
 * Drive form
 * ================================================================== */
export function DriveForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const EMPTY = {
    driveTitle: '', driveType: 'Campus', description: '', driveDate: '', startTime: '', endTime: '',
    registrationStart: '', registrationEnd: '', venue: '', mode: 'Offline', status: 'upcoming',
    company: '', job: '', maxStudents: '',
    eligibility: { minCgpa: 0, maxBacklogs: 10, allowedBranches: '', allowedCourses: '', passingYear: '', requiredExperience: '', requiredSkills: '' },
  };
  const [f, setF] = useState(EMPTY);
  const [loaded, setLoaded] = useState(!isEdit);
  const [busy, setBusy] = useState(false);
  const comps = useFetch(async () => (await api.get('/tpo/companies')).data.data, []);
  const allJobs = useFetch(async () => (await api.get('/tpo/jobs', { params: { limit: 100, approvalStatus: 'approved' } })).data.data, []);

  useFetch(async () => {
    if (isEdit) {
      const { data } = await api.get(`/drives/${id}`);
      const d = data.data.drive;
      setF({
        ...EMPTY, ...d,
        company: d.company?._id || d.company || '',
        job: d.job?._id || d.job || '',
        driveDate: d.driveDate?.slice(0, 10) || '',
        registrationStart: d.registrationStart?.slice(0, 10) || '',
        registrationEnd: d.registrationEnd?.slice(0, 10) || '',
        eligibility: { ...EMPTY.eligibility, ...(d.eligibility || {}) },
      });
      setLoaded(true);
    }
    return null;
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = {
      ...f,
      maxStudents: f.maxStudents ? +f.maxStudents : null,
      eligibility: {
        ...f.eligibility,
        minCgpa: f.eligibility.minCgpa !== '' ? +f.eligibility.minCgpa : 0,
        maxBacklogs: f.eligibility.maxBacklogs !== '' ? +f.eligibility.maxBacklogs : 10,
        passingYear: f.eligibility.passingYear ? +f.eligibility.passingYear : undefined,
      },
    };
    try {
      if (isEdit) await api.patch(`/drives/${id}`, body);
      else await api.post('/drives', body);
      toast.success(isEdit ? 'Placement drive updated successfully.' : 'New placement drive scheduled.');
      navigate('/tpo/drives');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <Loading rows={5} height={80} />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setE = (k) => (e) => setF({ ...f, eligibility: { ...f.eligibility, [k]: e.target.value } });

  const companyJobs = (allJobs.data || []).filter((j) => !f.company || (j.company?._id || j.company) === f.company);
  const selectedComp = (comps.data || []).find((c) => (c._id || c.id) === f.company);

  return (
    <div className="w-100" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link className="small fw-semibold d-inline-flex align-items-center gap-1 text-decoration-none text-muted" to="/tpo/drives">
          <ArrowLeft size={15} /> Back to Drives Registry
        </Link>
        <span className="cc-badge sky d-inline-flex align-items-center gap-1">
          <Sparkles size={12} /> {isEdit ? 'Editing Scheduled Drive' : 'Placement Orchestrator'}
        </span>
      </div>

      <PageHeader
        eyebrow="Placement Drive Management"
        title={isEdit ? `Edit Drive: ${f.driveTitle || 'Untitled'}` : 'Schedule Placement Drive'}
        icon={<Building2 size={22} />}
        description={isEdit ? 'Update drive schedules, venue, quota, and eligibility constraints for this campus drive.' : 'Publish a new campus hiring event, assign company roles, set registration deadlines, and enforce academic eligibility criteria.'}
      />

      <form onSubmit={submit} className="w-100" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="row g-4 w-100 m-0">
          <div className="col-12 col-xl-8 p-0 pe-xl-3">
            <SectionCard
              title="Drive Logistics & Identity"
              subtitle="Drive title, hiring company, associated job openings and drive format"
              icon={<Briefcase size={18} />}
              className="mb-4"
            >
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Drive Title <span className="text-danger">*</span></label>
                  <input
                    required
                    className="form-control"
                    placeholder="e.g. Google Campus Hiring 2026 - Software Engineer"
                    value={f.driveTitle}
                    onChange={set('driveTitle')}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Hiring Company <span className="text-danger">*</span></label>
                  <select required className="form-select" value={f.company} onChange={set('company')}>
                    <option value="">Select hiring company...</option>
                    {(comps.data || []).map((c) => (
                      <option key={c._id} value={c._id}>{c.companyName} {c.industry ? `(${c.industry})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Associated Job / Opening</label>
                  <select className="form-select" value={f.job} onChange={set('job')}>
                    <option value="">Select linked job opening (optional)...</option>
                    {companyJobs.map((j) => (
                      <option key={j._id} value={j._id}>{j.title} {j.jobType ? `[${j.jobType}]` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Drive Type</label>
                  <select className="form-select" value={f.driveType} onChange={set('driveType')}>
                    <option value="Campus">On-Campus</option>
                    <option value="Off-Campus">Off-Campus</option>
                    <option value="Pool-Campus">Pool Campus</option>
                    <option value="Virtual">Virtual Drive</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Conduct Mode</label>
                  <select className="form-select" value={f.mode} onChange={set('mode')}>
                    {DRIVE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Status Lifecycle</label>
                  <select className="form-select" value={f.status} onChange={set('status')}>
                    {DRIVE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-8">
                  <label className="form-label small fw-semibold">Venue / Online Meeting Link <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent text-muted"><MapPin size={16} /></span>
                    <input
                      required
                      className="form-control"
                      value={f.venue}
                      onChange={set('venue')}
                      placeholder={f.mode === 'Online' ? 'Google Meet / Zoom URL' : 'Auditorium Hall B / Lab 4'}
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Student Quota / Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 150 (Leave blank for no limit)"
                    value={f.maxStudents}
                    onChange={set('maxStudents')}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Drive Overview & Instructions</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Provide candidate instructions, interview attire, required documents, and drive schedule details..."
                    value={f.description || ''}
                    onChange={set('description')}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Timeline & Registration Windows"
              subtitle="Drive event date and candidate registration timeline"
              icon={<Calendar size={18} />}
              className="mb-4"
            >
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Drive Event Date <span className="text-danger">*</span></label>
                  <input required type="date" className="form-control" value={f.driveDate} onChange={set('driveDate')} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Start Time</label>
                  <input type="time" className="form-control" value={f.startTime || ''} onChange={set('startTime')} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">End Time</label>
                  <input type="time" className="form-control" value={f.endTime || ''} onChange={set('endTime')} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Registration Opens <span className="text-danger">*</span></label>
                  <input required type="date" className="form-control" value={f.registrationStart} onChange={set('registrationStart')} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Registration Closes <span className="text-danger">*</span></label>
                  <input required type="date" className="form-control" value={f.registrationEnd} onChange={set('registrationEnd')} />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Academic Eligibility Constraints"
              subtitle="Strict criteria evaluated when students apply or register for this drive"
              icon={<GraduationCap size={18} />}
              className="mb-4"
            >
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Minimum CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    className="form-control"
                    value={f.eligibility.minCgpa}
                    onChange={setE('minCgpa')}
                  />
                  <small className="text-muted d-block mt-1">Scale 0.0 to 10.0</small>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Max Backlogs Allowed</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={f.eligibility.maxBacklogs}
                    onChange={setE('maxBacklogs')}
                  />
                  <small className="text-muted d-block mt-1">0 for zero-backlog policy</small>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Graduating Year</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 2026 (Leave blank for any)"
                    value={f.eligibility.passingYear || ''}
                    onChange={setE('passingYear')}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Allowed Branches</label>
                  <input
                    className="form-control"
                    value={f.eligibility.allowedBranches || ''}
                    onChange={setE('allowedBranches')}
                    placeholder="e.g. CSE, IT, ECE (Comma separated, blank = all)"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Allowed Degree Programs</label>
                  <input
                    className="form-control"
                    value={f.eligibility.allowedCourses || ''}
                    onChange={setE('allowedCourses')}
                    placeholder="e.g. B.Tech, M.Tech, MCA (blank = all)"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Required Experience</label>
                  <input
                    className="form-control"
                    value={f.eligibility.requiredExperience || ''}
                    onChange={setE('requiredExperience')}
                    placeholder="e.g. Fresher / 0-1 years"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Required Skill Keywords</label>
                  <input
                    className="form-control"
                    value={f.eligibility.requiredSkills || ''}
                    onChange={setE('requiredSkills')}
                    placeholder="e.g. React, Node.js, Python, SQL"
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="col-12 col-xl-4 p-0 ps-xl-2">
            <div className="cc-card cc-section position-sticky" style={{ top: '88px' }}>
              <div className="p-4">
                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                  <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">Drive Summary</h6>
                    <small className="text-muted">Live validation preview</small>
                  </div>
                </div>

                <div className="d-flex flex-column gap-3 mb-4 small">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Target Company:</span>
                    <span className="fw-semibold text-truncate ms-2" style={{ maxWidth: '60%' }}>
                      {selectedComp?.companyName || 'Not selected'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Format & Mode:</span>
                    <span className="fw-semibold">{f.driveType} • {f.mode}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Drive Date:</span>
                    <span className="fw-semibold">{f.driveDate ? fmtDate(f.driveDate) : 'Not scheduled'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Min CGPA Barrier:</span>
                    <span className="fw-semibold">{f.eligibility.minCgpa > 0 ? `${f.eligibility.minCgpa} CGPA` : 'No CGPA Cutoff'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Backlog Threshold:</span>
                    <span className="fw-semibold">Max {f.eligibility.maxBacklogs}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Current Status:</span>
                    <span className="cc-badge violet">{f.status}</span>
                  </div>
                </div>

                <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>Eligible students matching these filters will automatically see this drive on their portal.</span>
                </div>

                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 py-2" disabled={busy}>
                    {busy ? <><Spinner /> Saving Drive...</> : <><CheckCircle2 size={16} /> {isEdit ? 'Save Changes' : 'Publish Drive'}</>}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/tpo/drives')}>
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


export function DriveRegs() {
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/drives/${id}/registrations`)).data.data, [id]);
  const info = useFetch(async () => (await api.get(`/drives/${id}`)).data.data, [id]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null);
  const setStatus = async (regId, status) => {
    setBusy(regId);
    try { await api.patch(`/drives/${id}/registrations/${regId}`, { status }); toast.success('Registration updated.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(null); }
  };
  if (res.loading) return <Loading rows={4} height={80} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const d = info.data?.drive;
  const regs = res.data || [];
  const s = search.trim().toLowerCase();
  const rows = s ? regs.filter((r) => (r.student?.name || '').toLowerCase().includes(s) || (r.student?.email || '').toLowerCase().includes(s)) : regs;
  const counts = regs.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
  const el = d?.eligibility || {};
  const eligRows = [['Min CGPA', el.minCgpa], ['Max backlogs', el.maxBacklogs], ['Passing year', el.passingYear], ['Branches', el.allowedBranches], ['Courses', el.allowedCourses], ['Experience', el.requiredExperience], ['Skills', el.requiredSkills]]
    .filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div>
      <Link className="small fw-semibold d-inline-flex align-items-center gap-1 mb-3" to="/tpo/drives"><ArrowLeft size={14} /> Back to drives</Link>
      {d && (
        <div className="cc-card cc-card-body mb-4">
          <div className="d-flex justify-content-between gap-2 flex-wrap align-items-start">
            <div>
              <h1 className="h4 mb-1">{d.driveTitle}</h1>
              <div className="small text-muted">{d.company?.companyName || '—'} · {fmtDate(d.driveDate)}{d.startTime ? ` ${d.startTime}${d.endTime ? `–${d.endTime}` : ''}` : ''}{d.venue ? ` · ${d.venue}` : ''}</div>
            </div>
            <span className="d-flex gap-1"><StatusBadge value={d.status} /><StatusBadge value={d.mode} /></span>
          </div>
          {eligRows.length > 0 && <div className="d-flex gap-2 mt-3 flex-wrap">{eligRows.map(([k, v]) => <span key={k} className="cc-badge gray no-dot">{k}: {v}</span>)}</div>}
        </div>
      )}

      <KpiGrid>
        <KpiCard tone="primary" icon={<Users />} value={regs.length} label="Registrations" />
        <KpiCard tone="info" icon={<Eye />} value={counts.shortlisted || 0} label="Shortlisted" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={counts.selected || 0} label="Selected" />
        <KpiCard tone="danger" icon={<XCircle />} value={counts.rejected || 0} label="Rejected" />
      </KpiGrid>

      <Toolbar showClear={!!search} onClear={() => setSearch('')}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search applicant" label="Applicant search" />
      </Toolbar>

      <DataTable
        rows={rows} empty="No registrations"
        columns={[
          { key: 'student', header: 'Student', render: (r) => (<div><b>{r.student?.name}</b><small className="text-muted d-block">{r.student?.email}</small></div>) },
          { key: 'elig', header: 'Eligibility', render: (r) => <StatusBadge value={r.eligibilityStatus} /> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
          { key: 'actions', header: 'Set status', align: 'right', render: (r) => (
            <div className="d-flex justify-content-end"><InlineStatus value={r.status} options={['registered', 'shortlisted', 'rejected', 'selected']} busy={busy === r._id} onSave={(v) => setStatus(r._id, v)} /></div>
          ) },
        ]}
      />
    </div>
  );
}

/* ================================================================== *
 * Applications
 * ================================================================== */
export function TpoApplications() {
  const [q, setQ] = useState({ status: '', search: '', page: 1 });
  const [busy, setBusy] = useState(null);
  const res = useFetch(async () => (await api.get('/tpo/applications', { params: { status: q.status, search: q.search, limit: 15, page: q.page } })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const override = async (a, status) => {
    setBusy(a._id);
    try { await api.patch(`/applications/${a._id}/status`, { status }); toast.success('Application status updated.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(null); }
  };

  return (
    <div>
      <PageHeader eyebrow="Placements" title="Applications" icon={<FileText />}
        description="Monitor every student application and move candidates through the hiring pipeline." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<FileText />} value={pag.total ?? '—'} label="Applications in view" />
        <KpiCard tone="violet" icon={<Eye />} value={rows.filter((a) => a.status === 'Shortlisted').length} label="Shortlisted (page)" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={rows.filter((a) => ['Selected', 'Offer', 'Placed'].includes(a.status)).length} label="Selected (page)" />
        <KpiCard tone="danger" icon={<XCircle />} value={rows.filter((a) => a.status === 'Rejected').length} label="Rejected (page)" />
      </KpiGrid>

      <Toolbar showClear={!!(q.search || q.status)} onClear={() => setQ({ status: '', search: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search student, job or company" label="Application search" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => set({ status: v })} options={APP_STATUSES} />
      </Toolbar>

      <DataTable
        rows={rows} loading={res.loading} empty="No applications match"
        columns={[
          { key: 'student', header: 'Student', render: (a) => (<div><Link className="fw-semibold" to={`/tpo/applications/${a._id}`}>{a.student?.name || '—'}</Link><small className="text-muted d-block">{a.student?.email}</small></div>) },
          { key: 'job', header: 'Job / Company', render: (a) => (<><div className="fw-medium">{a.job?.title || '—'}</div><small className="text-muted">{a.job?.company?.companyName || '—'}</small></>) },
          { key: 'applied', header: 'Applied', render: (a) => fmtDate(a.appliedAt || a.createdAt) },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge value={a.status} /> },
          { key: 'actions', header: 'Actions', align: 'right', render: (a) => (
            <div className="d-flex gap-1 justify-content-end align-items-center" onClick={(e) => e.stopPropagation()}>
              <Link className="btn btn-sm btn-outline-primary" to={`/tpo/applications/${a._id}`}>View</Link>
              <InlineStatus value={a.status} options={APP_STATUSES} busy={busy === a._id} onSave={(v) => override(a, v)} width={150} />
            </div>
          ) },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />
    </div>
  );
}

export function TpoApplicationDetail() {
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/applications/${id}`)).data.data, [id]);
  const [busy, setBusy] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const override = async (status, reason = '') => {
    setBusy(true);
    try {
      await api.patch(`/applications/${id}/status`, { status, rejectionReason: reason || undefined });
      toast.success(`Application updated to ${status}.`);
      setShowStatusModal(false);
      res.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (res.loading) return <Loading rows={5} height={90} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const a = res.data;

  const PIPELINE_STEPS = ['Applied', 'Under Review', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Offer', 'Placed'];
  const curIdx = PIPELINE_STEPS.indexOf(a.status);
  const isRejected = a.status === 'Rejected';

  return (
    <div className="w-100" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link className="small fw-semibold d-inline-flex align-items-center gap-1 text-decoration-none text-muted" to="/tpo/applications">
          <ArrowLeft size={15} /> Back to Applications Queue
        </Link>
        <span className="cc-badge emerald d-inline-flex align-items-center gap-1">
          <Activity size={12} /> Live Candidate Dossier
        </span>
      </div>

      <div className="cc-card p-4 mb-4 bg-gradient">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4" style={{ width: 56, height: 56 }}>
              {a.student?.name ? a.student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'ST'}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0">{a.student?.name || 'Student Candidate'}</h4>
                <StatusBadge value={a.status} />
              </div>
              <p className="text-muted small mb-0 mt-1">
                Applying for <strong className="text-body">{a.job?.title || 'Open Position'}</strong> at <strong className="text-body">{a.job?.company?.companyName || 'Campus Partner'}</strong>
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-primary d-inline-flex align-items-center gap-1"
              onClick={() => { setNewStatus(a.status); setRejectReason(a.rejectionReason || ''); setShowStatusModal(true); }}
            >
              <Pencil size={15} /> Update Status
            </button>
            <Link className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" to={`/tpo/students/${a.student?._id}`}>
              <Eye size={15} /> Student Profile
            </Link>
          </div>
        </div>

        <div className="mt-4 pt-3 border-top">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const done = !isRejected && curIdx >= idx;
              const current = !isRejected && curIdx === idx;
              return (
                <div key={step} className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: 100 }}>
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center small fw-bold ${current ? 'bg-primary text-white shadow' : done ? 'bg-success text-white' : 'bg-light text-muted border'}`}
                    style={{ width: 28, height: 28, flexShrink: 0 }}
                  >
                    {done ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className={`small ${current ? 'fw-bold text-primary' : done ? 'fw-semibold text-body' : 'text-muted'}`}>
                    {step}
                  </span>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className={`flex-grow-1 border-top ${done ? 'border-success' : 'border-light'}`} style={{ height: 2, minWidth: 20 }} />
                  )}
                </div>
              );
            })}
          </div>
          {isRejected && (
            <div className="alert alert-danger py-2 px-3 small mt-3 mb-0 d-flex align-items-center gap-2">
              <XCircle size={16} className="flex-shrink-0" />
              <span>Application has been marked as <strong>Rejected</strong>. Reason: {a.rejectionReason || 'No specific feedback provided.'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6">
          <SectionCard title="Job & Opportunity Overview" icon={<Briefcase size={18} />}>
            <DetailGrid columns={1} items={[
              { label: 'Role Title', value: <span className="fw-semibold">{a.job?.title}</span> },
              { label: 'Hiring Company', value: a.job?.company?.companyName },
              { label: 'Job Type & Work Mode', value: `${a.job?.jobType || 'Full-time'} • ${a.job?.workMode || 'Onsite'}` },
              { label: 'Application Date', value: fmtDateTime(a.appliedAt || a.createdAt) },
              { label: 'Salary / Package', value: a.job?.salaryMax ? `₹${a.job.salaryMin ? `${a.job.salaryMin} - ` : ''}${a.job.salaryMax} LPA` : 'Undisclosed' },
              { label: 'Job Location', value: a.job?.location || 'Campus / Multiple' },
            ]} />
          </SectionCard>
        </div>

        <div className="col-12 col-md-6">
          <SectionCard title="Candidate Academic Profile" icon={<GraduationCap size={18} />}>
            <DetailGrid columns={1} items={[
              { label: 'Full Name', value: <span className="fw-semibold">{a.student?.name}</span> },
              { label: 'Email Address', value: <a href={`mailto:${a.student?.email}`} className="text-decoration-none">{a.student?.email}</a> },
              { label: 'Roll / Enrollment Number', value: a.student?.enrollmentNumber || a.student?.rollNo || 'Verified' },
              { label: 'Department / Branch', value: a.student?.branch || a.student?.department || 'Engineering' },
              { label: 'Academic Standing', value: a.student?.cgpa ? `${a.student.cgpa} CGPA (0 Backlogs)` : 'Good Standing' },
              { label: 'Passing Year', value: a.student?.batch || a.student?.passingYear || '2026 Batch' },
            ]} />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Application Lifecycle Audit Trail" icon={<ScrollText size={18} />}>
        {!(a.history || []).length ? (
          <Empty title="No status change records" subtitle="Status changes and review notes will appear here automatically." />
        ) : (
          <div className="cc-timeline py-2">
            {(a.history || []).slice().reverse().map((h, i) => (
              <div key={i} className="cc-tl-item">
                <span className="cc-tl-dot cc-tone-primary"><CheckCircle2 size={16} /></span>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold">{h.status}</span>
                    {h.by && <small className="text-muted">• by {h.by}</small>}
                  </div>
                  {h.note && <div className="small text-muted mt-1">{h.note}</div>}
                  <div className="small text-muted mt-1">{fmtDateTime(h.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showStatusModal && (
        <Modal
          title={`Update Status: ${a.student?.name}`}
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
        >
          <div className="p-3">
            <div className="mb-3">
              <label className="form-label small fw-semibold">Target Application Stage</label>
              <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {newStatus === 'Rejected' && (
              <div className="mb-3">
                <label className="form-label small fw-semibold">Rejection Feedback / Reason</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="Explain why the candidate was rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            )}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-outline-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button
                className="btn btn-primary d-inline-flex align-items-center gap-1"
                disabled={busy}
                onClick={() => override(newStatus, rejectReason)}
              >
                {busy ? <><Spinner /> Updating...</> : 'Save & Notify Candidate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


export function TpoAssessments() {
  const [q, setQ] = useState({ search: '', status: '', company: '', page: 1 });
  const [detail, setDetail] = useState(null);
  const res = useFetch(async () => (await api.get('/tpo/assessments', { params: { q: q.search, status: q.status, company: q.company, page: q.page, limit: 15 } })).data, [JSON.stringify(q)]);
  const att = useFetch(async () => (await api.get('/tpo/attempts', { params: { limit: 10, page: 1 } })).data, []);
  const vio = useFetch(async () => (await api.get('/tpo/violations')).data.data, []);

  if (res.loading) return <Loading rows={4} height={80} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const all = res.data?.data || [];
  const summary = res.data?.summary || {};
  const companies = res.data?.companies || [];
  const pagination = res.data?.pagination || {};
  const rows = all;
  const attempts = att.data?.data || [];
  const vioList = vio.data || [];
  const setFilter = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  return (
    <div>
      <PageHeader eyebrow="Process" title="Assessments" icon={<FileText />}
        description="Monitor online assessments, attempts and proctoring integrity across drives." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<FileText />} value={summary.assessmentCount ?? '—'} label="Assessments" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={summary.active ?? '—'} label="Active" />
        <KpiCard tone="info" icon={<Users />} value={summary.attempts ?? '—'} label="Total attempts" />
        <KpiCard tone="success" icon={<Award />} value={summary.passed ?? '—'} label="Passed" />
        <KpiCard tone="danger" icon={<XCircle />} value={summary.failed ?? '—'} label="Failed" />
        <KpiCard tone="amber" icon={<Clock />} value={summary.pending ?? '—'} label="Pending" />
      </KpiGrid>

      <Toolbar showClear={!!(q.search || q.status || q.company)} onClear={() => setQ({ search: '', status: '', company: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => setFilter({ search: v })} placeholder="Search assessment, company or job" label="Assessment search" />
        <SelectFilter label="Company" value={q.company} onChange={(v) => setFilter({ company: v })} options={companies.map((c) => ({ value: c._id, label: c.companyName }))} placeholder="All companies" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => setFilter({ status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'draft', label: 'Draft' }]} />
      </Toolbar>

      <SectionCard title={`Assessments (${pagination.total ?? 0})`} icon={<FileText />} className="mb-4" bodyClass="p-0">
        <div className="d-none d-md-block">
        <DataTable
          className="cc-assessment-table-wrap"
          rows={rows} empty="No assessments match"
          columns={[
            { key: 'title', header: 'Assessment', render: (a) => (<div><b>{a.title}</b><small className="text-muted d-block">{a.company?.companyName || '—'}{a.job?.title ? ` · ${a.job.title}` : ''}</small></div>) },
            { key: 'questions', header: 'Questions', align: 'right', render: (a) => `${a.questionCount || 0} / ${a.numQuestions || 0}` },
            { key: 'duration', header: 'Duration', render: (a) => a.durationMinutes ? `${a.durationMinutes} min` : '—' },
            { key: 'passMark', header: 'Pass %', align: 'right', render: (a) => `${a.passingPercentage ?? 0}%` },
            { key: 'attempts', header: 'Attempts', align: 'right', render: (a) => a.attemptCount || 0 },
            { key: 'passCount', header: 'Passed / failed', align: 'right', render: (a) => `${a.passedCount || 0} / ${a.failedCount || 0}` },
            { key: 'marks', header: 'Marks', align: 'right', render: (a) => num(a.totalMarks) },
            { key: 'status', header: 'Status', render: (a) => <StatusBadge value={a.status} /> },
            { key: 'actions', header: '', align: 'right', render: (a) => <div className="d-flex gap-1 justify-content-end"><button type="button" className="btn btn-sm btn-light border" title="Quick view details" onClick={() => setDetail(a)}><Eye size={14} /></button><Link className="btn btn-sm btn-primary" to={`/tpo/assessments/${a._id}/attempts`}>Attempts</Link><Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessments/${a._id}`}>View</Link></div> },
          ]}
        />
        </div>
        <div className="d-md-none p-2">
          {rows.length === 0 ? <Empty title="No assessments match" /> : rows.map((a) => (
            <div key={a._id} className="tpo-mobile-record mb-2">
              <div className="tpo-mobile-head">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="tpo-mobile-title" style={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}>{a.title}</div>
                  <div className="tpo-mobile-sub" style={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}>{a.company?.companyName || '—'}{a.job?.title ? ` · ${a.job.title}` : ''}</div>
                </div>
                <StatusBadge value={a.status} />
              </div>
              <div className="tpo-mobile-grid">
                <div className="tpo-mobile-field"><span className="tpo-mobile-label">Questions</span><span className="tpo-mobile-value">{a.questionCount || 0} / {a.numQuestions || 0}</span></div>
                <div className="tpo-mobile-field"><span className="tpo-mobile-label">Duration</span><span className="tpo-mobile-value">{a.durationMinutes || 0} min</span></div>
                <div className="tpo-mobile-field"><span className="tpo-mobile-label">Pass %</span><span className="tpo-mobile-value">{a.passingPercentage ?? 0}%</span></div>
                <div className="tpo-mobile-field"><span className="tpo-mobile-label">Attempts</span><span className="tpo-mobile-value fw-bold">{a.attemptCount || 0}</span></div>
                <div className="tpo-mobile-field"><span className="tpo-mobile-label">Passed / Failed</span><span className="tpo-mobile-value">{a.passedCount || 0} / {a.failedCount || 0}</span></div>
                <div className="tpo-mobile-field"><span className="tpo-mobile-label">Marks</span><span className="tpo-mobile-value">{num(a.totalMarks)}</span></div>
              </div>
              <div className="tpo-mobile-actions">
                <button type="button" className="btn btn-light border btn-sm w-100" onClick={() => setDetail(a)}><Eye size={14} className="me-1" />Quick view</button>
                <Link className="btn btn-primary btn-sm w-100" to={`/tpo/assessments/${a._id}/attempts`}>Attempts</Link>
                <Link className="btn btn-outline-primary btn-sm w-100" to={`/tpo/assessments/${a._id}`}>View</Link>
              </div>
            </div>
          ))}
        </div>
        <Pager page={pagination.page || 1} pages={pagination.pages || 1} onPage={(page) => setFilter({ page })} />
      </SectionCard>

      <div className="cc-grid-2">
        <SectionCard title="Recent attempts" icon={<Users />} bodyClass="p-0">
          {att.loading ? <Loading rows={3} height={44} /> : !attempts.length ? <Empty title="No attempts yet" /> : (
            <>
              <div className="d-none d-md-block">
                <DataTable
                  className="cc-assessment-table-wrap"
                  rows={attempts}
                  empty="No attempts yet"
                  columns={[
                    { key: 'student', header: 'Student', render: (a) => <Link className="fw-semibold text-decoration-none" to={`/tpo/assessment-attempts/${a._id}`}>{a.student?.name || '—'}</Link> },
                    { key: 'assessment', header: 'Assessment', render: (a) => <span className="small text-muted text-truncate d-inline-block" style={{ maxWidth: 160 }}>{a.assessment?.title || '—'}</span> },
                    { key: 'score', header: '%', align: 'right', render: (a) => <b>{a.percentage ?? 0}%</b> },
                    { key: 'result', header: 'Result', render: (a) => <StatusBadge value={a.result} /> },
                    { key: 'action', header: '', align: 'right', render: (a) => <Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessment-attempts/${a._id}`}>View</Link> },
                  ]}
                />
              </div>
              <div className="d-md-none p-2">
                <div className="cc-stack">
                  {attempts.map((a) => (
                    <div key={a._id} className="cc-list-row">
                      <span className="cc-list-ic cc-tone-info"><FileText /></span>
                      <span className="cc-list-body"><Link className="text-reset text-decoration-none" to={`/tpo/assessment-attempts/${a._id}`}><b>{a.student?.name || '—'}</b></Link><small>{a.assessment?.title} · {a.percentage ?? 0}%</small></span>
                      <StatusBadge value={a.result} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SectionCard>
        <SectionCard title={`Violations (${vioList.length})`} icon={<XCircle />} bodyClass="p-0">
          {vio.loading ? <Loading rows={3} height={44} /> : !vioList.length ? <Empty title="No violations" /> : (
            <>
              <div className="d-none d-md-block">
                <DataTable
                  className="cc-assessment-table-wrap"
                  rows={vioList.slice(0, 10)}
                  empty="No violations"
                  columns={[
                    { key: 'student', header: 'Student', render: (v) => <b>{v.student?.name || '—'}</b> },
                    { key: 'type', header: 'Type', render: (v) => <span className="small">{v.violationType}</span> },
                    { key: 'severity', header: 'Severity', render: (v) => <StatusBadge value={v.severity} /> },
                    { key: 'action', header: '', align: 'right', render: (v) => v.attempt?._id ? <Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessment-attempts/${v.attempt._id}`}>View</Link> : '—' },
                  ]}
                />
              </div>
              <div className="d-md-none p-2">
                <div className="cc-stack">
                  {vioList.slice(0, 10).map((v) => (
                    <div key={v._id} className="cc-list-row">
                      <span className="cc-list-ic cc-tone-danger"><XCircle /></span>
                      <span className="cc-list-body"><b>{v.student?.name || '—'}</b><small>{v.violationType}</small></span>
                      <span className="d-flex align-items-center gap-2"><StatusBadge value={v.severity} />{v.attempt?._id && <Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessment-attempts/${v.attempt._id}`}>View</Link>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title || 'Assessment details'} description={detail ? `${detail.company?.companyName || '—'} · ${detail.job?.title || '—'}` : ''} size="lg">
        {detail && (
          <div className="row g-3 small">
            <div className="col-6 col-md-4"><div className="text-muted">Duration</div><b>{detail.durationMinutes || '—'} min</b></div>
            <div className="col-6 col-md-4"><div className="text-muted">Total marks</div><b>{detail.totalMarks ?? '—'}</b></div>
            <div className="col-6 col-md-4"><div className="text-muted">Pass %</div><b>{detail.passingPercentage ?? 0}%</b></div>
            <div className="col-6 col-md-4"><div className="text-muted">Questions</div><b>{detail.questionCount ?? 0} / {detail.numQuestions || 0}</b></div>
            <div className="col-6 col-md-4"><div className="text-muted">Attempts</div><b>{detail.attemptCount || 0}</b></div>
            <div className="col-6 col-md-4"><div className="text-muted">Passed / Failed</div><b>{detail.passedCount || 0} / {detail.failedCount || 0}</b></div>
            <div className="col-6 col-md-4"><div className="text-muted">Status</div><StatusBadge value={detail.status} /></div>
            <div className="col-6 col-md-4"><div className="text-muted">Created</div><b>{detail.createdAt ? String(detail.createdAt).slice(0, 10) : '—'}</b></div>
            <div className="col-12"><div className="text-muted">Description</div><div style={{ whiteSpace: 'pre-wrap' }}>{detail.description || '—'}</div></div>
            <div className="col-12 d-flex gap-2 mt-2">
              <Link className="btn btn-primary btn-sm" to={`/tpo/assessments/${detail._id}/attempts`} onClick={() => setDetail(null)}>View attempts</Link>
              <Link className="btn btn-outline-primary btn-sm" to={`/tpo/assessments/${detail._id}`} onClick={() => setDetail(null)}>Open full page</Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function TpoAssessmentDetail() {
  const { id } = useParams();
  const meta = useFetch(async () => (await api.get(`/assessments/${id}`)).data.data, [id]);
  const results = useFetch(async () => (await api.get(`/assessments/${id}/results`)).data.data, [id]);
  const violations = useFetch(async () => (await api.get(`/assessments/${id}/violations`)).data.data, [id]);
  if (meta.loading) return <Loading rows={4} height={80} />;
  if (meta.error) return <ErrorState message={apiErrorMessage(meta.error)} onRetry={meta.reload} />;
  const a = meta.data;
  const attempts = results.data || [];
  const vioList = violations.data || [];
  return (
    <div>
      <Link className="small fw-semibold d-inline-flex align-items-center gap-1 mb-3" to="/tpo/assessments"><ArrowLeft size={14} /> Back to assessments</Link>
      <PageHeader eyebrow="Assessment" title={a.title} icon={<FileText />}
        description={`${a.company?.companyName || '—'}${a.job?.title ? ` · ${a.job.title}` : ''}`}
        meta={<><StatusBadge value={a.status} dot={false} /><StatusBadge value={a.difficulty} dot={false} /></>} />
      <KpiGrid>
        <KpiCard tone="info" icon={<Clock />} value={a.durationMinutes ? `${a.durationMinutes}m` : '—'} label="Duration" />
        <KpiCard tone="primary" icon={<Award />} value={num(a.totalMarks)} label="Total marks" />
        <KpiCard tone="violet" icon={<FileText />} value={num(a.numQuestions)} label="Questions" />
        <KpiCard tone="success" icon={<UserCheck />} value={attempts.length} label="Attempts" />
      </KpiGrid>
      <SectionCard title={`Results (${attempts.length})`} icon={<Award />} className="mb-4" actions={<Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessments/${id}/attempts`}>Search all attempts</Link>}>
        {results.loading ? <Loading rows={3} height={44} /> : !attempts.length ? <Empty title="No attempts yet" /> : (
          <DataTable
            className="cc-assessment-table-wrap"
            rows={attempts}
            columns={[
              { key: 'student', header: 'Student', render: (x) => <b>{x.student?.name || '—'}</b> },
              { key: 'score', header: 'Score', align: 'right', render: (x) => num(x.score) },
              { key: 'pct', header: '%', align: 'right', render: (x) => `${x.percentage ?? 0}%` },
              { key: 'result', header: 'Result', render: (x) => <StatusBadge value={x.result} /> },
              { key: 'integrity', header: 'Integrity', render: (x) => <StatusBadge value={x.integrityStatus} /> },
              { key: 'viol', header: 'Violations', align: 'right', render: (x) => x.violationCount ?? 0 },
              { key: 'action', header: '', align: 'right', render: (x) => <Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessment-attempts/${x._id}`}>Details</Link> },
            ]}
          />
        )}
      </SectionCard>
      <SectionCard title={`Violations (${vioList.length})`} icon={<XCircle />}>
        {violations.loading ? <Loading rows={3} height={44} /> : !vioList.length ? <Empty title="No violations" /> : (
          <DataTable
            className="cc-assessment-table-wrap"
            rows={vioList}
            columns={[
              { key: 'student', header: 'Student', render: (v) => <b>{v.student?.name || '—'}</b> },
              { key: 'type', header: 'Type', render: (v) => v.violationType },
              { key: 'severity', header: 'Severity', render: (v) => <StatusBadge value={v.severity} /> },
              { key: 'at', header: 'Occurred', render: (v) => fmtDateTime(v.occurredAt || v.createdAt) },
              { key: 'action', header: '', align: 'right', render: (v) => v.attempt?._id ? <Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessment-attempts/${v.attempt._id}`}>Details</Link> : '—' },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}

/* ================================================================== *
 * Interviews
 * ================================================================== */
export function TpoInterviews() {
  const [q, setQ] = useState({ status: '', result: '', search: '', page: 1 });
  const res = useFetch(async () => (await api.get('/interviews', { params: { status: q.status, result: q.result, search: q.search, limit: 12, page: q.page } })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const cancel = async (iv) => {
    const reason = await promptText({ title: `Cancel interview with ${iv.student?.name}?`, inputLabel: 'Reason (optional)', placeholder: 'Reason', confirmButtonText: 'Cancel interview' });
    if (reason === null) return;
    try { await api.patch(`/interviews/${iv._id}`, { status: 'cancelled', notes: reason || undefined }); toast.success('Interview cancelled.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const saveEdit = async (payload) => {
    setBusy(true);
    try { await api.patch(`/interviews/${editing._id}`, payload); toast.success('Interview updated.'); setEditing(null); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader eyebrow="Process" title="Interviews" icon={<Video />}
        description="Track scheduled interviews, record results and reschedule or cancel rounds." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<Video />} value={pag.total ?? '—'} label="Interviews in view" />
        <KpiCard tone="info" icon={<Clock />} value={rows.filter((v) => v.status === 'scheduled').length} label="Scheduled (page)" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={rows.filter((v) => v.result === 'Selected').length} label="Selected (page)" />
        <KpiCard tone="amber" icon={<Clock />} value={rows.filter((v) => v.result === 'Pending').length} label="Pending (page)" />
      </KpiGrid>
      <Toolbar showClear={!!(q.search || q.status || q.result)} onClear={() => setQ({ status: '', result: '', search: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search student or company" label="Interview search" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => set({ status: v })} options={INTERVIEW_STATUSES} />
        <SelectFilter label="Result" value={q.result} onChange={(v) => set({ result: v })} options={INTERVIEW_RESULTS} />
      </Toolbar>

      <DataTable
        rows={rows} loading={res.loading} empty="No interviews match"
        columns={[
          { key: 'student', header: 'Student', render: (v) => (<div><b>{v.student?.name || '—'}</b><small className="text-muted d-block">{v.company?.companyName || '—'}</small></div>) },
          { key: 'round', header: 'Round', render: (v) => <StatusBadge value={v.roundName} dot={false} /> },
          { key: 'when', header: 'Date & time', render: (v) => (<><div>{fmtDateTime(v.interviewDate)}</div><small className="text-muted">{v.mode || ''}</small></>) },
          { key: 'status', header: 'Status', render: (v) => <StatusBadge value={v.status} /> },
          { key: 'result', header: 'Result', render: (v) => <StatusBadge value={v.result} /> },
          { key: 'actions', header: 'Actions', align: 'right', render: (v) => (
            <div className="d-flex gap-1 justify-content-end">
              <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(v)}><Pencil size={13} /> Edit</button>
              {v.status !== 'cancelled' && <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(v)}>Cancel</button>}
            </div>
          ) },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />

      <InterviewModal interview={editing} onClose={() => setEditing(null)} onSave={saveEdit} busy={busy} />
    </div>
  );
}

function InterviewModal({ interview, onClose, onSave, busy }) {
  const [f, setF] = useState({});
  const open = !!interview;
  useMemo(() => {
    if (interview) {
      setF({
        roundName: interview.roundName || 'Technical Round',
        mode: interview.mode || 'Online',
        status: interview.status || 'scheduled',
        result: interview.result || 'Pending',
        interviewDate: interview.interviewDate?.slice(0, 10) || '',
        interviewTime: interview.interviewTime || '',
        meetingLink: interview.meetingLink || '',
        location: interview.location || '',
        interviewer: interview.interviewer || '',
        notes: interview.notes || '',
      });
    }
  }, [interview]);
  if (!open) return null;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Update interview" description={interview.student?.name ? `${interview.student.name} · ${interview.company?.companyName || ''}` : undefined}
      footer={<>
        <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={() => onSave(f)}>{busy ? <Spinner /> : 'Save changes'}</button>
      </>}>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label small fw-semibold">Round</label><select className="form-select" value={f.roundName} onChange={set('roundName')}>{ROUND_NAMES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Mode</label><select className="form-select" value={f.mode} onChange={set('mode')}>{['Online', 'Offline', 'Hybrid', 'Telephonic', 'Video'].map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Date</label><input type="date" className="form-control" value={f.interviewDate} onChange={set('interviewDate')} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Time</label><input type="time" className="form-control" value={f.interviewTime} onChange={set('interviewTime')} /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Status</label><select className="form-select" value={f.status} onChange={set('status')}>{INTERVIEW_STATUSES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Result</label><select className="form-select" value={f.result} onChange={set('result')}>{INTERVIEW_RESULTS.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Meeting link</label><input className="form-control" value={f.meetingLink} onChange={set('meetingLink')} placeholder="https://" /></div>
        <div className="col-md-6"><label className="form-label small fw-semibold">Interviewer</label><input className="form-control" value={f.interviewer} onChange={set('interviewer')} /></div>
        <div className="col-12"><label className="form-label small fw-semibold">Location / venue</label><input className="form-control" value={f.location} onChange={set('location')} /></div>
        <div className="col-12"><label className="form-label small fw-semibold">Notes</label><textarea className="form-control" rows={2} value={f.notes} onChange={set('notes')} /></div>
      </div>
    </Modal>
  );
}

/* ================================================================== *
 * Offers
 * ================================================================== */
export function TpoOffers() {
  const [q, setQ] = useState({ status: '', search: '', page: 1 });
  const res = useFetch(async () => (await api.get('/offers', { params: { status: q.status, search: q.search, limit: 12, page: q.page } })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const withdraw = async (o) => {
    const reason = await promptText({ title: `Withdraw offer for ${o.student?.name}?`, input: 'textarea', inputLabel: 'Reason (min 5 chars)', confirmButtonText: 'Withdraw', required: true });
    if (reason === null) return;
    try { await api.post(`/offers/${o._id}/withdraw`, { reason }); toast.success('Offer withdrawn.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div>
      <PageHeader eyebrow="Process" title="Offers" icon={<Award />}
        description="Review issued offers, preview offer letters and manage their lifecycle." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<Award />} value={pag.total ?? '—'} label="Offers in view" />
        <KpiCard tone="info" icon={<Send />} value={rows.filter((o) => o.status === 'issued').length} label="Issued (page)" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={rows.filter((o) => o.status === 'accepted').length} label="Accepted (page)" />
        <KpiCard tone="danger" icon={<XCircle />} value={rows.filter((o) => o.status === 'withdrawn').length} label="Withdrawn (page)" />
      </KpiGrid>
      <Toolbar showClear={!!(q.search || q.status)} onClear={() => setQ({ status: '', search: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search student, company or position" label="Offer search" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => set({ status: v })} options={OFFER_STATUSES} />
      </Toolbar>

      <DataTable
        rows={rows} loading={res.loading} empty="No offers match"
        columns={[
          { key: 'position', header: 'Position', render: (o) => (<div><b>{o.position || '—'}</b><small className="text-muted d-block">{o.student?.name || '—'} · {o.company?.companyName || '—'}</small></div>) },
          { key: 'salary', header: 'Package', render: (o) => o.salary || '—' },
          { key: 'joining', header: 'Joining', render: (o) => fmtDate(o.joiningDate) },
          { key: 'status', header: 'Status', render: (o) => <StatusBadge value={o.status} /> },
          { key: 'actions', header: 'Actions', align: 'right', render: (o) => (
            <div className="d-flex gap-1 justify-content-end">
              <Link className="btn btn-sm btn-primary" to={`/tpo/offers/${o._id}/letter`}>Preview</Link>
              {!['withdrawn', 'rejected', 'expired'].includes(o.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => withdraw(o)}>Withdraw</button>}
            </div>
          ) },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />
    </div>
  );
}

/* ================================================================== *
 * Selections
 * ================================================================== */
export function Selections() {
  const [q, setQ] = useState({ status: '', search: '', page: 1 });
  const res = useFetch(async () => (await api.get('/selections', { params: { status: q.status, search: q.search, limit: 15, page: q.page } })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const counts = rows.reduce((m, s) => { m[s.selectionStatus] = (m[s.selectionStatus] || 0) + 1; return m; }, {});
  return (
    <div>
      <PageHeader eyebrow="Process" title="Selections" icon={<Star />}
        description="Final selection decisions recorded by recruiters across all drives." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<Star />} value={pag.total ?? '—'} label="Selections in view" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={counts.Selected || 0} label="Selected (page)" />
        <KpiCard tone="info" icon={<Clock />} value={counts['On Hold'] || 0} label="On hold (page)" />
        <KpiCard tone="danger" icon={<XCircle />} value={counts.Rejected || 0} label="Rejected (page)" />
      </KpiGrid>
      <Toolbar showClear={!!(q.search || q.status)} onClear={() => setQ({ status: '', search: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search student or company" label="Selection search" />
        <SelectFilter label="Decision" value={q.status} onChange={(v) => set({ status: v })} options={['Selected', 'On Hold', 'Rejected']} />
      </Toolbar>
      <DataTable
        rows={rows} loading={res.loading} empty="No selections match"
        columns={[
          { key: 'student', header: 'Student', render: (s) => (<div><b>{s.student?.name || '—'}</b><small className="text-muted d-block">{s.company?.companyName || '—'}</small></div>) },
          { key: 'job', header: 'Job', render: (s) => s.application?.job?.title || '—' },
          { key: 'remarks', header: 'Remarks', render: (s) => s.remarks || '—' },
          { key: 'date', header: 'Decision date', render: (s) => fmtDate(s.selectedAt) },
          { key: 'status', header: 'Decision', render: (s) => <StatusBadge value={s.selectionStatus} /> },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />
    </div>
  );
}

/* ================================================================== *
 * Placements
 * ================================================================== */
export function Placements() {
  const [q, setQ] = useState({ status: '', search: '', year: '', page: 1 });
  const res = useFetch(async () => (await api.get('/placements', { params: { status: q.status, search: q.search, year: q.year, limit: 15, page: q.page } })).data, [JSON.stringify(q)]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3].map(String);
  return (
    <div>
      <PageHeader eyebrow="Process" title="Placements" icon={<TrendingUp />}
        description="Confirmed placement records of students across companies and packages." />
      <KpiGrid>
        <KpiCard tone="primary" icon={<TrendingUp />} value={pag.total ?? '—'} label="Placements in view" />
        <KpiCard tone="success" icon={<CheckCircle2 />} value={rows.filter((p) => p.status === 'Placed' || p.status === 'Joined').length} label="Placed / joined (page)" />
        <KpiCard tone="info" icon={<Clock />} value={rows.filter((p) => p.status === 'Not Joined').length} label="Not joined (page)" />
      </KpiGrid>
      <Toolbar showClear={!!(q.search || q.status || q.year)} onClear={() => setQ({ status: '', search: '', year: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search student or company" label="Placement search" />
        <SelectFilter label="Status" value={q.status} onChange={(v) => set({ status: v })} options={PLACEMENT_STATUSES} />
        <SelectFilter label="Year" value={q.year} onChange={(v) => set({ year: v })} options={years} />
      </Toolbar>
      <DataTable
        rows={rows} loading={res.loading} empty="No placements match"
        columns={[
          { key: 'student', header: 'Student', render: (p) => (<div><b>{p.student?.name || '—'}</b><small className="text-muted d-block">{p.company?.companyName || '—'}</small></div>) },
          { key: 'role', header: 'Role', render: (p) => p.job?.title || p.position || '—' },
          { key: 'package', header: 'Package', render: (p) => p.package || '—' },
          { key: 'date', header: 'Placement date', render: (p) => fmtDate(p.placementDate) },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge value={p.status} /> },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />
    </div>
  );
}

/* ================================================================== *
 * Announcements
 * ================================================================== */
const BLANK_ANN = { title: '', message: '', targetRole: 'all', targetCourse: '', targetBranch: '', publishDate: new Date().toISOString().slice(0, 10), expiryDate: '' };

export function Announcements() {
  const res = useFetch(async () => (await api.get('/announcements')).data.data, []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(BLANK_ANN);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const openCreate = () => { setEditing(null); setF(BLANK_ANN); setOpen(true); };
  const openEdit = (a) => {
    setEditing(a._id);
    setF({ title: a.title, message: a.message, targetRole: a.targetRole || 'all', targetCourse: a.targetCourse || '', targetBranch: a.targetBranch || '', publishDate: a.publishDate?.slice(0, 10) || '', expiryDate: a.expiryDate?.slice(0, 10) || '' });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f, targetCourse: f.targetCourse || null, targetBranch: f.targetBranch || null, expiryDate: f.expiryDate || null };
    try {
      if (editing) { await api.patch(`/announcements/${editing}`, body); toast.success('Announcement updated.'); }
      else { await api.post('/announcements', body); toast.success('Draft created — publish to notify.'); }
      setOpen(false); setF(BLANK_ANN); setEditing(null); res.reload();
    } catch (e2) { toast.error(apiErrorMessage(e2)); } finally { setBusy(false); }
  };
  const publish = async (a) => {
    try { await api.post(`/announcements/${a._id}/publish`); toast.success('Published and notified.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const unpublish = async (a) => {
    const ok = await confirmAction({ title: 'Unpublish announcement?', text: 'It will no longer be delivered or visible as active.', confirmButtonText: 'Unpublish' });
    if (!ok) return;
    try { await api.patch(`/announcements/${a._id}`, { status: 'inactive' }); toast.success('Announcement unpublished.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const del = async (a) => {
    const ok = await confirmDanger({ title: 'Delete announcement?', text: 'The announcement and its notifications will be removed.', confirmButtonText: 'Delete' });
    if (!ok) return;
    try { await api.delete(`/announcements/${a._id}`); toast.success('Deleted.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const rows = res.data || [];

  return (
    <div>
      <PageHeader eyebrow="Engage" title="Announcements" icon={<Megaphone />}
        description="Broadcast notices to students, companies or specific branches — delivered as notifications."
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15} /> New announcement</button>} />

      <DataTable
        rows={rows} loading={res.loading} empty="No announcements yet"
        columns={[
          { key: 'title', header: 'Title', render: (a) => (<div><b>{a.title}</b><small className="text-muted d-block cc-truncate" style={{ maxWidth: 380 }}>{a.message}</small></div>) },
          { key: 'audience', header: 'Audience', render: (a) => (<div className="d-flex gap-1 flex-wrap"><StatusBadge value={a.targetRole || 'all'} dot={false} />{a.targetCourse && <span className="cc-badge gray no-dot">{a.targetCourse}</span>}{a.targetBranch && <span className="cc-badge gray no-dot">{a.targetBranch}</span>}</div>) },
          { key: 'publish', header: 'Publish date', render: (a) => fmtDate(a.publishDate) },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge value={a.status} /> },
          { key: 'actions', header: 'Actions', align: 'right', render: (a) => (
            <div className="d-flex gap-1 justify-content-end">
              {a.status !== 'active' && <button className="btn btn-sm btn-success" onClick={() => publish(a)}>Publish</button>}
              {a.status === 'active' && <button className="btn btn-sm btn-outline-secondary" onClick={() => unpublish(a)}>Unpublish</button>}
              <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(a)}><Pencil size={13} /></button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => del(a)} aria-label={`Delete ${a.title}`}><Trash2 size={13} /></button>
            </div>
          ) },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit announcement' : 'New announcement'} size="lg"
        footer={<>
          <button className="btn btn-outline-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary" form="ann-form" disabled={busy}>{busy ? <Spinner /> : editing ? 'Update' : 'Create draft'}</button>
        </>}>
        <form id="ann-form" onSubmit={save} className="row g-3">
          <div className="col-12"><label className="form-label small fw-semibold">Title <span className="text-danger">*</span></label><input required maxLength={180} className="form-control" value={f.title} onChange={set('title')} /></div>
          <div className="col-md-4"><label className="form-label small fw-semibold">Audience</label><select className="form-select" value={f.targetRole} onChange={set('targetRole')}><option value="all">All</option><option value="student">Students</option><option value="company">Companies</option><option value="tpo">TPO</option></select></div>
          <div className="col-md-4"><label className="form-label small fw-semibold">Publish date <span className="text-danger">*</span></label><input required type="date" className="form-control" value={f.publishDate} onChange={set('publishDate')} /></div>
          <div className="col-md-4"><label className="form-label small fw-semibold">Expiry date</label><input type="date" className="form-control" value={f.expiryDate} onChange={set('expiryDate')} /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Target course</label><input className="form-control" value={f.targetCourse} onChange={set('targetCourse')} placeholder="Optional" /></div>
          <div className="col-md-6"><label className="form-label small fw-semibold">Target branch</label><input className="form-control" value={f.targetBranch} onChange={set('targetBranch')} placeholder="Optional" /></div>
          <div className="col-12">
            <label className="form-label small fw-semibold">Message <span className="text-danger">*</span></label>
            <textarea required maxLength={2000} rows={4} className="form-control" value={f.message} onChange={set('message')} />
            <div className="small text-muted text-end mt-1">{f.message.length}/2000</div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ================================================================== *
 * Reports
 * ================================================================== */
const REPORTS = [
  { key: 'students', label: 'Students Academic Registry', category: 'Academics', icon: <GraduationCap size={20} />, badge: 'A4 Landscape', desc: 'Comprehensive student roster with enrollment, courses, CGPA, backlogs, and verified placement status.' },
  { key: 'companies', label: 'Corporate Recruiters Directory', category: 'Corporate', icon: <Building2 size={20} />, badge: 'Verified Partners', desc: 'Active hiring partners with domain specializations, verification badges, contact emails, and office locations.' },
  { key: 'placements', label: 'Official Placement Records', category: 'Outcomes', icon: <Award size={20} />, badge: 'Accreditation Ready', desc: 'Final placement records, offered designations, CTC packages (LPA), appointment dates, and confirmation state.' },
  { key: 'applications', label: 'Candidate Applications Ledger', category: 'Pipeline', icon: <FileText size={20} />, badge: 'Live Pipeline', desc: 'Full lifecycle tracking of all candidate applications across open job vacancies with current pipeline stages.' },
  { key: 'branch', label: 'Departmental Placement Summary', category: 'Academics', icon: <Activity size={20} />, badge: 'KPI Analytics', desc: 'Branch-wise placement statistics, total enrolled students, placed candidate counts, and success ratios.' },
  { key: 'drives', label: 'Placement Drives Registry', category: 'Operations', icon: <Briefcase size={20} />, badge: 'Event Ledger', desc: 'On-campus, virtual and pool campus drives with quotas, candidate registration logs, and eligibility audit.' },
  { key: 'interviews', label: 'Interview Rounds & Outcomes', category: 'Assessments', icon: <Users size={20} />, badge: 'Evaluations', desc: 'Technical and HR interview rounds, conduct formats (Online/Offline), schedule timelines, and recruiter evaluations.' },
  { key: 'selections', label: 'Recruiter Hiring Selections', category: 'Decisions', icon: <CheckCircle2 size={20} />, badge: 'Formal Decisions', desc: 'Formal shortlisting and hiring decisions submitted by corporate recruiters through the recruiter suite.' },
  { key: 'offers', label: 'Offer Letters & Commitments', category: 'Outcomes', icon: <Sparkles size={20} />, badge: 'Offer Ledger', desc: 'Candidate offer letters, accepted packages, status tracking, verified reference signatures, and terms.' },
  { key: 'audit', label: 'System Governance Audit Trail', category: 'Security', icon: <ShieldCheck size={20} />, badge: 'Immutable Log', desc: 'Chronological audit ledger capturing administrative actions, policy modifications, and actor IP records.' },
];

export function Reports() {
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const dl = async (t, format) => {
    setBusy(`${t}-${format}`);
    try {
      await downloadFile(`/tpo/reports/${t}?format=${format}`, `${t}_report_${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success(`${t.toUpperCase()} report (${format.toUpperCase()}) downloaded successfully.`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const categories = ['All', 'Academics', 'Corporate', 'Outcomes', 'Pipeline', 'Operations', 'Security'];

  const filtered = REPORTS.filter((r) => {
    const matchCat = selectedCat === 'All' || r.category === selectedCat;
    const matchSearch = !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="w-100 cc-reports-page" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <span className="cc-badge violet d-inline-flex align-items-center gap-1">
            <Sparkles size={13} /> Institutional Accreditation & Audit Ledgers
          </span>
        </div>
        <span className="small text-muted d-inline-flex align-items-center gap-1">
          <Clock size={13} /> Formats: Clean A4 Landscape PDF & CSV
        </span>
      </div>

      <PageHeader
        eyebrow="Compliance & Analytics"
        title="Official Reports & Institutional Exports"
        icon={<Download size={22} />}
        description="Download audit-ready placement ledgers, candidate records, recruiter directories, and outcome metrics formatted for accreditation bodies (NBA, NAAC, NIRF) with zero column truncation."
      />

      {/* KPI Feature Bar */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Available Report Ledgers" value={REPORTS.length} icon={<Layers />} tone="primary" hint="Distinct institutional datasets" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="PDF Engine Format" value="A4 Landscape" icon={<FileText />} tone="violet" hint="Zero truncation auto-wrapped" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Accreditation Standards" value="NBA / NAAC" icon={<Award />} tone="emerald" hint="Formatted institutional headers" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Data Integrity" value="100% Cryptographic" icon={<ShieldCheck />} tone="emerald" hint="Direct DB streaming" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-body border rounded-3 mb-4">
        <div className="d-flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`btn btn-sm ${selectedCat === c ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill px-3`}
              onClick={() => setSelectedCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ minWidth: 240, maxWidth: 360, flex: '1 1 auto' }}>
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Search report ledgers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="row g-4">
        {filtered.map((r) => {
          const csvBusy = busy === `${r.key}-csv`;
          const pdfBusy = busy === `${r.key}-pdf`;

          return (
            <div key={r.key} className="col-12 col-md-6 col-xl-4">
              <div className="cc-card p-4 h-100 d-flex flex-direction-column justify-content-between" style={{ display: 'flex', flexDirection: 'column' }}>
                <div>
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <div className="p-2.5 rounded-3 bg-primary bg-opacity-10 text-primary d-inline-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                      {r.icon}
                    </div>
                    <span className="cc-badge sky">{r.badge}</span>
                  </div>

                  <h5 className="fw-bold mb-1 text-body">{r.label}</h5>
                  <p className="small text-muted mb-4" style={{ minHeight: 42 }}>{r.desc}</p>
                </div>

                <div className="pt-3 border-top mt-auto">
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1.5 py-2"
                      disabled={pdfBusy}
                      onClick={() => dl(r.key, 'pdf')}
                      title="Download Official Publication-Ready PDF"
                    >
                      {pdfBusy ? <><Spinner /> Generating PDF...</> : <><FileText size={15} /> Official PDF</>}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center gap-1 py-2 px-3"
                      disabled={csvBusy}
                      onClick={() => dl(r.key, 'csv')}
                      title="Export Raw Data Spreadsheet"
                    >
                      {csvBusy ? <Spinner /> : <><Download size={14} /> CSV</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="col-12 text-center py-5">
            <Empty title="No report modules match your search" subtitle="Try clearing the search query or changing category filters." />
          </div>
        )}
      </div>
    </div>
  );
}


export function Contacts() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const res = useFetch(async () => (await api.get('/contact', { params: { status: status || undefined, page, limit: 12 } })).data, [status, page]);
  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = async (c, s) => {
    try { await api.patch(`/contact/${c._id}`, { status: s }); toast.success('Message updated.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  return (
    <div>
      <PageHeader eyebrow="System" title="Contact Messages" icon={<Mail />}
        description="Enquiries submitted through the public contact form." />
      <Toolbar showClear={!!status} onClear={() => { setStatus(''); setPage(1); }}>
        <SelectFilter label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={CONTACT_STATUSES} />
      </Toolbar>
      <DataTable
        rows={rows} loading={res.loading} empty="No messages match"
        columns={[
          { key: 'subject', header: 'Subject', render: (c) => (<div><b>{c.subject}</b><small className="text-muted d-block cc-truncate" style={{ maxWidth: 420 }}>{c.message}</small></div>) },
          { key: 'from', header: 'From', render: (c) => (<div>{c.name}<small className="text-muted d-block">{c.email}</small></div>) },
          { key: 'received', header: 'Received', render: (c) => fmtDate(c.createdAt) },
          { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
          { key: 'actions', header: 'Actions', align: 'right', render: (c) => (
            <div className="d-flex gap-1 justify-content-end">
              {CONTACT_STATUSES.filter((s) => s !== c.status).map((s) => <button key={s} className="btn btn-sm btn-outline-secondary" onClick={() => set(c, s)}>{s}</button>)}
            </div>
          ) },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={setPage} />
    </div>
  );
}

/* ================================================================== *
 * Audit logs
 * ================================================================== */
export function Audit() {
  const [q, setQ] = useState({ module: '', action: '', search: '', from: '', to: '', page: 1 });
  const [inspectEvent, setInspectEvent] = useState(null);

  const res = useFetch(async () => {
    const params = { limit: 25, page: q.page };
    if (q.module) params.module = q.module;
    if (q.action) params.action = q.action;
    if (q.search) params.search = q.search;
    if (q.from) params.from = q.from;
    if (q.to) params.to = q.to;
    return (await api.get('/audit-logs', { params })).data;
  }, [JSON.stringify(q)]);

  const rows = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const modules = [...new Set(rows.map((a) => a.module).filter(Boolean))];
  const actions = [...new Set(rows.map((a) => a.action).filter(Boolean))];

  return (
    <div className="w-100" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <span className="cc-badge violet d-inline-flex align-items-center gap-1">
            <ShieldCheck size={13} /> Security & System Compliance
          </span>
        </div>
        <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1" onClick={() => res.reload()}>
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      <PageHeader
        eyebrow="System Governance"
        title="Audit Logs & Activity Stream"
        icon={<ScrollText size={22} />}
        description="Comprehensive immutable ledger recording administrative actions, drive transitions, assessment records, and security events across the placement portal."
      />

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Total Logged Events" value={pag.total || rows.length} icon={<Activity />} tone="primary" hint="Recorded system actions" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Active Audit Modules" value={modules.length || 6} icon={<Layers />} tone="violet" hint="Distinct operational domains" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Action Types" value={actions.length || 12} icon={<Sparkles />} tone="emerald" hint="Categorized event triggers" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard label="Integrity Status" value="Verified" icon={<ShieldCheck />} tone="emerald" hint="Tamper-evident DB stream" />
        </div>
      </div>

      <Toolbar showClear={!!(q.module || q.action || q.search || q.from || q.to)} onClear={() => setQ({ module: '', action: '', search: '', from: '', to: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search activity description..." label="Audit search" />
        <SelectFilter label="Module" value={q.module} onChange={(v) => set({ module: v })} options={modules} />
        <SelectFilter label="Action" value={q.action} onChange={(v) => set({ action: v })} options={actions} />
        <input type="date" className="form-control cc-select" aria-label="From date" value={q.from} onChange={(e) => set({ from: e.target.value })} title="Events from date" />
        <input type="date" className="form-control cc-select" aria-label="To date" value={q.to} onChange={(e) => set({ to: e.target.value })} title="Events to date" />
      </Toolbar>

      <DataTable
        rows={rows}
        loading={res.loading}
        empty="No audit events matched the selected filters."
        columns={[
          {
            key: 'when',
            header: 'Timestamp',
            render: (a) => (
              <div className="d-flex align-items-center gap-2">
                <Clock size={14} className="text-muted" />
                <span className="small fw-semibold">{fmtDateTime(a.createdAt)}</span>
              </div>
            ),
          },
          {
            key: 'user',
            header: 'Actor / Identity',
            render: (a) => (
              <div>
                <div className="small fw-bold text-body">{a.user?.name || 'System Daemon'}</div>
                <small className="text-muted d-block">{a.user?.role || a.user?.email || 'Automated Job'}</small>
              </div>
            ),
          },
          {
            key: 'action',
            header: 'Action',
            render: (a) => <StatusBadge value={a.action} dot={false} />,
          },
          {
            key: 'module',
            header: 'Module',
            render: (a) => <span className="cc-badge sky">{a.module || 'Core'}</span>,
          },
          {
            key: 'desc',
            header: 'Description & Context',
            render: (a) => (
              <div className="small text-truncate" style={{ maxWidth: 360 }} title={a.description}>
                {a.description}
              </div>
            ),
          },
          {
            key: 'ip',
            header: 'Client IP',
            render: (a) => <code className="small text-muted">{a.ipAddress || 'Internal'}</code>,
          },
          {
            key: 'inspect',
            header: 'Inspect',
            align: 'right',
            render: (a) => (
              <button
                className="btn btn-outline-secondary btn-sm py-1 px-2"
                onClick={() => setInspectEvent(a)}
                title="Inspect event payload"
              >
                <Eye size={13} />
              </button>
            ),
          },
        ]}
      />

      <Pager page={pag.page || 1} pages={pag.pages || 1} onPage={(p) => set({ page: p })} />

      {inspectEvent && (
        <Modal
          title="Audit Log Event Inspector"
          isOpen={!!inspectEvent}
          onClose={() => setInspectEvent(null)}
        >
          <div className="p-3">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h6 className="fw-bold mb-0">{inspectEvent.action}</h6>
                <small className="text-muted">{fmtDateTime(inspectEvent.createdAt)}</small>
              </div>
              <span className="cc-badge violet">{inspectEvent.module}</span>
            </div>

            <DetailGrid columns={1} items={[
              { label: 'Description', value: inspectEvent.description },
              { label: 'Actor', value: `${inspectEvent.user?.name || 'System'} (${inspectEvent.user?.role || 'N/A'})` },
              { label: 'Client IP Address', value: inspectEvent.ipAddress || 'N/A' },
              { label: 'Event ID', value: <code>{inspectEvent._id}</code> },
            ]} />

            {inspectEvent.details && (
              <div className="mt-3">
                <label className="form-label small fw-semibold">Metadata / Raw Payload</label>
                <pre className="p-3 bg-dark text-white rounded-3 small overflow-auto" style={{ maxHeight: 220 }}>
                  {JSON.stringify(inspectEvent.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="d-flex justify-content-end mt-4">
              <button className="btn btn-primary btn-sm" onClick={() => setInspectEvent(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  return cells;
}
const dayKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

export function TpoCalendar() {
  const navigate = useNavigate();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(dayKey(now));
  const drives = useFetch(async () => (await api.get('/drives', { params: { limit: 100 } })).data.data, []);
  const ivs = useFetch(async () => (await api.get('/interviews', { params: { limit: 100 } })).data.data, []);
  const byDate = useMemo(() => {
    const map = {};
    const push = (dateStr, item) => { if (!dateStr) return; const k = String(dateStr).slice(0, 10); (map[k] = map[k] || []).push(item); };
    (drives.data || []).forEach((d) => push(d.driveDate, { kind: 'drive', id: d._id, title: d.driveTitle || d.title, time: d.startTime, status: d.status }));
    (ivs.data || []).forEach((v) => push(v.interviewDate, { kind: 'iv', id: v._id, title: `${v.roundName} — ${v.student?.name || ''}`, time: v.interviewTime, status: v.status }));
    return map;
  }, [drives.data, ivs.data]);
  const cells = monthCells(ym.y, ym.m);
  const label = new Date(ym.y, ym.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const go = (dm) => setYm(({ y, m }) => { const d = new Date(y, m + dm, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const flat = Object.values(byDate).flat();
  const nDrives = flat.filter((e) => e.kind === 'drive').length;
  const nIvs = flat.filter((e) => e.kind === 'iv').length;

  return (
    <div>
      <PageHeader eyebrow="Placements" title="Drive Calendar" icon={<CalendarDays />}
        description="Month view of placement drives and interview rounds."
        actions={<>
          <button className="btn btn-light border btn-sm" onClick={() => go(-1)} aria-label="Previous month">‹</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
          <button className="btn btn-light border btn-sm" onClick={() => go(1)} aria-label="Next month">›</button>
          <Link className="btn btn-primary btn-sm" to="/tpo/drives">All drives</Link>
        </>} />
      <SectionCard title={label} subtitle={`${nDrives} drives · ${nIvs} interviews`} icon={<CalendarDays />} className="mb-4">
        {drives.loading || ivs.loading ? <Loading rows={4} height={70} /> : (
          <div className="cc-cal">
            <div className="cc-cal-head">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}</div>
            <div className="cc-cal-grid">
              {cells.map((dt, i) => {
                if (!dt) return <div key={`e${i}`} className="cc-cal-cell empty" />;
                const k = dayKey(dt);
                const items = (byDate[k] || []).slice(0, 4);
                const isToday = k === dayKey(now);
                return (
                  <div key={k} className={`cc-cal-cell${isToday ? ' today' : ''}${selected === k ? ' selected' : ''}`} onClick={() => setSelected(k)} role="button" tabIndex={0}>
                    <div className="cc-cal-day">{dt.getDate()}</div>
                    {(byDate[k] || []).length > 0 && <span className="cc-cal-dot" aria-hidden="true" />}
                    {items.map((e) => (
                      <button key={`${e.kind}${e.id}`} className={`cc-cal-ev ${e.kind}`} title={`${e.title}${e.time ? ` · ${e.time}` : ''}`}
                        onClick={() => navigate(e.kind === 'drive' ? `/tpo/drives/${e.id}` : '/tpo/interviews')}>
                        {e.title}
                      </button>
                    ))}
                    {(byDate[k] || []).length > 4 && <div className="small text-muted">+{(byDate[k] || []).length - 4} more</div>}
                  </div>
                );
              })}
            </div>
            <div className="cc-cal-detail">
              <div className="cc-cal-detail-title">
                {new Date(selected).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {!(byDate[selected] || []).length ? (
                <div className="small text-muted">No drives or interviews scheduled.</div>
              ) : (
                <div className="cc-stack gap-2">
                  {(byDate[selected] || []).map((e) => (
                    <button
                      key={`${e.kind}${e.id}`}
                      className={`cc-cal-detail-item ${e.kind}`}
                      onClick={() => navigate(e.kind === 'drive' ? `/tpo/drives/${e.id}` : '/tpo/interviews')}
                    >
                      <span className="cc-cal-detail-time">{e.time || '—'}</span>
                      <span className="cc-cal-detail-text">{e.title}</span>
                      <StatusBadge value={e.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ================================================================== *
 * Drive history
 * ================================================================== */
export function DriveHistory() {
  const [q, setQ] = useState({ search: '', mode: '', status: '', page: 1 });
  const res = useFetch(async () => {
    const params = { limit: 12, page: q.page };
    if (q.search) params.search = q.search;
    if (q.mode) params.mode = q.mode;
    if (q.status) params.status = q.status;
    return (await api.get('/drives/history', { params })).data;
  }, [JSON.stringify(q)]);
  const s = res.data?.summary || {};
  const items = res.data?.data || [];
  const pag = res.data?.pagination || {};
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  return (
    <div>
      <PageHeader eyebrow="Placements" title="Drive History" icon={<ListOrdered />}
        description="Completed and cancelled drives with participation outcomes."
        actions={<Link className="btn btn-outline-secondary btn-sm" to="/tpo/drives">All drives</Link>} />
      <KpiGrid>
        <KpiCard tone="success" icon={<CheckCircle2 />} value={s.completed ?? '—'} label="Completed drives" />
        <KpiCard tone="danger" icon={<XCircle />} value={s.cancelled ?? '—'} label="Cancelled" />
        <KpiCard tone="info" icon={<Users />} value={s.participants ?? '—'} label="Participants (completed)" />
      </KpiGrid>
      <Toolbar showClear={!!(q.search || q.status || q.mode)} onClear={() => setQ({ search: '', mode: '', status: '', page: 1 })}>
        <SearchInput value={q.search} onChange={(v) => set({ search: v })} placeholder="Search drive or company" label="History search" />
        <SelectFilter label="Outcome" placeholder="Completed + cancelled" value={q.status} onChange={(v) => set({ status: v })} options={[{ value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
        <SelectFilter label="Mode" value={q.mode} onChange={(v) => set({ mode: v })} options={DRIVE_MODES} />
      </Toolbar>
      <DataTable
        rows={items} loading={res.loading} empty="No past drives"
        columns={[
          { key: 'title', header: 'Drive', render: ({ drive: d }) => (<div><Link className="fw-semibold" to={`/tpo/drives/${d._id}`}>{d.driveTitle}</Link><small className="text-muted d-block">{d.company?.companyName || '—'} · {fmtDate(d.driveDate)}</small></div>) },
          { key: 'mode', header: 'Mode', render: ({ drive: d }) => (<><StatusBadge value={d.mode} dot={false} />{d.venue ? <small className="text-muted d-block">{d.venue}</small> : null}</>) },
          { key: 'regs', header: 'Registered', align: 'right', render: ({ regCount }) => regCount },
          { key: 'short', header: 'Shortlisted', align: 'right', render: ({ shortlistedCount }) => shortlistedCount },
          { key: 'sel', header: 'Selected', align: 'right', render: ({ selectedCount }) => selectedCount },
          { key: 'status', header: 'Status', render: ({ drive: d }) => <StatusBadge value={d.status} /> },
        ]}
      />
      <Pager page={pag.page || 1} pages={pag.pages} onPage={(p) => set({ page: p })} />
    </div>
  );
}
