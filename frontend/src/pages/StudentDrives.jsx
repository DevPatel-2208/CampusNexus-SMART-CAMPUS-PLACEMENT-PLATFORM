import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertCircle, ArrowLeft, ArrowRight, Award, BookOpen, Briefcase, Building2,
  ClipboardCheck, Eye, HelpCircle, Play,
  Calendar, CalendarDays, CheckCircle2, ChevronRight, CircleX, ClipboardList,
  Clock, ExternalLink, FileText, GraduationCap, IndianRupee, Info, Laptop,
  Layers, ListChecks, MapPin, RefreshCw, Search, ShieldAlert, ShieldCheck,
  Sparkles, Target, TrendingUp, Trophy, Users, Video, XCircle,
} from 'lucide-react';
import api, { apiErrorMessage, fileUrl } from '../services/api';
import { useDebounced, useFetch } from '../hooks/useUnread';
import {
  Empty, ErrorState, KpiCard, KpiGrid, Loading, PageHeader, Pager, StatusBadge, Toolbar,
  SearchInput, SelectFilter, SectionCard, DetailGrid,
} from '../components/ui';

function fmtDate(v, opts) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-IN', opts || { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtSalary(job) {
  if (!job) return null;
  if (job.salary) return job.salary;
  if (job.salaryMin || job.salaryMax) {
    const min = job.salaryMin ? (job.salaryMin / 100000).toFixed(1) : null;
    const max = job.salaryMax ? (job.salaryMax / 100000).toFixed(1) : null;
    if (min && max) return `₹${min} – ₹${max} LPA`;
    if (min) return `₹${min}+ LPA`;
    if (max) return `Up to ₹${max} LPA`;
  }
  return null;
}

