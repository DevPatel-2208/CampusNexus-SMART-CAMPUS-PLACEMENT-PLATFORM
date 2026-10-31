import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, ArrowLeft, ArrowRight, Award, BadgeCheck, Briefcase, Building2,
  Calendar, CalendarDays, Check, CheckCircle2, ChevronRight, Clock, Compass, Download,
  ExternalLink, Eye, FileCheck, FileText, HelpCircle, IndianRupee, Layers, ListChecks,
  MapPin, Percent, Play, RefreshCw, Search, Shield, ShieldCheck, Sparkles, Star, Target,
  TrendingUp, Trophy, User, Users, Video, Wifi, X, XCircle, Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';
import api, { apiErrorMessage, downloadFile, fileUrl } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import { confirmAction, promptText, swalBase } from '../services/alerts';
import {
  DataTable, Empty, ErrorState, KpiCard, KpiGrid, Loading, PageHeader, Pager,
  SearchInput, SectionCard, SelectFilter, StatusBadge, DetailGrid, Toolbar,
} from '../components/ui';

function fmtDate(v, opts) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-IN', opts || { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function timeUntil(iso) {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (hours > 1) return `${hours} hours left`;
  return 'Ending soon';
}

/* ==================================================================
   1. STUDENT ASSESSMENTS PAGE (/student/assessments)
   ================================================================== */
