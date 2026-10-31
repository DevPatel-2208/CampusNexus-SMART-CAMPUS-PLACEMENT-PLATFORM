import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  ArrowRight, Award, BadgeCheck, Bell, Bookmark, BookmarkCheck, Briefcase, Building2,
  CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, Clock,
  ExternalLink, FileText, GraduationCap, Globe, IndianRupee, Laptop, MapPin, Plus, Send, ShieldCheck, Sparkles,
  TrendingUp, Trophy, User, Video, WandSparkles,
} from 'lucide-react';
import api, { apiErrorMessage, fileUrl } from '../services/api';
import { useDebounced, useFetch } from '../hooks/useUnread';
import { confirmAction } from '../services/alerts';
import {
  JobCard, KpiCard, KpiGrid, PageContainer, PageHeader, SectionCard, Toolbar,
  SearchInput, SelectFilter, Empty, Loading, ErrorState, StatusBadge, Pager,
  salaryText,
} from '../components/ui';

const JOB_TYPES = ['Full Time', 'Part Time', 'Internship', 'Fresher', 'Experienced'];
const WORK_MODES = ['Onsite', 'Remote', 'Hybrid'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; }
}

const QUICK = [
  { to: '/student/jobs', icon: Briefcase, title: 'Browse Jobs', sub: 'Open opportunities', tone: 'primary' },
  { to: '/student/recommended', icon: WandSparkles, title: 'Recommended', sub: 'Best-fit roles', tone: 'violet' },
  { to: '/student/applications', icon: ClipboardList, title: 'My Applications', sub: 'Track status', tone: 'success' },
  { to: '/student/assessments', icon: ClipboardCheck, title: 'Assessments', sub: 'Tests & quizzes', tone: 'amber' },
  { to: '/student/drives', icon: CalendarDays, title: 'Drives', sub: 'Placement events', tone: 'info' },
  { to: '/student/profile', icon: User, title: 'My Profile', sub: 'Manage details', tone: 'slate' },
];