const DRIVE_STATUS = ['upcoming', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'];
const DRIVE_MODES = ['Online', 'Offline', 'Hybrid'];

/* ------------------------------------------------------------------
   Drive Card Component (Used in Drives Grid)
   ------------------------------------------------------------------ */
export function DriveCard({ drive: d, eligibility, myRegistration }) {
  const regClosed = (d.registrationEnd && new Date(d.registrationEnd) < new Date()) || d.status === 'registration_closed';
  const reasons = eligibility?.reasons || [];
  const company = d.company || {};
  const initials = String(company.companyName || 'D').trim().slice(0, 2).toUpperCase() || 'D';
  const logo = company.logo ? fileUrl(company.logo) : null;

  return (
    <article className="cc-drive-card">
      {/* Top Header */}
      <div className="cc-drive-top">
        <div className="cc-drive-brand">
          <div className="cc-drive-logo">
            {logo ? <img src={logo} alt={company.companyName} /> : initials}
          </div>
          <div className="min-w-0" style={{ minWidth: 0, flex: 1 }}>
            <div className="cc-drive-company-name">
              <span className="text-truncate">{company.companyName || 'Corporate Partner'}</span>
              {company.verificationStatus === 'verified' && (
                <ShieldCheck size={14} className="text-primary flex-shrink-0" title="Verified Recruiter" />
              )}
            </div>
            <Link to={`/student/drives/${d._id}`} className="cc-drive-title" title={d.driveTitle}>
              {d.driveTitle}
            </Link>
          </div>
        </div>
        <StatusBadge value={d.status} />
      </div>

      {/* Meta Strip */}
      <div className="cc-drive-meta-strip">
        <span className="cc-drive-meta-pill">
          <CalendarDays size={13} />
          <span>{fmtDate(d.driveDate)}</span>
        </span>
        <span className="cc-drive-meta-pill">
          <MapPin size={13} />
          <span>{d.venue || 'Campus Hall / TBA'}</span>
        </span>
        {d.mode && (
          <span className="cc-drive-meta-pill">
            <Laptop size={13} />
            <span>{d.mode}</span>
          </span>
        )}
      </div>

      {/* Registration Timeline Window */}
      <div className="cc-drive-reg-box">
        <div className="cc-drive-reg-dates">
          <Clock size={13} className="me-1 text-muted d-inline" />
          <span>Register: </span>
          <strong>{fmtDate(d.registrationStart)}</strong> &rarr;{' '}
          <span className={regClosed ? 'text-danger fw-bold' : 'fw-bold'}>{fmtDate(d.registrationEnd)}</span>
        </div>
        {regClosed ? (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5">Closed</span>
        ) : (
          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5">Open</span>
        )}
      </div>

      {/* Eligibility / Registration Badges */}
      <div className="d-flex flex-wrap gap-1.5 align-items-center mb-3">
        {eligibility?.eligible ? (
          <span className="cc-badge green no-dot">
            <CheckCircle2 size={12} /> Eligible to Apply
          </span>
        ) : (
          <span className="cc-badge red no-dot">
            <ShieldAlert size={12} /> Not Eligible
          </span>
        )}
        {myRegistration && (
          <span className="cc-badge blue no-dot">
            <CheckCircle2 size={12} /> Registered
          </span>
        )}
      </div>

      {!eligibility?.eligible && reasons.length > 0 && (
        <div className="cc-drive-reasons">
          <div className="fw-semibold mb-0.5">Ineligibility criteria:</div>
          {reasons.slice(0, 2).map((r, i) => (
            <div key={i}>• {typeof r === 'string' ? r : r.label || r.detail}</div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="cc-drive-footer mt-auto pt-3 border-top d-flex align-items-center justify-content-between gap-2">
        <Link to={`/student/drives/${d._id}`} className="btn btn-sm btn-outline-secondary rounded-pill px-3">
          View Details
        </Link>
        {myRegistration ? (
          <span className="btn btn-sm btn-success disabled d-inline-flex align-items-center gap-1.5 rounded-pill px-3">
            <CheckCircle2 size={14} /> Registered
          </span>
        ) : regClosed ? (
          <span className="btn btn-sm btn-outline-secondary disabled rounded-pill px-3">Closed</span>
        ) : (
          <Link to={`/student/drives/${d._id}`} className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5 rounded-pill px-3 fw-bold shadow-sm">
            <span>Register Now</span>
            <ChevronRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------
   Drives Listing Page (/student/drives)
   ------------------------------------------------------------------ */
export function Drives() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const [q, setQ] = useState({ search: '', status: '', mode: '', page: 1 });
  const debouncedSearch = useDebounced(q.search, 350);

  const queryParams = {
    q: debouncedSearch || undefined,
    status: q.status || undefined,
    mode: q.mode || undefined,
    page: q.page,
    limit: 9,
    scope: 'student',
  };

  const res = useFetch(
    async () => (await api.get('/drives', { params: queryParams })).data,
    [JSON.stringify(queryParams)],
    { keepPrevious: true }
  );
  const items = res.data?.data || [];
  const summary = res.data?.summary;
  const active = q.search || q.status || q.mode;
  const clear = () => setQ({ search: '', status: '', mode: '', page: 1 });

  return (
    <div className="cc-page cc-drives-page">
      <PageHeader
        title="Placement Drives"
        eyebrow="Campus Recruitments"
        description="Explore exclusive campus placement drives, verify your academic eligibility, and register before seat deadlines."
        icon={<CalendarDays size={26} />}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3" to="/student/applications">
              <ClipboardList size={14} /> My Applications
            </Link>
            <Link className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3" to="/student/placement">
              <TrendingUp size={14} /> Placement Status
            </Link>
          </div>
        }
      />

      {summary && (
        <div className="cc-student-kpis mb-4">
          <KpiCard icon={<CalendarDays size={20} />} value={summary.all} label="Drives in View" tone="primary" />
          <KpiCard icon={<TrendingUp size={20} />} value={summary.upcoming} label="Upcoming Drives" tone="violet" />
          <KpiCard icon={<CheckCircle2 size={20} />} value={summary.eligible} label="Eligible to Apply" tone="success" />
          <KpiCard icon={<ClipboardList size={20} />} value={summary.registered} label="Your Registrations" tone="info" />
        </div>
      )}

      <Toolbar onClear={clear} showClear={!!active}>
        <SearchInput
          value={q.search}
          onChange={(v) => setQ({ ...q, search: v, page: 1 })}
          placeholder="Search by drive title or company name..."
          label="Search drives"
        />
        <SelectFilter label="Status" value={q.status} options={DRIVE_STATUS} onChange={(v) => setQ({ ...q, status: v, page: 1 })} />
        <SelectFilter label="Mode" value={q.mode} options={DRIVE_MODES} onChange={(v) => setQ({ ...q, mode: v, page: 1 })} />
      </Toolbar>

      {res.loading ? (
        <Loading rows={3} height={160} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !items.length ? (
        <Empty
          title={active ? 'No drives match your filters' : 'No placement drives right now'}
          hint={active ? 'Try clearing or modifying your filter criteria.' : 'Upcoming campus recruitment drives will appear as the TPO announces them.'}
          icon={<CalendarDays size={44} />}
        />
      ) : (
        <>
          <div className="row g-4 mb-4">
            {items.map(({ drive: d, eligibility, myRegistration }) => (
              <div key={d._id} className="col-12 col-md-6 col-xl-4">
                <DriveCard drive={d} eligibility={eligibility} myRegistration={myRegistration} />
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-center">
            <Pager page={res.data?.pagination?.page || 1} pages={res.data?.pagination?.pages} onPage={(p) => setQ({ ...q, page: p })} />
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Drive Details Page (/student/drives/:id)
   ------------------------------------------------------------------ */
export function DriveDetails() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/drives/${id}`)).data.data, [id]);
  const elig = useFetch(async () => (await api.get(`/drives/${id}/eligibility`)).data.data, [id]);
  const [busy, setBusy] = useState(false);

  const register = async () => {
    setBusy(true);
    try {
      await api.post(`/drives/${id}/register`);
      toast.success('You have successfully registered for this placement drive!');
      res.reload();
      elig.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (res.loading || elig.loading) return <Loading rows={4} height={120} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const { drive, regCount, myRegistration, registrationOpen, seatsFull } = res.data;
  const reasons = elig.data?.reasons || [];
  const isEligible = !!elig.data?.eligible;
  const canRegister = registrationOpen && !seatsFull && !myRegistration && isEligible;
  const btnLabel = myRegistration ? 'Already Registered'
    : !registrationOpen ? 'Registration Closed'
      : seatsFull ? 'Capacity Full'
        : !isEligible ? 'Criteria Not Met' : 'Register for Drive';

  const company = drive.company || {};
  const initials = String(company.companyName || 'D').trim().slice(0, 2).toUpperCase() || 'D';
  const logo = company.logo ? fileUrl(company.logo) : null;
  const salaryText = fmtSalary(drive.job);

  // Time remaining calculation
  const regEnd = drive.registrationEnd ? new Date(drive.registrationEnd) : null;
  const daysLeft = regEnd ? Math.ceil((regEnd - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="cc-page cc-detail-view">
      {/* Top Back bar */}
      <div className="cc-detail-back-bar mb-3">
        <Link className="cc-detail-back-link d-inline-flex align-items-center gap-2" to="/student/drives">
          <ArrowLeft size={16} /> Back to Placement Drives
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="cc-detail-hero-card mb-4">
        <div className="cc-detail-hero-body">
          <div className="cc-detail-brand-box">
            <div className="cc-detail-avatar">
              {logo ? <img src={logo} alt={company.companyName} /> : initials}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="cc-detail-subtitle mb-1">
                <span className="fw-bold text-dark">{company.companyName || 'Corporate Recruiter'}</span>
                {company.verificationStatus === 'verified' && (
                  <ShieldCheck size={16} className="text-primary" title="Verified Campus Recruiter" />
                )}
                {drive.job?.title && (
                  <span className="d-inline-flex align-items-center gap-1 text-muted">
                    • <Briefcase size={13} /> {drive.job.title}
                  </span>
                )}
              </div>
              <h1 className="cc-detail-title">{drive.driveTitle}</h1>
            </div>
          </div>

          <div className="cc-detail-badges">
            <StatusBadge value={drive.status} />
            {drive.mode && <StatusBadge value={drive.mode} />}
            <span className="cc-badge blue no-dot">
              <Users size={13} /> {regCount} Registered
            </span>
            {drive.maxStudents ? (
              <span className="cc-badge gray no-dot">
                {regCount} / {drive.maxStudents} Seats
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Grid: 8 Cols Content + 4 Cols Sticky Action Sidebar */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          {/* Linked Job Spotlight Banner if Present */}
          {drive.job && (
            <div className="cc-drive-detail-job-banner">
              <div className="min-w-0 flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-primary text-white rounded-pill px-2.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                    ASSOCIATED VACANCY
                  </span>
                  {drive.job.jobType && <span className="small text-muted">• {drive.job.jobType}</span>}
                  {drive.job.workMode && <span className="small text-muted">• {drive.job.workMode}</span>}
                </div>
                <h3 className="h6 fw-bold mb-1 text-dark">{drive.job.title}</h3>
                <div className="d-flex align-items-center gap-3 flex-wrap small text-muted">
                  {salaryText && (
                    <span className="text-success fw-bold d-inline-flex align-items-center gap-1">
                      <IndianRupee size={13} /> {salaryText}
                    </span>
                  )}
                  {drive.job.location && (
                    <span className="d-inline-flex align-items-center gap-1">
                      <MapPin size={13} /> {drive.job.location}
                    </span>
                  )}
                </div>
              </div>
              <Link to={`/student/jobs/${drive.job._id}`} className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1 text-nowrap">
                <span>View Job Details</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          )}

          {/* Drive Information & Schedule */}
          <SectionCard title="Drive Information & Overview" icon={<Building2 size={16} />} className="mb-4">
            {drive.description && (
              <p className="mb-3 text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {drive.description}
              </p>
            )}
            <DetailGrid columns={2} items={[
              { label: 'Drive Date', value: fmtDate(drive.driveDate, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) },
              { label: 'Time Window', value: drive.startTime && drive.endTime ? `${drive.startTime} – ${drive.endTime}` : (drive.startTime || 'Morning Slot') },
              { label: 'Venue / Meeting Room', value: drive.venue || 'Campus Auditorium / Central Lab' },
              { label: 'Execution Mode', value: drive.mode || 'Offline Campus Drive' },
              { label: 'Registration Window', value: `${fmtDate(drive.registrationStart)} → ${fmtDate(drive.registrationEnd)}` },
              { label: 'Capacity Limit', value: drive.maxStudents ? `${drive.maxStudents} Students Max` : 'Open Batch Capacity' },
              { label: 'Placement Authority', value: 'Central Training & Placement Cell (TPO)' },
            ]} />
          </SectionCard>

          {/* Academic Eligibility Requirements */}
          {drive.eligibility && (
            <SectionCard title="Academic Eligibility & Prerequisite Benchmarks" icon={<GraduationCap size={16} />} className="mb-4">
              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <div className="cc-eligibility-tile">
                    <span className="cc-elig-tile-label"><GraduationCap size={14} className="text-primary" /> Min CGPA Cutoff</span>
                    <strong className="cc-elig-tile-val text-primary">{drive.eligibility.minCgpa ?? 'No CGPA Cutoff'}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="cc-eligibility-tile">
                    <span className="cc-elig-tile-label"><ShieldAlert size={14} className="text-warning" /> Max Backlogs</span>
                    <strong className="cc-elig-tile-val">{drive.eligibility.maxBacklogs != null ? `${drive.eligibility.maxBacklogs} Backlogs` : 'Any'}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="cc-eligibility-tile">
                    <span className="cc-elig-tile-label"><Calendar size={14} className="text-info" /> Eligible Batch</span>
                    <strong className="cc-elig-tile-val">{drive.eligibility.passingYear || 'Current Passing Year'}</strong>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="cc-eligibility-tile">
                    <span className="cc-elig-tile-label"><BookOpen size={14} className="text-secondary" /> Allowed Degrees</span>
                    <strong className="cc-elig-tile-val fs-6">{drive.eligibility.allowedCourses || 'All standard university degrees'}</strong>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="cc-eligibility-tile">
                    <span className="cc-elig-tile-label"><Layers size={14} className="text-secondary" /> Eligible Branches</span>
                    <strong className="cc-elig-tile-val fs-6">{drive.eligibility.allowedBranches || 'Open to all departments & branches'}</strong>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Selection Rounds & Hiring Pipeline */}
          <SectionCard title="Drive Rounds & Evaluation Process" icon={<ListChecks size={16} />} className="mb-4">
            <div className="cc-rounds-timeline py-2">
              <div className="cc-round-item">
                <div className="cc-round-dot" />
                <span className="cc-round-name">Round 1: Online Technical & Aptitude Assessment</span>
                <span className="cc-round-desc">Assigned automatically via Student Hub assessments upon registration confirmation.</span>
              </div>
              <div className="cc-round-item">
                <div className="cc-round-dot" />
                <span className="cc-round-name">Round 2: Technical & Domain Discussion</span>
                <span className="cc-round-desc">One-on-one interview panel evaluating code structure, projects, and fundamentals.</span>
              </div>
              <div className="cc-round-item">
                <div className="cc-round-dot" />
                <span className="cc-round-name">Round 3: Leadership & HR Round</span>
                <span className="cc-round-desc">Cultural alignment, role fit, location preferences, and offer letter discussion.</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right Sticky Sidebar: Registration Action */}
        <div className="col-12 col-lg-4">
          <div className="cc-sidebar-card sticky-top" style={{ top: '80px' }}>
            <h2 className="h6 fw-bold mb-3 text-dark d-flex align-items-center justify-content-between">
              <span>Registration Status</span>
              {daysLeft !== null && daysLeft > 0 && registrationOpen && !myRegistration && (
                <span className="badge bg-warning-subtle text-warning border rounded-pill px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                  {daysLeft} day{daysLeft > 1 ? 's' : ''} left
                </span>
              )}
            </h2>

            {myRegistration ? (
              <div className="alert alert-success d-flex flex-column gap-2 mb-3 rounded-3">
                <div className="d-flex align-items-center gap-2 fw-bold text-success">
                  <CheckCircle2 size={18} />
                  <span>You are Registered!</span>
                </div>
                <div className="small text-secondary">
                  Your profile has been submitted to the recruiter drive roster.
                </div>
                <div className="d-flex gap-1.5 mt-1 flex-wrap">
                  <StatusBadge value={myRegistration.eligibilityStatus || 'Eligible'} />
                  <StatusBadge value={myRegistration.status || 'Confirmed'} />
                </div>
              </div>
            ) : !registrationOpen ? (
              <div className="alert alert-secondary mb-3 rounded-3">
                <div className="d-flex align-items-center gap-2 fw-bold text-dark">
                  <Clock size={16} />
                  <span>Registration Closed</span>
                </div>
                <div className="small text-muted mt-1">
                  The registration window for this campus drive is currently closed.
                </div>
              </div>
            ) : seatsFull ? (
              <div className="alert alert-warning mb-3 rounded-3">
                <div className="d-flex align-items-center gap-2 fw-bold text-dark">
                  <AlertCircle size={16} />
                  <span>Capacity Full</span>
                </div>
                <div className="small text-muted mt-1">
                  All {drive.maxStudents} seats for this drive have been claimed.
                </div>
              </div>
            ) : isEligible ? (
              <div className="alert alert-success mb-3 rounded-3">
                <div className="d-flex align-items-center gap-2 fw-bold text-success">
                  <CheckCircle2 size={16} />
                  <span>Criteria Met</span>
                </div>
                <div className="small text-secondary mt-1">
                  Your academic records and student profile satisfy all prerequisites.
                </div>
              </div>
            ) : (
              <div className="alert alert-danger mb-3 rounded-3">
                <div className="d-flex align-items-center gap-2 fw-bold text-danger">
                  <ShieldAlert size={16} />
                  <span>Eligibility Criteria Not Met</span>
                </div>
                <div className="small text-danger mt-1 mb-2">Review ineligibility reasons below:</div>
                <ul className="mb-0 ps-3 small text-danger">
                  {reasons.map((r, i) => (
                    <li key={i}>{typeof r === 'string' ? r : `${r.label}: ${r.detail}`}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary w-100 py-2.5 d-flex align-items-center justify-content-center gap-2 fw-bold rounded-pill shadow-sm"
              disabled={busy || !canRegister}
              onClick={register}
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{btnLabel}</span>
                </>
              )}
            </button>

            <div className="text-muted small text-center mt-3 d-flex align-items-center justify-content-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              <span>Verified University Placement Drive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Applications Tracker Page (/student/applications)
   ------------------------------------------------------------------ */
const APP_STEPS = ['Applied', 'Under Review', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Offer', 'Placed'];

function AppProgressBar({ status }) {
  if (status === 'Rejected') {
    return (
      <div className="cc-app-progress-section">
        <div className="cc-app-progress-top">
          <span className="cc-app-progress-label text-danger d-inline-flex align-items-center gap-1">
            <XCircle size={14} /> Application Closed
          </span>
          <span className="cc-app-progress-pct text-danger">Rejected</span>
        </div>
        <div className="cc-app-progress-track">
          <div className="cc-app-progress-bar rejected" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const curIdx = Math.max(0, APP_STEPS.indexOf(status));
  const total = APP_STEPS.length;
  const pct = Math.round(((curIdx + 1) / total) * 100);

  return (
    <div className="cc-app-progress-section">
      <div className="cc-app-progress-top">
        <span className="cc-app-progress-label">
          Stage {curIdx + 1} of {total}: <strong className="text-primary">{APP_STEPS[curIdx]}</strong>
        </span>
        <span className="cc-app-progress-pct">{pct}% Completed</span>
      </div>
      <div className="cc-app-progress-track">
        <div className="cc-app-progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Applications() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const res = useFetch(
    async () => (await api.get('/applications/mine', { params: { status: status || undefined, q: q || undefined, page, limit: 12 } })).data,
    [status, q, page]
  );

  const counts = res.data?.counts || [];
  const countOf = (s) => counts.find((c) => c._id === s)?.n || 0;
  const all = counts.reduce((a, c) => a + c.n, 0);
  const pipeline = ['Applied', 'Under Review', 'Shortlisted', 'Assessment', 'Interview'].reduce((a, s) => a + countOf(s), 0);
  const offers = ['Selected', 'Offer', 'Placed'].reduce((a, s) => a + countOf(s), 0);
  const rejected = countOf('Rejected');
  const rows = res.data?.data || [];
  const set = (s) => { setStatus(s); setPage(1); };

  return (
    <div className="cc-page cc-applications-page">
      <PageHeader
        title="My Job Applications"
        eyebrow="Placement Tracker"
        description="Monitor application progress across recruitment stages, view assessment invitations, and track offer shortlists in real time."
        icon={<ClipboardList size={26} />}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 rounded-pill px-3"
              onClick={() => { res.reload(); toast.info('Refreshed applications.'); }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3 fw-bold" to="/student/jobs">
              <Briefcase size={14} /> Explore Open Jobs
            </Link>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <KpiGrid>
        <KpiCard icon={<ClipboardList size={18} />} value={all} label="Total Submitted" hint="Across all recruitment drives" tone="primary" />
        <KpiCard icon={<TrendingUp size={18} />} value={pipeline} label="In Active Pipeline" hint="Under screening, test, or interview" tone="info" />
        <KpiCard icon={<Trophy size={18} />} value={offers} label="Selections & Offers" hint="Qualified for campus placement" tone="success" />
        <KpiCard icon={<CircleX size={18} />} value={rejected} label="Closed / Rejected" hint="Applications not advanced" tone="danger" />
      </KpiGrid>

      {/* Stage Filter Buttons Bar */}
      <div className="cc-app-stage-tabs">
        <button
          type="button"
          className={`cc-app-stage-btn ${status === '' ? 'active' : ''}`}
          onClick={() => set('')}
        >
          All Applications ({all})
        </button>
        {APP_STEPS.map((s) => {
          const n = countOf(s);
          if (n === 0 && status !== s) return null;
          return (
            <button
              type="button"
              key={s}
              className={`cc-app-stage-btn ${status === s ? 'active' : ''}`}
              onClick={() => set(s)}
            >
              <span>{s}</span>
              <span className="badge rounded-pill bg-light text-dark border px-1.5">{n}</span>
            </button>
          );
        })}
        {rejected > 0 && (
          <button
            type="button"
            className={`cc-app-stage-btn ${status === 'Rejected' ? 'active' : ''}`}
            onClick={() => set('Rejected')}
          >
            <span>Rejected</span>
            <span className="badge rounded-pill bg-danger text-white px-1.5">{rejected}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <Toolbar onClear={(q || status) ? () => { setQ(''); set(''); } : undefined} showClear={!!(q || status)}>
        <SearchInput
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder="Search by job title, company name or location..."
          label="Search applications"
        />
        <SelectFilter
          label="Status"
          value={status}
          options={[
            { value: '', label: 'All Statuses' },
            ...APP_STEPS.map((s) => ({ value: s, label: s })),
            { value: 'Rejected', label: 'Rejected' },
          ]}
          onChange={set}
        />
      </Toolbar>

      {/* Applications List */}
      {res.loading ? (
        <Loading rows={4} height={140} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !rows.length ? (
        <Empty
          title={q || status ? 'No matching applications found' : 'No job applications submitted yet'}
          hint={q || status ? 'Try adjusting your search query or reset filter selections.' : 'Browse campus job postings and apply with one click to begin your placement journey.'}
          icon={<ClipboardList size={44} />}
          action={<Link to="/student/jobs" className="btn btn-primary btn-sm rounded-pill px-3">Browse Available Jobs</Link>}
        />
      ) : (
        <div className="cc-applications-list">
          {rows.map((a) => {
            const job = a.job || {};
            const company = job.company || {};
            const companyName = company.companyName || 'Campus Partner';
            const initial = String(companyName)[0]?.toUpperCase() || 'C';
            const logo = company.logo ? fileUrl(company.logo) : null;
            const salary = fmtSalary(job);

            return (
              <article key={a._id} className="cc-card cc-app-card">
                {/* Card Top: Avatar + Company + Title + Status */}
                <div className="cc-app-card-top">
                  <div className="cc-app-brand">
                    <div className="cc-app-avatar" aria-hidden="true">
                      {logo ? <img src={logo} alt={companyName} /> : initial}
                    </div>
                    <div className="min-w-0 flex-grow-1">
                      <div className="cc-app-company">
                        <span className="text-truncate">{companyName}</span>
                        {company.verificationStatus === 'verified' && (
                          <ShieldCheck size={14} className="text-primary flex-shrink-0" title="Verified Campus Employer" />
                        )}
                      </div>
                      <Link to={`/student/applications/${a._id}`} className="cc-app-title text-truncate">
                        {job.title || 'Placement Application'}
                      </Link>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <StatusBadge value={a.status} />
                    <span className="cc-app-chip">
                      <Clock size={12} /> Applied {fmtDate(a.appliedAt)}
                    </span>
                  </div>
                </div>

                {/* Meta Row: Salary, Location, Work Mode, Drive Info */}
                <div className="cc-app-meta-row">
                  {salary && (
                    <span className="cc-app-chip cc-app-chip-salary">
                      <IndianRupee size={12} /> {salary}
                    </span>
                  )}
                  {job.jobType && (
                    <span className="cc-app-chip cc-app-chip-primary">
                      <Briefcase size={12} /> {job.jobType}
                    </span>
                  )}
                  {job.workMode && (
                    <span className="cc-app-chip">
                      <Laptop size={12} /> {job.workMode}
                    </span>
                  )}
                  {job.location && (
                    <span className="cc-app-chip">
                      <MapPin size={12} /> {job.location}
                    </span>
                  )}
                  {a.drive && (
                    <span className="cc-app-chip" title="Linked to placement drive">
                      <CalendarDays size={12} className="text-primary" /> Drive: {a.drive.driveTitle || 'Campus Drive'}
                    </span>
                  )}
                </div>

                {/* Progress Visual Bar */}
                <AppProgressBar status={a.status} />

                {/* Bottom Action Footer */}
                <div className="cc-app-foot">
                  <div className="small text-muted d-flex align-items-center gap-1.5">
                    {a.status === 'Applied' && <span>Application under initial recruiter screening</span>}
                    {a.status === 'Under Review' && <span>Recruitment team is reviewing your profile credentials</span>}
                    {a.status === 'Shortlisted' && <span className="text-primary fw-semibold">Shortlisted! Evaluation link will be assigned shortly</span>}
                    {a.status === 'Assessment' && <span className="text-warning fw-semibold">Assessment invited! Check your Assessments page</span>}
                    {a.status === 'Interview' && <span className="text-info fw-semibold">Interview round scheduled! Check details</span>}
                    {a.status === 'Selected' && <span className="text-success fw-semibold">Selected for campus offer letter</span>}
                    {a.status === 'Offer' && <span className="text-success fw-bold">Official offer letter received!</span>}
                    {a.status === 'Placed' && <span className="text-success fw-bold">Campus placement confirmed!</span>}
                    {a.status === 'Rejected' && <span className="text-danger">Application closed by employer</span>}
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {a.status === 'Assessment' && (
                      <Link to="/student/assessments" className="btn btn-sm btn-primary rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-1.5">
                        <FileText size={14} /> Go to Assessments
                      </Link>
                    )}
                    {a.status === 'Interview' && (
                      <Link to="/student/interviews" className="btn btn-sm btn-primary rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-1.5">
                        <Video size={14} /> View Interview Slot
                      </Link>
                    )}
                    {(a.status === 'Offer' || a.status === 'Placed') && (
                      <Link to="/student/offers" className="btn btn-sm btn-success rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-1.5">
                        <Award size={14} /> View Job Offer
                      </Link>
                    )}

                    <Link className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1" to={`/student/applications/${a._id}`}>
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

          <div className="d-flex justify-content-center mt-4">
            <Pager page={res.data?.pagination?.page || 1} pages={res.data?.pagination?.pages} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Application Details Page (/student/applications/:id)
   ------------------------------------------------------------------ */
export function ApplicationDetails() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/applications/${id}`)).data.data, [id]);

  if (res.loading) return <Loading rows={4} height={120} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const a = res.data;
  const job = a.job || {};
  const company = job.company || {};
  const initials = String(company.companyName || 'C').trim().slice(0, 2).toUpperCase() || 'C';
  const logo = company.logo ? fileUrl(company.logo) : null;
  const currentStepIdx = APP_STEPS.indexOf(a.status);
  const salary = fmtSalary(job) || 'As per industry standard';

  return (
    <div className="cc-page cc-detail-view">
      {/* Top Back bar */}
      <div className="cc-detail-back-bar mb-3">
        <Link className="cc-detail-back-link d-inline-flex align-items-center gap-2" to="/student/applications">
          <ArrowLeft size={16} /> Back to My Applications
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="cc-detail-hero-card mb-4">
        <div className="cc-detail-hero-body">
          <div className="cc-detail-brand-box">
            <div className="cc-detail-avatar">
              {logo ? <img src={logo} alt={company.companyName} /> : initials}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="cc-detail-subtitle mb-1">
                <span className="fw-bold text-dark">{company.companyName || 'Employer Partner'}</span>
                {company.verificationStatus === 'verified' && (
                  <ShieldCheck size={16} className="text-primary" title="Verified Recruiter" />
                )}
                {job.location && <span className="text-muted">• {job.location}</span>}
              </div>
              <h1 className="cc-detail-title">{job.title || 'Application Details'}</h1>
            </div>
          </div>

          <div className="cc-detail-badges">
            <StatusBadge value={a.status} />
            {job.jobType && <StatusBadge value={job.jobType} />}
            {job.workMode && <StatusBadge value={job.workMode} />}
            <span className="cc-badge gray no-dot">Applied {fmtDate(a.appliedAt)}</span>
          </div>
        </div>

        {/* Stepper Multi-Stage Timeline */}
        {a.status !== 'Rejected' ? (
          <div className="cc-stepper-wrap mt-4">
            {APP_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIdx || a.status === 'Placed';
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step} className={`cc-stepper-item ${isDone ? 'done' : isCurrent ? 'current' : ''}`}>
                  <div className="cc-stepper-circle">
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span className="cc-stepper-label">{step}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="alert alert-danger mt-3 mb-0 d-flex align-items-center gap-2 rounded-3">
            <XCircle size={18} />
            <span>This application was closed by employer. Reason: {a.rejectionReason || 'Role criteria or capacity mismatch.'}</span>
          </div>
        )}
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <SectionCard title="Position Overview" icon={<Briefcase size={16} />} className="mb-4">
            <DetailGrid columns={2} items={[
              { label: 'Job Title', value: job.title },
              { label: 'Compensation Package', value: salary },
              { label: 'Work Mode', value: job.workMode || 'Onsite' },
              { label: 'Location', value: job.location || 'Campus / Office' },
              { label: 'Vacancies', value: job.vacancies != null ? String(job.vacancies) : 'Open capacity' },
              { label: 'Application Submitted', value: fmtDate(a.appliedAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              { label: 'Last Recruiter Update', value: fmtDate(a.updatedAt, { day: '2-digit', month: 'short', year: 'numeric' }) },
            ]} />
            {job.description && (
              <div className="mt-3 pt-3 border-top">
                <span className="fw-semibold text-dark small d-block mb-1">Role Description:</span>
                <p className="small text-secondary mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                  {job.description}
                </p>
              </div>
            )}
          </SectionCard>

          {a.coverLetter && (
            <SectionCard title="Submitted Cover Letter" icon={<FileText size={16} />} className="mb-4">
              <p className="small text-secondary mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {a.coverLetter}
              </p>
            </SectionCard>
          )}
        </div>

        {/* Sidebar Actions & Links */}
        <div className="col-12 col-lg-4">
          <div className="cc-sidebar-card mb-4">
            <h2 className="h6 fw-bold text-dark mb-3">Quick Actions</h2>
            <div className="d-grid gap-2">
              <Link to={`/student/jobs/${job._id}`} className="btn btn-primary d-flex align-items-center justify-content-center gap-2 rounded-pill fw-bold shadow-sm">
                <ExternalLink size={15} />
                <span>View Full Job Posting</span>
              </Link>
              <Link to="/student/applications" className="btn btn-outline-secondary rounded-pill">
                View All Applications
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Application Success Page (/student/apply-success/:id)
   ------------------------------------------------------------------ */
export function ApplicationSuccess() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/applications/${id}`)).data.data, [id]);

  if (res.loading) return <Loading rows={3} height={120} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const a = res.data;
  return (
    <div className="cc-auth-wrap">
      <div className="cc-card cc-card-body text-center p-4 p-md-5" style={{ maxWidth: 520, borderRadius: 20 }}>
        <div className="mx-auto d-grid mb-3" style={{ width: 68, height: 68, borderRadius: '50%', placeItems: 'center', background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
          <CheckCircle2 size={34} />
        </div>
        <h1 className="h4 fw-bold mb-2">Application Submitted!</h1>
        <p className="text-muted small mb-3">
          Your application for <strong className="text-dark">{a.job?.title}</strong> at <strong className="text-dark">{a.job?.company?.companyName || 'Recruiter Partner'}</strong> was successfully delivered to the hiring team.
        </p>
        <div className="d-flex justify-content-center my-2">
          <StatusBadge value={a.status} />
        </div>
        <div className="d-flex gap-2 justify-content-center flex-wrap mt-4">
          <Link className="btn btn-primary rounded-pill px-4 fw-bold" to={`/student/applications/${a._id}`}>
            Track Application
          </Link>
          <Link className="btn btn-outline-primary rounded-pill px-4" to="/student/jobs">
            Browse More Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
