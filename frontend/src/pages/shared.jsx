import { Link, useParams, useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-toastify';
import { confirmAction, confirmDanger } from '../services/alerts';
import api, { apiErrorMessage, fileUrl } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import {
  DetailGrid, Empty, ErrorState, KpiCard, KpiGrid, Loading, PageHeader, Pager, SearchInput, SectionCard,
  Spinner, StatusBadge, Toolbar, salaryText,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PublicHeader } from '../components/public/Header';
import { PublicFooter } from '../components/public/Footer';
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Award, BadgeCheck, Sun, Moon, Key, Lock, Check, Bell, Briefcase, Building2, Calendar, CalendarDays,
  CheckCircle2, ClipboardCheck, Clock, Compass, Copy, Download, ExternalLink, Eye, EyeOff, FileText, Globe, GraduationCap,
  HelpCircle, IndianRupee, Laptop, Layers, LogIn, MapPin, Play, Printer, Share2, ShieldAlert, ShieldCheck, Sparkles,
  Target, User, Users, Video, XCircle, Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
export function JobDetails({ prefix = '', canApply = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  const res = useFetch(async () => (await api.get(`/jobs/${id}`)).data, [id]);
  const elig = useFetch(async () => (user?.role === 'student' ? (await api.get(`/jobs/${id}/eligibility`)).data.data : null), [id, user?.role]);
  const myApps = useFetch(async () => (user?.role === 'student' ? (await api.get('/applications/mine', { params: { limit: 100 } })).data?.data || [] : []), [user?.role]);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const studentProfileCompletion = Number(elig.data?.completion ?? user?.profile?.profileCompletion ?? 0);
  const isProfileComplete = user?.role === 'student' ? studentProfileCompletion >= 100 : true;

  const apply = async () => {
    if (user?.role === 'student' && !isProfileComplete) {
      toast.warning(`Your profile is currently ${studentProfileCompletion}% complete. You must complete 100% of your profile before applying.`);
      navigate('/student/profile');
      return;
    }
    const ok = await confirmAction({
      title: 'Apply for this position?',
      text: 'Your verified academic profile and resume will be submitted directly to the recruiter hiring roster.',
      icon: 'question',
      confirmButtonText: 'Yes, Submit Application',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await api.post('/applications', { jobId: id });
      toast.success('Application submitted successfully!');
      navigate(`/student/apply-success/${data.data._id}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const shareJob = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.info('Job link copied to clipboard!');
    } catch {
      toast.info(window.location.href);
    }
  };

  if (res.loading) return <div className="container py-5"><Loading rows={4} height={140} /></div>;
  if (res.error) return <div className="container py-5"><ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} /></div>;
  if (!res.data?.data) return <div className="container py-5"><Empty title="Job position not found" hint="This opening may have been unlisted, filled, or removed." /></div>;

  const { job, skills = [], hasApplied: serverHasApplied, application: serverApp, assessment: serverAssessment } = res.data.data;
  const assessment = serverAssessment || null;
  const clientApp = myApps.data?.find((a) => String(a.job?._id || a.job) === String(id));
  const hasApplied = Boolean(serverHasApplied || clientApp);
  const application = serverApp || clientApp || null;
  const company = job.company || {};
  const reasons = elig.data?.reasons || [];
  const isClosed = String(job.status || '').toLowerCase() !== 'open';
  const initials = String(company.companyName || 'C').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'C';
  const logo = company.logo ? fileUrl(company.logo) : null;
  const salary = salaryText(job);

  function dateText(v, opts) {
    if (!v) return '—';
    try {
      return new Date(v).toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }

  // Days until deadline
  const deadlineDate = job.deadline ? new Date(job.deadline) : null;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  const content = (
    <div className={canApply ? 'cc-page cc-detail-view' : 'container py-4'}>
      {/* Top Back & Share Navigation */}
      <div className="cc-detail-back-bar d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link className="cc-detail-back-link d-inline-flex align-items-center gap-2" to={canApply ? '/student/jobs' : '/jobs'}>
          <ArrowLeft size={16} /> Back to Job Openings
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1.5 rounded-pill px-3"
          onClick={shareJob}
          title="Share job opening"
        >
          <Share2 size={13} /> Share Opening
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="cc-detail-hero-card mb-4">
        <div className="cc-detail-hero-body">
          <div className="cc-detail-brand-box">
            <div className="cc-detail-avatar">
              {logo ? <img src={logo} alt={company.companyName} /> : initials}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="cc-detail-subtitle mb-1.5">
                <span className="fw-bold text-dark fs-6">{company.companyName || 'Corporate Partner'}</span>
                {company.verificationStatus === 'verified' && (
                  <ShieldCheck size={16} className="text-primary" title="Verified Recruiter" />
                )}
                {company.industry && (
                  <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                    {company.industry}
                  </span>
                )}
                {job.location && (
                  <span className="d-inline-flex align-items-center gap-1 text-muted">
                    • <MapPin size={13} /> {job.location}
                  </span>
                )}
                {job.createdAt && (
                  <span className="text-muted d-none d-md-inline">
                    • Posted on {dateText(job.createdAt)}
                  </span>
                )}
              </div>
              <h1 className="cc-detail-title">{job.title}</h1>
            </div>
          </div>

          <div className="cc-detail-badges">
            {job.jobType && <StatusBadge value={job.jobType} />}
            {job.workMode && <StatusBadge value={job.workMode} />}
            <span className={`cc-badge ${isClosed ? 'red' : 'green'} no-dot`}>
              {isClosed ? 'Closed' : 'Open for Applications'}
            </span>
            {hasApplied && (
              <span className="cc-badge green no-dot d-inline-flex align-items-center gap-1.5 fw-bold" title="You have already submitted an application for this role">
                <CheckCircle2 size={14} /> Applied on {dateText(application?.createdAt || application?.appliedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key Role Metrics Summary Strip (4 KPI Tiles) */}
      <div className="cc-job-metrics-grid">
        <div className="cc-job-metric-tile">
          <div className="cc-job-metric-icon tone-salary">
            <IndianRupee size={22} />
          </div>
          <div className="cc-job-metric-data">
            <div className="cc-job-metric-label">CTC Compensation</div>
            <div className="cc-job-metric-val text-success">{salary || 'Industry Standard'}</div>
          </div>
        </div>

        <div className="cc-job-metric-tile">
          <div className="cc-job-metric-icon tone-location">
            <MapPin size={22} />
          </div>
          <div className="cc-job-metric-data">
            <div className="cc-job-metric-label">Location & Mode</div>
            <div className="cc-job-metric-val">{job.location || 'Pan India'} · {job.workMode || 'Onsite'}</div>
          </div>
        </div>

        <div className="cc-job-metric-tile">
          <div className="cc-job-metric-icon tone-exp">
            <GraduationCap size={22} />
          </div>
          <div className="cc-job-metric-data">
            <div className="cc-job-metric-label">Experience & Degree</div>
            <div className="cc-job-metric-val">{job.experience || 'Fresher'} · {job.qualification || 'Any Degree'}</div>
          </div>
        </div>

        <div className="cc-job-metric-tile">
          <div className="cc-job-metric-icon tone-deadline">
            <CalendarDays size={22} />
          </div>
          <div className="cc-job-metric-data">
            <div className="cc-job-metric-label">Application Deadline</div>
            <div className="cc-job-metric-val">
              {job.deadline ? dateText(job.deadline) : 'Rolling Admissions'}
              {daysLeft !== null && daysLeft > 0 && !isClosed && (
                <span className="badge bg-warning-subtle text-warning border ms-1.5 rounded-pill px-2" style={{ fontSize: '0.68rem' }}>
                  {daysLeft}d left
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isClosed && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 rounded-3">
          <ShieldAlert size={18} />
          <span><strong>This position is closed.</strong> Applications are no longer being accepted for this role.</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="cc-job-tabs mb-4">
        <div className="d-flex align-items-center gap-2 border-bottom pb-2 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3.5 py-2 fw-semibold ${activeTab === 'overview' ? 'btn-primary shadow-sm' : 'btn-light text-secondary'}`}
            onClick={() => setActiveTab('overview')}
          >
            <Briefcase size={15} />
            <span>Job Overview</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3.5 py-2 fw-semibold ${activeTab === 'assessment' ? 'btn-primary shadow-sm' : 'btn-light text-secondary'}`}
            onClick={() => setActiveTab('assessment')}
          >
            {hasApplied ? <ClipboardCheck size={15} /> : <Lock size={14} />}
            <span>Online Assessment</span>
            {assessment && (
              <span
                className={`badge rounded-pill ms-1 ${
                  !hasApplied
                    ? 'bg-secondary-subtle text-secondary border'
                    : assessment.attempt?.status === 'submitted'
                    ? assessment.attempt.result === 'Passed'
                      ? 'bg-success text-white'
                      : 'bg-danger text-white'
                    : assessment.attempt?.status === 'active'
                    ? 'bg-warning text-dark'
                    : 'bg-primary text-white'
                }`}
                style={{ fontSize: '0.68rem' }}
              >
                {!hasApplied
                  ? 'Locked'
                  : assessment.attempt?.status === 'submitted'
                  ? assessment.attempt.result === 'Passed'
                    ? 'Passed'
                    : 'Completed'
                  : assessment.attempt?.status === 'active'
                  ? 'In Progress'
                  : 'Available'}
              </span>
            )}
            {!assessment && hasApplied && (
              <span className="badge rounded-pill ms-1 bg-light text-muted border" style={{ fontSize: '0.68rem' }}>
                Not Required
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'assessment' ? (
        <div className="cc-assessment-tab-content">
          {!hasApplied ? (
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden p-4 p-md-5 text-center bg-white mb-4">
              <div
                className="mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 68, height: 68, background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}
              >
                <Lock size={30} />
              </div>
              <h3 className="h5 fw-bold text-dark mb-2">Online Assessment Locked</h3>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: 560, fontSize: '0.94rem', lineHeight: 1.6 }}>
                This screening evaluation is administered by <strong>{company.companyName || 'the hiring organization'}</strong>. To access the examination syllabus, questions overview, and secure testing environment, you must first submit your application for this position.
              </p>

              {assessment && (
                <div className="card border bg-light-subtle rounded-3 p-3 mx-auto mb-4 text-start shadow-xs" style={{ maxWidth: 500 }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-warning" />
                    <strong className="text-dark small">Upcoming Screening Test</strong>
                  </div>
                  <div className="fw-semibold text-secondary mb-2.5">{assessment.title}</div>
                  <div className="d-flex align-items-center gap-3 text-muted small flex-wrap" style={{ fontSize: '0.8rem' }}>
                    <span className="d-inline-flex align-items-center gap-1"><Clock size={13} /> {assessment.durationMinutes} Minutes</span>
                    <span className="d-inline-flex align-items-center gap-1"><HelpCircle size={13} /> {assessment.numQuestions || assessment.questionCount} Questions</span>
                    <span className="d-inline-flex align-items-center gap-1"><Target size={13} /> Pass Mark {assessment.passingPercentage}%</span>
                    <span className="d-inline-flex align-items-center gap-1"><Zap size={13} /> {assessment.difficulty || 'Medium'}</span>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-center gap-2.5 flex-wrap">
                {user?.role === 'student' ? (
                  !isProfileComplete ? (
                    <Link
                      to="/student/profile"
                      className="btn btn-warning rounded-pill px-4 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center gap-2 text-dark"
                    >
                      <AlertTriangle size={16} /> Complete 100% Profile to Apply & Unlock Test ({studentProfileCompletion}% complete)
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary rounded-pill px-4 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                      onClick={apply}
                      disabled={busy || isClosed}
                    >
                      {busy ? 'Submitting Application...' : 'Apply for this Job to Unlock Assessment'}
                      <ArrowRight size={16} />
                    </button>
                  )
                ) : !user ? (
                  <Link to="/login" className="btn btn-primary rounded-pill px-4 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center gap-1.5">
                    <LogIn size={15} /> <span>Login as Student to Apply</span>
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4 py-2.5"
                  onClick={() => setActiveTab('overview')}
                >
                  View Job Overview
                </button>
              </div>
            </div>
          ) : assessment ? (
            <div className="cc-assessment-active-view">
              {/* Assessment Hero Card */}
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div
                  className="card-body p-4 p-md-5"
                  style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(14, 165, 233, 0.05) 100%)' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <span
                      className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fw-bold d-inline-flex align-items-center gap-1.5"
                      style={{ fontSize: '0.78rem' }}
                    >
                      <ShieldCheck size={14} /> Official Recruiter Assessment · Unlocked
                    </span>
                    <span className="badge bg-light text-secondary border rounded-pill px-2.5 py-1 small">
                      {assessment.categories || 'Technical'} · {assessment.difficulty || 'Medium'}
                    </span>
                  </div>

                  <h2 className="h4 fw-bold text-dark mb-2">{assessment.title}</h2>
                  <p className="text-secondary mb-4" style={{ maxWidth: 720, fontSize: '0.94rem', lineHeight: 1.6 }}>
                    {assessment.description || `Official candidate screening evaluation for the ${job.title} position at ${company.companyName || 'the hiring partner'}. Complete this round to progress into technical and behavioral interview stages.`}
                  </p>

                  {/* 4 Metric Tiles */}
                  <div className="row g-3 mb-4">
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-white rounded-3 border text-center shadow-xs">
                        <div className="text-muted small mb-1 d-inline-flex align-items-center gap-1">
                          <Clock size={14} className="text-warning" /> Duration
                        </div>
                        <div className="fs-5 fw-bold text-dark">{assessment.durationMinutes} Mins</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-white rounded-3 border text-center shadow-xs">
                        <div className="text-muted small mb-1 d-inline-flex align-items-center gap-1">
                          <HelpCircle size={14} className="text-info" /> Questions
                        </div>
                        <div className="fs-5 fw-bold text-dark">{assessment.numQuestions || assessment.questionCount} MCQs</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-white rounded-3 border text-center shadow-xs">
                        <div className="text-muted small mb-1 d-inline-flex align-items-center gap-1">
                          <Target size={14} className="text-danger" /> Pass Mark
                        </div>
                        <div className="fs-5 fw-bold text-dark">{assessment.passingPercentage}%</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-3 bg-white rounded-3 border text-center shadow-xs">
                        <div className="text-muted small mb-1 d-inline-flex align-items-center gap-1">
                          <Award size={14} className="text-success" /> Total Marks
                        </div>
                        <div className="fs-5 fw-bold text-dark">{assessment.totalMarks} Pts</div>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Status & Launch Action */}
                  <div className="p-3.5 p-md-4 bg-white rounded-3 border shadow-xs d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="small text-muted fw-semibold">Your Attempt Status:</span>
                        {assessment.attempt?.status === 'submitted' ? (
                          <span className={`badge rounded-pill fw-bold ${assessment.attempt.result === 'Passed' ? 'bg-success' : 'bg-danger'}`}>
                            {assessment.attempt.result === 'Passed' ? 'Passed & Cleared' : 'Needs Review / Failed'} ({assessment.attempt.percentage}%)
                          </span>
                        ) : assessment.attempt?.status === 'active' ? (
                          <span className="badge bg-warning text-dark rounded-pill fw-bold">Active Session In Progress</span>
                        ) : (
                          <span className="badge bg-success-subtle text-success border rounded-pill fw-bold">Ready to Start</span>
                        )}
                      </div>
                      <p className="small text-muted mb-0">
                        {assessment.attempt?.status === 'submitted'
                          ? `Submitted on ${dateText(assessment.attempt.submittedAt)}. Scored ${assessment.attempt.score} out of ${assessment.totalMarks} total points.`
                          : assessment.attempt?.status === 'active'
                          ? 'Your assessment timer is running. Click resume to complete and submit before time expires.'
                          : 'You are eligible to take this assessment. Launch the secure exam tab when ready.'}
                      </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      {assessment.attempt?.status === 'submitted' ? (
                        <Link
                          to={`/student/attempt/${assessment.attempt._id}`}
                          className="btn btn-outline-primary rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2"
                        >
                          <Eye size={16} />
                          <span>View Full Exam Report</span>
                        </Link>
                      ) : assessment.attempt?.status === 'active' ? (
                        <Link
                          to={`/student/assessments/${assessment._id}`}
                          className="btn btn-warning rounded-pill px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                        >
                          <Play size={16} />
                          <span>Resume Assessment</span>
                        </Link>
                      ) : (
                        <Link
                          to={`/student/assessments/${assessment._id}`}
                          className="btn btn-primary rounded-pill px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                        >
                          <Play size={16} />
                          <span>Start Assessment Now</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proctoring & Examination Rules */}
              <SectionCard title="Examination Proctoring Guidelines & Security Policy" icon={<ShieldCheck size={16} />}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 h-100">
                      <strong className="d-flex align-items-center gap-2 text-dark small mb-1">
                        <CheckCircle2 size={16} className="text-success" /> Fullscreen Mode Enforced
                      </strong>
                      <p className="text-muted small mb-0">
                        Exam launches in an isolated full-screen viewport. Exiting or resizing triggers integrity warnings.
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 h-100">
                      <strong className="d-flex align-items-center gap-2 text-dark small mb-1">
                        <CheckCircle2 size={16} className="text-success" /> Tab Switch & Blur Monitoring
                      </strong>
                      <p className="text-muted small mb-0">
                        Switching tabs or loss of window focus is recorded in realtime telemetry. Repeated violations flag the attempt.
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 h-100">
                      <strong className="d-flex align-items-center gap-2 text-dark small mb-1">
                        <CheckCircle2 size={16} className="text-success" /> Real-time Answer Synchronization
                      </strong>
                      <p className="text-muted small mb-0">
                        Selected responses are auto-saved per question. If the session expires, submitted answers are graded instantly.
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 h-100">
                      <strong className="d-flex align-items-center gap-2 text-dark small mb-1">
                        <CheckCircle2 size={16} className="text-success" /> Transparent Recruiter Reporting
                      </strong>
                      <p className="text-muted small mb-0">
                        Scores and proctoring metrics are transmitted directly to {company.companyName || 'the recruiting team'}.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white mb-4">
              <div
                className="mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 64, height: 64, background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}
              >
                <Sparkles size={30} />
              </div>
              <h3 className="h5 fw-bold text-dark mb-2">No Written Assessment Required</h3>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: 540, fontSize: '0.94rem', lineHeight: 1.6 }}>
                <strong>{company.companyName || 'The hiring organization'}</strong> has not scheduled an online test for the <strong>{job.title}</strong> role. Applications are evaluated directly based on academic scores, skills, and personal interviews.
              </p>
              <div className="d-flex justify-content-center gap-2.5 flex-wrap">
                <Link
                  to={application?._id ? `/student/applications/${application._id}` : '/student/applications'}
                  className="btn btn-primary rounded-pill px-4 py-2 fw-semibold"
                >
                  Track in My Applications
                </Link>
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4 py-2" onClick={() => setActiveTab('overview')}>
                  Back to Overview
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* 2-Column Responsive Layout */}
      <div className="row g-4">
        {/* Left Column (8 cols): Job Description, Skills, Company */}
        <div className="col-12 col-lg-8">
          <SectionCard title="Role Overview & Job Description" icon={<FileText size={16} />} className="mb-4">
            <p className="mb-4 text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.94rem' }}>
              {job.description || 'No detailed description provided by the recruiter.'}
            </p>

            <DetailGrid columns={2} items={[
              job.qualification ? { label: 'Academic Qualification', value: job.qualification } : null,
              job.experience ? { label: 'Experience Level', value: job.experience } : null,
              job.vacancies != null ? { label: 'Open Vacancies', value: `${job.vacancies} Position${job.vacancies > 1 ? 's' : ''}` } : null,
              job.jobType ? { label: 'Employment Nature', value: job.jobType } : null,
              job.workMode ? { label: 'Working Arrangement', value: job.workMode } : null,
              job.deadline ? { label: 'Registration Cutoff', value: dateText(job.deadline, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) } : null,
            ]} />
          </SectionCard>

          {/* Required Skills & Technologies */}
          {!!skills?.length && (
            <SectionCard title="Required Skills & Competencies" icon={<Zap size={16} />} className="mb-4">
              <p className="small text-muted mb-3">
                Candidates proficient in these tools and languages are prioritized during recruiter resume screening:
              </p>
              <div className="cc-job-skills-wrap">
                {skills.map((s) => s.skill?.skillName).filter(Boolean).map((skillName) => (
                  <span key={skillName} className="cc-job-skill-badge">
                    <Sparkles size={12} className="text-warning" />
                    <span>{skillName}</span>
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Hiring Recruiter Organization Profile */}
          <SectionCard title="About the Hiring Organization" icon={<Building2 size={16} />} className="mb-4">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="cc-detail-avatar" style={{ width: 52, height: 52, borderRadius: 12, fontSize: '1.2rem' }}>
                {logo ? <img src={logo} alt={company.companyName} /> : initials}
              </div>
              <div className="min-w-0 flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                  <h4 className="h6 fw-bold mb-0 text-dark">{company.companyName || 'Corporate Recruiter'}</h4>
                  {company.verificationStatus === 'verified' && (
                    <ShieldCheck size={16} className="text-primary" title="Verified Employer" />
                  )}
                </div>
                <span className="small text-muted">{company.industry || 'Technology & Solutions'}</span>
              </div>
            </div>

            {company.description && (
              <p className="small text-secondary mb-3" style={{ lineHeight: 1.6 }}>
                {company.description}
              </p>
            )}

            <div className="row g-2 pt-2 border-top">
              {company.city && (
                <div className="col-12 col-md-6">
                  <div className="cc-company-meta-item">
                    <MapPin size={14} />
                    <span>Location: <strong>{company.city}</strong></span>
                  </div>
                </div>
              )}
              {company.website && (
                <div className="col-12 col-md-6">
                  <div className="cc-company-meta-item">
                    <Globe size={14} />
                    <a href={company.website} target="_blank" rel="noreferrer" className="text-primary text-decoration-none text-truncate d-inline-flex align-items-center gap-1">
                      <span>{company.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right Sticky Sidebar (4 cols): Eligibility & Apply Action */}
        <div className="col-12 col-lg-4">
          <div className="cc-sidebar-card sticky-top" style={{ top: '80px' }}>
            {/* Student Eligibility Review */}
            {elig.data && !isClosed && (
              <div className="mb-3 pb-3 border-bottom">
                <h2 className="h6 fw-bold text-dark mb-2 d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-1.5">
                    <ShieldCheck size={16} className={elig.data.eligible ? 'text-success' : 'text-warning'} />
                    <span>Prerequisite Criteria</span>
                  </span>
                  {elig.data.eligible ? (
                    <span className="badge bg-success-subtle text-success border rounded-pill px-2 py-0.5" style={{ fontSize: '0.7rem' }}>
                      Qualified
                    </span>
                  ) : (
                    <span className="badge bg-warning-subtle text-warning border rounded-pill px-2 py-0.5" style={{ fontSize: '0.7rem' }}>
                      Action Required
                    </span>
                  )}
                </h2>

                {elig.data.eligible ? (
                  <div className="alert alert-success py-2.5 px-3 small mb-0 rounded-3 d-flex align-items-center gap-2">
                    <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    <span>You meet all academic & profile prerequisites for this opening.</span>
                  </div>
                ) : (
                  <div className="alert alert-warning py-2.5 px-3 small mb-0 rounded-3">
                    <div className="fw-bold mb-1 d-flex align-items-center gap-1 text-dark">
                      <ShieldAlert size={14} className="text-warning flex-shrink-0" />
                      <span>Review ineligibility reasons:</span>
                    </div>
                    <ul className="mb-0 ps-3">
                      {reasons.map((r, i) => (
                        <li key={i}>{typeof r === 'string' ? r : `${r.label}: ${r.detail}`}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Application State Box */}
            {hasApplied ? (
              <div className="cc-applied-status-card p-3 rounded-3 border bg-light-subtle">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="cc-applied-beacon" />
                  <strong className="text-success d-flex align-items-center gap-1.5 fs-6">
                    <CheckCircle2 size={18} /> Application Active
                  </strong>
                </div>
                <p className="small text-muted mb-2.5">
                  You submitted your application for this opening{application?.createdAt || application?.appliedAt ? ` on ${dateText(application.createdAt || application.appliedAt)}` : ''}. Your profile is in the recruiter shortlist pipeline.
                </p>

                <div className="d-flex align-items-center justify-content-between p-2.5 rounded-2 bg-white border small mb-3">
                  <span className="text-muted fw-semibold">Current Stage:</span>
                  <StatusBadge value={application?.status || 'Applied'} />
                </div>

                <div className="d-grid gap-2">
                  <Link
                    to={application?._id ? `/student/applications/${application._id}` : '/student/applications'}
                    className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-bold rounded-pill shadow-sm"
                  >
                    <span>Track in My Applications</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ) : !isClosed ? (
              <div>
                {user?.role === 'student' ? (
                  !isProfileComplete ? (
                    <div className="card cc-profile-incomplete-card border-0 rounded-4 overflow-hidden shadow-sm mb-2" style={{ background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)', border: '1.5px solid #fde68a' }}>
                      <div className="cc-profile-incomplete-header">
                        <div className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: '#fef3c7', color: '#d97706' }}>
                          <AlertTriangle size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="cc-profile-incomplete-title">Profile Incomplete ({studentProfileCompletion}%)</h4>
                          <span className="cc-profile-incomplete-subtitle">100% profile details required to apply</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.75rem' }}>
                          <span className="text-muted fw-semibold">Profile Strength</span>
                          <strong className="text-warning fw-bold">{studentProfileCompletion}% / 100%</strong>
                        </div>
                        <div className="progress" style={{ height: 8, borderRadius: 99, background: '#f1f5f9' }}>
                          <div
                            className="progress-bar bg-warning progress-bar-striped progress-bar-animated"
                            role="progressbar"
                            style={{ width: `${Math.max(5, studentProfileCompletion)}%` }}
                            aria-valuenow={studentProfileCompletion}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                      </div>

                      <p className="cc-profile-incomplete-copy">
                        Recruiters and TPOs require complete academic and personal details. Your profile must be <strong>100% complete</strong> before you can apply.
                      </p>

                      <div className="cc-profile-incomplete-actions">
                        <Link
                          to="/student/profile"
                          className="btn btn-warning rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm text-dark cc-profile-incomplete-cta"
                        >
                          <User size={15} />
                          <span className="cc-profile-incomplete-cta-label">
                            <span className="cc-profile-incomplete-cta-desktop">Complete My Profile ({100 - studentProfileCompletion}% remaining)</span>
                            <span className="cc-profile-incomplete-cta-mobile">Complete Profile · {100 - studentProfileCompletion}% left</span>
                          </span>
                          <ArrowRight className="cc-profile-incomplete-cta-arrow" size={15} />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-light border text-muted rounded-pill small fw-semibold d-flex align-items-center justify-content-center gap-2 cc-profile-locked-cta"
                          disabled
                          style={{ cursor: 'not-allowed', opacity: 0.65 }}
                        >
                          <Lock size={13} />
                          <span className="cc-profile-locked-label">Apply Locked (100% Profile Required)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-grid gap-2">
                      <button
                        type="button"
                        className="cc-apply-cta-btn"
                        disabled={busy}
                        onClick={apply}
                      >
                        {busy ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <span>Apply for this Position</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                      <p className="small text-muted text-center mb-0 mt-2" style={{ fontSize: '0.78rem' }}>
                        Your verified student profile, CGPA credentials, and resume will be submitted to {company.companyName || 'the recruiter'}.
                      </p>
                    </div>
                  )
                ) : !user ? (
                  <div className="cc-guest-wrap text-center">
                    <div className="cc-guest-icon-badge">
                      <GraduationCap size={22} />
                    </div>
                    <b className="cc-guest-title">Interested in this role?</b>
                    <p className="cc-guest-text">
                      Sign in as a verified student to apply with 1-click and track your status.
                    </p>
                    <div className="d-grid gap-2 w-100">
                      <Link className="btn btn-primary rounded-pill fw-bold d-inline-flex align-items-center justify-content-center gap-1.5" to="/login">
                        <LogIn size={15} /> <span>Login to Apply</span>
                      </Link>
                      <Link className="btn btn-outline-primary rounded-pill fw-semibold d-inline-flex align-items-center justify-content-center" to="/register">
                        <span>Create Student Account</span>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Roadmap / Quick Steps Checklist */}
            <div className="mt-4 pt-3 border-top">
              <span className="fw-bold text-dark small d-block mb-2">Recruitment Roadmap</span>
              <div className="d-flex flex-column gap-2 small text-muted">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-circle bg-primary-subtle text-primary border" style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', fontSize: '0.68rem' }}>1</span>
                  <span>1-Click Application Submission</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-circle bg-light text-secondary border" style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', fontSize: '0.68rem' }}>2</span>
                  <span>Recruiter Resume & Academic Shortlisting</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-circle bg-light text-secondary border" style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', fontSize: '0.68rem' }}>3</span>
                  <span>Online Assessment & Technical Interview</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-circle bg-light text-secondary border" style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', fontSize: '0.68rem' }}>4</span>
                  <span>Final Campus Placement Offer Letter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );

  if (canApply) return content;

  return (
    <div className="cc-public-page">
      <a href="#main-content" className="cc-skip-link">Skip to main content</a>
      <PublicHeader />
      <main id="main-content" className="cc-public-main">{content}</main>
      <PublicFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function OfferLetterPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const letterRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const res = useFetch(async () => (await api.get(`/offers/${id}`)).data.data, [id]);
  if (res.loading) return <div className="container py-4"><Loading rows={3} height={90} /></div>;
  if (res.error) return <div className="container py-4"><ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} /></div>;
  const o = res.data;
  if (!o) return <div className="container py-4"><Empty title="Offer letter not found" /></div>;

  const c = o.company || {};
  const student = o.student || {};
  const ref = `CC-OFFER-${String(o._id).slice(-8).toUpperCase()}`;
  const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
  const logoSrc = c.logo ? fileUrl(c.logo) : null;

  const details = [
    ['Official Designation', o.position, <Briefcase size={15} />],
    ['Department / Division', o.department, <Building2 size={15} />],
    ['Work Location', o.location, <MapPin size={15} />],
    ['Annual Compensation (CTC)', o.salary, <IndianRupee size={15} />],
    ['Employment Classification', o.employmentType, <Clock size={15} />],
    ['Work Mode Arrangement', o.workMode, <Globe size={15} />],
    ['Reporting Joining Date', fmt(o.joiningDate), <Calendar size={15} />],
    ['Offer Validity Deadline', fmt(o.offerExpiry), <AlertCircle size={15} />],
    ['Reporting Authority', o.representativeName ? `${o.representativeName}${o.representativeDesignation ? ` (${o.representativeDesignation})` : ''}` : null, <Users size={15} />],
  ].filter(([, v]) => v && v !== '—');

  const downloadPdf = async () => {
    if (pdfBusy || !letterRef.current) return;
    setPdfBusy(true);
    try {
      await new Promise((resolve) => {
        if (document.fonts?.ready) document.fonts.ready.then(resolve); else resolve();
      });
      const images = letterRef.current.querySelectorAll('img');
      await Promise.all(Array.from(images).map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }))));
      const safeName = String(student.name || 'Candidate').replace(/[\/:*?"<>|]/g, '').trim() || 'Candidate';
      const filename = `CampusNexus_Official_Offer_${safeName}_${ref}.pdf`;
      await html2pdf().set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(letterRef.current).save();
      toast.success('Official offer letter PDF downloaded!');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not generate PDF. Please try again.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const copyRef = () => {
    navigator.clipboard?.writeText(ref);
    toast.success(`Reference ${ref} copied to clipboard!`);
  };

  const respondOffer = async (decision) => {
    const ok = await confirmAction({
      title: decision === 'accepted' ? 'Accept Employment Offer?' : 'Decline Employment Offer?',
      text: decision === 'accepted'
        ? `You are confirming formal acceptance of this placement offer with ${c.companyName || 'the employer'}.`
        : `Are you sure you want to decline this offer? This decision is recorded in campus placement records.`,
      icon: decision === 'accepted' ? 'success' : 'warning',
      confirmButtonText: decision === 'accepted' ? 'Yes, Accept Offer' : 'Decline Offer',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await api.patch(`/offers/${id}/status`, { status: decision });
      toast.success(`Offer ${decision} successfully.`);
      res.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const statusTone = (s) => {
    const st = String(s || '').toLowerCase();
    if (st === 'accepted') return 'bg-success text-white';
    if (st === 'issued' || st === 'pending') return 'bg-primary text-white';
    if (st === 'rejected' || st === 'declined') return 'bg-danger text-white';
    return 'bg-secondary text-white';
  };

  const backLink = user?.role ? `/${user.role}/offers` : -1;

  return (
    <div className="container py-4" style={{ maxWidth: 940 }}>
      {/* Top Action Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4 cc-no-print">
        <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow-sm" onClick={() => typeof backLink === 'string' ? navigate(backLink) : navigate(-1)}>
          <ArrowLeft size={15} /> Back to Offers
        </button>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button type="button" className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-inline-flex align-items-center gap-1.5 shadow-sm" onClick={copyRef}>
            <Copy size={14} /> Ref: {ref}
          </button>
          <button className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1.5 shadow-sm" onClick={() => window.print()}>
            <Printer size={15} /> Print Document
          </button>
          <button className="btn btn-sm btn-primary rounded-pill px-3.5 d-inline-flex align-items-center gap-1.5 shadow-sm" onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? <span className="spinner-border spinner-border-sm me-1" /> : <Download size={15} />} Download PDF
          </button>
        </div>
      </div>

      {/* Main Official Offer Sheet */}
      <div className="cc-offer-sheet shadow-lg" ref={letterRef}>
        <div className="cc-offer-watermark">CONFIDENTIAL &amp; OFFICIAL</div>

        <div className="cc-offer-content">
          {/* Institutional Top Header */}
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 pb-4 border-bottom mb-4">
            <div className="d-flex align-items-center gap-3">
              {logoSrc ? (
                <img src={logoSrc} alt={`${c.companyName} logo`} style={{ width: 56, height: 56, objectFit: 'contain' }} className="rounded-3 border p-1" />
              ) : (
                <div className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 56, height: 56, fontSize: 22 }}>
                  {(c.companyName || 'C').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="h5 fw-bold mb-0 text-dark">{c.companyName || 'Employer Corporation'}</h3>
                {c.address && <div className="small text-muted">{c.address}</div>}
                <div className="small text-muted d-flex align-items-center gap-2 flex-wrap">
                  {c.city && <span>{c.city}</span>}
                  {c.phone && <span>· Tel: {c.phone}</span>}
                  {c.website && <span>· <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-decoration-none">{c.website}</a></span>}
                </div>
              </div>
            </div>

            <div className="text-md-end">
              <span className={`badge rounded-pill px-3 py-1.5 text-uppercase fw-bold shadow-sm ${statusTone(o.status)}`}>
                {o.status || 'OFFER ISSUED'}
              </span>
              <div className="small text-muted mt-1.5 font-monospace">Ref: <b>{ref}</b></div>
              <div className="small text-muted">Issue Date: {fmt(o.issueDate || o.createdAt)}</div>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-4">
            <span className="badge bg-light text-primary border px-3 py-1 text-uppercase fw-bold mb-2" style={{ letterSpacing: '1px' }}>
              Official Campus Recruitment Appointment
            </span>
            <h1 className="h3 fw-bold text-dark text-uppercase tracking-wide mb-1">Letter of Employment Offer</h1>
            <p className="text-muted small">Issued under the auspices of the University Placement &amp; Training Directorate</p>
          </div>

          {/* Recipient Addressee */}
          <div className="bg-light p-3.5 rounded-3 border mb-4">
            <div className="small text-uppercase fw-bold text-secondary mb-1">Offer Recipient:</div>
            <div className="fw-bold text-dark h5 mb-0.5">{student.name || 'Candidate Name'}</div>
            <div className="small text-muted d-flex gap-3 flex-wrap">
              {student.email && <span>Email: <b>{student.email}</b></span>}
              {student.phone && <span>Contact: <b>{student.phone}</b></span>}
              <span>Institution: <b>CampusNexus Partner University</b></span>
            </div>
          </div>

          {/* Salutation & Body */}
          <p className="fw-semibold text-dark">Dear {student.name || 'Candidate'},</p>
          <p className="text-secondary" style={{ lineHeight: '1.7' }}>
            On behalf of <strong>{c.companyName || 'our organization'}</strong>, we are thrilled to extend this formal offer of employment for the position of <strong>{o.position}</strong>. Following your commendable performance in our campus recruitment selection rounds, we are confident that your technical competencies and personal attributes will contribute significantly to our ongoing innovations.
          </p>

          {/* Compensation & Details Table */}
          <table className="cc-offer-table-v2">
            <tbody>
              {details.map(([label, val, icon]) => (
                <tr key={label}>
                  <td className="label-col">
                    <span className="d-inline-flex align-items-center gap-2">
                      <span className="text-primary">{icon}</span> {label}
                    </span>
                  </td>
                  <td className="val-col">
                    <b>{val}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Terms & Conditions */}
          {o.terms && (
            <div className="mb-4">
              <h5 className="h6 fw-bold text-dark text-uppercase tracking-wider mb-2">Terms &amp; Employment Conditions</h5>
              <div className="p-3 bg-light rounded-3 border small text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.65' }}>
                {o.terms}
              </div>
            </div>
          )}

          {o.remarks && (
            <div className="mb-4">
              <h5 className="h6 fw-bold text-dark text-uppercase tracking-wider mb-2">Special Instructions &amp; Remarks</h5>
              <div className="p-3 bg-light rounded-3 border small text-secondary">
                {o.remarks}
              </div>
            </div>
          )}

          <p className="text-secondary small mt-4" style={{ lineHeight: '1.7' }}>
            Please signify your acceptance of this appointment by reviewing and endorsing this offer through your authenticated CampusNexus student portal on or before <strong>{fmt(o.offerExpiry)}</strong>.
          </p>

          {/* Signatory Blocks */}
          <div className="row g-4 pt-4 mt-2 border-top align-items-end">
            <div className="col-sm-6">
              <div className="small text-muted mb-1">For and on behalf of:</div>
              <div className="fw-bold text-dark h6 mb-3">{c.companyName || 'Authorized Employer'}</div>
              <div className="p-2 border rounded-2 d-inline-block bg-light small mb-2 text-primary fw-semibold font-monospace" style={{ fontSize: '11px' }}>
                ✓ DIGITALLY VERIFIED SIGNATURE
              </div>
              <div className="fw-bold small text-dark">{o.representativeName || 'HR Director / Talent Acquisition'}</div>
              <div className="small text-muted">{o.representativeDesignation || 'Authorized Corporate Signatory'}</div>
            </div>

            <div className="col-sm-6 text-sm-end">
              <div className="small text-muted mb-1">Verified &amp; Endorsed by:</div>
              <div className="fw-bold text-dark h6 mb-3">University Placement Directorate</div>
              <div className="d-inline-flex align-items-center gap-1.5 p-2 border rounded-2 bg-success-subtle text-success small mb-2 fw-semibold">
                <ShieldCheck size={14} /> CampusNexus Institutional Seal
              </div>
              <div className="small text-muted">Office of Career Services &amp; Corporate Relations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Action Controls */}
      {user?.role === 'student' && (o.status === 'issued' || o.status === 'pending') && (
        <div className="p-4 bg-white border rounded-3 shadow-sm mt-4 text-center cc-no-print">
          <h5 className="fw-bold mb-1">Ready to confirm your career decision?</h5>
          <p className="text-muted small mb-3">Accepting this offer will notify the employer and placement coordinators.</p>
          <div className="d-flex justify-content-center gap-3">
            <button className="btn btn-outline-danger rounded-pill px-4" onClick={() => respondOffer('declined')} disabled={busy}>
              Decline Offer
            </button>
            <button className="btn btn-success rounded-pill px-4 shadow-sm" onClick={() => respondOffer('accepted')} disabled={busy}>
              {busy ? <span className="spinner-border spinner-border-sm me-1" /> : <CheckCircle2 size={16} className="me-1" />} Accept Placement Offer
            </button>
          </div>
        </div>
      )}

      {o.status === 'draft' && (
        <div className="alert alert-warning py-2.5 small cc-no-print mt-3 text-center fw-semibold rounded-pill">
          ⚠️ This offer is in draft state. It has not yet been dispatched to the student candidate.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Notifications() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const params = { limit: 20, page };
  if (tab === 'unread') params.unread = 1; else if (tab !== 'all') params.type = tab;
  if (q) params.q = q;
  const res = useFetch(async () => (await api.get('/notifications', { params })).data, [tab, q, page]);
  const types = res.data?.types || [];
  const unread = res.data?.unread || 0;
  const rows = res.data?.data || [];
  const total = res.data?.pagination?.total || rows.length;
  const typeIcon = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('job')) return <Briefcase size={18} />;
    if (t.includes('assessment')) return <FileText size={18} />;
    if (t.includes('offer')) return <Award size={18} />;
    if (t.includes('drive') || t.includes('interview')) return <CalendarDays size={18} />;
    return <Bell size={18} />;
  };
  const typeTone = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('job')) return 'primary';
    if (t.includes('assessment')) return 'violet';
    if (t.includes('offer')) return 'success';
    if (t.includes('drive') || t.includes('interview')) return 'info';
    return 'slate';
  };
  const mark = async (n) => {
    if (n.isRead || busyId) return;
    setBusyId(n._id);
    try { await api.patch(`/notifications/${n._id}/read`); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusyId(null); }
  };
  const markAll = async () => {
    if (!unread || busyId) return;
    setBusyId('all');
    try { await api.patch('/notifications/read-all'); res.reload(); toast.success('All notifications marked as read.'); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusyId(null); }
  };
  const del = async (n) => {
    const ok = await confirmDanger({ title: 'Delete notification?', confirmButtonText: 'Delete' });
    if (!ok) return;
    setBusyId(n._id);
    try { await api.delete(`/notifications/${n._id}`); res.reload(); toast.success('Notification deleted.'); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusyId(null); }
  };
  const set = (t) => { setTab(t); setPage(1); };
  const summaryCards = [
    { label: 'Total', value: total, tone: 'primary', icon: <Bell size={20} /> },
    { label: 'Unread', value: unread, tone: 'amber', icon: <Clock size={20} /> },
    ...types.filter((t) => t._id).slice(0, 2).map((t) => ({ label: String(t._id), value: t.n, tone: typeTone(t._id), icon: typeIcon(t._id) })),
  ];

  return (
    <div className="cc-page-shell">
      <PageHeader
        eyebrow="Communications"
        title="Notifications"
        description="Stay up to date with applications, drives, assessments and offers."
        icon={<Bell size={26} />}
        meta={unread ? <span className="cc-badge amber no-dot">{unread} unread</span> : <span className="cc-badge green no-dot">All read</span>}
        actions={
          <button className="btn btn-sm btn-primary" disabled={!unread || busyId === 'all'} onClick={markAll}>
            {busyId === 'all' ? <Spinner /> : null} Mark all as read
          </button>
        }
      />

      <KpiGrid>
        {summaryCards.map((card) => (
          <KpiCard key={card.label} tone={card.tone} icon={card.icon} value={card.value} label={card.label} />
        ))}
      </KpiGrid>

      <Toolbar showClear={!!(q || tab !== 'all')} onClear={() => { setQ(''); set('all'); }} label="Notification filters">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search title or message…" label="Search notifications" />
        <div className="cc-filter-chips" role="tablist" aria-label="Notification filters">
          <button type="button" className={`cc-filter-chip${tab === 'all' ? ' is-active' : ''}`} onClick={() => set('all')}>All ({total})</button>
          <button type="button" className={`cc-filter-chip${tab === 'unread' ? ' is-active' : ''}`} onClick={() => set('unread')}>Unread ({unread})</button>
          {types.filter((t) => t._id).map((t) => (
            <button type="button" key={t._id} className={`cc-filter-chip${tab === t._id ? ' is-active' : ''}`} onClick={() => set(t._id)}>
              {String(t._id)} ({t.n})
            </button>
          ))}
        </div>
      </Toolbar>

      {res.loading ? <Loading rows={4} height={86} /> : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !rows.length ? (
        <Empty
          title={q || tab !== 'all' ? 'No matching notifications' : 'You are all caught up'}
          hint={q || tab !== 'all' ? 'Try a different search or filter.' : 'New updates will appear here.'}
          icon={<Bell size={28} />}
        />
      ) : (
        <>
          <div className="cc-notify-list">
            {rows.map((n, i) => (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`cc-notify-card${n.isRead ? '' : ' is-unread'}`}
              >
                <div className={`cc-notify-icon cc-tone-${typeTone(n.type)}`}>{typeIcon(n.type)}</div>
                <div className="cc-notify-body">
                  <div className="d-flex justify-content-between gap-2 flex-wrap align-items-start">
                    <div>
                      <div className="cc-notify-title">{n.title}</div>
                      <div className="cc-notify-message">{n.message}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <StatusBadge value={n.priority} />
                      {!n.isRead && <span className="cc-badge violet no-dot">Unread</span>}
                    </div>
                  </div>
                  <div className="cc-notify-meta">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {n.type && n.type !== 'general' && <span>· {n.type}</span>}
                  </div>
                  <div className="cc-notify-actions">
                    {n.actionUrl && <Link className="btn btn-sm btn-outline-primary" to={n.actionUrl}>Open</Link>}
                    {!n.isRead && (
                      <button className="btn btn-sm btn-outline-secondary" disabled={busyId === n._id} onClick={() => mark(n)}>
                        {busyId === n._id ? <Spinner /> : 'Mark read'}
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline-danger" disabled={busyId === n._id} onClick={() => del(n)}>Delete</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <Pager page={res.data?.pagination?.page || 1} pages={res.data?.pagination?.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export function Settings() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [f, setF] = useState({ currentPassword: '', password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const strength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Za-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!f.currentPassword) {
      setErr('Current password is required.');
      return;
    }
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) {
      setErr('New password must be at least 8 characters and include letters and numbers.');
      return;
    }
    if (f.password !== f.confirm) {
      setErr('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.patch('/auth/change-password', { currentPassword: f.currentPassword, password: f.password });
      setMsg('Password updated successfully! Your account credentials have been secured.');
      toast.success('Password updated successfully.');
      setF({ currentPassword: '', password: '', confirm: '' });
    } catch (e2) {
      setErr(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const score = strength(f.password);
  const initial = String(user?.name || 'A')[0]?.toUpperCase() || 'A';

  return (
    <div className="cc-page cc-settings-page">
      {/* Settings Header */}
      <PageHeader
        eyebrow="Account & Security"
        title="Settings & Preferences"
        description="Manage your login credentials, theme appearance, and platform security."
        icon={<Lock size={26} />}
        meta={user ? <span className="badge bg-primary text-white rounded-pill px-3 py-1 fw-bold text-uppercase">{user.role}</span> : null}
      />

      {/* Account Identity Hero Card */}
      <div className="cc-settings-hero-card">
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            <div className="cc-candidate-avatar" style={{ width: 56, height: 56, fontSize: '1.3rem' }} aria-hidden="true">
              {initial}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h2 className="h5 fw-bold mb-0 text-dark">{user?.name || 'Authorized User'}</h2>
                <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5 text-uppercase" style={{ fontSize: '0.72rem' }}>
                  {user?.role}
                </span>
              </div>
              <span className="small text-muted">{user?.email}</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5">
              <ShieldCheck size={14} /> Active Authenticated Session
            </span>
          </div>
        </div>
      </div>

      <div className="cc-settings-grid">
        {/* Main Column: Theme & Password Form */}
        <div className="cc-settings-main">
          {/* Appearance & Theme Customizer */}
          <SectionCard title="Interface Appearance" subtitle="Select your preferred color theme mode for the application interface." icon={<Sun size={16} />} className="mb-4">
            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <div
                  className={`cc-theme-choice-card ${theme === 'light' ? 'is-active' : ''}`}
                  onClick={() => { if (theme !== 'light') toggle(); }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="p-2.5 rounded-3 bg-light border text-warning d-grid place-items-center">
                    <Sun size={22} />
                  </div>
                  <div>
                    <strong className="text-dark d-block">Light Mode</strong>
                    <span className="small text-muted">Clean high-contrast daytime UI</span>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6">
                <div
                  className={`cc-theme-choice-card ${theme === 'dark' ? 'is-active' : ''}`}
                  onClick={() => { if (theme !== 'dark') toggle(); }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="p-2.5 rounded-3 bg-dark border text-info d-grid place-items-center">
                    <Moon size={22} />
                  </div>
                  <div>
                    <strong className="text-dark d-block">Dark Mode</strong>
                    <span className="small text-muted">Eye-friendly deep navy theme</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Change Password Form */}
          <SectionCard title="Update Password & Security" subtitle="Ensure your account uses a strong, unique password to prevent unauthorized access." icon={<Key size={16} />} className="mb-4">
            {msg && <div className="alert alert-success py-2.5 px-3 rounded-3 mb-3 d-flex align-items-center gap-2"><CheckCircle2 size={16} /><span>{msg}</span></div>}
            {err && <div className="alert alert-danger py-2.5 px-3 rounded-3 mb-3 d-flex align-items-center gap-2"><ShieldAlert size={16} /><span>{err}</span></div>}

            <form onSubmit={submit} className="d-grid gap-3">
              <div>
                <label className="form-label fw-bold text-dark small">Current Password <span className="text-danger">*</span></label>
                <div className="cc-input-wrap">
                  <input
                    type={show.current ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    className="form-control cc-input-pad cc-input-pad-end"
                    value={f.currentPassword}
                    onChange={(e) => setF({ ...f, currentPassword: e.target.value })}
                  />
                  <button type="button" className="cc-input-toggle" onClick={() => setShow((s) => ({ ...s, current: !s.current }))} aria-label="Toggle current password">
                    {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label fw-bold text-dark small">New Password <span className="text-danger">*</span></label>
                <div className="cc-input-wrap">
                  <input
                    type={show.next ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Enter new strong password"
                    className="form-control cc-input-pad cc-input-pad-end"
                    value={f.password}
                    onChange={(e) => setF({ ...f, password: e.target.value })}
                  />
                  <button type="button" className="cc-input-toggle" onClick={() => setShow((s) => ({ ...s, next: !s.next }))} aria-label="Toggle new password">
                    {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {f.password && (
                  <div className="cc-pw-strength mt-2">
                    <div className="cc-pw-strength-bar">
                      <span style={{ width: `${(score / 5) * 100}%`, background: score < 2 ? 'var(--cc-danger)' : score < 4 ? 'var(--cc-warning)' : 'var(--cc-success)' }} />
                    </div>
                    <small className="text-muted fw-bold">{score < 2 ? 'Weak' : score < 4 ? 'Moderate' : 'Strong Password'}</small>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label fw-bold text-dark small">Confirm New Password <span className="text-danger">*</span></label>
                <div className="cc-input-wrap">
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    className="form-control cc-input-pad cc-input-pad-end"
                    value={f.confirm}
                    onChange={(e) => setF({ ...f, confirm: e.target.value })}
                  />
                  <button type="button" className="cc-input-toggle" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} aria-label="Toggle confirm password">
                    {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-text small text-muted">
                Password must be at least 8 characters long, containing uppercase, lowercase letters, numbers and special symbols.
              </div>

              <div className="pt-2">
                <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm" disabled={busy} type="submit">
                  {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <Lock size={15} className="me-1.5" />}
                  Save New Password
                </button>
              </div>
            </form>
          </SectionCard>
        </div>

        {/* Sidebar Column: Account Details & Security Tips */}
        <div className="cc-settings-side">
          <SectionCard title="Account Credentials" icon={<ShieldCheck size={16} />} className="mb-4">
            <div className="d-flex flex-column gap-2.5">
              <div className="p-2.5 rounded-3 bg-light-subtle border">
                <span className="cc-settings-info-label">Account Name</span>
                <span className="cc-settings-info-value">{user?.name || '—'}</span>
              </div>
              <div className="p-2.5 rounded-3 bg-light-subtle border">
                <span className="cc-settings-info-label">Registered Email</span>
                <span className="cc-settings-info-value text-break">{user?.email || '—'}</span>
              </div>
              <div className="p-2.5 rounded-3 bg-light-subtle border">
                <span className="cc-settings-info-label">User Role</span>
                <span className="cc-settings-info-value text-uppercase">{user?.role || '—'}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Security Best Practices" icon={<Sparkles size={16} />} className="mb-4">
            <div className="cc-tip-item">
              <CheckCircle2 size={16} />
              <span>Use a unique password not shared with personal email accounts.</span>
            </div>
            <div className="cc-tip-item">
              <CheckCircle2 size={16} />
              <span>Never disclose your credentials to unverified college personnel.</span>
            </div>
            <div className="cc-tip-item">
              <CheckCircle2 size={16} />
              <span>Regularly sign out when operating from shared campus workstations.</span>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export function Unauthorized() {
  return (
    <div className="cc-auth-wrap">
      <div className="cc-card cc-card-body text-center" style={{ maxWidth: 420 }}>
        <span className="cc-empty-ic" style={{ color: 'var(--cc-danger)' }}><ShieldAlert /></span>
        <h1 className="h4 mt-2">403 — Access denied</h1>
        <p className="text-muted small">You do not have permission to view this page.</p>
        <Link className="btn btn-primary" to="/">Go home</Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="cc-auth-wrap">
      <div className="cc-card cc-card-body text-center" style={{ maxWidth: 420 }}>
        <span className="cc-empty-ic"><Compass /></span>
        <h1 className="h4 mt-2">404 — Page not found</h1>
        <p className="text-muted small">The page you are looking for does not exist or has moved.</p>
        <Link className="btn btn-primary" to="/">Go home</Link>
      </div>
    </div>
  );
}