export function Assessments() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/assessments')).data.data, []);
  const attemptsRes = useFetch(async () => (await api.get('/attempts/mine')).data.data, []);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  if (res.loading || attemptsRes.loading) return <Loading rows={4} height={140} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const all = res.data || [];
  const attemptByAssessment = new Map();
  (attemptsRes.data || []).forEach((attempt) => {
    const assessmentId = attempt.assessment?._id || attempt.assessment;
    if (assessmentId && !attemptByAssessment.has(String(assessmentId))) {
      attemptByAssessment.set(String(assessmentId), attempt);
    }
  });

  const stateFor = (a) => {
    const attempt = attemptByAssessment.get(String(a._id));
    if (!attempt) return 'available';
    if (attempt.status === 'active') {
      return attempt.expiresAt && new Date(attempt.expiresAt).getTime() <= Date.now() ? 'expired' : 'in_progress';
    }
    if (attempt.result === 'Passed') return 'passed';
    if (attempt.result === 'Failed') return 'failed';
    return 'completed';
  };

  const items = all.map((assessment) => ({
    ...assessment,
    _attempt: attemptByAssessment.get(String(assessment._id)),
    _state: stateFor(assessment),
  }));

  const inProgressCount = items.filter((a) => a._state === 'in_progress').length;
  const passedCount = items.filter((a) => a._state === 'passed').length;
  const completedCount = items.filter((a) => ['completed', 'failed', 'passed', 'expired'].includes(a._state)).length;
  const scores = items.filter((a) => a._attempt?.percentage != null).map((a) => Number(a._attempt.percentage));
  const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

  const categories = [...new Set(all.map((a) => a.categories).filter(Boolean))].sort();
  const difficulties = [...new Set(all.map((a) => a.difficulty).filter(Boolean))].sort();

  const search = q.trim().toLowerCase();
  const filtered = items.filter((a) => {
    const haystack = [a.title, a.company?.companyName, a.job?.title, a.categories, a.difficulty].filter(Boolean).join(' ').toLowerCase();
    return (!search || haystack.includes(search))
      && (!category || a.categories === category)
      && (!difficulty || a.difficulty === difficulty)
      && (!status || a._state === status);
  });

  const limit = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * limit, currentPage * limit);

  const clearFilters = () => { setQ(''); setCategory(''); setDifficulty(''); setStatus(''); setPage(1); };
  const stateLabel = {
    available: 'Available',
    in_progress: 'In Progress',
    completed: 'Completed',
    passed: 'Passed',
    failed: 'Failed',
    expired: 'Time expired',
  };

  const next = items.find((a) => a._state === 'in_progress')
    || items.find((a) => a._state === 'expired')
    || items.find((a) => a._state === 'available');

  const finishExpired = async (assessment) => {
    try {
      const { data } = await api.post(`/assessments/${assessment._id}/start`, { sessionId: assessment._attempt?.sessionId });
      const sessionId = data.data.sessionId;
      sessionStorage.setItem(`cc-exam-session:${assessment._id}`, sessionId);
      navigate(`/student/exam/${assessment._id}?session=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      if (error.response?.status === 410 && assessment._attempt?._id) {
        attemptsRes.reload();
        navigate(`/student/attempt/${assessment._attempt._id}`);
        return;
      }
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="cc-page cc-assessments-page">
      <PageHeader
        title="Assessments & Tests"
        eyebrow="Online Evaluations"
        description="Online technical tests, aptitude evaluations, and screening exams assigned by hiring partners."
        icon={<FileText size={26} />}
        actions={(
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => { res.reload(); attemptsRes.reload(); toast.info('Refreshed assessments.'); }}
            title="Refresh assessments list"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      />

      {/* KPI Stat Cards */}
      <KpiGrid>
        <KpiCard tone="primary" icon={<FileText size={18} />} value={all.length} label="Assigned Tests" hint="Linked with your applied drives" />
        <KpiCard tone="amber" icon={<Clock size={18} />} value={inProgressCount} label="In Progress" hint="Active exam attempts" />
        <KpiCard tone="success" icon={<Trophy size={18} />} value={passedCount} label="Passed & Cleared" hint="Qualified for next interview" />
        <KpiCard tone="info" icon={<Percent size={18} />} value={avgScore != null ? `${avgScore}%` : '—'} label="Average Score" hint="Across all submitted exams" />
      </KpiGrid>

      {/* Spotlight Next Assessment Banner */}
      {next && (
        <div className="cc-spotlight-card">
          <div className="cc-spotlight-content">
            <div className="cc-spotlight-badge">
              <Sparkles size={14} className="cc-spotlight-badge-icon" />
              <span className="cc-spotlight-badge-text">
                {next._state === 'in_progress' ? 'ACTIVE ATTEMPT IN PROGRESS' : next._state === 'expired' ? 'ACTION REQUIRED · EXPIRED' : 'UP NEXT ON SCHEDULE'}
              </span>
            </div>
            <h3 className="cc-spotlight-title" title={next.title}>{next.title}</h3>
            <div className="cc-spotlight-meta">
              <span className="cc-spotlight-chip">
                <Building2 size={14} className="text-primary flex-shrink-0" />
                <strong className="text-dark">{next.company?.companyName || 'Campus Partner'}</strong>
              </span>
              {next.job?.title && (
                <span className="cc-spotlight-chip">
                  <Briefcase size={14} className="text-secondary flex-shrink-0" />
                  <span>{next.job.title}</span>
                </span>
              )}
              <span className="cc-spotlight-chip">
                <Clock size={14} className="text-warning flex-shrink-0" />
                <span>{next.durationMinutes || '30'} mins</span>
              </span>
              <span className="cc-spotlight-chip">
                <HelpCircle size={14} className="text-info flex-shrink-0" />
                <span>{next.numQuestions || next.questionCount || '10'} Questions</span>
              </span>
              <span className="cc-spotlight-chip">
                <Target size={14} className="text-danger flex-shrink-0" />
                <span>Pass mark: {next.passingPercentage ?? 60}%</span>
              </span>
            </div>
          </div>
          <div className="cc-spotlight-actions">
            {next._state === 'expired' ? (
              <button type="button" className="cc-spotlight-action-btn" onClick={() => finishExpired(next)}>
                <span className="cc-spotlight-btn-text">Finish & View Result</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <Link className="cc-spotlight-action-btn" to={`/student/assessments/${next._id}`}>
                <span className="cc-spotlight-btn-text">{next._state === 'in_progress' ? 'Continue Assessment' : 'Start Assessment'}</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Responsive Filter Toolbar */}
      <Toolbar showClear={!!(q || category || difficulty || status)} onClear={clearFilters} label="Assessment filters">
        <SearchInput
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder="Search test name, company or role…"
          label="Search assessments"
        />
        {categories.length > 1 && (
          <SelectFilter
            value={category}
            onChange={(v) => { setCategory(v); setPage(1); }}
            options={categories}
            label="Category"
            placeholder="All categories"
          />
        )}
        {difficulties.length > 1 && (
          <SelectFilter
            value={difficulty}
            onChange={(v) => { setDifficulty(v); setPage(1); }}
            options={difficulties}
            label="Difficulty"
            placeholder="Any difficulty"
          />
        )}
        <SelectFilter
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={Object.entries(stateLabel).map(([value, label]) => ({ value, label }))}
          label="Status"
          placeholder="All statuses"
        />
      </Toolbar>

      {!all.length ? (
        <Empty
          title="No assessments assigned yet"
          hint="Assessments are assigned automatically after your job application is shortlisted by recruiter."
          icon={<FileText size={42} />}
          action={<Link to="/student/jobs" className="btn btn-primary btn-sm">Explore Open Jobs</Link>}
        />
      ) : !filtered.length ? (
        <Empty
          title="No matching assessments found"
          hint="Try adjusting your search terms or clearing the status and category filters."
          icon={<Search size={42} />}
          action={<button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>Reset Filters</button>}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="d-none d-lg-block">
            <SectionCard title={`Assigned Assessments (${filtered.length})`} subtitle="Review specifications before launching test." icon={<FileText size={16} />} bodyClass="p-0">
              <DataTable
                className="cc-assessment-table-wrap"
                rows={rows}
                empty="No assessments found"
                columns={[
                  {
                    key: 'title',
                    header: 'Assessment',
                    width: '32%',
                    render: (a) => {
                      const coInitial = String(a.company?.companyName || 'C')[0]?.toUpperCase() || 'C';
                      const diffKey = String(a.difficulty || 'medium').toLowerCase();
                      return (
                        <div className="cc-assessment-title-cell">
                          <span className="cc-table-co-avatar" aria-hidden="true">{coInitial}</span>
                          <div className="cc-assessment-title-content">
                            <Link to={`/student/assessments/${a._id}`} className="cc-table-test-name text-truncate d-block" title={a.title}>
                              {a.title}
                            </Link>
                            <div className="cc-table-tags-row">
                              <span className="cc-table-tag cc-table-tag-cat">{a.categories || 'Technical'}</span>
                              <span className={`cc-table-tag cc-table-tag-diff cc-diff-${diffKey}`}>
                                {a.difficulty || 'Medium'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'job',
                    header: 'Company & Role',
                    render: (a) => (
                      <div className="cc-assessment-context">
                        <b className="d-block text-dark">{a.company?.companyName || 'Campus Partner'}</b>
                        <small className="text-muted d-block text-truncate" style={{ maxWidth: 220 }}>{a.job?.title || 'Open Placement Drive'}</small>
                      </div>
                    ),
                  },
                  {
                    key: 'questions',
                    header: 'Questions',
                    align: 'center',
                    render: (a) => <span className="badge bg-light text-dark border px-2 py-1"><b>{a.questionCount ?? a.numQuestions ?? '—'}</b> Qs</span>,
                  },
                  {
                    key: 'duration',
                    header: 'Duration',
                    align: 'center',
                    render: (a) => <span className="d-inline-flex align-items-center gap-1 text-muted small"><Clock size={13} /> {a.durationMinutes || '—'}m</span>,
                  },
                  {
                    key: 'passing',
                    header: 'Pass Mark',
                    align: 'center',
                    render: (a) => <span className="fw-semibold text-secondary small">{a.passingPercentage ?? 60}%</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (a) => <StatusBadge value={stateLabel[a._state]} />,
                  },
                  {
                    key: 'score',
                    header: 'Score',
                    align: 'center',
                    render: (a) => a._attempt?.status === 'submitted' ? (
                      <div>
                        <span className={`fw-bold ${a._attempt.percentage >= (a.passingPercentage ?? 60) ? 'text-success' : 'text-danger'}`}>
                          {a._attempt.percentage ?? 0}%
                        </span>
                        <small className="d-block text-muted">{a._attempt.score ?? 0} / {a.totalMarks ?? '—'}</small>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Action',
                    align: 'right',
                    render: (a) => a._attempt?.status === 'submitted' ? (
                      <Link className="btn btn-sm btn-outline-primary text-nowrap rounded-pill px-3 fw-bold" to={`/student/attempt/${a._attempt._id}`}>
                        View Result
                      </Link>
                    ) : a._state === 'expired' ? (
                      <button type="button" className="btn btn-sm btn-outline-danger text-nowrap rounded-pill px-3 fw-bold" onClick={() => finishExpired(a)}>
                        View Result
                      </button>
                    ) : (
                      <Link className="btn btn-sm btn-primary text-nowrap rounded-pill px-3 fw-bold shadow-sm" to={`/student/assessments/${a._id}`}>
                        {a._state === 'in_progress' ? 'Continue' : 'Start Test'}
                      </Link>
                    ),
                  },
                ]}
              />
            </SectionCard>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="d-lg-none cc-assessments-mobile-list">
            {rows.map((a) => {
              const hasAttempt = a._attempt?.status === 'submitted';
              return (
                <div key={a._id} className="cc-card cc-test-card-mobile mb-3">
                  <div className="cc-test-card-body">
                    {/* Top row: Company and Status */}
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        <span className="cc-test-co-logo">
                          {a.company?.companyName?.[0] || 'C'}
                        </span>
                        <div className="min-w-0">
                          <span className="cc-test-co-name text-truncate d-block">{a.company?.companyName || 'Hiring Partner'}</span>
                          <span className="cc-test-role-name text-muted text-truncate d-block">{a.job?.title || 'Campus Drive'}</span>
                        </div>
                      </div>
                      <StatusBadge value={stateLabel[a._state]} />
                    </div>

                    {/* Test Title */}
                    <h4 className="cc-test-card-title">
                      <Link to={`/student/assessments/${a._id}`}>{a.title}</Link>
                    </h4>

                    <div className="cc-test-meta-chips cc-test-classification">
                      <span className="cc-test-chip cc-test-chip-cat">{a.categories || 'Technical'}</span>
                      <span className={`cc-test-chip cc-test-chip-difficulty cc-diff-${String(a.difficulty || 'medium').toLowerCase()}`}>
                        {a.difficulty || 'Medium'}
                      </span>
                    </div>

                    {/* Meta chips */}
                    <div className="cc-test-meta-chips">
                      <span className="cc-test-chip">
                        <Clock size={12} className="text-primary" /> {a.durationMinutes || '—'} mins
                      </span>
                      <span className="cc-test-chip">
                        <ListChecks size={12} className="text-info" /> {a.questionCount ?? a.numQuestions ?? '—'} Qs
                      </span>
                      <span className="cc-test-chip">
                        <Target size={12} className="text-warning" /> Pass: {a.passingPercentage ?? 60}%
                      </span>
                      {a.categories && (
                        <span className="cc-test-chip cc-test-chip-cat">
                          {a.categories}
                        </span>
                      )}
                    </div>

                    {/* Score Bar if submitted */}
                    {hasAttempt && (
                      <div className="cc-test-score-box">
                        <div className="d-flex justify-content-between align-items-center mb-1 small">
                          <span className="text-muted">Your Score:</span>
                          <b className={a._attempt.percentage >= (a.passingPercentage ?? 60) ? 'text-success' : 'text-danger'}>
                            {a._attempt.percentage}% ({a._attempt.score} / {a.totalMarks || '—'} pts)
                          </b>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className={`progress-bar ${a._attempt.percentage >= (a.passingPercentage ?? 60) ? 'bg-success' : 'bg-danger'}`}
                            style={{ width: `${Math.min(100, a._attempt.percentage)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bottom CTA Button */}
                    <div className="mt-3">
                      {hasAttempt ? (
                        <Link className="btn btn-outline-primary btn-sm w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold" to={`/student/attempt/${a._attempt._id}`}>
                          <span>View Detailed Result</span>
                          <ArrowRight size={14} />
                        </Link>
                      ) : a._state === 'expired' ? (
                        <button type="button" className="btn btn-primary btn-sm w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold" onClick={() => finishExpired(a)}>
                          <span>Finish & View Result</span>
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <Link className="btn btn-primary btn-sm w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold" to={`/student/assessments/${a._id}`}>
                          <span>{a._state === 'in_progress' ? 'Continue Assessment' : 'Start Assessment'}</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pager page={currentPage} pages={pages} onPage={setPage} />
        </>
      )}

      {attemptsRes.error && (
        <p className="small text-muted mt-2">Attempt history could not be refreshed. Assessment details are still accessible.</p>
      )}
    </div>
  );
}

/* ==================================================================
   Legacy Assessment Start & Exam (kept for backward compatibility)
   ================================================================== */
export function LegacyAssessmentOpen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/assessments/${id}/start`, { sessionId: sessionStorage.getItem('cc-exam-session') || undefined });
      if (!sessionStorage.getItem('cc-exam-session')) sessionStorage.setItem('cc-exam-session', data.data.sessionId);
      navigate(`/student/exam/${id}`, { state: { paper: data.data } });
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ maxWidth: 660 }}>
      <PageHeader title="Start assessment" description="Read the instructions carefully before you begin." icon={<FileText size={26} />} />
      <SectionCard title="Instructions">
        <ul className="small mb-3">
          <li>One active attempt at a time; the timer auto-submits on expiry.</li>
          <li>Tab switches, copy/paste and fullscreen exits are recorded — 3 violations auto-submit and block.</li>
          <li>Stay in fullscreen with a stable connection.</li>
        </ul>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start / resume'}</button>
      </SectionCard>
    </div>
  );
}

const VIOLATION_EVENTS = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'CONTEXT_MENU'];

export function LegacyExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initial = window.history.state?.usr?.paper;
  const [paper] = useState(initial || null);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(null);
  const attemptId = paper?.attemptId;
  const flagged = useRef(false);

  useEffect(() => {
    if (!paper) { navigate(`/student/assessments/${id}`); return; }
    const init = {};
    paper.answers?.forEach((a) => { init[a.question] = a.selected; });
    setAnswers(init);
    if (paper.expiresAt) {
      const t = setInterval(() => {
        const s = Math.max(0, Math.floor((new Date(paper.expiresAt) - Date.now()) / 1000));
        setLeft(s);
        if (s <= 0) { clearInterval(t); doSubmit(true); }
      }, 1000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [paper]);

  useEffect(() => {
    if (!attemptId) return undefined;
    const hb = setInterval(() => api.post(`/attempts/${attemptId}/heartbeat`).catch(() => {}), 12000);
    const report = (type) => {
      if (!VIOLATION_EVENTS.includes(type) || flagged.current) return;
      api.post(`/attempts/${attemptId}/violation`, { type }).then(({ data }) => {
        if (data.data.blocked) {
          flagged.current = true;
          toast.error('Blocked: too many violations. Auto-submitted.');
          navigate(`/student/attempt/${attemptId}`);
        } else {
          toast.warning(`Violation recorded (${data.data.violationCount}/3): ${type}`);
        }
      }).catch(() => {});
    };
    const onVis = () => { if (document.hidden) report('TAB_SWITCH'); };
    const onBlur = () => report('WINDOW_BLUR');
    const onCopy = () => report('COPY_ATTEMPT');
    const onCut = () => report('CUT_ATTEMPT');
    const onPaste = () => report('PASTE_ATTEMPT');
    const onCtx = (e) => { e.preventDefault(); report('CONTEXT_MENU'); };
    const onFs = () => { if (!document.fullscreenElement) report('FULLSCREEN_EXIT'); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('fullscreenchange', onFs);
    try { const p = document.documentElement.requestFullscreen?.(); if (p?.catch) p.catch(() => {}); } catch { /* optional */ }
    return () => {
      clearInterval(hb);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [attemptId]);

  if (!paper) return null;
  const choose = async (qid, letter) => {
    setAnswers({ ...answers, [qid]: letter });
    try { await api.post(`/attempts/${attemptId}/answer`, { questionId: qid, selected: letter }); } catch { /* ignore */ }
  };
  const doSubmit = async (auto = false) => {
    if (!auto) {
      const ok = await confirmAction({ title: 'Submit assessment?', text: 'You cannot change answers after submitting.', icon: 'question', confirmButtonText: 'Submit' });
      if (!ok) return;
    }
    try { await api.post(`/attempts/${attemptId}/submit`); navigate(`/student/attempt/${attemptId}`); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const mm = left !== null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '—';
  const answered = Object.values(answers).filter(Boolean).length;
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h5 mb-0">Assessment in progress</h1>
          <div className="small text-muted">{answered} of {paper.questions.length} answered</div>
        </div>
        <span className={`cc-badge ${left !== null && left < 60 ? 'red' : 'amber'} no-dot`}><Clock size={14} /> {mm} left</span>
      </div>
      {paper.questions.map((q, i) => (
        <div key={q._id} className="cc-card cc-card-body mb-2">
          <div className="fw-semibold">Q{i + 1}. {q.question} <span className="text-muted small">({q.marks} marks)</span></div>
          <div className="d-grid gap-1 mt-2">
            {Object.entries(q.options).map(([letter, text]) => (
              <button type="button" key={letter} className={`btn btn-sm text-start d-flex align-items-center gap-2 ${answers[q._id] === letter ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => choose(q._id, letter)}>
                <b>{letter}.</b> <span>{text}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-success w-100 mb-4" onClick={() => doSubmit(false)}>Submit assessment</button>
    </div>
  );
}