/* ------------------------------------------------------------------ */
export function Dashboard() {
  const me = useFetch(async () => (await api.get('/students/me')).data.data, []);
  const apps = useFetch(async () => (await api.get('/applications/mine', { params: { limit: 6 } })).data, []);
  const interviews = useFetch(async () => (await api.get('/interviews/mine')).data.data, []);
  const offers = useFetch(async () => (await api.get('/offers/mine')).data.data, []);
  const rec = useFetch(async () => (await api.get('/jobs/recommended')).data.data, []);
  const drives = useFetch(async () => (await api.get('/drives', { params: { limit: 6, scope: 'student' } })).data, []);
  const notifs = useFetch(async () => (await api.get('/notifications', { params: { limit: 5 } })).data, []);
  const skills = useFetch(async () => (await api.get('/students/skills')).data.data, []);
  const jobsCount = useFetch(async () => (await api.get('/jobs', { params: { limit: 1 } })).data, []);
  const savedJobs = useFetch(async () => (await api.get('/saved-jobs', { params: { limit: 1 } })).data, []);
  const assessList = useFetch(async () => (await api.get('/assessments', { params: { limit: 1 } })).data, []);

  const p = me.data?.profile;
  const userName = me.data?.user?.name || 'Student';
  const userEmail = me.data?.user?.email || '';
  const completion = p?.profileCompletion ?? 0;
  const isPlaced = p?.placementStatus === 'placed';
  const appsList = apps.data?.data || [];
  const appsTotal = apps.data?.pagination?.total ?? appsList.length;
  const interviewsList = interviews.data || [];
  const offersList = offers.data || [];
  const upcomingInterviews = interviewsList.filter((i) => i.status === 'scheduled').slice(0, 3);
  const pendingOffers = offersList.filter((o) => ['pending', 'issued', 'viewed'].includes(o.status)).slice(0, 2);
  const openDrives = (drives.data?.data || []).filter((d) => ['upcoming', 'registration_open'].includes(d.status)).slice(0, 3);
  const notifList = notifs.data?.data || [];
  const unread = notifs.data?.unread ?? notifList.filter((n) => !n.isRead).length;
  const openJobs = jobsCount.data?.pagination?.total ?? '—';
  const savedTotal = savedJobs.data?.pagination?.total ?? 0;
  const assessTotal = assessList.data?.pagination?.total ?? 0;
  const SHORTLISTED = ['Shortlisted', 'Assessment', 'Interview', 'Selected', 'Offer', 'Placed'];
  const shortlisted = (apps.data?.counts || []).filter((c) => SHORTLISTED.includes(c._id)).reduce((n, c) => n + c.n, 0);
  const upcomingCount = interviewsList.filter((i) => i.status === 'scheduled').length;
  const pendingCount = offersList.filter((o) => ['pending', 'issued', 'viewed'].includes(o.status)).length;

  const steps = [
    { label: 'Profile Built', done: completion >= 80, cur: completion < 80 },
    { label: 'Applied to Roles', done: appsTotal > 0, cur: completion >= 80 && appsTotal === 0 },
    { label: 'Assessments Passed', done: assessTotal > 0, cur: appsTotal > 0 && assessTotal === 0 },
    { label: 'Interviews', done: interviewsList.length > 0, cur: assessTotal > 0 && interviewsList.length === 0 },
    { label: 'Offer Received', done: offersList.length > 0, cur: interviewsList.length > 0 && offersList.length === 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div>
      {/* 1. Dynamic Executive Student Dashboard Hero */}
      <div className="cc-student-dash-hero">
        <div className="cc-student-dash-hero-body">
          <div className="cc-student-dash-hero-main">
            {/* Student Avatar (Image or Monogram) */}
            <div className="cc-student-dash-avatar-wrap">
              {p?.profilePhoto ? (
                <img
                  src={fileUrl(p.profilePhoto)}
                  alt={userName}
                  className="cc-student-dash-avatar-img"
                />
              ) : (
                <div className="cc-student-dash-avatar-mono">
                  {userName[0]?.toUpperCase() || 'S'}
                </div>
              )}
              <Link to="/student/profile" className="cc-student-dash-avatar-badge" title="Edit Profile Photo">
                <CheckCircle2 size={16} />
              </Link>
            </div>

            {/* Core Greetings & Student Identity */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="cc-student-dash-hero-greet">
                {greeting()} <span aria-hidden="true">👋</span>
              </div>
              <h1 className="cc-student-dash-hero-name">
                Welcome back, {userName.split(' ')[0]}
              </h1>

              {/* Student Academic & Placement Metadata Chips */}
              <div className="cc-student-dash-hero-meta">
                <span className="cc-badge blue no-dot">
                  <GraduationCap size={13} />
                  {p?.course || 'Degree Program'}{p?.branch ? ` · ${p.branch}` : ''}
                </span>

                {p?.enrollmentNo && (
                  <span className="cc-badge gray no-dot">
                    ID: {p.enrollmentNo}
                  </span>
                )}

                {p?.cgpa != null && p?.cgpa !== '' && (
                  <span className={`cc-badge ${Number(p.cgpa) >= 8.0 ? 'green' : Number(p.cgpa) >= 6.5 ? 'blue' : 'amber'} no-dot`}>
                    CGPA {Number(p.cgpa).toFixed(2)} / 10
                  </span>
                )}

                <span className={`cc-badge ${isPlaced ? 'green' : 'blue'} no-dot`}>
                  <span className="cc-badge-dot" />
                  {isPlaced ? 'Placed 🎉' : 'Seeking Placement 🎯'}
                </span>

                {p?.backlogs != null && (
                  <span className={`cc-badge ${Number(p.backlogs) === 0 ? 'green' : 'amber'} no-dot`}>
                    <ShieldCheck size={12} />
                    {Number(p.backlogs) === 0 ? '0 Backlogs · Eligible' : `${p.backlogs} Backlogs`}
                  </span>
                )}

                {p?.city && (
                  <span className="cc-badge gray no-dot">
                    <MapPin size={12} /> {p.city}
                  </span>
                )}
              </div>

              {/* Primary Call to Action Buttons */}
              <div className="cc-student-dash-hero-actions">
                <Link className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5" to="/student/jobs">
                  <Briefcase size={14} /> Browse Live Jobs
                </Link>
                <Link className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5" to="/student/drives">
                  <CalendarDays size={14} /> Placement Drives
                </Link>
                <Link className="btn btn-ghost btn-sm d-inline-flex align-items-center gap-1.5" to="/student/profile">
                  <User size={14} /> My Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Profile Strength / Completion Gauge */}
          <div className="cc-student-dash-hero-stats">
            <div className="cc-ring" style={{ '--pct': completion, width: 62, height: 62 }}>
              <span>{completion}%</span>
            </div>
            <div>
              <div className="cc-profile-strength-title">Profile Strength</div>
              <div className="cc-profile-strength-desc">
                {completion >= 85
                  ? '100% Ready for Campus Drives'
                  : completion >= 60
                  ? 'Good Progress · Complete details'
                  : 'Complete profile to unlock top jobs'}
              </div>
              {completion < 100 && (
                <Link to="/student/profile" className="small text-primary fw-bold d-inline-flex align-items-center gap-1 mt-1">
                  Complete remaining fields <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placed Celebration Banner if student is placed */}
      {isPlaced && (
        <div className="cc-placed-banner mb-4">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-3">
              <Trophy size={28} />
              <div>
                <b>Congratulations {userName}! You are officially Placed! 🎓🎉</b>
                <div className="small">Your placement journey has succeeded. Review your offer letter and placement documents.</div>
              </div>
            </div>
            <Link className="btn btn-light btn-sm ms-auto fw-semibold" to="/student/placement">
              View Placement Letter
            </Link>
          </div>
        </div>
      )}

      {/* 2. Enhanced Dynamic KPI Cards Grid */}
      <div className="cc-student-kpis-grid">
        <Link to="/student/jobs" className="cc-student-kpi-card tone-indigo">
          <div className="cc-student-kpi-top">
            <span className="cc-student-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
              <Briefcase size={22} />
            </span>
            <span className="cc-badge blue no-dot">Live Roles</span>
          </div>
          <div>
            <div className="cc-student-kpi-val">{openJobs}</div>
            <div className="cc-student-kpi-lbl">Open Opportunities</div>
            <div className="cc-student-kpi-sub">
              <Sparkles size={12} style={{ color: '#6366f1' }} /> Verified corporate partners
            </div>
          </div>
        </Link>

        <Link to="/student/applications" className="cc-student-kpi-card tone-blue">
          <div className="cc-student-kpi-top">
            <span className="cc-student-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
              <Send size={22} />
            </span>
            {shortlisted > 0 && <span className="cc-badge green no-dot">{shortlisted} Shortlisted</span>}
          </div>
          <div>
            <div className="cc-student-kpi-val">{appsTotal}</div>
            <div className="cc-student-kpi-lbl">My Applications</div>
            <div className="cc-student-kpi-sub">
              <CheckCircle2 size={12} className="text-success" /> {shortlisted > 0 ? `${shortlisted} advanced to next rounds` : 'In recruitment pipeline'}
            </div>
          </div>
        </Link>

        <Link to="/student/interviews" className="cc-student-kpi-card tone-violet">
          <div className="cc-student-kpi-top">
            <span className="cc-student-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
              <Video size={22} />
            </span>
            {upcomingCount > 0 && <span className="cc-badge violet no-dot">{upcomingCount} Upcoming</span>}
          </div>
          <div>
            <div className="cc-student-kpi-val">{interviewsList.length}</div>
            <div className="cc-student-kpi-lbl">Interview Rounds</div>
            <div className="cc-student-kpi-sub">
              <Clock size={12} className="text-warning" /> {upcomingCount > 0 ? `${upcomingCount} round${upcomingCount > 1 ? 's' : ''} scheduled` : 'No pending rounds'}
            </div>
          </div>
        </Link>

        <Link to="/student/assessments" className="cc-student-kpi-card tone-amber">
          <div className="cc-student-kpi-top">
            <span className="cc-student-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <ClipboardCheck size={22} />
            </span>
            <span className="cc-badge amber no-dot">Test Portal</span>
          </div>
          <div>
            <div className="cc-student-kpi-val">{assessTotal}</div>
            <div className="cc-student-kpi-lbl">Assessments</div>
            <div className="cc-student-kpi-sub">
              <Laptop size={12} /> Coding & Aptitude Tests
            </div>
          </div>
        </Link>

        <Link to="/student/drives" className="cc-student-kpi-card tone-emerald">
          <div className="cc-student-kpi-top">
            <span className="cc-student-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <CalendarDays size={22} />
            </span>
            <span className="cc-badge green no-dot">{openDrives.length} Active</span>
          </div>
          <div>
            <div className="cc-student-kpi-val">{drives.data?.data?.length || 0}</div>
            <div className="cc-student-kpi-lbl">Campus Drives</div>
            <div className="cc-student-kpi-sub">
              <Building2 size={12} /> College Placement Drives
            </div>
          </div>
        </Link>

        <Link to="/student/offers" className="cc-student-kpi-card tone-rose">
          <div className="cc-student-kpi-top">
            <span className="cc-student-kpi-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' }}>
              <Trophy size={22} />
            </span>
            {pendingCount > 0 && <span className="cc-badge red no-dot">{pendingCount} Action Needed</span>}
          </div>
          <div>
            <div className="cc-student-kpi-val">{offersList.length}</div>
            <div className="cc-student-kpi-lbl">Job Offers</div>
            <div className="cc-student-kpi-sub">
              <Award size={12} /> {offersList.length > 0 ? `${offersList.length} offer letter${offersList.length > 1 ? 's' : ''}` : 'Targeting first offer'}
            </div>
          </div>
        </Link>
      </div>

      {/* 3. Interactive Quick Action Links */}
      <div className="cc-student-actions-grid">
        <Link to="/student/jobs" className="cc-student-action-card">
          <span className="cc-student-action-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <Briefcase size={20} />
          </span>
          <div className="cc-student-action-body">
            <span className="cc-student-action-title">Browse Jobs</span>
            <span className="cc-student-action-sub">{openJobs} active listings</span>
          </div>
          <ChevronRight size={16} className="cc-student-action-arrow" />
        </Link>

        <Link to="/student/recommended" className="cc-student-action-card">
          <span className="cc-student-action-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <WandSparkles size={20} />
          </span>
          <div className="cc-student-action-body">
            <span className="cc-student-action-title">AI Matches</span>
            <span className="cc-student-action-sub">Smart role recommendations</span>
          </div>
          <ChevronRight size={16} className="cc-student-action-arrow" />
        </Link>

        <Link to="/student/drives" className="cc-student-action-card">
          <span className="cc-student-action-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CalendarDays size={20} />
          </span>
          <div className="cc-student-action-body">
            <span className="cc-student-action-title">Campus Drives</span>
            <span className="cc-student-action-sub">{openDrives.length} open for registration</span>
          </div>
          <ChevronRight size={16} className="cc-student-action-arrow" />
        </Link>

        <Link to="/student/applications" className="cc-student-action-card">
          <span className="cc-student-action-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
            <ClipboardList size={20} />
          </span>
          <div className="cc-student-action-body">
            <span className="cc-student-action-title">Applications</span>
            <span className="cc-student-action-sub">{appsTotal} submitted</span>
          </div>
          <ChevronRight size={16} className="cc-student-action-arrow" />
        </Link>

        <Link to="/student/assessments" className="cc-student-action-card">
          <span className="cc-student-action-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <ClipboardCheck size={20} />
          </span>
          <div className="cc-student-action-body">
            <span className="cc-student-action-title">Assessments</span>
            <span className="cc-student-action-sub">Online tests & quizzes</span>
          </div>
          <ChevronRight size={16} className="cc-student-action-arrow" />
        </Link>

        <Link to="/student/resume" className="cc-student-action-card">
          <span className="cc-student-action-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
            <FileText size={20} />
          </span>
          <div className="cc-student-action-body">
            <span className="cc-student-action-title">Resume & ATS</span>
            <span className="cc-student-action-sub">CV score & optimization</span>
          </div>
          <ChevronRight size={16} className="cc-student-action-arrow" />
        </Link>
      </div>

      {/* 4. Placement Pipeline Milestone Journey */}
      <div className="cc-student-journey-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h3 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Placement Progression Journey
            </h3>
            <div className="small text-muted">Track your campus placement milestones from profile building to receiving offer letters.</div>
          </div>
          <span className="cc-badge violet no-dot">
            {doneCount} of {steps.length} Milestones Reached
          </span>
        </div>

        <div className="cc-student-journey-track">
          <div className="cc-student-journey-line">
            <div
              className="cc-student-journey-line-fill"
              style={{ width: `${Math.min(100, Math.max(0, (doneCount / (steps.length - 1)) * 100))}%` }}
            />
          </div>

          {steps.map((st, i) => {
            const cls = st.done ? 'done' : st.cur ? 'cur' : '';
            return (
              <div key={st.label} className={`cc-student-journey-step ${cls}`}>
                <div className="cc-student-journey-node">
                  {st.done ? '✓' : i + 1}
                </div>
                <span className="cc-student-journey-lbl">{st.label}</span>
              </div>
            );
          })}
        </div>

        {offersList.length > 0 ? (
          <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top small text-success fw-semibold">
            <Trophy size={16} /> Placement Offer Received! Review your terms and accept in My Offers.
          </div>
        ) : appsTotal === 0 ? (
          <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top small text-muted">
            <Sparkles size={14} className="text-primary" /> Apply to recommended jobs or registered drives to advance to the next milestone!
          </div>
        ) : null}
      </div>

      {/* 5. Main Content Split: Recommended Jobs vs Upcoming Schedule */}
      <div className="row g-4 mb-3">
        {/* Left Column: AI Recommendations & Recent Applications */}
        <div className="col-12 col-lg-7">
          {/* AI Recommended Roles */}
          <SectionCard
            title="AI Recommended For You"
            icon={<Sparkles size={18} className="text-primary" />}
            actions={<Link className="small fw-semibold text-primary" to="/student/recommended">View all matches ({rec.data?.length || 0})</Link>}
            className="mb-4"
          >
            {rec.loading ? (
              <Loading rows={3} height={60} />
            ) : !rec.data?.length ? (
              <Empty
                title="No role recommendations yet"
                hint="Add technical skills and academic background to your profile to unlock customized AI matched job postings."
                action={
                  <Link to="/student/skills" className="btn btn-sm btn-primary mt-2">
                    Add Technical Skills
                  </Link>
                }
              />
            ) : (
              rec.data.slice(0, 4).map(({ job, match }) => {
                const compName = job.company?.companyName || 'Corporate Partner';
                const compLogo = job.company?.logo ? fileUrl(job.company.logo) : null;
                const matchScore = match?.score ?? 90;

                return (
                  <Link key={job._id} to={`/student/jobs/${job._id}`} className="cc-student-rec-card">
                    <div className="cc-student-rec-left">
                      <div className="cc-student-rec-logo">
                        {compLogo ? (
                          <img src={compLogo} alt={compName} />
                        ) : (
                          compName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="cc-student-rec-info">
                        <div className="cc-student-rec-title">{job.title}</div>
                        <div className="cc-student-rec-sub">
                          <span className="fw-medium text-dark">{compName}</span>
                          <span>·</span>
                          <span className="d-inline-flex align-items-center gap-1">
                            <MapPin size={12} /> {job.location || 'Onsite'}
                          </span>
                          {job.salary && (
                            <>
                              <span>·</span>
                              <span className="fw-semibold text-success d-inline-flex align-items-center gap-0.5">
                                <IndianRupee size={12} /> {salaryText(job.salary)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="cc-student-rec-pills">
                      <span className="cc-badge violet no-dot">
                        <Sparkles size={12} /> {matchScore}% Match
                      </span>
                      <ChevronRight size={18} className="text-muted" />
                    </div>
                  </Link>
                );
              })
            )}
          </SectionCard>

          {/* Recent Applications Live Tracker */}
          <SectionCard
            title="My Applications Status"
            icon={<ClipboardList size={18} className="text-primary" />}
            actions={<Link className="small fw-semibold text-primary" to="/student/applications">View all ({appsTotal})</Link>}
          >
            {apps.loading ? (
              <Loading rows={3} height={60} />
            ) : !appsList.length ? (
              <Empty
                title="No applications submitted yet"
                hint="Explore open campus drives and corporate job openings to kickstart your placement journey."
                action={
                  <Link to="/student/jobs" className="btn btn-sm btn-primary mt-2">
                    Browse Jobs & Apply
                  </Link>
                }
              />
            ) : (
              appsList.slice(0, 4).map((a) => (
                <Link key={a._id} to={`/student/applications/${a._id}`} className="cc-list-row">
                  <span className="cc-list-ic cc-tone-primary">
                    <Briefcase size={17} />
                  </span>
                  <span className="cc-list-body">
                    <b>{a.job?.title}</b>
                    <small>{a.job?.company?.companyName || 'Company'} · Applied on {fmtDate(a.appliedAt)}</small>
                  </span>
                  <StatusBadge value={a.status} />
                </Link>
              ))
            )}
          </SectionCard>
        </div>

        {/* Right Column: Upcoming Activities, Notifications & Insights */}
        <div className="col-12 col-lg-5">
          {/* Upcoming Activities & Schedule */}
          <SectionCard
            title="Upcoming Schedule"
            icon={<CalendarDays size={18} className="text-primary" />}
            className="mb-4"
          >
            {!upcomingInterviews.length && !openDrives.length && !pendingOffers.length ? (
              <Empty
                title="No immediate deadlines"
                hint="Your scheduled interviews, exam sessions, and placement drives will automatically display here."
              />
            ) : (
              <div>
                {upcomingInterviews.map((i) => (
                  <Link key={i._id} to={`/student/interviews/${i._id}`} className="cc-student-activity-card">
                    <span className="cc-student-activity-icon" style={{ background: 'rgba(139, 92, 246, 0.14)', color: '#8b5cf6' }}>
                      <Video size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="fw-bold small text-dark">{i.roundName || 'Interview Round'}</span>
                        <span className="cc-badge violet no-dot">Scheduled</span>
                      </div>
                      <div className="small text-muted mt-0.5">
                        {fmtDate(i.interviewDate)} · {i.mode || 'Online Round'}
                      </div>
                    </div>
                  </Link>
                ))}

                {openDrives.map(({ drive: d }) => (
                  <Link key={d._id} to={`/student/drives/${d._id}`} className="cc-student-activity-card">
                    <span className="cc-student-activity-icon" style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#10b981' }}>
                      <CalendarDays size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="fw-bold small text-dark">Register: {d.driveTitle}</span>
                        <span className="cc-badge green no-dot">Drive Open</span>
                      </div>
                      <div className="small text-muted mt-0.5">
                        {d.company?.companyName || 'Corporate Drive'} · Ends soon
                      </div>
                    </div>
                  </Link>
                ))}

                {pendingOffers.map((o) => (
                  <Link key={o._id} to={`/student/offers/${o._id}`} className="cc-student-activity-card">
                    <span className="cc-student-activity-icon" style={{ background: 'rgba(244, 63, 94, 0.14)', color: '#f43f5e' }}>
                      <Trophy size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="fw-bold small text-dark">Offer: {o.position || o.job?.title}</span>
                        <span className="cc-badge red no-dot">Decision Required</span>
                      </div>
                      <div className="small text-muted mt-0.5">
                        Accept or review offer letter terms
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Campus Notifications & Announcements */}
          <SectionCard
            title={
              <div className="d-flex align-items-center gap-2">
                <span>Campus Announcements</span>
                {unread > 0 && <span className="cc-badge amber no-dot">{unread} New</span>}
              </div>
            }
            icon={<Bell size={18} className="text-primary" />}
            actions={<Link className="small fw-semibold text-primary" to="/student/notifications">View all</Link>}
            className="mb-4"
          >
            {notifs.loading ? (
              <Loading rows={2} height={50} />
            ) : !notifList.length ? (
              <Empty title="You're all caught up" hint="New announcements from your college TPO will appear here." />
            ) : (
              notifList.slice(0, 3).map((n) => (
                <div key={n._id} className="cc-list-row">
                  <span
                    className="cc-list-ic"
                    style={{
                      background: n.isRead ? 'var(--cc-surface-2)' : 'var(--cc-primary-soft)',
                      color: n.isRead ? 'var(--cc-muted)' : 'var(--cc-primary)',
                    }}
                  >
                    <Bell size={16} />
                  </span>
                  <span className="cc-list-body">
                    <b>{n.title}</b>
                    <small>{String(n.message || '').slice(0, 75)}...</small>
                  </span>
                </div>
              ))
            )}
          </SectionCard>

          {/* Career & Skills Summary Card */}
          <SectionCard title="Career Readiness" icon={<GraduationCap size={18} className="text-primary" />}>
            <div className="row g-2 text-center mb-3">
              <div className="col-4">
                <div className="p-2.5 rounded-3 border" style={{ background: 'var(--cc-surface-2)' }}>
                  <b className="d-block h5 mb-0 text-dark">{openJobs}</b>
                  <div className="small text-muted mt-1">Open Roles</div>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2.5 rounded-3 border" style={{ background: 'var(--cc-surface-2)' }}>
                  <b className="d-block h5 mb-0 text-dark">{skills.data?.length ?? 0}</b>
                  <div className="small text-muted mt-1">Skills Added</div>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2.5 rounded-3 border" style={{ background: 'var(--cc-surface-2)' }}>
                  <b className="d-block h5 mb-0 text-dark">{completion}%</b>
                  <div className="small text-muted mt-1">Readiness</div>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between p-2.5 rounded-3 border bg-surface-2">
              <div className="d-flex align-items-center gap-2">
                <ShieldCheck size={18} className="text-success" />
                <span className="small fw-semibold text-dark">ATS Resume Verification</span>
              </div>
              <Link to="/student/resume" className="small fw-bold text-primary">
                Check ATS Score
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function useSaved() {
  const saved = useFetch(async () => (await api.get('/saved-jobs', { params: { limit: 100 } })).data.data, []);
  const ids = useMemo(() => new Set((saved.data || []).map((s) => s.job?._id).filter(Boolean)), [saved.data]);
  return { ids, reload: saved.reload };
}

function useMyApplications() {
  const res = useFetch(async () => (await api.get('/applications/mine', { params: { limit: 100 } })).data?.data || [], []);
  const appliedMap = useMemo(() => {
    const map = new Map();
    for (const app of res.data || []) {
      const jId = app.job?._id || app.job;
      if (jId) map.set(String(jId), app);
    }
    return map;
  }, [res.data]);
  return { appliedMap, reloadApplications: res.reload };
}

export function StudentJobCard({
  job,
  match,
  saved = false,
  onToggleSave,
  hasApplied = false,
  application = null,
}) {
  if (!job) return null;
  const company = job.company || {};
  const companyName = company.companyName || 'Corporate Partner';
  const logo = company.logo ? fileUrl(company.logo) : null;
  const initials = String(companyName).trim().slice(0, 2).toUpperCase() || 'CP';

  // Deadline calculation
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

  // Skills chips
  const skills = useMemo(() => {
    if (job.skills && Array.isArray(job.skills)) return job.skills;
    if (typeof job.skills === 'string') return job.skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (job.technologies) return String(job.technologies).split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  }, [job]);

  return (
    <motion.article
      className="cc-student-job-card h-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="cc-student-job-card-inner">
        {/* Top Header */}
        <div className="cc-student-job-header">
          <div className="cc-student-job-brand">
            {logo ? (
              <img src={logo} alt={companyName} className="cc-student-job-logo-img" loading="lazy" />
            ) : (
              <span className="cc-student-job-logo-fallback">{initials}</span>
            )}
            <div className="min-w-0" style={{ minWidth: 0, flex: 1 }}>
              <div className="cc-student-job-company">
                <span className="text-truncate">{companyName}</span>
                {company.verificationStatus === 'verified' && (
                  <BadgeCheck size={14} className="text-primary flex-shrink-0" title="Verified Campus Recruiter" />
                )}
              </div>
              <Link to={`/student/jobs/${job._id}`} className="cc-student-job-title" title={job.title}>
                {job.title}
              </Link>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
            {hasApplied && (
              <span className="cc-badge green no-dot d-inline-flex align-items-center gap-1 fw-bold" title="You have already applied">
                <BadgeCheck size={12} /> Applied
              </span>
            )}
            {match ? (
              <div className={`cc-job-match-badge ${match.score >= 80 ? 'high' : match.score >= 60 ? 'mid' : 'low'}`} title={`${match.score}% Skill & Profile Match`}>
                <Sparkles size={13} />
                <span>{match.score}% Match</span>
              </div>
            ) : (
              job.jobType && <StatusBadge value={job.jobType} />
            )}

            {onToggleSave && (
              <button
                type="button"
                className={`cc-job-bookmark-btn ${saved ? 'is-saved' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onToggleSave(job._id);
                }}
                title={saved ? 'Remove bookmark' : 'Save opportunity'}
                aria-label={saved ? 'Remove bookmark' : 'Save opportunity'}
              >
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Highlight Strip (Salary CTC + Work mode + Location) */}
        <div className="cc-student-job-pills">
          <span className="cc-student-job-pill salary">
            <IndianRupee size={13} />
            <b>{salaryText(job)}</b>
          </span>
          {job.location && (
            <span className="cc-student-job-pill">
              <MapPin size={12} />
              <span>{job.location}</span>
            </span>
          )}
          {job.workMode && (
            <span className="cc-student-job-pill">
              <Laptop size={12} />
              <span>{job.workMode}</span>
            </span>
          )}
        </div>

        {/* Description snippet */}
        {job.description && (
          <p className="cc-student-job-desc">
            {job.description}
          </p>
        )}

        {/* In Recommended: Skill Compatibility Gauge & Chips */}
        {match && (
          <div className="cc-student-job-match-box">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small fw-semibold text-muted">Skill Compatibility</span>
              <span className="small fw-bold text-primary">
                {match.matched?.length || 0} of {(match.matched?.length || 0) + (match.missing?.length || 0)} skills matched
              </span>
            </div>
            <div className="cc-bar success mb-2" style={{ height: 6 }}>
              <span style={{ width: `${match.score}%` }} />
            </div>
            <div className="cc-student-job-skills">
              {(match.matched || []).slice(0, 4).map((s) => (
                <span key={`m-${s}`} className="cc-rec-skill-chip ok">
                  <Check size={11} /> {s}
                </span>
              ))}
              {(match.missing || []).slice(0, 3).map((s) => (
                <span key={`x-${s}`} className="cc-rec-skill-chip miss">
                  + {s}
                </span>
              ))}
              {((match.matched?.length || 0) + (match.missing?.length || 0) > 7) && (
                <span className="cc-rec-skill-chip more">
                  +{((match.matched?.length || 0) + (match.missing?.length || 0)) - 7} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* In Standard Jobs: Skills preview tags if available */}
        {!match && skills.length > 0 && (
          <div className="cc-student-job-skills">
            {skills.slice(0, 4).map((s, idx) => (
              <span key={idx} className="cc-student-skill-tag">{s}</span>
            ))}
            {skills.length > 4 && (
              <span className="cc-student-skill-tag more">+{skills.length - 4} more</span>
            )}
          </div>
        )}

        {/* Footer with deadline and action buttons */}
        <div className="cc-student-job-foot">
          <div className="cc-student-job-deadline">
            {deadlineLabel ? (
              <span className={`d-inline-flex align-items-center gap-1 ${deadlineUrgent ? 'text-danger fw-bold' : 'text-muted'}`}>
                <Clock size={13} />
                <span>{deadlineExpired ? 'Closed' : deadlineUrgent ? `Urgent: ${deadlineLabel}` : `Apply by ${deadlineLabel}`}</span>
              </span>
            ) : (
              <span className="text-muted d-inline-flex align-items-center gap-1">
                <Clock size={13} /> Open Application
              </span>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {hasApplied ? (
              <Link to={`/student/jobs/${job._id}`} className="btn btn-sm btn-outline-success cc-job-cta-btn applied d-inline-flex align-items-center gap-1.5 fw-semibold">
                <BadgeCheck size={14} />
                <span>Applied</span>
              </Link>
            ) : (
              <Link to={`/student/jobs/${job._id}`} className="btn btn-sm btn-primary cc-job-cta-btn">
                <span>View &amp; Apply</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function Jobs() {
  const [q, setQ] = useState({ search: '', location: '', jobType: '', workMode: '', page: 1 });
  const debouncedSearch = useDebounced(q.search, 350);
  const debouncedLocation = useDebounced(q.location, 350);

  const queryParams = useMemo(() => ({
    ...q,
    search: debouncedSearch,
    location: debouncedLocation,
  }), [q.jobType, q.workMode, q.page, debouncedSearch, debouncedLocation]);

  const res = useFetch(
    async () => (await api.get('/jobs', { params: { ...queryParams, limit: 9 } })).data,
    [JSON.stringify(queryParams)],
    { keepPrevious: true }
  );
  const { ids, reload } = useSaved();
  const { appliedMap } = useMyApplications();
  const [overrides, setOverrides] = useState({});
  const isSaved = (id) => (id in overrides ? overrides[id] : ids.has(id));
  const onToggleSave = async (jobId) => {
    const nextSaved = !isSaved(jobId);
    setOverrides((o) => ({ ...o, [jobId]: nextSaved }));
    try {
      if (nextSaved) await api.post('/saved-jobs', { jobId });
      else await api.delete(`/saved-jobs/${jobId}`);
      toast.success(nextSaved ? 'Job saved to bookmarks.' : 'Job removed from bookmarks.');
      reload();
    } catch (e) {
      setOverrides((o) => ({ ...o, [jobId]: !nextSaved }));
      toast.error(apiErrorMessage(e));
    }
  };
  const active = q.search || q.location || q.jobType || q.workMode;
  const clear = () => setQ({ search: '', location: '', jobType: '', workMode: '', page: 1 });
  const total = res.data?.pagination?.total ?? 0;
  const jobsList = res.data?.data || [];

  const fullTimeCount = useMemo(() => jobsList.filter((j) => j.jobType === 'Full Time').length, [jobsList]);
  const remoteCount = useMemo(() => jobsList.filter((j) => j.workMode === 'Remote' || j.workMode === 'Hybrid').length, [jobsList]);

  return (
    <PageContainer>
      <PageHeader
        title="Explore Placement Openings"
        eyebrow="Campus & Corporate Drives"
        icon={<Briefcase size={26} />}
        description="Discover verified campus openings, internships, and corporate placement opportunities."
        meta={<span className="cc-badge blue no-dot">{total} opening{total !== 1 ? 's' : ''} available</span>}
        actions={
          <Link to="/student/recommended" className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
            <Sparkles size={16} /> View Recommended Matches
          </Link>
        }
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<Briefcase size={20} />} label="Total Openings" value={total} tone="primary" />
        <KpiCard icon={<Sparkles size={20} />} label="Full Time Roles" value={fullTimeCount} tone="violet" />
        <KpiCard icon={<Laptop size={20} />} label="Remote / Hybrid" value={remoteCount} tone="success" />
        <KpiCard icon={<Bookmark size={20} />} label="Saved Bookmarks" value={ids.size} tone="amber" to="/student/saved" />
      </div>

      {/* Advanced Filter Toolbar */}
      <Toolbar onClear={clear} showClear={!!active}>
        <SearchInput
          value={q.search}
          onChange={(v) => setQ({ ...q, search: v, page: 1 })}
          placeholder="Search by role, company name, or technology..."
          label="Search jobs"
        />
        <input
          className="form-control cc-select"
          placeholder="Location (e.g. Bengaluru, Remote)"
          aria-label="Location"
          value={q.location}
          onChange={(e) => setQ({ ...q, location: e.target.value, page: 1 })}
          style={{ maxWidth: 220 }}
        />
        <SelectFilter
          label="Job type"
          value={q.jobType}
          options={JOB_TYPES}
          onChange={(v) => setQ({ ...q, jobType: v, page: 1 })}
        />
        <SelectFilter
          label="Work mode"
          value={q.workMode}
          options={WORK_MODES}
          onChange={(v) => setQ({ ...q, workMode: v, page: 1 })}
        />
      </Toolbar>

      {/* Jobs Grid Area */}
      {res.loading ? (
        <Loading rows={3} height={180} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !jobsList.length ? (
        <Empty
          title={active ? 'No opportunities match your filters' : 'No open opportunities right now'}
          hint={active ? 'Try clearing or broadening your search parameters.' : 'New corporate openings will appear as recruiters publish placement drives.'}
          icon={<Briefcase size={44} />}
          action={active ? <button className="btn btn-outline-primary btn-sm" onClick={clear}>Reset All Filters</button> : null}
        />
      ) : (
        <>
          <div className="row g-3">
            {jobsList.map((job) => (
              <div key={job._id} className="col-12 col-md-6 col-xl-4">
                <StudentJobCard
                  job={job}
                  saved={isSaved(job._id)}
                  onToggleSave={onToggleSave}
                  hasApplied={appliedMap.has(String(job._id))}
                  application={appliedMap.get(String(job._id))}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 d-flex justify-content-center">
            <Pager
              page={res.data?.pagination?.page || 1}
              pages={res.data?.pagination?.pages}
              onPage={(p) => setQ({ ...q, page: p })}
            />
          </div>
        </>
      )}
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
export function Recommended() {
  const res = useFetch(async () => (await api.get('/jobs/recommended')).data.data, []);
  const { ids, reload } = useSaved();
  const { appliedMap } = useMyApplications();
  const [overrides, setOverrides] = useState({});
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [search, setSearch] = useState('');

  const isSaved = (id) => (id in overrides ? overrides[id] : ids.has(id));
  const onToggleSave = async (jobId) => {
    const nextSaved = !isSaved(jobId);
    setOverrides((o) => ({ ...o, [jobId]: nextSaved }));
    try {
      if (nextSaved) await api.post('/saved-jobs', { jobId });
      else await api.delete(`/saved-jobs/${jobId}`);
      toast.success(nextSaved ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
      reload();
    } catch (e) {
      setOverrides((o) => ({ ...o, [jobId]: !nextSaved }));
      toast.error(apiErrorMessage(e));
    }
  };

  const rawList = res.data || [];

  const filtered = useMemo(() => {
    return rawList.filter(({ job, match }) => {
      const title = (job?.title || '').toLowerCase();
      const comp = (job?.company?.companyName || '').toLowerCase();
      const matchesSearch = !search || title.includes(search.toLowerCase()) || comp.includes(search.toLowerCase());
      const matchesScore = (match?.score || 0) >= filterMinScore;
      return matchesSearch && matchesScore;
    });
  }, [rawList, search, filterMinScore]);

  const highMatchCount = useMemo(() => rawList.filter(({ match }) => (match?.score || 0) >= 80).length, [rawList]);
  const avgScore = useMemo(() => {
    if (!rawList.length) return 0;
    const total = rawList.reduce((acc, curr) => acc + (curr.match?.score || 0), 0);
    return Math.round(total / rawList.length);
  }, [rawList]);

  return (
    <PageContainer>
      <PageHeader
        title="Recommended Opportunities"
        eyebrow="Algorithmic Match Engine"
        icon={<WandSparkles size={26} />}
        description="Smart job matches ranked by your profile skills (50%), preferred location, work mode, course, and academic branch."
        meta={<span className="cc-badge violet no-dot">{rawList.length} smart match{rawList.length !== 1 ? 'es' : ''}</span>}
        actions={
          <Link to="/student/jobs" className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
            <Briefcase size={16} /> Browse All Jobs
          </Link>
        }
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<WandSparkles size={20} />} label="Total Matches" value={rawList.length} tone="primary" />
        <KpiCard icon={<Sparkles size={20} />} label="High Match (80%+)" value={highMatchCount} tone="success" />
        <KpiCard icon={<Award size={20} />} label="Average Match" value={`${avgScore}%`} tone="violet" />
        <KpiCard icon={<Bookmark size={20} />} label="Saved Matches" value={ids.size} tone="amber" to="/student/saved" />
      </div>

      {/* Filter Tabs & Search */}
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div style={{ maxWidth: 340, width: '100%' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter matches by title or company..."
          />
        </div>

        <div className="d-flex align-items-center gap-1 flex-wrap">
          <span className="small text-muted me-1">Match Quality:</span>
          {[
            { label: 'All Matches', min: 0 },
            { label: '🔥 Top Matches (80%+)', min: 80 },
            { label: '⭐ Good Matches (60%+)', min: 60 },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`btn btn-sm ${filterMinScore === tab.min ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilterMinScore(tab.min)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {res.loading ? (
        <Loading rows={3} height={180} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !rawList.length ? (
        <Empty
          title="No recommendations calculated yet"
          hint="Add more technical skills, projects, and career preferences to unlock machine-matched opportunities."
          icon={<WandSparkles size={44} />}
          action={
            <Link to="/student/skills" className="btn btn-primary d-inline-flex align-items-center gap-2">
              <Plus size={16} /> Add Skills to Profile
            </Link>
          }
        />
      ) : !filtered.length ? (
        <Empty title="No recommendations match your filters" hint="Try switching to 'All Matches' or clearing your search filter." bare />
      ) : (
        <div className="row g-3">
          {filtered.map(({ job, match }) => (
            <div key={job._id} className="col-12 col-md-6 col-xl-4">
              <StudentJobCard
                job={job}
                match={match}
                saved={isSaved(job._id)}
                onToggleSave={onToggleSave}
                hasApplied={appliedMap.has(String(job._id))}
                application={appliedMap.get(String(job._id))}
              />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
export function External() {
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const debouncedQ = useDebounced(q, 350);
  const debouncedLoc = useDebounced(loc, 350);
  const res = useFetch(
    async () => (await api.get('/external-jobs', { params: { q: debouncedQ, loc: debouncedLoc } })).data,
    [debouncedQ, debouncedLoc],
    { keepPrevious: true }
  );
  const internal = res.data?.data?.internal || [];
  const external = res.data?.data?.external || [];
  const active = !!(q || loc);
  const clear = () => { setQ(''); setLoc(''); };

  return (
    <PageContainer>
      <PageHeader
        title="Live & External Jobs"
        eyebrow="Marketplace Discovery"
        description="Explore verified campus job postings paired with live, public job-board listings across top tech companies."
        icon={<Globe size={26} />}
        meta={
          <div className="d-flex align-items-center gap-2">
            <span className="cc-badge blue no-dot">{internal.length} Campus Opening{internal.length !== 1 ? 's' : ''}</span>
            <span className="cc-badge violet no-dot">{external.length} Public Listing{external.length !== 1 ? 's' : ''}</span>
          </div>
        }
      />

      <Toolbar onClear={clear} showClear={active}>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by job title, skill (e.g. Frontend, Python)..."
          label="Search external jobs"
        />
        <input
          className="form-control cc-select"
          placeholder="Location (e.g. Pune, Remote)"
          aria-label="Location"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          style={{ maxWidth: 220 }}
        />
      </Toolbar>

      {res.loading ? (
        <Loading rows={3} height={120} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : (
        <div className="row g-4">
          {/* Campus Verified Openings */}
          <div className="col-12 col-lg-6">
            <SectionCard
              title="Verified Campus Openings"
              icon={<Building2 size={16} />}
              actions={<span className="cc-badge green no-dot">{internal.length} Verified</span>}
            >
              {!internal.length ? (
                <Empty title="No internal matches" hint="Try adjusting keywords or search location." />
              ) : (
                <div className="cc-ext-jobs-stack">
                  {internal.map((j) => {
                    const cName = j.company?.companyName || 'Campus Partner';
                    const initial = cName.charAt(0).toUpperCase();
                    return (
                      <div key={j._id} className="cc-ext-job-card">
                        <div className="cc-ext-job-avatar" title={cName}>
                          {initial}
                        </div>
                        <div className="cc-ext-job-body">
                          <div className="cc-ext-job-title-row">
                            <Link to={`/student/jobs/${j._id}`} className="cc-ext-job-title text-truncate">
                              {j.title}
                            </Link>
                            <span className="cc-ext-badge campus">
                              <BadgeCheck size={12} /> Verified
                            </span>
                          </div>
                          <div className="cc-ext-job-meta">
                            <span className="cc-ext-company">{cName}</span>
                            <span className="cc-dot-sep">·</span>
                            <span className="d-inline-flex align-items-center gap-1">
                              <MapPin size={12} className="text-muted" />
                              {j.location || 'Flexible'}
                            </span>
                            <span className="cc-dot-sep">·</span>
                            <span className="cc-type-pill">{j.jobType}</span>
                          </div>
                        </div>
                        <Link to={`/student/jobs/${j._id}`} className="cc-ext-action-btn">
                          <span>View Role</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Public Live Listings */}
          <div className="col-12 col-lg-6">
            <SectionCard
              title="Live External Listings"
              icon={<Globe size={16} />}
              actions={<span className="cc-badge violet no-dot">{external.length} Public</span>}
            >
              {!q && (
                <div className="alert alert-info py-2 small mb-3">
                  Type a job title or skill keyword above to search live external postings in real-time.
                </div>
              )}
              {q && !external.length ? (
                <Empty title="No external listings match" hint="Try searching for general roles such as Software Engineer or Data Analyst." />
              ) : (
                <div className="cc-ext-jobs-stack">
                  {external.map((j, i) => {
                    const cName = j.companyName || 'External Company';
                    const initial = cName.charAt(0).toUpperCase();
                    return (
                      <div key={`${j.title}-${i}`} className="cc-ext-job-card">
                        <div className="cc-ext-job-avatar external" title={cName}>
                          {initial}
                        </div>
                        <div className="cc-ext-job-body">
                          <div className="cc-ext-job-title-row">
                            <strong className="cc-ext-job-title text-truncate">{j.title}</strong>
                            <span className="cc-ext-badge external">
                              <Globe size={11} /> External
                            </span>
                          </div>
                          <div className="cc-ext-job-meta">
                            <span className="cc-ext-company">{cName}</span>
                            <span className="cc-dot-sep">·</span>
                            <span className="d-inline-flex align-items-center gap-1">
                              <MapPin size={12} className="text-muted" />
                              {j.location || 'Remote'}
                            </span>
                            {j.jobType && (
                              <>
                                <span className="cc-dot-sep">·</span>
                                <span className="cc-type-pill">{j.jobType}</span>
                              </>
                            )}
                            {j.salary && (
                              <>
                                <span className="cc-dot-sep">·</span>
                                <span className="text-success fw-medium">{j.salary}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {j.applyUrl && (
                          <a
                            className="cc-ext-action-btn external"
                            href={j.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>Apply</span>
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
export function Saved() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const res = useFetch(async () => (await api.get('/saved-jobs', { params: { q, page, limit: 9 } })).data, [q, page]);
  const { appliedMap, reloadApplications } = useMyApplications();
  const items = res.data?.data || [];
  const total = res.data?.pagination?.total ?? 0;

  const unsave = async (jobId) => {
    try { await api.delete(`/saved-jobs/${jobId}`); toast.success('Removed from bookmarks.'); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const apply = async (jobId) => {
    const ok = await confirmAction({ title: 'Apply for this role?', text: 'Your profile and resume will be shared with the recruiter.', icon: 'question', confirmButtonText: 'Apply' });
    if (!ok) return;
    try {
      await api.post('/applications', { jobId });
      toast.success('Application submitted successfully!');
      res.reload();
      reloadApplications();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  return (
    <PageContainer>
      <PageHeader
        title="Saved Jobs"
        eyebrow="Bookmarks"
        description="Your bookmarked openings, ready when you are to apply."
        icon={<Bookmark size={26} />}
        meta={<span className="cc-badge blue no-dot">{total} saved</span>}
      />
      <Toolbar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search saved jobs…" label="Search saved jobs" />
      </Toolbar>
      {res.loading ? <Loading rows={3} height={140} /> : res.error ? <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} /> : !items.length ? (
        <Empty title="No saved jobs" hint={q ? 'Try a different search.' : 'Bookmark jobs to find them here.'} />
      ) : (
        <>
          <div className="row g-3">
            {items.map((s) => {
              const j = s.job || {};
              const jId = String(j._id || '');
              const app = s.application || appliedMap.get(jId);
              const isApplied = Boolean(s.hasApplied || appliedMap.has(jId));

              return (
                <div key={s._id} className="col-md-6 col-xl-4">
                  <JobCard
                    job={{ ...j, company: j.company }}
                    to={`/student/jobs/${j._id}`}
                    badge={isApplied ? (
                      <span className="cc-badge green no-dot d-inline-flex align-items-center gap-1 fw-bold">
                        <BadgeCheck size={12} /> Applied
                      </span>
                    ) : undefined}
                    actions={<>
                      {isApplied ? (
                        <Link
                          to={app?._id ? `/student/applications/${app._id}` : `/student/jobs/${j._id}`}
                          className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5 fw-semibold"
                        >
                          <BadgeCheck size={14} /> Application Submitted
                        </Link>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5 fw-semibold"
                          onClick={() => apply(j._id)}
                        >
                          <Send size={13} /> Apply Now
                        </button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => unsave(j._id)}>
                        Remove
                      </button>
                    </>}
                  />
                </div>
              );
            })}
          </div>
          <Pager page={res.data?.pagination?.page || 1} pages={res.data?.pagination?.pages} onPage={setPage} />
        </>
      )}
    </PageContainer>
  );
}
