import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Briefcase, Building2, Calendar, CheckCircle2, Clock, FileText, HelpCircle, Laptop, Percent, ShieldAlert, ShieldCheck, Sparkles, Target, Users, XCircle } from 'lucide-react';
import api, { apiErrorMessage } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import { DataTable, Empty, ErrorState, KpiCard, KpiGrid, Loading, PageHeader, Pager, SearchInput, SectionCard, SelectFilter, StatusBadge, Toolbar } from '../components/ui';

const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const metadataText = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

export function CompanyAssessmentResults() {
  const [filters, setFilters] = useState({ q: '', assessmentId: '', page: 1 });
  const key = JSON.stringify(filters);
  const results = useFetch(async () => (await api.get('/assessments/results', { params: { ...filters, limit: 15 } })).data, [key]);
  const assessments = useFetch(async () => (await api.get('/assessments', { params: { limit: 100 } })).data.data, []);
  if (results.loading) return <Loading rows={5} height={60} />;
  if (results.error) return <ErrorState message={apiErrorMessage(results.error)} onRetry={results.reload} />;
  const rows = results.data?.data || [];
  const pagination = results.data?.pagination || {};
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  return (
    <div className="cc-page">
      <PageHeader eyebrow="Company / Assessments" title="Assessment results" icon={<Award />} description="Search candidate attempts, review scores, and open an integrity report." actions={<Link className="btn btn-outline-secondary btn-sm" to="/company/assessments"><ArrowLeft size={15} /> Assessments</Link>} />
      <Toolbar showClear={!!(filters.q || filters.assessmentId)} onClear={() => setFilters({ q: '', assessmentId: '', page: 1 })} label="Assessment result filters">
        <SearchInput value={filters.q} onChange={(q) => set({ q })} placeholder="Search student, email, assessment or score…" label="Search assessment results" />
        <SelectFilter value={filters.assessmentId} onChange={(assessmentId) => set({ assessmentId })} options={(assessments.data || []).map((a) => ({ value: a._id, label: a.title }))} label="Assessment" placeholder="All assessments" />
      </Toolbar>
      <SectionCard title={`Attempts (${pagination.total || 0})`} icon={<Users size={16} />} bodyClass="p-0">
        <DataTable className="cc-assessment-table-wrap" rows={rows} empty="No attempts found" emptyHint="Attempts will appear when students begin assessments." columns={[
          { key: 'student', header: 'Student', render: (a) => <div className="cc-assessment-context"><b>{a.student?.name || '—'}</b><small>{a.student?.email || '—'}</small></div> },
          { key: 'assessment', header: 'Assessment', render: (a) => <span>{a.assessment?.title || '—'}</span> },
          { key: 'score', header: 'Score / %', align: 'right', render: (a) => <span><b>{a.score ?? 0} / {a.assessment?.totalMarks ?? '—'}</b><small className="cc-assessment-target d-block">{a.percentage ?? 0}%</small></span> },
          { key: 'result', header: 'Result', render: (a) => <StatusBadge value={a.result || 'Pending'} /> },
          { key: 'attemptStatus', header: 'Attempt', render: (a) => <StatusBadge value={a.status === 'submitted' ? 'Submitted' : 'Active'} /> },
          { key: 'integrity', header: 'Integrity', render: (a) => <StatusBadge value={a.integrityStatus || 'NORMAL'} /> },
          { key: 'violations', header: 'Violations', align: 'right', render: (a) => a.violationCount ?? 0 },
          { key: 'started', header: 'Started', render: (a) => <span className="small text-nowrap">{dateTime(a.startedAt)}</span> },
          { key: 'action', header: '', align: 'right', render: (a) => <Link className="btn btn-sm btn-outline-primary text-nowrap" to={`/company/assessment-attempts/${a._id}`}>Details</Link> },
        ]} />
      </SectionCard>
      <Pager page={pagination.page || 1} pages={pagination.pages || 1} onPage={(page) => set({ page })} />
    </div>
  );
}