/* ==================================================================
   2. ATTEMPT RESULT PAGE (/student/attempt/:id)
   ================================================================== */
export function AttemptResult() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/attempts/${id}/result`)).data.data, [id]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'correct', 'wrong'
  const celebratedRef = useRef(false);

  const triggerPassCelebration = (isManual = false) => {
    const attempt = res.data?.attempt;
    const percentage = Math.max(0, Math.min(100, Number(attempt?.percentage) || 0));
    const passingScore = attempt?.assessment?.passingPercentage ?? 60;
    const assessmentTitle = attempt?.assessment?.title || 'Assessment';

    try {
      // Dual-cannon confetti burst for executive celebration
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { x: 0.15, y: 0.55 },
        colors: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'],
        zIndex: 10001,
      });
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { x: 0.85, y: 0.55 },
        colors: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'],
        zIndex: 10001,
      });
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 110,
          origin: { x: 0.5, y: 0.38 },
          colors: ['#4f46e5', '#10b981', '#fbbf24', '#38bdf8'],
          zIndex: 10001,
        });
      }, 350);
    } catch {
      // safe fallback
    }

    Swal.fire(swalBase({
      title: '🎉 Congratulations! You Passed!',
      html: `
        <div style="text-align: center; padding: 6px 0;">
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(16, 185, 129, 0.12); color: #059669; font-weight: 750; font-size: 0.95rem; margin-bottom: 14px; border: 1px solid rgba(16, 185, 129, 0.28);">
            <span>Score: ${percentage}%</span>
            <span>•</span>
            <span>Qualifying Cutoff: ${passingScore}%</span>
          </div>
          <p style="font-size: 0.95rem; color: var(--cc-muted, #64748b); line-height: 1.55; margin-bottom: 8px;">
            Outstanding performance! You have successfully cleared <b>${assessmentTitle}</b>.
          </p>
          <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.84rem; color: #10b981; font-weight: 650; margin-top: 4px;">
            <span>✨ Qualified for Next Stage & Interview Rounds</span>
          </div>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'Review Full Breakdown 🚀',
      confirmButtonColor: '#4f46e5',
    }));
  };

  useEffect(() => {
    if (res.data?.attempt?.result === 'Passed' && !celebratedRef.current) {
      celebratedRef.current = true;
      const t = setTimeout(() => {
        triggerPassCelebration();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [res.data]);

  if (res.loading) return <Loading rows={4} height={140} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const { attempt, answers = [] } = res.data;
  const passed = attempt.result === 'Passed';
  const percentage = Math.max(0, Math.min(100, Number(attempt.percentage) || 0));
  const totalMarks = attempt.assessment?.totalMarks || 0;
  const passingScore = attempt.assessment?.passingPercentage ?? 60;
  const durationMinutes = attempt.startedAt && attempt.submittedAt
    ? Math.max(1, Math.round((new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 60000))
    : null;

  const correctAnswers = answers.filter((a) => a.isCorrect);
  const wrongAnswers = answers.filter((a) => !a.isCorrect);
  const displayedAnswers = activeFilter === 'correct' ? correctAnswers : activeFilter === 'wrong' ? wrongAnswers : answers;

  const downloadPdf = async () => {
    try {
      await downloadFile(`/attempts/${id}/result.pdf`, `assessment-result-${attempt.assessment?.title || id}.pdf`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div className="cc-page cc-attempt-result-page">
      {/* Top Back bar */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <Link to="/student/assessments" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2">
          <ArrowLeft size={15} /> Back to Assessments
        </Link>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {passed && (
            <button
              type="button"
              className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-2 rounded-pill px-3 fw-bold shadow-sm"
              onClick={() => triggerPassCelebration(true)}
              title="Replay celebratory fireworks & congratulations"
            >
              <Sparkles size={14} className="text-warning" /> Celebrate Again 🎉
            </button>
          )}
          <button type="button" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2" onClick={downloadPdf}>
            <Download size={15} /> Download PDF Report
          </button>
        </div>
      </div>

      <PageHeader
        title={`${attempt.assessment?.title || 'Assessment'} — Result Report`}
        description="Comprehensive evaluation score, question analysis, and answer key breakdown."
        icon={<Trophy size={26} />}
        meta={(
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <StatusBadge value={attempt.result} />
            <span className="badge bg-light text-dark border">
              Points: {attempt.score} / {totalMarks || '—'}
            </span>
            {attempt.integrityStatus && attempt.integrityStatus !== 'SUBMITTED' && (
              <StatusBadge value={attempt.integrityStatus} />
            )}
          </div>
        )}
      />

      {/* Hero Performance Scorecard */}
      <div className={`cc-attempt-hero-pro ${passed ? 'is-passed' : 'is-failed'}`}>
        <div className="cc-attempt-hero-content">
          <span className="cc-attempt-kicker">
            {passed ? <CheckCircle2 size={14} className="text-success" /> : <AlertCircle size={14} className="text-warning" />}
            <span>OFFICIAL ATTEMPT RESULT</span>
          </span>
          <h2 className="cc-attempt-headline">
            {passed ? 'Outstanding Work! You Passed' : 'Assessment Completed'}
          </h2>
          <p className="cc-attempt-desc">
            {passed
              ? `Congratulations! You scored ${percentage}%, meeting the ${passingScore}% qualifying cutoff benchmark for this assessment.`
              : `You scored ${percentage}%. You needed ${passingScore}% to clear this evaluation. Review your mistakes below to improve.`}
          </p>
          <div className="cc-attempt-timestamp">
            <Clock size={13} className="text-muted" />
            <span>Submitted on {fmtDate(attempt.submittedAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Circular Score Dial */}
        <div className="cc-attempt-dial-wrap">
          <div className="cc-attempt-dial" style={{ '--attempt-score': `${percentage * 3.6}deg` }}>
            <div className="cc-attempt-dial-inner">
              <strong className="cc-attempt-dial-num">{percentage}%</strong>
              <span className="cc-attempt-dial-label">SCORE</span>
            </div>
          </div>
        </div>

        {/* Breakdown Metrics */}
        <div className="cc-attempt-metrics-grid">
          <div className="cc-attempt-metric-box">
            <span className="cc-metric-lbl">Total Score</span>
            <b className="cc-metric-val">{attempt.score} <small>/ {totalMarks || '—'}</small></b>
          </div>
          <div className="cc-attempt-metric-box">
            <span className="cc-metric-lbl">Passing Cutoff</span>
            <b className="cc-metric-val">{passingScore}<small>%</small></b>
          </div>
          <div className="cc-attempt-metric-box">
            <span className="cc-metric-lbl">Accuracy</span>
            <b className="cc-metric-val">{answers.length ? Math.round((correctAnswers.length / answers.length) * 100) : 0}<small>%</small></b>
          </div>
          <div className="cc-attempt-metric-box">
            <span className="cc-metric-lbl">Time Used</span>
            <b className="cc-metric-val">{durationMinutes != null ? durationMinutes : '—'} <small>min</small></b>
          </div>
        </div>
      </div>

      {/* Answer Review Section */}
      <SectionCard
        title="Question & Answer Review"
        subtitle="Review your submitted choices alongside the verified correct answer keys."
        icon={<ListChecks size={18} />}
        actions={(
          <div className="btn-group btn-group-sm" role="group" aria-label="Filter answers">
            <button
              type="button"
              className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setActiveFilter('all')}
            >
              All ({answers.length})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'correct' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
              onClick={() => setActiveFilter('correct')}
            >
              Correct ({correctAnswers.length})
            </button>
            <button
              type="button"
              className={`btn ${activeFilter === 'wrong' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
              onClick={() => setActiveFilter('wrong')}
            >
              Incorrect ({wrongAnswers.length})
            </button>
          </div>
        )}
      >
        <div className="cc-attempt-answers-list">
          {!displayedAnswers.length ? (
            <Empty
              title="No questions in this filter"
              hint={activeFilter === 'wrong' ? 'Great job! You answered all questions correctly!' : 'No questions match the selected filter.'}
              icon={<CheckCircle2 size={36} className="text-success" />}
            />
          ) : (
            displayedAnswers.map((answer, i) => {
              const question = answer.question || {};
              const correctLetter = question.displayCorrectAnswer || question.correctAnswer;
              const options = question.options || null;
              const qIndex = answers.indexOf(answer) + 1;

              return (
                <article key={answer._id || i} className={`cc-attempt-qcard ${answer.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                  <header className="cc-qcard-head">
                    <div className="d-flex align-items-center gap-2">
                      <span className="cc-qcard-num">Q{String(qIndex).padStart(2, '0')}</span>
                      <span className={`cc-qcard-result-pill ${answer.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                        {answer.isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </span>
                    </div>
                    <span className="cc-qcard-marks">
                      {answer.marksObtained > 0 ? `+${answer.marksObtained}` : '0'} / {question.marks || 1} Marks
                    </span>
                  </header>

                  <h3 className="cc-qcard-prompt">
                    {question.question || `Question ${qIndex}`}
                  </h3>

                  {options ? (
                    <div className="cc-qcard-options-grid">
                      {Object.entries(options).map(([letter, text]) => {
                        const isStudentChoice = answer.selectedAnswer === letter;
                        const isAnswerKey = correctLetter === letter;

                        let optClass = 'cc-qcard-opt';
                        if (isAnswerKey) optClass += ' is-correct-key';
                        if (isStudentChoice) optClass += isAnswerKey ? ' is-chosen-correct' : ' is-chosen-wrong';

                        return (
                          <div key={letter} className={optClass}>
                            <b className="cc-opt-letter">{letter}</b>
                            <span className="cc-opt-text">{text}</span>
                            <div className="cc-opt-badges">
                              {isStudentChoice && (
                                <span className={`badge ${isAnswerKey ? 'bg-success' : 'bg-danger'} text-white`}>
                                  Your Choice
                                </span>
                              )}
                              {isAnswerKey && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                                  <Check size={11} /> Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="cc-qcard-fallback-answer">
                      <div>Your Answer: <b>{answer.selectedAnswer || 'Not answered'}</b></div>
                      <div>Correct Answer: <b className="text-success">{correctLetter || '—'}</b></div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}

/* ==================================================================
   3. STUDENT INTERVIEWS PAGE (/student/interviews & :id)
   ================================================================== */
export function Interviews() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const [upcoming, setUpcoming] = useState(false);
  const [q, setQ] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const res = useFetch(async () => (await api.get('/interviews/mine', { params: upcoming ? { upcoming: 1 } : {} })).data.data, [upcoming]);

  if (res.loading) return <Loading rows={4} height={140} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const interviews = res.data || [];
  const totalCount = interviews.length;
  const upcomingCount = interviews.filter((iv) => iv.status === 'scheduled' || !iv.status).length;
  const completedCount = interviews.filter((iv) => iv.status === 'completed').length;
  const videoCount = interviews.filter((iv) => String(iv.mode || '').toLowerCase().includes('online') || String(iv.mode || '').toLowerCase().includes('video')).length;

  const search = q.trim().toLowerCase();
  const filtered = interviews.filter((iv) => {
    const haystack = [
      iv.roundName,
      iv.application?.job?.title,
      iv.company?.companyName,
      iv.interviewer,
      iv.mode,
      iv.location,
    ].filter(Boolean).join(' ').toLowerCase();
    return (!search || haystack.includes(search)) && (!modeFilter || iv.mode === modeFilter);
  });

  const clearFilters = () => { setQ(''); setModeFilter(''); setUpcoming(false); };

  return (
    <div className="cc-page cc-interviews-page">
      <PageHeader
        title="Interviews & Rounds"
        eyebrow="Campus Hiring Rounds"
        description="Track your technical interviews, campus drive discussions, and join live online meetings."
        icon={<Video size={26} />}
        actions={(
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => { res.reload(); toast.info('Refreshed interviews.'); }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      />

      {/* KPI Stats Grid */}
      <KpiGrid>
        <KpiCard tone="primary" icon={<Video size={18} />} value={totalCount} label="Total Rounds" hint="Across all job applications" />
        <KpiCard tone="amber" icon={<Clock size={18} />} value={upcomingCount} label="Upcoming Sessions" hint="Awaiting evaluation" />
        <KpiCard tone="success" icon={<CheckCircle2 size={18} />} value={completedCount} label="Completed Rounds" hint="Evaluation submitted" />
        <KpiCard tone="info" icon={<Video size={18} />} value={videoCount} label="Video Interviews" hint="Online joining enabled" />
      </KpiGrid>

      {/* Filter Bar */}
      <Toolbar showClear={!!(q || modeFilter || upcoming)} onClear={clearFilters} label="Interview filters">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by company, role, interviewer or round…"
          label="Search interviews"
        />
        <SelectFilter
          value={modeFilter}
          onChange={setModeFilter}
          options={['Online', 'Offline', 'Telephonic']}
          label="Mode"
          placeholder="All modes"
        />
        <label className="d-flex align-items-center gap-2 small mb-0 px-2 cursor-pointer user-select-none">
          <input
            type="checkbox"
            className="form-check-input m-0"
            checked={upcoming}
            onChange={(e) => setUpcoming(e.target.checked)}
          />
          <span className="fw-semibold">Upcoming Only</span>
        </label>
      </Toolbar>

      {/* Interview Cards List */}
      {!interviews.length ? (
        <Empty
          title="No interviews scheduled yet"
          hint={upcoming ? 'No upcoming rounds found. Uncheck "Upcoming Only" to view all history.' : 'Interview rounds will appear here once your application is shortlisted by recruiters.'}
          icon={<Video size={42} />}
          action={<Link to="/student/applications" className="btn btn-primary btn-sm">Check Applications</Link>}
        />
      ) : !filtered.length ? (
        <Empty
          title="No matching interviews"
          hint="Try adjusting your search keywords or reset filter options."
          icon={<Search size={42} />}
          action={<button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>Reset Filters</button>}
        />
      ) : (
        <div className="cc-interviews-list">
          {filtered.map((iv) => {
            const company = iv.company || {};
            const initial = String(company.companyName || 'C')[0]?.toUpperCase() || 'C';
            const isOnline = String(iv.mode || '').toLowerCase().includes('online') || String(iv.mode || '').toLowerCase().includes('video');

            return (
              <article key={iv._id} className="cc-card cc-iv-card mb-3">
                <div className="cc-iv-body">
                  {/* Top Header: Company Avatar + Round Info + Status */}
                  <div className="cc-iv-top">
                    <div className="cc-iv-brand">
                      <span className="cc-iv-logo" aria-hidden="true">{initial}</span>
                      <div className="cc-iv-brand-meta">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="cc-iv-company-name">{company.companyName || 'Recruiter'}</span>
                          {company.verificationStatus === 'verified' && (
                            <ShieldCheck size={14} className="text-primary" title="Verified Employer" />
                          )}
                        </div>
                        <span className="cc-iv-job-title">{iv.application?.job?.title || 'Campus Placement Drive'}</span>
                      </div>
                    </div>
                    <div className="cc-iv-status-pill">
                      <StatusBadge value={iv.status || 'Scheduled'} />
                    </div>
                  </div>

                  {/* Round Name */}
                  <h3 className="cc-iv-round-title">
                    <Link to={`/student/interviews/${iv._id}`}>
                      {iv.roundName || 'Interview Round'}
                    </Link>
                  </h3>

                  {/* Highlights Grid */}
                  <div className="cc-iv-details-row">
                    <div className="cc-iv-meta-tag">
                      <CalendarDays size={14} className="text-primary" />
                      <span>{fmtDate(iv.interviewDate)}</span>
                    </div>
                    <div className="cc-iv-meta-tag">
                      <Clock size={14} className="text-warning" />
                      <span>{iv.interviewTime || 'Time TBD'}</span>
                    </div>
                    <div className="cc-iv-meta-tag">
                      {isOnline ? <Video size={14} className="text-info" /> : <MapPin size={14} className="text-danger" />}
                      <span>{iv.mode || 'Online Video'}</span>
                    </div>
                    {iv.interviewer && (
                      <div className="cc-iv-meta-tag">
                        <User size={14} className="text-secondary" />
                        <span>Panel: {iv.interviewer}</span>
                      </div>
                    )}
                  </div>

                  {/* Venue location or instructions if offline */}
                  {iv.location && (
                    <div className="cc-iv-location-box">
                      <MapPin size={14} className="text-danger flex-shrink-0" />
                      <span>Venue: {iv.location}</span>
                    </div>
                  )}

                  {/* Recruiter Notes */}
                  {iv.notes && (
                    <p className="cc-iv-notes-snippet">
                      <span className="fw-semibold text-dark">Notes: </span>{iv.notes}
                    </p>
                  )}

                  {/* Actions Bar */}
                  <div className="cc-iv-foot">
                    <div className="d-flex align-items-center gap-2 flex-wrap w-100 justify-content-between">
                      <Link className="btn btn-outline-primary btn-sm cc-iv-btn-details" to={`/student/interviews/${iv._id}`}>
                        <span>View Details</span>
                        <ChevronRight size={14} />
                      </Link>

                      {iv.meetingLink ? (
                        <a
                          className="btn btn-primary btn-sm cc-iv-btn-join d-inline-flex align-items-center gap-2"
                          href={iv.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Video size={15} />
                          <span>Join Live Interview</span>
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="small text-muted fst-italic">
                          {isOnline ? 'Meeting link will appear prior to slot' : 'In-person campus venue'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InterviewDetails() {
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/interviews/${id}`)).data.data, [id]);
  if (res.loading) return <Loading rows={4} height={140} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const iv = res.data;
  const d = iv.interviewDate ? new Date(iv.interviewDate) : null;
  const company = iv.company || {};
  const initials = String(company.companyName || 'C').trim().slice(0, 2).toUpperCase() || 'C';
  const logo = company.logo ? fileUrl(company.logo) : null;
  const isOnline = String(iv.mode || '').toLowerCase().includes('online') || String(iv.mode || '').toLowerCase().includes('video');

  return (
    <div className="cc-page cc-detail-view">
      <div className="cc-detail-back-bar mb-3">
        <Link className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2" to="/student/interviews">
          <ArrowLeft size={16} /> Back to Scheduled Interviews
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="cc-card cc-detail-hero-card mb-4">
        <div className="cc-detail-hero-body p-4">
          <div className="cc-detail-brand-box d-flex align-items-center gap-3">
            <div className="cc-detail-avatar">
              {logo ? <img src={logo} alt={company.companyName} /> : initials}
            </div>
            <div>
              <div className="cc-detail-subtitle d-flex align-items-center gap-2 flex-wrap mb-1">
                <span className="fw-bold">{company.companyName || 'Interview Partner'}</span>
                {company.verificationStatus === 'verified' && (
                  <ShieldCheck size={16} className="text-primary" title="Verified Recruiter" />
                )}
                {iv.application?.job?.title && <span className="text-muted">· Role: {iv.application.job.title}</span>}
              </div>
              <h1 className="h3 fw-bold mb-0 text-dark">{iv.roundName || 'Interview Round'}</h1>
            </div>
          </div>

          <div className="cc-detail-badges d-flex align-items-center gap-2 flex-wrap mt-3 mt-md-0">
            <StatusBadge value={iv.status || 'Scheduled'} />
            {iv.result && <StatusBadge value={iv.result} />}
            {iv.mode && <span className="badge bg-light text-dark border">{iv.mode}</span>}
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <SectionCard title="Schedule & Timing Specifications" icon={<CalendarDays size={18} />} className="mb-4">
            <DetailGrid columns={2} items={[
              { label: 'Interview Date', value: d ? d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Scheduled Time', value: iv.interviewTime || 'Time TBD' },
              { label: 'Interview Mode', value: iv.mode || 'Online Video' },
              { label: 'Interviewer Panel', value: iv.interviewer || 'Technical Evaluation Team' },
              !isOnline ? { label: 'Venue / Office Location', value: iv.location || 'Campus Placement Hall' } : null,
              { label: 'Current Round Status', value: iv.status || 'Scheduled' },
            ].filter(Boolean)} />
          </SectionCard>

          {iv.notes && (
            <SectionCard title="Recruiter Notes & Instructions" icon={<FileText size={18} />} className="mb-4">
              <p className="mb-0 text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {iv.notes}
              </p>
            </SectionCard>
          )}

          {/* Preparation Checklist */}
          <SectionCard title="Candidate Preparation Checklist" icon={<ListChecks size={18} />}>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small text-secondary">
              <li className="d-flex align-items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span>Keep your updated resume and portfolio / GitHub links accessible for screen share.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span>Ensure high-speed internet connectivity, test microphone and web camera before joining.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span>Be prepared with fundamental concepts of the role and questions for the interviewing panel.</span>
              </li>
            </ul>
          </SectionCard>
        </div>

        {/* Sidebar Actions */}
        <div className="col-12 col-lg-4">
          <div className="cc-card cc-sidebar-card p-4 mb-4">
            <h2 className="h6 fw-bold text-dark mb-3">Interview Access & Link</h2>
            {iv.meetingLink ? (
              <div className="d-grid gap-2">
                <a
                  className="btn btn-primary py-2.5 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                  href={iv.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Video size={18} />
                  <span>Join Live Video Meeting</span>
                  <ExternalLink size={14} />
                </a>
                <span className="small text-muted text-center mt-1">Please join 5–10 minutes prior to your time slot</span>
              </div>
            ) : (
              <div className="alert alert-light border small text-muted mb-0">
                {!isOnline
                  ? 'This round will be conducted in-person at the campus / office venue indicated on the schedule.'
                  : 'The meeting URL will be activated by the recruiting team shortly before the interview.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   4. STUDENT OFFERS PAGE (/student/offers & :id)
   ================================================================== */
function useOfferAction(res) {
  const act = async (o, kind) => {
    if (kind === 'accept') {
      const ok = await confirmAction({
        title: 'Accept Job Offer?',
        text: `Accepting "${o.position}" at ${o.company?.companyName || 'the employer'} will create your official campus placement record.`,
        icon: 'question',
        confirmButtonText: 'Yes, Accept Offer',
      });
      if (!ok) return;
      try {
        await api.post(`/offers/${o._id}/accept`);
        toast.success('Congratulations! Offer accepted and registered in placement records.');
        res.reload();
      } catch (e) {
        toast.error(apiErrorMessage(e));
      }
    } else {
      const reason = await promptText({
        title: 'Decline Job Offer?',
        input: 'textarea',
        inputLabel: 'Reason for declining (optional, 5–1000 characters)',
        confirmButtonText: 'Confirm Decline',
      });
      if (reason == null) return;
      try {
        await api.post(`/offers/${o._id}/reject`, { reason });
        toast.info('Offer has been declined.');
        res.reload();
      } catch (e) {
        toast.error(apiErrorMessage(e));
      }
    }
  };
  return act;
}

const LIVE_OFFER = ['pending', 'issued', 'viewed'];

export function Offers() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/offers/mine')).data.data, []);
  const act = useOfferAction(res);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  if (res.loading) return <Loading rows={4} height={140} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const offers = res.data || [];
  const totalOffers = offers.length;
  const pendingOffers = offers.filter((o) => LIVE_OFFER.includes(o.status)).length;
  const acceptedOffers = offers.filter((o) => o.status === 'accepted').length;

  const search = q.trim().toLowerCase();
  const filtered = offers.filter((o) => {
    const haystack = [
      o.position,
      o.company?.companyName,
      o.location,
      o.employmentType,
      o.salary,
    ].filter(Boolean).join(' ').toLowerCase();
    return (!search || haystack.includes(search)) && (!statusFilter || o.status === statusFilter);
  });

  const clearFilters = () => { setQ(''); setStatusFilter(''); };

  const downloadPdf = async (o) => {
    try {
      await downloadFile(`/offers/${o._id}/letter`, `offer-${o.position || 'letter'}.pdf`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div className="cc-page cc-offers-page">
      <PageHeader
        title="Job Offers & Letters"
        eyebrow="Corporate Offers"
        description="Review formal job offers, compensation packages, and appointment letters from campus recruiters."
        icon={<Award size={26} />}
        actions={(
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => { res.reload(); toast.info('Refreshed job offers.'); }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      />

      {/* KPI Stats Grid */}
      <KpiGrid>
        <KpiCard tone="primary" icon={<Award size={18} />} value={totalOffers} label="Total Offers" hint="Received via campus drives" />
        <KpiCard tone="amber" icon={<Clock size={18} />} value={pendingOffers} label="Pending Response" hint="Requires your action" />
        <KpiCard tone="success" icon={<CheckCircle2 size={18} />} value={acceptedOffers} label="Accepted Placements" hint="Confirmed placement records" />
        <KpiCard tone="info" icon={<Trophy size={18} />} value={acceptedOffers ? 'Confirmed' : 'In Progress'} label="Placement Status" hint="Tracked by college TPO" />
      </KpiGrid>

      {/* Urgent Action Banner if Pending Offers Exist */}
      {pendingOffers > 0 && (
        <div className="alert alert-warning border d-flex align-items-center gap-3 py-3 px-3 rounded-3 mb-3">
          <Sparkles size={20} className="text-warning flex-shrink-0" />
          <div className="min-w-0 flex-grow-1">
            <b className="d-block text-dark">Action Required: You have {pendingOffers} pending job offer{pendingOffers > 1 ? 's' : ''}!</b>
            <span className="small text-secondary">
              Please review the offer letters and compensation packages below and submit your acceptance before expiry.
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <Toolbar showClear={!!(q || statusFilter)} onClear={clearFilters} label="Offer filters">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by role, company, CTC package or location…"
          label="Search offers"
        />
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Declined' },
          ]}
          label="Status"
          placeholder="All statuses"
        />
      </Toolbar>

      {/* Offers Cards Grid */}
      {!offers.length ? (
        <Empty
          title="No job offers yet"
          hint="Official job offers will appear here once you clear interview rounds and get selected by recruiters."
          icon={<Award size={42} />}
          action={<Link to="/student/jobs" className="btn btn-primary btn-sm">Browse Available Jobs</Link>}
        />
      ) : !filtered.length ? (
        <Empty
          title="No matching offers"
          hint="Try adjusting your search keywords or reset filter options."
          icon={<Search size={42} />}
          action={<button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>Reset Filters</button>}
        />
      ) : (
        <div className="cc-offers-list">
          {filtered.map((o) => {
            const company = o.company || {};
            const initial = String(company.companyName || 'C')[0]?.toUpperCase() || 'C';
            const isPending = LIVE_OFFER.includes(o.status);

            return (
              <article key={o._id} className="cc-card cc-offer-card-pro mb-3">
                <div className="cc-offer-body">
                  {/* Top Header: Company Avatar + Position + Status */}
                  <div className="cc-offer-top">
                    <div className="cc-offer-brand">
                      <span className="cc-offer-logo" aria-hidden="true">{initial}</span>
                      <div className="cc-offer-brand-meta">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="cc-offer-company-name">{company.companyName || 'Campus Recruiter'}</span>
                          {company.verificationStatus === 'verified' && (
                            <ShieldCheck size={14} className="text-primary" title="Verified Employer" />
                          )}
                        </div>
                        <h3 className="cc-offer-position-title mb-0">
                          <Link to={`/student/offers/${o._id}`}>{o.position}</Link>
                        </h3>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <StatusBadge value={o.status} />
                    </div>
                  </div>

                  {/* Compensation & Key Details Strip */}
                  <div className="cc-offer-highlight-bar">
                    <div className="cc-offer-salary-pill">
                      <IndianRupee size={15} />
                      <span>{o.salary || 'Competitive CTC'}</span>
                    </div>
                    {o.employmentType && (
                      <span className="cc-offer-chip">
                        <Briefcase size={13} className="text-primary" /> {o.employmentType}
                      </span>
                    )}
                    {o.location && (
                      <span className="cc-offer-chip">
                        <MapPin size={13} className="text-danger" /> {o.location}
                      </span>
                    )}
                    <span className="cc-offer-chip">
                      <Calendar size={13} className="text-secondary" /> Joining: {String(o.joiningDate || '').slice(0, 10) || 'On graduation'}
                    </span>
                    {o.offerExpiry && (
                      <span className="cc-offer-chip cc-offer-chip-expiry">
                        <Clock size={13} className="text-warning" /> Valid: {String(o.offerExpiry).slice(0, 10)} ({timeUntil(o.offerExpiry)})
                      </span>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="cc-offer-foot">
                    <div className="d-flex align-items-center gap-2 flex-wrap w-100 justify-content-between">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Link className="btn btn-outline-primary btn-sm" to={`/student/offers/${o._id}`}>
                          <span>Terms Details</span>
                        </Link>
                        <Link className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5" to={`/student/offers/${o._id}/letter`}>
                          <FileText size={14} />
                          <span>Preview Letter</span>
                        </Link>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5"
                          onClick={() => downloadPdf(o)}
                          title="Download official PDF"
                        >
                          <Download size={14} />
                          <span>PDF</span>
                        </button>
                      </div>

                      {isPending && (
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 fw-semibold px-3"
                            onClick={() => act(o, 'accept')}
                          >
                            <CheckCircle2 size={15} />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger px-3"
                            onClick={() => act(o, 'reject')}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OfferDetails() {
  const { id } = useParams();
  const res = useFetch(async () => (await api.get(`/offers/${id}`)).data.data, [id]);
  const act = useOfferAction(res);
  if (res.loading) return <Loading rows={4} height={140} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const o = res.data;
  const company = o.company || {};
  const initials = String(company.companyName || 'C').trim().slice(0, 2).toUpperCase() || 'C';
  const logo = company.logo ? fileUrl(company.logo) : null;
  const isPending = LIVE_OFFER.includes(o.status);

  const downloadPdf = async () => {
    try {
      await downloadFile(`/offers/${o._id}/letter`, `offer-${o.position}.pdf`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div className="cc-page cc-detail-view">
      <div className="cc-detail-back-bar mb-3">
        <Link className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2" to="/student/offers">
          <ArrowLeft size={16} /> Back to Job Offers
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="cc-card cc-detail-hero-card mb-4">
        <div className="cc-detail-hero-body p-4">
          <div className="cc-detail-brand-box d-flex align-items-center gap-3">
            <div className="cc-detail-avatar">
              {logo ? <img src={logo} alt={company.companyName} /> : initials}
            </div>
            <div>
              <div className="cc-detail-subtitle d-flex align-items-center gap-2 flex-wrap mb-1">
                <span className="fw-bold">{company.companyName || 'Campus Recruiter'}</span>
                {company.verificationStatus === 'verified' && (
                  <ShieldCheck size={16} className="text-primary" title="Verified Employer" />
                )}
                {o.location && <span className="text-muted">· {o.location}</span>}
              </div>
              <h1 className="h3 fw-bold mb-0 text-dark">{o.position || 'Offer Details'}</h1>
            </div>
          </div>

          <div className="cc-detail-badges d-flex align-items-center gap-2 flex-wrap mt-3 mt-md-0">
            <StatusBadge value={o.status} />
            {o.employmentType && <span className="badge bg-light text-dark border">{o.employmentType}</span>}
            {o.salary && <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">{o.salary}</span>}
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <SectionCard title="Offer Terms & Compensation Package" icon={<Building2 size={18} />} className="mb-4">
            <DetailGrid columns={2} items={[
              { label: 'Offered Position / Role', value: o.position },
              { label: 'Employer Company', value: company.companyName },
              { label: 'CTC Package / Salary', value: o.salary || 'Competitive Industry CTC' },
              { label: 'Work Location', value: o.location || 'Flexible' },
              { label: 'Employment Arrangement', value: o.employmentType || 'Full-Time' },
              { label: 'Expected Joining Date', value: o.joiningDate ? fmtDate(o.joiningDate) : 'Upon graduation' },
              { label: 'Offer Acceptance Deadline', value: o.offerExpiry ? fmtDate(o.offerExpiry) : '—' },
              { label: 'Related Campus Drive / Job', value: o.job?.title || 'Campus Drive' },
            ].filter(Boolean)} />

            {o.withdrawReason && (
              <div className="alert alert-warning py-2 mt-3 small mb-0">
                Withdrawn: {o.withdrawReason}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar Decision Card */}
        <div className="col-12 col-lg-4">
          <div className="cc-card cc-sidebar-card p-4 mb-4">
            <h2 className="h6 fw-bold text-dark mb-3">Offer Decision & Letters</h2>
            <div className="d-grid gap-2 mb-3">
              <Link to={`/student/offers/${o._id}/letter`} className="btn btn-primary d-flex align-items-center justify-content-center gap-2 fw-semibold py-2">
                <FileCheck size={16} />
                <span>Preview Offer Letter</span>
              </Link>
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={downloadPdf}
              >
                <Download size={15} />
                <span>Download Official PDF</span>
              </button>
            </div>

            {isPending && (
              <div className="pt-3 border-top d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-success d-flex align-items-center justify-content-center gap-2 fw-semibold py-2"
                  onClick={() => act(o, 'accept')}
                >
                  <CheckCircle2 size={16} />
                  <span>Accept Offer</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger py-2"
                  onClick={() => act(o, 'reject')}
                >
                  Decline Offer
                </button>
              </div>
            )}

            {o.status === 'accepted' && (
              <div className="alert alert-success mt-2 mb-0 py-2.5 small text-center fw-bold">
                🎉 Offer Accepted! Registered to your Placement Records.
              </div>
            )}
            {o.status === 'rejected' && (
              <div className="alert alert-secondary mt-2 mb-0 py-2 small text-center">
                Offer Declined.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   5. PLACEMENT STATUS PAGE (/student/placement)
   ================================================================== */
export function PlacementStatus() {
  const placements = useFetch(async () => (await api.get('/placements/mine')).data.data, []);
  const offers = useFetch(async () => (await api.get('/offers/mine')).data.data, []);
  const me = useFetch(async () => (await api.get('/students/me')).data.data, []);
  const apps = useFetch(async () => (await api.get('/applications/mine', { params: { limit: 1 } })).data, []);

  if (placements.loading || offers.loading || me.loading || apps.loading) return <Loading rows={4} height={120} />;

  const list = placements.data || [];
  const offerList = offers.data || [];
  const accepted = offerList.find((o) => o.status === 'accepted') || null;
  const isPlaced = me.data?.profile?.placementStatus === 'placed';
  const appCount = (apps.data?.counts || []).reduce((s, c) => s + (c.n || 0), 0);
  const offerCount = offerList.length;
  const hasHistory = list.length > 0 || !!accepted;

  const timeline = [
    { label: 'Applied', desc: 'You apply to eligible openings', done: true },
    { label: 'Shortlisted', desc: 'Companies review and shortlist you', done: isPlaced || hasHistory },
    { label: 'Interview', desc: 'Attend interview rounds', done: isPlaced || hasHistory },
    { label: 'Offer', desc: 'Receive your job offer', done: isPlaced || !!accepted },
    { label: 'Placed', desc: 'Offer accepted and placement confirmed', done: isPlaced },
  ];

  let activeIdx = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].done && !timeline[i + 1]?.done) { activeIdx = i; break; }
  }

  const field = (label, value) => (value ? { label, value } : null);

  return (
    <div className="cc-page cc-placement-status-page">
      <PageHeader
        title="Placement Status"
        eyebrow="Milestones & Verification"
        description="Your overall placement journey, verified achievements, and confirmed college records."
        icon={<Trophy size={26} />}
        actions={(
          <div className="d-flex align-items-center gap-2">
            <Link className="btn btn-outline-secondary btn-sm" to="/student/applications">My Applications</Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/student/offers">My Offers</Link>
          </div>
        )}
      />

      <KpiGrid>
        <KpiCard icon={<Briefcase size={18} />} value={appCount} label="Applications Sent" tone="primary" />
        <KpiCard icon={<Award size={18} />} value={offerCount} label="Offers Received" tone="info" />
        <KpiCard icon={<Trophy size={18} />} value={list.length} label="Placements" tone="success" />
        <KpiCard icon={isPlaced ? <CheckCircle2 size={18} /> : <Clock size={18} />} value={isPlaced ? 'Placed' : 'In Progress'} label="Overall Status" tone={isPlaced ? 'success' : 'amber'} />
      </KpiGrid>

      {/* Status Highlight Banner */}
      <div className="cc-card cc-card-body mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ borderLeft: `5px solid ${isPlaced ? 'var(--cc-success)' : 'var(--cc-warning)'}` }}>
        <div className="d-flex align-items-center gap-3">
          <span className={`cc-list-ic ${isPlaced ? 'cc-tone-success' : 'cc-tone-amber'}`} style={{ width: 52, height: 52, borderRadius: 14 }}>
            {isPlaced ? <Trophy size={24} /> : <Clock size={24} />}
          </span>
          <div>
            <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '.5px' }}>Current Placement Status</div>
            <h2 className="h5 mb-0 fw-bold">{isPlaced ? 'Placed 🎉' : 'In Progress'}</h2>
            <div className="small text-muted">{isPlaced ? 'Congratulations on your campus placement!' : 'Keep applying — your placement progress will update automatically.'}</div>
          </div>
        </div>
        <span className={`badge ${isPlaced ? 'bg-success' : 'bg-warning'} px-3 py-2 text-white fw-bold`}>
          {isPlaced ? 'Placed' : 'In Progress'}
        </span>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          {list.length ? (
            list.map((p) => (
              <SectionCard key={p._id} title={p.position || 'Position'} subtitle={p.company?.companyName || '—'} icon={<Award size={16} />} className="mb-3" actions={<StatusBadge value={p.status} />}>
                <DetailGrid columns={2} items={[
                  field('Package', p.package),
                  field('Joining Date', String(p.joiningDate || '').slice(0, 10)),
                  field('Placement Date', String(p.placementDate || '').slice(0, 10)),
                  field('Job Role', p.job?.title),
                ].filter(Boolean)} />
              </SectionCard>
            ))
          ) : accepted ? (
            <SectionCard title={accepted.position || 'Position'} subtitle={accepted.company?.companyName || '—'} icon={<Award size={16} />} className="mb-3" actions={<span className="badge bg-primary">Offer Accepted</span>}>
              <DetailGrid columns={2} items={[
                field('Salary', accepted.salary),
                field('Joining Date', String(accepted.joiningDate || '').slice(0, 10)),
                field('Location', accepted.location),
                field('Employment', accepted.employmentType),
              ].filter(Boolean)} />
            </SectionCard>
          ) : (
            <Empty
              title="No placement record yet"
              hint="Once you accept an offer, your official placement details will be registered here."
              action={<Link className="btn btn-primary" to="/student/jobs">Explore Open Jobs</Link>}
            />
          )}
        </div>

        <div className="col-12 col-lg-5">
          <SectionCard title="Placement Journey" icon={<TrendingUp size={16} />}>
            <div className="cc-timeline">
              {timeline.map((t, i) => {
                const isDone = t.done && i !== activeIdx;
                const isActive = i === activeIdx;
                return (
                  <div key={t.label} className="cc-tl-item" style={{ borderBottom: i === timeline.length - 1 ? 0 : undefined }}>
                    <span className={`cc-tl-dot ${isDone ? 'cc-tone-success' : isActive ? 'cc-tone-primary' : ''}`} style={!isDone && !isActive ? { background: 'var(--cc-surface-2)', color: 'var(--cc-muted)' } : undefined}>
                      {isDone ? <CheckCircle2 size={17} /> : <b>{i + 1}</b>}
                    </span>
                    <span>
                      <span className={`fw-semibold small ${t.done ? '' : 'text-muted'}`}>{t.label}</span>
                      <span className="d-block small text-muted">{t.desc}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