export function AssessmentAttemptDetail() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const location = useLocation();
  const isTpo = location.pathname.startsWith('/tpo/');
  const res = useFetch(async () => (await api.get(`/attempts/${id}/monitor`)).data.data, [id]);

  if (res.loading) return <div className="cc-page"><Loading rows={5} height={90} /></div>;
  if (res.error) return <div className="cc-page"><ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} /></div>;

  const { attempt, violations } = res.data;
  const assessmentId = attempt.assessment?._id;
  const back = isTpo ? `/tpo/assessments/${assessmentId}/attempts` : `/company/assessments/${assessmentId}`;
  const highCount = violations.filter((v) => v.severity === 'HIGH').length;
  const mediumCount = violations.filter((v) => v.severity === 'MEDIUM').length;
  const passed = attempt.result === 'Passed';
  const percentage = Math.max(0, Math.min(100, Number(attempt.percentage) || 0));
  const passMark = attempt.assessment?.passingPercentage ?? 60;
  const initial = String(attempt.student?.name || 'S')[0]?.toUpperCase() || 'S';

  const durationMin = attempt.startedAt && attempt.submittedAt
    ? Math.max(1, Math.round((new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 60000))
    : (attempt.assessment?.durationMinutes || '—');

  return (
    <div className="cc-page cc-attempt-monitor-page">
      {/* Top Back Navigation Bar */}
      <div className="cc-detail-back-bar d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link className="cc-detail-back-link d-inline-flex align-items-center gap-2" to={back}>
          <ArrowLeft size={16} /> Back to Assessment Management
        </Link>
        <div className="d-flex align-items-center gap-2">
          {assessmentId && (
            <Link className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1.5" to={isTpo ? `/tpo/assessments/${assessmentId}` : `/company/assessments/${assessmentId}`}>
              <FileText size={14} /> View Assessment Specs
            </Link>
          )}
        </div>
      </div>

      {/* Attempt Hero Card */}
      <div className="cc-candidate-hero-card">
        <div className="cc-candidate-hero-body">
          <div className="cc-candidate-profile-meta">
            <div className="cc-candidate-avatar" style={{ background: passed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }} aria-hidden="true">
              {initial}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="cc-candidate-role-target">
                <Laptop size={15} />
                <span>Test: <strong>{attempt.assessment?.title || 'Technical Assessment'}</strong></span>
                {attempt.assessment?.job?.title && <span className="text-muted">• {attempt.assessment.job.title}</span>}
              </div>
              <h1 className="cc-candidate-name">{attempt.student?.name || 'Student Candidate'}</h1>
              <div className="cc-candidate-contact-row">
                <span>{attempt.student?.email}</span>
                <span>• Started: {dateTime(attempt.startedAt)}</span>
                <span>• Submitted: {dateTime(attempt.submittedAt)}</span>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <StatusBadge value={attempt.result || 'Pending'} />
            <StatusBadge value={attempt.integrityStatus || 'SUBMITTED'} />
            {violations.length === 0 ? (
              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1">
                <ShieldCheck size={14} /> Clean Proctoring Record
              </span>
            ) : (
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1">
                <ShieldAlert size={14} /> {violations.length} Proctoring Event{violations.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4 Summary Score & Integrity KPI Tiles */}
      <KpiGrid>
        <KpiCard
          tone={passed ? 'success' : 'danger'}
          icon={<Percent size={18} />}
          value={`${percentage}%`}
          label={`Score: ${attempt.score ?? 0} / ${attempt.assessment?.totalMarks ?? '—'}`}
          hint={`Qualifying Benchmark: ${passMark}%`}
        />
        <KpiCard
          tone="primary"
          icon={<Clock size={18} />}
          value={`${durationMin} min`}
          label="Time Elapsed"
          hint={`Allowed: ${attempt.assessment?.durationMinutes || '—'} minutes`}
        />
        <KpiCard
          tone={violations.length > 0 ? 'danger' : 'success'}
          icon={<ShieldAlert size={18} />}
          value={violations.length}
          label="Proctoring Incidents"
          hint={`${highCount} High · ${mediumCount} Medium Severity`}
        />
        <KpiCard
          tone="info"
          icon={<CheckCircle2 size={18} />}
          value={attempt.status === 'submitted' ? 'Submitted' : 'In Progress'}
          label="Attempt State"
          hint={`Verified integrity: ${attempt.integrityStatus || 'NORMAL'}`}
        />
      </KpiGrid>

      {/* Assessment Specifications & Details Grid */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <SectionCard title="Assessment Specifications & Parameters" icon={<FileText size={16} />}>
            <div className="row g-3">
              <div className="col-6 col-md-6">
                <div className="p-3 rounded-3 border bg-light-subtle">
                  <span className="small text-muted d-block">Hiring Partner</span>
                  <strong className="text-dark fs-6">{attempt.assessment?.company?.companyName || 'Corporate Recruiter'}</strong>
                </div>
              </div>
              <div className="col-6 col-md-6">
                <div className="p-3 rounded-3 border bg-light-subtle">
                  <span className="small text-muted d-block">Linked Drive Role</span>
                  <strong className="text-dark fs-6">{attempt.assessment?.job?.title || 'Open Placement Drive'}</strong>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="p-3 rounded-3 border bg-light-subtle">
                  <span className="small text-muted d-block">Total Questions</span>
                  <strong className="text-dark fs-6">{attempt.assessment?.numQuestions || attempt.assessment?.questionCount || '—'} Qs</strong>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="p-3 rounded-3 border bg-light-subtle">
                  <span className="small text-muted d-block">Pass Cutoff</span>
                  <strong className="text-dark fs-6 text-primary">{passMark}% Cutoff</strong>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="p-3 rounded-3 border bg-light-subtle">
                  <span className="small text-muted d-block">Proctoring Flag</span>
                  <strong className="text-dark fs-6">{attempt.integrityStatus || 'VERIFIED'}</strong>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-lg-5">
          <SectionCard title="Student University Record" icon={<Users size={16} />}>
            <p className="small text-secondary mb-3">
              Candidate profile and verified college academic credentials can be inspected directly in the campus roster.
            </p>
            {isTpo ? (
              <Link className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" to={`/tpo/students/${attempt.student?._id}`}>
                View Complete Student Profile &rarr;
              </Link>
            ) : (
              <div className="d-flex flex-column gap-2 small text-muted">
                <div><strong className="text-dark">Candidate:</strong> {attempt.student?.name}</div>
                <div><strong className="text-dark">Email:</strong> {attempt.student?.email}</div>
                <div><strong className="text-dark">Attempt ID:</strong> <code>{attempt._id}</code></div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Proctoring & Violation Events Table */}
      <SectionCard
        title={`Proctoring & Integrity Activity Log (${violations.length})`}
        subtitle="Chronological monitor audit of browser focus switches, tab changes, and webcam events during test session."
        icon={<ShieldAlert size={16} />}
        bodyClass="p-0"
      >
        {!violations.length ? (
          <Empty
            title="Zero Integrity Violations"
            hint="Candidate maintained active window focus throughout the entire test session. No unauthorized tab changes detected."
            icon={<CheckCircle2 size={40} className="text-success" />}
            bare
          />
        ) : (
          <DataTable
            className="cc-assessment-table-wrap"
            rows={violations}
            columns={[
              {
                key: 'at',
                header: 'Timestamp',
                render: (v) => <span className="small text-nowrap fw-semibold text-dark">{dateTime(v.occurredAt)}</span>,
              },
              {
                key: 'type',
                header: 'Incident Type',
                render: (v) => <b className="text-dark">{v.violationType}</b>,
              },
              {
                key: 'severity',
                header: 'Severity',
                render: (v) => <StatusBadge value={v.severity} />,
              },
              {
                key: 'description',
                header: 'Observation & Description',
                render: (v) => <span className="small text-secondary">{v.description || 'Focus lost or external device detected.'}</span>,
              },
              {
                key: 'metadata',
                header: 'Telemetry Diagnostics',
                render: (v) => <code className="cc-violation-meta small">{metadataText(v.metadata)}</code>,
              },
            ]}
          />
        )}
      </SectionCard>

      <div className="alert alert-light border small mt-3 mb-0 text-muted rounded-3 d-flex align-items-center gap-2">
        <Sparkles size={16} className="text-primary flex-shrink-0" />
        <span>CampusNexus Automated Proctoring: Real-time window switch detection, copy-paste prevention, and submission telemetry.</span>
      </div>
    </div>
  );
}

export function TpoAssessmentAttempts() {
  const { id } = useParams();
  const [filters, setFilters] = useState({ q: '', result: '', page: 1 });
  const key = `${id}:${JSON.stringify(filters)}`;
  const res = useFetch(async () => (await api.get(`/tpo/assessments/${id}/attempts`, { params: { ...filters, limit: 15 } })).data, [key]);
  if (res.loading) return <Loading rows={5} height={60} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;
  const assessment = res.data?.assessment;
  const rows = res.data?.data || [];
  const pagination = res.data?.pagination || {};
  const summary = res.data?.summary || {};
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  return (
    <div className="cc-page">
      <PageHeader eyebrow="TPO / Assessments" title={assessment?.title || 'Assessment attempts'} icon={<Users />} description={`${assessment?.company?.companyName || '—'} · ${assessment?.job?.title || '—'} · ${assessment?.durationMinutes || '—'} min`} actions={<Link className="btn btn-outline-secondary btn-sm" to="/tpo/assessments"><ArrowLeft size={15} /> Assessments</Link>} />
      <KpiGrid>
        <KpiCard tone="primary" icon={<Users size={18} />} value={summary.total ?? 0} label="Attempts" />
        <KpiCard tone="success" icon={<Award size={18} />} value={summary.passed ?? 0} label="Passed" />
        <KpiCard tone="danger" icon={<XCircle size={18} />} value={summary.failed ?? 0} label="Failed" />
        <KpiCard tone="amber" icon={<Clock size={18} />} value={summary.pending ?? 0} label="Pending" />
      </KpiGrid>
      <Toolbar showClear={!!(filters.q || filters.result)} onClear={() => setFilters({ q: '', result: '', page: 1 })} label="Student attempt filters">
        <SearchInput value={filters.q} onChange={(q) => set({ q })} placeholder="Student, email or enrollment…" label="Search student attempts" />
        <SelectFilter value={filters.result} onChange={(result) => set({ result })} options={['Passed', 'Failed', 'Pending']} label="Result" placeholder="All results" />
      </Toolbar>
      <SectionCard title={`Student attempts (${pagination.total || 0})`} icon={<Users size={16} />} bodyClass="p-0">
        <DataTable className="cc-assessment-table-wrap" rows={rows} empty="No attempts match" emptyHint="Try changing the search or result filter." columns={[
          { key: 'student', header: 'Student', render: (a) => <div className="cc-assessment-context"><b>{a.student?.name || '—'}</b><small>{a.student?.email || '—'}{a.studentProfile?.enrollmentNo ? ` · ${a.studentProfile.enrollmentNo}` : ''}</small></div> },
          { key: 'academic', header: 'Course / branch / CGPA', render: (a) => <span>{a.studentProfile?.course || '—'}{a.studentProfile?.branch ? ` · ${a.studentProfile.branch}` : ''}{a.studentProfile?.cgpa != null ? ` · CGPA ${a.studentProfile.cgpa}` : ''}</span> },
          { key: 'started', header: 'Started', render: (a) => <span className="small text-nowrap">{a.startedAt ? new Date(a.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span> },
          { key: 'submitted', header: 'Submitted', render: (a) => <span className="small text-nowrap">{a.submittedAt ? new Date(a.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span> },
          { key: 'score', header: 'Score', align: 'right', render: (a) => <span><b>{a.score ?? 0}</b><small className="cc-assessment-target d-block">{a.percentage ?? 0}%</small></span> },
          { key: 'result', header: 'Result', render: (a) => <StatusBadge value={a.result || 'Pending'} /> },
          { key: 'attemptStatus', header: 'Attempt', render: (a) => <StatusBadge value={a.status === 'submitted' ? 'Submitted' : 'Active'} /> },
          { key: 'integrity', header: 'Integrity', render: (a) => <StatusBadge value={a.integrityStatus || 'NORMAL'} /> },
          { key: 'violations', header: 'Violations', align: 'right', render: (a) => a.violationCount ?? 0 },
          { key: 'actions', header: '', align: 'right', render: (a) => <div className="d-flex gap-1 justify-content-end"><Link className="btn btn-sm btn-outline-primary" to={`/tpo/assessment-attempts/${a._id}`}>Attempt details</Link>{a.student?._id && <Link className="btn btn-sm btn-outline-secondary" to={`/tpo/students/${a.student._id}`}>Student</Link>}</div> },
        ]} />
      </SectionCard>
      <Pager page={pagination.page || 1} pages={pagination.pages || 1} onPage={(page) => set({ page })} />
    </div>
  );
}
