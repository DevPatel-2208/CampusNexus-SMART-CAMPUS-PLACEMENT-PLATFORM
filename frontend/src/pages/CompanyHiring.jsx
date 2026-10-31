import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import api, { apiErrorMessage, downloadFile, fileUrl } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import { Empty, Loading, PageHeader, SectionCard, StatusBadge, Toolbar,
  KpiCard, KpiGrid, SearchInput, SelectFilter, Pager, DataTable, Modal } from '../components/ui';
import {
  ClipboardList, Plus, Trash2, Sparkles, Calendar, Award, Building2,
  Video, Pencil, Clock, ShieldCheck, FileText, Users, CheckCircle2, CircleHelp, RefreshCw,
  Settings, Send, BarChart3, PauseCircle, Download,
} from 'lucide-react';

const ASSESSMENT_DEFAULTS = { job: '', title: '', description: '', durationMinutes: 30, totalMarks: 100, numQuestions: 10, marksPerQuestion: 1, passingPercentage: 60, difficulty: 'Medium', categories: 'Technical', technology: '', negativeMarking: false, negativeMarks: 0 };
const ASSESSMENT_TOPICS = {
  Technical: { label: 'Technology / Domain', placeholder: 'PHP, MySQL, Laravel, Networking…', required: true },
  Programming: { label: 'Programming Language / Technology', placeholder: 'PHP, Java, Python, JavaScript…', required: true },
  Aptitude: { label: 'Aptitude Topics', placeholder: 'Quantitative Aptitude, Percentage, Profit & Loss…', required: true },
  'Logical Reasoning': { label: 'Reasoning Topics', placeholder: 'Coding-Decoding, Number Series, Blood Relations…', required: true },
  Mixed: { label: 'Topics / Skills', placeholder: 'Optional topics or skills…', required: false },
};
const SELECTION_STATUSES = ['Selected', 'Rejected', 'On Hold'];
const OFFER_DEFAULTS = {
  selectionId: '', studentId: '', jobId: '', position: '', department: '', workMode: '',
  salary: '', joiningDate: '', location: '', employmentType: 'Full Time', offerExpiry: '',
  terms: '', remarks: '', representativeName: '', representativeDesignation: '',
};
const OFFER_FIELDS = ['position', 'department', 'workMode', 'salary', 'joiningDate', 'location', 'employmentType', 'offerExpiry', 'terms', 'remarks', 'representativeName', 'representativeDesignation'];

function AssessmentForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial?._id;
  const [f, setF] = useState(() => (isEdit ? { ...ASSESSMENT_DEFAULTS, ...initial, job: initial.job?._id || '', negativeMarking: !!initial.negativeMarking } : ASSESSMENT_DEFAULTS));
  const [busy, setBusy] = useState(false);
  const jobs = useFetch(async () => (await api.get('/company/jobs')).data.data, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.job) { toast.error('Select a job for this assessment.'); return; }
    if (ASSESSMENT_TOPICS[f.categories]?.required && !String(f.technology || '').trim()) { toast.error('Add a topic for this assessment category.'); return; }
    if (f.negativeMarking && (!Number.isInteger(+f.negativeMarks) || +f.negativeMarks < 1 || +f.negativeMarks > 10)) { toast.error('Negative marks must be a whole number from 1 to 10.'); return; }
    setBusy(true);
    const body = { ...f, job: f.job || null, durationMinutes: +f.durationMinutes || 30, totalMarks: +f.totalMarks || 100, numQuestions: +f.numQuestions || 10, marksPerQuestion: +f.marksPerQuestion || 1, passingPercentage: +f.passingPercentage || 60, negativeMarks: f.negativeMarking ? (+f.negativeMarks || 0) : 0 };
    try {
      if (isEdit) { await api.patch('/assessments/' + initial._id, body); toast.success('Assessment updated.'); }
      else { const { data } = await api.post('/assessments', body); toast.success('Assessment drafted — add questions, then publish.'); onSaved?.(data.data._id); return; }
      onSaved?.();
    } catch (e2) { toast.error(apiErrorMessage(e2)); } finally { setBusy(false); }
  };
  const jobList = jobs.data || [];
  const topic = ASSESSMENT_TOPICS[f.categories] || ASSESSMENT_TOPICS.Technical;
  return (
    <form onSubmit={submit} className="row g-3">
      <div className="col-md-8">
        <label className="form-label">Job <span className="text-danger">*</span></label>
        <select required className="form-select" value={f.job} onChange={set('job')}>
          <option value="">Select job</option>
          {jobList.map(({ job }) => <option key={job._id} value={job._id}>{job.title}</option>)}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">Title <span className="text-danger">*</span></label>
        <input required className="form-control" value={f.title} onChange={set('title')} />
      </div>
      <div className="col-12">
        <label className="form-label">Description</label>
        <textarea className="form-control" rows={2} value={f.description} onChange={set('description')} />
      </div>
      <div className="col-md-3"><label className="form-label">Duration (min)</label><input type="number" min="1" max="600" className="form-control" value={f.durationMinutes} onChange={set('durationMinutes')} /></div>
      <div className="col-md-3"><label className="form-label">Total marks</label><input type="number" min="1" className="form-control" value={f.totalMarks} onChange={set('totalMarks')} /></div>
      <div className="col-md-3"><label className="form-label">No. of questions</label><input type="number" min="1" max="50" className="form-control" value={f.numQuestions} onChange={set('numQuestions')} /></div>
      <div className="col-md-3"><label className="form-label">Marks / question</label><input type="number" min="1" className="form-control" value={f.marksPerQuestion} onChange={set('marksPerQuestion')} /></div>
      <div className="col-md-3"><label className="form-label">Passing %</label><input type="number" min="0" max="100" className="form-control" value={f.passingPercentage} onChange={set('passingPercentage')} /></div>
      <div className="col-md-3"><label className="form-label">Difficulty <span className="text-danger">*</span></label><select required className="form-select" value={f.difficulty} onChange={set('difficulty')}><option>Easy</option><option>Medium</option><option>Hard</option><option>Mixed</option></select></div>
      <div className="col-md-3"><label className="form-label">Category <span className="text-danger">*</span></label><select required className="form-select" value={f.categories} onChange={(e) => setF({ ...f, categories: e.target.value })}><option>Technical</option><option>Programming</option><option>Aptitude</option><option>Logical Reasoning</option><option>Mixed</option></select></div>
      <div className="col-md-6"><label className="form-label">{topic.label}{topic.required && <> <span className="text-danger">*</span></>}</label><input required={topic.required} className="form-control" placeholder={topic.placeholder} value={f.technology || ''} onChange={set('technology')} /><div className="form-text">{topic.required ? 'This topic guides the question generator.' : 'Optional. The generator will balance topics automatically.'}</div></div>
      <div className="col-md-6 d-flex align-items-end gap-3">
        <div className="form-check"><input type="checkbox" className="form-check-input" id="neg" checked={f.negativeMarking} onChange={(e) => setF({ ...f, negativeMarking: e.target.checked, negativeMarks: e.target.checked ? Math.max(1, +f.negativeMarks || 1) : 0 })} /><label className="form-check-label" htmlFor="neg">Negative marking</label></div>
        {f.negativeMarking && <label className="small">Deduct per wrong answer<input aria-label="Negative marks per wrong answer" type="number" min="1" max="10" step="1" required className="form-control" style={{ maxWidth: 150 }} value={f.negativeMarks} onChange={set('negativeMarks')} /></label>}
      </div>
      <div className="col-12 d-flex gap-2">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create assessment'}</button>
        {onCancel && <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export function Assessments() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const navigate = useNavigate();
  const res = useFetch(async () => (await api.get('/assessments')).data.data, []);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const all = res.data || [];
  const search = q.trim().toLowerCase();
  const STATUS_RANK = { active: 0, draft: 1, inactive: 2 };
  const filtered = all
    .filter((a) => (!status || a.status === status) && (!search || a.title.toLowerCase().includes(search) || (a.job?.title || '').toLowerCase().includes(search)))
    .sort((a, b) => (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const limit = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
    const del = async (id) => { const r = await Swal.fire({ title: 'Delete draft?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: 'var(--cc-danger)' }); if (!r.isConfirmed) return; try { await api.delete('/assessments/' + id); toast.success('Deleted.'); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } };
  const publish = async (a) => {
    const r = await Swal.fire({
      title: 'Publish assessment?',
      text: `"${a.title}" will become active and all applicants of the linked job will be notified. You can no longer edit questions without unpublishing.`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Publish', cancelButtonText: 'Cancel',
    });
    if (!r.isConfirmed) return;
    try { await api.post('/assessments/' + a._id + '/publish'); toast.success('Published and applicants notified.'); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  return (
    <div className="cc-page">
      <PageHeader icon={<ClipboardList size={20} />} title="Assessments" description="Create, publish and manage candidate assessments." eyebrow="Company / Assessments" actions={<button className="btn btn-primary btn-sm" onClick={() => { setShow((v) => !v); setEditing(null); }}>{show || editing ? 'Cancel' : <><Plus size={15} /> New assessment</>}</button>} />
      {(show || editing) && (
        <SectionCard title={editing ? 'Edit assessment' : 'New assessment'} icon={<Plus size={16} />}>
          <AssessmentForm initial={editing} onCancel={() => { setShow(false); setEditing(null); }} onSaved={(newId) => { setShow(false); setEditing(null); res.reload(); if (newId) navigate('/company/assessments/' + newId); }} />
        </SectionCard>
      )}
      <KpiGrid>
        <KpiCard tone="primary" icon={<ClipboardList size={18} />} value={all.length} label="Total" />
        <KpiCard tone="success" icon={<CheckCircle2 size={18} />} value={all.filter((a) => a.status === 'active').length} label="Active" />
        <KpiCard tone="amber" icon={<FileText size={18} />} value={all.filter((a) => a.status === 'draft').length} label="Drafts" />
        <KpiCard tone="violet" icon={<Award size={18} />} value={all.reduce((n, a) => n + (a.questionCount || 0), 0)} label="Questions" />
      </KpiGrid>

      <Toolbar showClear={!!(q || status)} onClear={() => { setQ(''); setStatus(''); setPage(1); }}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search title or job…" />
        <SelectFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['draft', 'active']} placeholder="All statuses" label="status" />
      </Toolbar>
      {res.loading ? <Loading rows={3} /> : !all.length ? (
        <Empty
          title="No assessments yet"
          hint="Create your first assessment to start testing candidates."
          icon={<ClipboardList />}
          action={<button className="btn btn-primary btn-sm" onClick={() => { setShow(true); setEditing(null); }}><Plus size={15} /> Create Assessment</button>}
        />
      ) : !filtered.length ? <Empty title="No matches" hint="Try clearing filters." /> : (
        <>
          <div className="d-none d-md-block">
          <div className="cc-table-wrap cc-assessment-table-wrap mb-3">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Job</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Attempts</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <div style={{ minWidth: 0 }}>
                        <Link to={'/company/assessments/' + a._id} className="fw-semibold text-decoration-none d-block text-truncate" style={{ color: 'var(--cc-text)' }} title={a.title}>{a.title}</Link>
                        <small className="text-muted d-block text-truncate">{a.categories || 'Technical'} · {a.difficulty || 'Medium'}</small>
                      </div>
                    </td>
                    <td className="small text-muted"><span className="d-inline-block text-truncate" style={{ maxWidth: 200, verticalAlign: 'bottom' }} title={a.job?.title || ''}>{a.job?.title || '—'}</span></td>
                    <td><span className="fw-semibold">{a.questionCount || 0}</span> <span className="text-muted">/ {a.numQuestions || 0}</span></td>
                    <td className="small text-muted">{a.durationMinutes} min</td>
                    <td>{a.attemptCount || 0}</td>
                    <td><StatusBadge value={a.status} /></td>
                    <td>
                      <div className="d-flex gap-1 justify-content-end flex-nowrap">
                        <Link className="btn btn-sm btn-outline-primary" to={'/company/assessments/' + a._id} title="Manage questions & results"><Settings size={14} /></Link>
                        {a.status === 'draft' && <button className="btn btn-sm btn-outline-secondary" title="Edit configuration" onClick={() => { setEditing(a); setShow(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={14} /></button>}
                        {a.status === 'draft' && <button className="btn btn-sm btn-success" title="Publish to applicants" onClick={() => publish(a)}><Send size={14} /></button>}
                        {a.status === 'draft' && <button className="btn btn-sm btn-outline-danger" title="Delete draft" onClick={() => del(a._id)}><Trash2 size={14} /></button>}
                        {a.status !== 'draft' && (a.attemptCount || 0) > 0 && <Link className="btn btn-sm btn-outline-dark" title="View results" to={'/company/assessment-results?assessmentId=' + a._id}><BarChart3 size={14} /></Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          <div className="d-md-none">
            {filtered.length === 0 ? null : rows.map((a) => (
              <div key={a._id} className="cc-card cc-card-body mb-2">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                  <Link to={'/company/assessments/' + a._id} className="fw-semibold text-decoration-none" style={{ color: 'var(--cc-text)' }}>{a.title}</Link>
                  <StatusBadge value={a.status} />
                </div>
                <div className="small text-muted mb-2">{a.categories || 'Technical'} · {a.difficulty || 'Medium'} · {a.job?.title || '—'}</div>
                <div className="d-flex flex-wrap gap-3 small text-muted mb-2">
                  <span><b className="text-dark">{a.questionCount || 0}</b>/{a.numQuestions || 0} Qs</span>
                  <span>{a.durationMinutes} min</span>
                  <span>{a.attemptCount || 0} attempts</span>
                </div>
                <div className="d-flex gap-1 flex-wrap">
                  <Link className="btn btn-sm btn-outline-primary" to={'/company/assessments/' + a._id}><Settings size={14} /></Link>
                  {a.status === 'draft' && <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditing(a); setShow(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={14} /></button>}
                  {a.status === 'draft' && <button className="btn btn-sm btn-success" onClick={() => publish(a)}><Send size={14} /></button>}
                  {a.status === 'draft' && <button className="btn btn-sm btn-outline-danger" onClick={() => del(a._id)}><Trash2 size={14} /></button>}
                  {a.status !== 'draft' && (a.attemptCount || 0) > 0 && <Link className="btn btn-sm btn-outline-dark" to={'/company/assessment-results?assessmentId=' + a._id}><BarChart3 size={14} /></Link>}
                </div>
              </div>
            ))}
          </div>
          <Pager page={cur} pages={pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export function AssessmentDetail() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const qs = useFetch(async () => (await api.get('/assessments/' + id + '/questions')).data.data, [id]);
  const meta = useFetch(async () => (await api.get('/assessments/' + id)).data.data, [id]);
  const results = useFetch(async () => (await api.get('/assessments/' + id + '/results')).data.data, [id]);
  const viols = useFetch(async () => (await api.get('/assessments/' + id + '/violations')).data.data, [id]);
  const [f, setF] = useState({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', questionType: 'MCQ', marks: 2 });
  const [editingId, setEditingId] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genF, setGenF] = useState({ topic: '', category: 'Technical', difficulty: 'Medium', count: 10 });
  const [genBusy, setGenBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [regenBusyId, setRegenBusyId] = useState(null);
  const questionEditorRef = useRef(null);
  const blank = { question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', questionType: 'MCQ', marks: 2 };
  const add = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await api.patch('/assessments/' + id + '/questions/' + editingId, { ...f, marks: +f.marks || 1 }); toast.success('Question updated.'); }
      else { await api.post('/assessments/' + id + '/questions', { ...f, marks: +f.marks || 1 }); toast.success('Question added (assessment moved to draft).'); }
      setF(blank); setEditingId(null); qs.reload(); meta.reload();
    } catch (e2) { toast.error(apiErrorMessage(e2)); }
  };
  const editQ = (q) => {
    setEditingId(q._id);
    setF({ question: q.question, optionA: q.optionA || '', optionB: q.optionB || '', optionC: q.optionC || '', optionD: q.optionD || '', correctAnswer: q.correctAnswer, questionType: q.questionType, marks: q.marks });
    requestAnimationFrame(() => questionEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const del = async (qid) => { const r = await Swal.fire({ title: 'Delete question?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e11d48' }); if (!r.isConfirmed) return; try { await api.delete('/assessments/' + id + '/questions/' + qid); qs.reload(); meta.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } };
  const regenerate = async (q) => {
    const result = await Swal.fire({
      title: 'Regenerate this question?',
      text: 'AI will replace this question and its answer choices. The question will stay unchanged if generation fails.',
      icon: 'question', showCancelButton: true, confirmButtonText: 'Regenerate', cancelButtonText: 'Keep question',
    });
    if (!result.isConfirmed) return;
    setRegenBusyId(q._id);
    try {
      const { data } = await api.post('/assessments/' + id + '/questions/' + q._id + '/regenerate', {
        topic: genF.topic || a?.technology || '', category: genF.category || a?.categories || 'Technical', difficulty: genF.difficulty || a?.difficulty || 'Medium',
      });
      qs.reload(); meta.reload();
      toast.success(`Question regenerated${data.data.model ? ` with ${data.data.model}` : ''}. Assessment moved to draft for review.`);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setRegenBusyId(null); }
  };
  const generate = async () => {
    setGenBusy(true);
    try {
      const { data } = await api.post('/assessments/' + id + '/generate', genF);
      qs.reload(); meta.reload();
      toast.success(data.data.inserted + ' questions generated' + (data.data.live ? ` with AI${data.data.model ? ` (${data.data.model})` : ''}` : ' from the offline bank') + '. Assessment moved to draft — review, then publish.');
      setGenOpen(false);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setGenBusy(false); }
  };
  const changePublishState = async () => {
    if (!a) return;
    const active = a.status === 'active';
    const questionCount = qs.data?.length || 0;
    if (!active && questionCount === 0) {
      toast.error('Add at least one question before publishing this assessment.');
      return;
    }
    const confirm = await Swal.fire({
      title: active ? 'Unpublish this assessment?' : 'Publish this assessment?',
      text: active
        ? 'Students will no longer be able to start new attempts. Existing submissions and results will remain available.'
        : `This will make the assessment available to applicants for ${a.job?.title || 'the linked job'} and notify them.`,
      icon: active ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: active ? 'Unpublish' : 'Publish assessment',
      cancelButtonText: 'Keep as is',
      confirmButtonColor: active ? '#c2414b' : '#5147e8',
    });
    if (!confirm.isConfirmed) return;
    setPublishBusy(true);
    try {
      await api.post(`/assessments/${id}/${active ? 'unpublish' : 'publish'}`);
      await meta.reload();
      toast.success(active ? 'Assessment unpublished. Existing results are preserved.' : 'Assessment published. Applicants have been notified.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setPublishBusy(false);
    }
  };
  const a = meta.data;
  return (
    <div className="cc-page">
      <Link className="small fw-semibold text-decoration-none" to="/company/assessments">← Back to assessments</Link>
      <PageHeader
        icon={<ClipboardList size={20} />}
        title={a?.title || 'Assessment workspace'}
        description={a ? `${a.durationMinutes} min · ${a.totalMarks} marks · pass ${a.passingPercentage}%${a.negativeMarking ? ' · −' + a.negativeMarks : ''} · ${a.difficulty}` : 'Manage questions, results and integrity violations.'}
        eyebrow="Company / Assessments / Workspace"
        actions={<>
          {a && <button className={`btn btn-sm ${a.status === 'active' ? 'btn-outline-danger' : 'btn-primary'}`} disabled={publishBusy || (a.status !== 'active' && (qs.loading || !(qs.data || []).length))} onClick={changePublishState} title={a.status === 'active' ? 'Stop new attempts' : (qs.data || []).length ? 'Publish this assessment to applicants' : 'Add at least one question before publishing'}>
            {publishBusy ? <><span className="cc-spin me-1" /> Saving…</> : a.status === 'active' ? <><PauseCircle size={14} /> Unpublish</> : <><Send size={14} /> Publish assessment</>}
          </button>}
          <Link className="btn btn-sm btn-outline-primary" to={`/company/assessment-results?assessmentId=${id}`}><BarChart3 size={14} /> View all results</Link>
          <button className="btn btn-sm btn-outline-primary" disabled={genBusy} onClick={() => setGenOpen(true)}>{genBusy ? 'Generating…' : <><Sparkles size={14} /> Generate with AI</>}</button>
        </>}
      />
      {a && !qs.loading && a.status !== 'active' && !(qs.data || []).length && <div className="cc-assessment-publish-hint" role="status"><CircleHelp size={16} /><span><b>One step left to publish</b><small>Add or generate at least one question. The Publish assessment button will be enabled when the question bank is ready.</small></span></div>}
      {a && <div className="d-flex gap-2 flex-wrap mb-3"><StatusBadge value={a.status} /><StatusBadge value={a.difficulty} /><StatusBadge value={a.categories} />{a.job?.title && <span className="cc-badge gray">{a.job.title}</span>}</div>}
      <div className="cc-assessment-overview" aria-label="Assessment summary">
        <div className="cc-assessment-stat"><span className="cc-assessment-stat-icon violet"><ClipboardList size={17} /></span><span><small>Questions</small><b>{qs.data?.length || 0}</b></span></div>
        <div className="cc-assessment-stat"><span className="cc-assessment-stat-icon blue"><Award size={17} /></span><span><small>Submissions</small><b>{results.data?.length || 0}</b></span></div>
        <div className="cc-assessment-stat"><span className="cc-assessment-stat-icon amber"><ShieldCheck size={17} /></span><span><small>Integrity events</small><b>{viols.data?.length || 0}</b></span></div>
        <div className="cc-assessment-stat"><span className="cc-assessment-stat-icon green"><Clock size={17} /></span><span><small>Duration</small><b>{a?.durationMinutes || '—'} <em>min</em></b></span></div>
      </div>
      <div className="cc-assessment-content mt-3">
        <SectionCard title="Question bank" subtitle={`${qs.data?.length || 0} questions · review the correct answer before publishing`} icon={<ClipboardList size={16} />} className="cc-assessment-section">
          {qs.loading ? <Loading rows={3} height={118} /> : (qs.data || []).length === 0 ? (
            <Empty title="No questions yet" hint="Add a question or generate a topic-specific set with AI to get started." icon={<CircleHelp />} />
          ) : (qs.data || []).map((q, i) => (
            <article key={q._id} className="cc-q-card cc-q-card-pro">
              <header className="cc-q-card-head">
                <div className="cc-q-number">{String(i + 1).padStart(2, '0')}</div>
                <div className="cc-q-prompt"><span>QUESTION {String(i + 1).padStart(2, '0')}</span><h3>{q.question}</h3></div>
                <div className="cc-q-tags"><span className="cc-q-type">{q.questionType || 'MCQ'}</span><span className="cc-q-marks">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span></div>
              </header>
              <div className="cc-q-options" role="list" aria-label={`Answer options for question ${i + 1}`}>
                {['A', 'B', 'C', 'D'].map((l) => (
                  <div key={l} role="listitem" className={`cc-q-option${q.correctAnswer === l ? ' is-correct' : ''}`}>
                    <span className="cc-q-option-key">{l}</span><span className="cc-q-option-text">{q['option' + l]}</span>
                    {q.correctAnswer === l && <span className="cc-q-correct"><CheckCircle2 size={14} /> Correct</span>}
                  </div>
                ))}
              </div>
              <footer className="cc-q-actions">
                <button className="btn btn-sm btn-outline-primary" disabled={!!regenBusyId || genBusy} onClick={() => regenerate(q)} title="Replace this question with a new AI generated question">{regenBusyId === q._id ? <><span className="cc-spin me-1" /> Generating…</> : <><RefreshCw size={13} /> Regenerate</>}</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => editQ(q)}><Pencil size={13} /> Edit</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => del(q._id)}><Trash2 size={13} /> Delete</button>
              </footer>
            </article>
          ))}
        </SectionCard>
        <div ref={questionEditorRef} className="cc-assessment-edit-anchor">
        <SectionCard title={editingId ? 'Edit question' : 'Add a question'} subtitle={editingId ? 'Update the prompt, answer choices and scoring, then save your changes.' : 'Write a clear prompt and four distinct answer choices.'} icon={editingId ? <Pencil size={16} /> : <Plus size={16} />} className={`cc-assessment-section cc-assessment-form-card${editingId ? ' is-editing' : ''}`}>
            <form onSubmit={add} className="cc-question-form">
              <label className="form-label" htmlFor="question-prompt">Question</label>
              <textarea id="question-prompt" required className="form-control" rows="3" placeholder="Enter the question prompt" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
              <div className="cc-form-label-row"><span className="form-label mb-0">Answer choices</span><small>Choose the correct answer below</small></div>
              <div className="cc-question-choice-fields">{['A', 'B', 'C', 'D'].map((l) => <label key={l} className="cc-choice-field"><span>{l}</span><input required className="form-control" placeholder={`Option ${l}`} value={f['option' + l]} onChange={(e) => setF({ ...f, ['option' + l]: e.target.value })} /></label>)}</div>
              <div className="cc-question-form-meta">
                <label className="cc-form-field"><span>Correct answer</span><select className="form-select" value={f.correctAnswer} onChange={(e) => setF({ ...f, correctAnswer: e.target.value })}>{['A', 'B', 'C', 'D'].map((l) => <option key={l} value={l}>Option {l}</option>)}</select></label>
                <label className="cc-form-field"><span>Question type</span><select className="form-select" value={f.questionType} onChange={(e) => setF({ ...f, questionType: e.target.value })}>{['MCQ', 'True/False', 'Technical', 'Aptitude', 'Logical Reasoning'].map((t) => <option key={t}>{t}</option>)}</select></label>
                <label className="cc-form-field cc-marks-field"><span>Marks</span><input type="number" min="1" className="form-control" value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })} /></label>
              </div>
              <div className="cc-question-form-actions"><button className="btn btn-primary"><CheckCircle2 size={15} /> {editingId ? 'Save changes' : 'Add question'}</button>{editingId && <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setF(blank); }}>Cancel</button>}</div>
            </form>
        </SectionCard>
        </div>
        <div className="cc-assessment-monitor-grid">
          <SectionCard title={'Results (' + (results.data?.length || 0) + ')'} subtitle="Latest student submissions" icon={<Award size={16} />} className="cc-assessment-section">
            <DataTable
              className="cc-assessment-table-wrap"
              columns={[
                { key: 'student', header: 'Student', render: (r) => <span className="small">{r.student?.name}</span> },
                { key: 'percentage', header: '%', align: 'right', render: (r) => <b className="small">{r.percentage}%</b> },
                { key: 'integrity', header: 'Integrity', render: (r) => <span className="small">{r.integrityStatus}</span> },
                { key: 'result', header: 'Result', render: (r) => <StatusBadge value={r.result} /> },
              ]}
              rows={(results.data || []).slice(0, 50)}
              loading={results.loading}
              empty="No results yet"
              emptyHint="Results appear when students submit the assessment."
            />
          </SectionCard>
          <SectionCard title={'Integrity events (' + (viols.data?.length || 0) + ')'} subtitle="Proctoring activity from student attempts" icon={<ShieldCheck size={16} />} className="cc-assessment-section">
            <DataTable
              className="cc-assessment-table-wrap"
              columns={[
                { key: 'student', header: 'Student', render: (v) => <span className="small">{v.student?.name}</span> },
                { key: 'violationType', header: 'Type', render: (v) => <span className="small">{v.violationType}</span> },
                { key: 'severity', header: 'Severity', render: (v) => <StatusBadge value={v.severity} /> },
                { key: 'occurredAt', header: 'When', render: (v) => <span className="small">{v.occurredAt ? new Date(v.occurredAt).toLocaleString() : '—'}</span> },
              ]}
              rows={(viols.data || []).slice(0, 50)}
              loading={viols.loading}
              empty="No violations"
              emptyHint="Proctoring events will appear here."
            />
          </SectionCard>
        </div>
      </div>
      <Modal open={genOpen} onClose={() => !genBusy && setGenOpen(false)} title="Generate questions" description="Questions will follow the topic you enter. If AI is not configured, the offline question bank is used; provider errors are shown without adding unrelated questions." size="md">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Topic / technologies</label>
            <input className="form-control" placeholder="e.g. JavaScript, DSA, aptitude" value={genF.topic} onChange={(e) => setGenF({ ...genF, topic: e.target.value })} />
            <div className="form-text">Required for Technical, Programming, Aptitude and Logical Reasoning.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label">Category</label>
            <select className="form-select" value={genF.category} onChange={(e) => setGenF({ ...genF, category: e.target.value })}>
              {['Technical', 'Programming', 'Aptitude', 'Logical Reasoning', 'Mixed'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={genF.difficulty} onChange={(e) => setGenF({ ...genF, difficulty: e.target.value })}>
              {['Medium', 'Easy', 'Hard', 'Mixed'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Count (1–20)</label>
            <input type="number" min="1" max="20" className="form-control" value={genF.count} onChange={(e) => setGenF({ ...genF, count: Math.max(1, Math.min(20, +e.target.value || 10)) })} />
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-primary" disabled={genBusy} onClick={generate}>{genBusy ? <><span className="cc-spin me-1" /> Generating…</> : <><Sparkles size={14} /> Generate</>}</button>
          <button className="btn btn-outline-secondary" disabled={genBusy} onClick={() => setGenOpen(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}

export function Interviews() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const navigate = useNavigate();
  const res = useFetch(async () => (await api.get('/interviews/company')).data.data, []);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ key: 'interviewDate', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [resch, setResch] = useState(null);
  const [reschF, setReschF] = useState({ interviewDate: '', interviewTime: '', reason: '' });
  const update = async (iv, patch) => { setBusy(true); try { await api.patch('/interviews/' + iv._id, patch); toast.success('Interview updated.'); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); } };
  const cancel = async (iv) => {
    const r = await Swal.fire({ title: 'Cancel interview?', input: 'text', inputLabel: 'Reason (min 3 characters)', inputValidator: (v) => (!v || v.trim().length < 3 ? 'Reason required.' : null), showCancelButton: true, confirmButtonText: 'Cancel interview', confirmButtonColor: '#e11d48' });
    if (!r.isConfirmed) return;
    await update(iv, { status: 'cancelled', notes: 'Cancelled: ' + r.value });
  };
  const openReschedule = (iv) => { setResch(iv); setReschF({ interviewDate: String(iv.interviewDate).slice(0, 10), interviewTime: iv.interviewTime || '', reason: '' }); };
  const doReschedule = async () => {
    if (!reschF.interviewDate || !reschF.interviewTime) { toast.error('Date and time are required.'); return; }
    setBusy(true);
    try {
      await api.patch('/interviews/' + resch._id, { interviewDate: reschF.interviewDate, interviewTime: reschF.interviewTime, status: 'rescheduled', notes: reschF.reason ? 'Rescheduled: ' + reschF.reason : undefined });
      toast.success('Interview rescheduled.'); setResch(null); res.reload();
    } catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  const all = res.data || [];
  const search = q.trim().toLowerCase();
  let filtered = all.filter((iv) => (!status || iv.status === status) && (!search || (iv.student?.name || '').toLowerCase().includes(search) || (iv.roundName || '').toLowerCase().includes(search) || (iv.interviewer || '').toLowerCase().includes(search)));
  const dir = sort.dir === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((a, b) => {
    if (sort.key === 'interviewDate') return (new Date(a.interviewDate) - new Date(b.interviewDate)) * dir;
    return String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? '')) * dir;
  });
  const limit = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
  const upcomingCount = all.filter((iv) => iv.status === 'scheduled').length;
  return (
    <div className="cc-page">
      <PageHeader icon={<Video size={20} />} title="Interviews" description="Track, reschedule and update interview outcomes." eyebrow="Company / Interviews" actions={<Link className="btn btn-primary btn-sm" to="/company/interviews/new"><Plus size={15} /> Schedule</Link>} />
      {upcomingCount > 0 && <div className="alert alert-info py-2 mb-3"><b>{upcomingCount}</b> scheduled interview{upcomingCount === 1 ? '' : 's'} upcoming.</div>}
      <Toolbar showClear={!!(q || status)} onClear={() => { setQ(''); setStatus(''); setPage(1); }}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search candidate, round or interviewer…" />
        <SelectFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['scheduled', 'completed', 'cancelled', 'rescheduled']} placeholder="All statuses" label="status" />
      </Toolbar>
      <DataTable
        columns={[
          { key: 'student', header: 'Candidate', render: (iv) => (
            <div style={{ minWidth: 0 }}>
              <b className="small">{iv.student?.name}</b>
              <div className="small text-muted">{iv.roundName}</div>
            </div>
          ) },
          { key: 'interviewDate', header: 'When', sortable: true, render: (iv) => <span className="small"><Calendar size={13} className="me-1" style={{ verticalAlign: '-2px' }} />{String(iv.interviewDate).slice(0, 10)} {iv.interviewTime}</span> },
          { key: 'mode', header: 'Mode', render: (iv) => <span className="small">{iv.mode}{iv.interviewer ? ` · ${iv.interviewer}` : ''}</span> },
          { key: 'status', header: 'Status', sortable: true, render: (iv) => <StatusBadge value={iv.status} /> },
          { key: 'result', header: 'Result', render: (iv) => <StatusBadge value={iv.result} /> },
          { key: 'actions', header: '', render: (iv) => (
            <div className="d-flex gap-1 flex-wrap">
              <select disabled={busy} className="form-select form-select-sm" style={{ maxWidth: 130 }} value={iv.result} onChange={(e) => update(iv, { result: e.target.value })}>{['Pending', 'Selected', 'Rejected', 'On Hold'].map((r) => <option key={r}>{r}</option>)}</select>
              {iv.status !== 'cancelled' && iv.status !== 'completed' && (
                <>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => openReschedule(iv)}>Reschedule</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(iv)}>Cancel</button>
                </>
              )}
            </div>
          ) },
        ]}
        rows={rows}
        loading={res.loading}
        empty={all.length ? 'No matches' : 'No interviews'}
        emptyHint={all.length ? 'Try clearing filters.' : 'Schedule an interview from a shortlisted application.'}
        sort={sort}
        onSort={(key, dir2) => setSort({ key, dir: dir2 })}
      />
      <Pager page={cur} pages={pages} onPage={setPage} />
      <Modal open={!!resch} onClose={() => !busy && setResch(null)} title="Reschedule interview" description={resch ? `${resch.student?.name} · ${resch.roundName}` : ''} size="sm">
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label">Date</label><input type="date" className="form-control" value={reschF.interviewDate} onChange={(e) => setReschF({ ...reschF, interviewDate: e.target.value })} /></div>
          <div className="col-md-6"><label className="form-label">Time</label><input type="time" className="form-control" value={reschF.interviewTime} onChange={(e) => setReschF({ ...reschF, interviewTime: e.target.value })} /></div>
          <div className="col-12"><label className="form-label">Reason</label><input className="form-control" placeholder="Optional note for the candidate" value={reschF.reason} onChange={(e) => setReschF({ ...reschF, reason: e.target.value })} /></div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-primary" disabled={busy} onClick={doReschedule}>{busy ? 'Saving…' : 'Reschedule'}</button>
          <button className="btn btn-outline-secondary" disabled={busy} onClick={() => setResch(null)}>Cancel</button>
        </div>
      </Modal>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/company/interviews/new')}><Plus size={14} /> Schedule interview</button>
      </div>
    </div>
  );
}

export function InterviewForm() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const loc = useLocation();
  const navigate = useNavigate();
  const [f, setF] = useState({ applicationId: loc.state?.applicationId || '', roundName: 'Technical Round', interviewDate: '', interviewTime: '', mode: 'Online', meetingLink: '', location: '', interviewer: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const apps = useFetch(async () => (await api.get('/company/applications', { params: { status: 'Shortlisted' } })).data.data, []);
  const submit = async (e) => {
    e.preventDefault();
    if (f.mode === 'Online' && !f.meetingLink.trim()) { toast.error('A meeting link is required for online interviews.'); return; }
    if (f.mode === 'Offline' && !f.location.trim()) { toast.error('A venue is required for offline interviews.'); return; }
    setBusy(true);
    try { await api.post('/interviews', f); toast.success('Interview scheduled.'); navigate('/company/interviews'); } catch (e2) { toast.error(apiErrorMessage(e2)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="cc-page" style={{ maxWidth: 720 }}>
      <PageHeader icon={<Video size={20} />} title="Schedule interview" description="Set up an interview with a shortlisted candidate." eyebrow="Company / Interviews / Schedule" />
      <SectionCard title="Interview details" icon={<Calendar size={16} />}>
        <form onSubmit={submit} className="row g-3">
          <div className="col-12">
            <label className="form-label">Candidate (shortlisted)</label>
            <select required className="form-select" value={f.applicationId} onChange={set('applicationId')}>
              <option value="">— Choose a shortlisted candidate —</option>
              {(apps.data || []).map(({ application: a }) => <option key={a._id} value={a._id}>{a.student?.name} · {a.job?.title}</option>)}
            </select>
            {!apps.loading && !(apps.data || []).length && <div className="form-text text-warning">No shortlisted candidates yet. Shortlist someone from Applications first.</div>}
          </div>
          <div className="col-md-6"><label className="form-label">Round</label><select className="form-select" value={f.roundName} onChange={set('roundName')}><option>Technical Round</option><option>HR Round</option><option>Final Round</option><option>Other</option></select></div>
          <div className="col-md-6"><label className="form-label">Mode</label><select className="form-select" value={f.mode} onChange={set('mode')}><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
          <div className="col-md-6"><label className="form-label">Date <span className="text-danger">*</span></label><input required type="date" className="form-control" value={f.interviewDate} onChange={set('interviewDate')} /></div>
          <div className="col-md-6"><label className="form-label">Time <span className="text-danger">*</span></label><input required type="time" className="form-control" value={f.interviewTime} onChange={set('interviewTime')} /></div>
          <div className="col-12"><label className="form-label">Meeting link {f.mode === 'Online' && <span className="text-danger">*</span>}</label><input className="form-control" placeholder="https://…" value={f.meetingLink} onChange={set('meetingLink')} /></div>
          <div className="col-12"><label className="form-label">Location {f.mode === 'Offline' && <span className="text-danger">*</span>}</label><input className="form-control" placeholder="Venue" value={f.location} onChange={set('location')} /></div>
          <div className="col-12"><label className="form-label">Interviewer</label><input className="form-control" placeholder="Name" value={f.interviewer} onChange={set('interviewer')} /></div>
          <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={f.notes} onChange={set('notes')} /></div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</button>
            <Link className="btn btn-outline-secondary" to="/company/interviews">Cancel</Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

export function Selection() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const res = useFetch(async () => (await api.get('/selections', { params: { limit: 200, ...(status ? { status } : {}) } })).data.data, [status]);
  const all = res.data || [];
  const search = q.trim().toLowerCase();
  const filtered = all.filter((s) => !search || (s.student?.name || '').toLowerCase().includes(search) || (s.application?.job?.title || '').toLowerCase().includes(search));
  const limit = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
  return (
    <div className="cc-page">
      <PageHeader icon={<Award size={20} />} title="Selections" description="Candidates you marked Selected, Rejected or On Hold." eyebrow="Company / Selection" actions={<Link className="btn btn-primary btn-sm" to="/company/offers/new"><Plus size={15} /> Draft offer</Link>} />
      <Toolbar showClear={!!(status || q)} onClear={() => { setStatus(''); setQ(''); setPage(1); }}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search candidate or job…" />
        <SelectFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={SELECTION_STATUSES} placeholder="All decisions" label="decision" />
      </Toolbar>
      <DataTable
        columns={[
          { key: 'student', header: 'Candidate', render: (s) => (
            <div style={{ minWidth: 0 }}>
              <b className="small">{s.student?.name}</b>
              <div className="small text-muted">{s.student?.email}</div>
            </div>
          ) },
          { key: 'job', header: 'Job', render: (s) => <span className="small">{s.application?.job?.title || 'Job'}</span> },
          { key: 'decision', header: 'Decision', render: (s) => <StatusBadge value={s.selectionStatus} /> },
          { key: 'remarks', header: 'Remarks', render: (s) => <span className="small text-muted">{s.remarks || '—'}</span> },
          { key: 'actions', header: '', render: (s) => (
            <div className="d-flex gap-1 flex-wrap">
              {s.selectionStatus === 'Selected' && <Link className="btn btn-sm btn-primary" to="/company/offers/new" state={{ selectionId: s._id }}>Draft offer</Link>}
              {s.application?._id && <Link className="btn btn-sm btn-outline-primary" to={'/company/applications/' + s.application._id}>View</Link>}
            </div>
          ) },
        ]}
        rows={rows}
        loading={res.loading}
        empty={all.length ? 'No matches' : 'No selections'}
        emptyHint={all.length ? 'Try clearing filters.' : 'Shortlist and select candidates from Applications.'}
      />
      <Pager page={cur} pages={pages} onPage={setPage} />
    </div>
  );
}

export function Offers() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/offers/company')).data.data, []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const withdraw = async (o) => { const r = await Swal.fire({ title: 'Withdraw offer?', input: 'text', inputLabel: 'Reason (min 3 characters)', inputValidator: (v) => (!v || v.trim().length < 3 ? 'Reason required.' : null), showCancelButton: true, confirmButtonText: 'Withdraw', confirmButtonColor: '#e11d48' }); if (!r.isConfirmed) return; try { await api.post('/offers/' + o._id + '/withdraw', { reason: r.value }); toast.success('Withdrawn.'); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } };
  const issue = async (o) => {
    const r = await Swal.fire({ title: 'Issue offer?', text: `The offer for ${o.student?.name} will be sent to the student.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Issue now' });
    if (!r.isConfirmed) return;
    try { await api.post('/offers/' + o._id + '/issue'); toast.success('Offer issued.'); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const all = res.data || [];
  const search = q.trim().toLowerCase();
  let filtered = all.filter((o) => (!status || o.status === status) && (!search || (o.student?.name || '').toLowerCase().includes(search) || (o.position || '').toLowerCase().includes(search) || (o.job?.title || '').toLowerCase().includes(search)));
  const dir = sort.dir === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((a, b) => {
    if (sort.key === 'createdAt' || sort.key === 'joiningDate' || sort.key === 'offerExpiry') {
      const va = a[sort.key] ? new Date(a[sort.key]).getTime() : 0;
      const vb = b[sort.key] ? new Date(b[sort.key]).getTime() : 0;
      return (va - vb) * dir;
    }
    return String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? '')) * dir;
  });
  const limit = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * limit, cur * limit);
  const count = (v) => all.filter((o) => o.status === v).length;
  return (
    <div className="cc-page">
      <PageHeader icon={<Award size={20} />} title="Offers" description="Draft, issue and track offers to selected candidates." eyebrow="Company / Offers" actions={<Link className="btn btn-primary btn-sm" to="/company/offers/new"><Plus size={15} /> Draft offer</Link>} />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className={`cc-badge ${!status ? 'primary' : 'gray'} border-0`} onClick={() => { setStatus(''); setPage(1); }} style={{ cursor: 'pointer' }}>All {all.length}</button>
        {['draft', 'pending', 'issued', 'viewed', 'accepted', 'rejected', 'withdrawn', 'expired'].map((s) => (
          <button key={s} className={`cc-badge ${status === s ? (s === 'accepted' ? 'green' : s === 'rejected' || s === 'withdrawn' || s === 'expired' ? 'red' : 'violet') : 'gray'} border-0`} onClick={() => { setStatus(status === s ? '' : s); setPage(1); }} style={{ cursor: 'pointer' }}>{s} {count(s)}</button>
        ))}
      </div>
      <Toolbar showClear={!!(q || status)} onClear={() => { setQ(''); setStatus(''); setPage(1); }}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search student, position or job…" />
      </Toolbar>
      <DataTable
        columns={[
          { key: 'student', header: 'Candidate', render: (o) => (
            <div style={{ minWidth: 0 }}>
              <b className="small">{o.student?.name}</b>
              <div className="small text-muted">{o.position}{o.department ? ` · ${o.department}` : ''}</div>
            </div>
          ) },
          { key: 'salary', header: 'Salary', render: (o) => <span className="small">{o.salary || '—'}</span> },
          { key: 'joiningDate', header: 'Joining', sortable: true, render: (o) => <span className="small">{o.joiningDate ? String(o.joiningDate).slice(0, 10) : '—'}</span> },
          { key: 'offerExpiry', header: 'Expires', sortable: true, render: (o) => <span className="small">{o.offerExpiry ? String(o.offerExpiry).slice(0, 10) : '—'}</span> },
          { key: 'status', header: 'Status', sortable: true, render: (o) => <StatusBadge value={o.status} /> },
          { key: 'actions', header: '', render: (o) => (
            <div className="d-flex gap-1 flex-wrap">
              <Link className="btn btn-sm btn-outline-primary" to={'/company/offers/' + o._id + '/letter'}>Letter</Link>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => downloadFile('/offers/' + o._id + '/letter', 'offer-' + o.position + '.pdf').catch((e) => toast.error(apiErrorMessage(e)))}><Download size={13} /></button>
              {['draft', 'pending'].includes(o.status) && <Link className="btn btn-sm btn-outline-secondary" to={'/company/offers/' + o._id + '/edit'}><Pencil size={13} /></Link>}
              {o.status === 'draft' && <button className="btn btn-sm btn-success" onClick={() => issue(o)}>Issue</button>}
              {['draft', 'pending', 'issued', 'viewed'].includes(o.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => withdraw(o)}>Withdraw</button>}
            </div>
          ) },
        ]}
        rows={rows}
        loading={res.loading}
        empty={all.length ? 'No offers match your filters' : 'No offers'}
        emptyHint={all.length ? 'Try clearing filters.' : 'Draft an offer from a Selected candidate.'}
        sort={sort}
        onSort={(key, dir2) => setSort({ key, dir: dir2 })}
      />
      <Pager page={cur} pages={pages} onPage={setPage} />
    </div>
  );
}

export function OfferForm() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState(() => (loc.state?.selectionId ? { ...OFFER_DEFAULTS, selectionId: loc.state.selectionId } : OFFER_DEFAULTS));
  const [loaded, setLoaded] = useState(!isEdit);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const selections = useFetch(async () => (await api.get('/selections', { params: { status: 'Selected', limit: 100 } })).data.data, []);
  const pickSelection = (e) => {
    const sel = (selections.data || []).find((s) => s._id === e.target.value);
    if (!sel) { setF({ ...f, selectionId: '', studentId: '', jobId: '' }); return; }
    const job = sel.application?.job;
    setF({ ...f, selectionId: sel._id, studentId: sel.student?._id || '', jobId: job?._id || '', position: f.position || job?.title || '' });
  };
  useFetch(async () => {
    if (!isEdit) {
      if (loc.state?.selectionId) {
        const sel = (selections.data || []).find((s) => s._id === loc.state.selectionId);
        if (sel) {
          const job = sel.application?.job;
          setF((prev) => ({ ...prev, studentId: sel.student?._id || '', jobId: job?._id || '', position: prev.position || job?.title || '' }));
        }
      }
      return null;
    }
    const { data } = await api.get('/offers/' + id);
    const o = data.data;
    if (!['draft', 'pending'].includes(o.status)) { toast.error('Only draft or pending offers can be edited (this one is ' + o.status + ').'); navigate('/company/offers'); return null; }
    setF({
      selectionId: '', studentId: '', jobId: '',
      position: o.position || '', department: o.department || '', workMode: o.workMode || '',
      salary: o.salary || '', joiningDate: o.joiningDate?.slice(0, 10) || '', location: o.location || '',
      employmentType: o.employmentType || 'Full Time', offerExpiry: o.offerExpiry?.slice(0, 10) || '',
      terms: o.terms || '', remarks: o.remarks || '',
      representativeName: o.representativeName || '', representativeDesignation: o.representativeDesignation || '',
    });
    setLoaded(true);
    return null;
  }, [id, selections.data]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      OFFER_FIELDS.forEach((k) => { if (f[k] !== undefined && f[k] !== null && f[k] !== '') fd.append(k, f[k]); });
      if (file) fd.append('file', file);
      if (isEdit) { await api.patch('/offers/' + id, fd); toast.success('Offer updated.'); }
      else { await api.post('/offers', fd); toast.success('Offer drafted.'); }
      navigate('/company/offers');
    } catch (e2) { toast.error(apiErrorMessage(e2)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (!loaded) return <Loading rows={3} />;
  return (
    <div className="cc-page" style={{ maxWidth: 820 }}>
      <PageHeader icon={<Award size={20} />} title={isEdit ? 'Edit offer' : 'Draft offer'} description={!isEdit ? 'Pick a Selected candidate, then fill in the offer letter details.' : 'Update offer details.'} eyebrow="Company / Offers" />
      <form onSubmit={submit}>
        {!isEdit && (
          <SectionCard title="Candidate" subtitle="Linked selection or manual IDs" icon={<Users size={16} />}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Selected candidate</label>
                <select className="form-select" value={f.selectionId} onChange={pickSelection}>
                  <option value="">— Choose a Selected candidate —</option>
                  {(selections.data || []).map((s) => <option key={s._id} value={s._id}>{s.student?.name} · {s.application?.job?.title || 'Job'}</option>)}
                </select>
                {!selections.loading && !(selections.data || []).length && <div className="form-text text-warning">No candidates marked “Selected” yet. Mark a candidate as Selected from Applications first, or enter IDs below.</div>}
              </div>
              <div className="col-md-6"><label className="form-label">Student ID (if no selection)</label><input className="form-control" placeholder="Student ID" value={f.studentId} onChange={set('studentId')} /></div>
              <div className="col-md-6"><label className="form-label">Job ID (if no selection)</label><input className="form-control" placeholder="Job ID" value={f.jobId} onChange={set('jobId')} /></div>
            </div>
          </SectionCard>
        )}
        <SectionCard title="Offer details" icon={<Award size={16} />}>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Position <span className="text-danger">*</span></label><input required className="form-control" placeholder="Position" value={f.position} onChange={set('position')} /></div>
            <div className="col-md-6"><label className="form-label">Department</label><input className="form-control" placeholder="e.g. Engineering" value={f.department} onChange={set('department')} /></div>
            <div className="col-md-4"><label className="form-label">Work mode</label><select className="form-select" value={f.workMode} onChange={set('workMode')}><option value="">—</option><option>Onsite</option><option>Remote</option><option>Hybrid</option></select></div>
            <div className="col-md-4"><label className="form-label">Salary / package</label><input className="form-control" placeholder="e.g. ₹8 LPA" value={f.salary} onChange={set('salary')} /></div>
            <div className="col-md-4"><label className="form-label">Employment type</label><select className="form-select" value={f.employmentType} onChange={set('employmentType')}><option>Full Time</option><option>Part Time</option><option>Internship</option><option>Contract</option></select></div>
            <div className="col-md-4"><label className="form-label">Joining date</label><input type="date" className="form-control" value={f.joiningDate} onChange={set('joiningDate')} /></div>
            <div className="col-md-4"><label className="form-label">Offer expiry</label><input type="date" className="form-control" value={f.offerExpiry} onChange={set('offerExpiry')} /></div>
            <div className="col-md-4"><label className="form-label">Location</label><input className="form-control" placeholder="Location" value={f.location} onChange={set('location')} /></div>
          </div>
        </SectionCard>
        <SectionCard title="Letter & representative" subtitle="Terms, remarks and signatory used on the generated PDF" icon={<FileText size={16} />}>
          <div className="row g-3">
            <div className="col-12"><label className="form-label">Terms & conditions</label><textarea className="form-control" rows={3} placeholder="Probation, benefits, notice period…" value={f.terms} onChange={set('terms')} /></div>
            <div className="col-12"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} placeholder="Additional notes for the candidate" value={f.remarks} onChange={set('remarks')} /></div>
            <div className="col-md-6"><label className="form-label">Representative name</label><input className="form-control" placeholder="Signatory name" value={f.representativeName} onChange={set('representativeName')} /></div>
            <div className="col-md-6"><label className="form-label">Representative designation</label><input className="form-control" placeholder="e.g. HR Manager" value={f.representativeDesignation} onChange={set('representativeDesignation')} /></div>
            <div className="col-12">
              <label className="form-label">Offer letter file (PDF/DOC)</label>
              <input type="file" accept=".pdf,.doc,.docx" className="form-control" onChange={(e) => setFile(e.target.files[0])} />
              {isEdit && <div className="form-text">Leave empty to keep the current letter.</div>}
            </div>
          </div>
        </SectionCard>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}</button>
          <Link className="btn btn-outline-secondary" to="/company/offers">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export function CompanyProfile() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/company/profile')).data.data, []);
  const [f, setF] = useState(null);
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  if (!f && res.data) setF(res.data);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api.patch('/company/profile', f); toast.success('Profile saved.'); res.reload(); } catch (e2) { toast.error(apiErrorMessage(e2)); } finally { setBusy(false); } };
  const upload = async () => { if (!logo) return; setLogoBusy(true); const fd = new FormData(); fd.append('file', logo); try { await api.post('/company/profile/logo', fd); toast.success('Logo updated.'); setLogo(null); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } finally { setLogoBusy(false); } };
  if (!f) return <Loading rows={3} />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const logoUrl = f.logo ? fileUrl(f.logo) : null;
  const profileFields = [f.companyName, f.industry, f.email, f.phone, f.website, f.city, f.address, f.description, f.logo];
  const completedFields = profileFields.filter((value) => String(value || '').trim()).length;
  const completion = Math.round((completedFields / profileFields.length) * 100);
  return (
    <div className="cc-page cc-company-profile-page">
      <PageHeader icon={<Building2 size={20} />} title="Company profile" description="Manage your company details and branding." eyebrow="Company / Profile" />
      <div className="cc-company-profile-layout">
        <SectionCard title="Company details" subtitle="Keep your hiring contact and company information up to date." icon={<Building2 size={16} />} className="cc-company-profile-details">
          <form onSubmit={save} className="row g-3">
            <div className="col-md-6"><label className="form-label">Company name <span className="text-danger">*</span></label><input required className="form-control" placeholder="Company name" value={f.companyName || ''} onChange={set('companyName')} /></div>
            <div className="col-md-6"><label className="form-label">Industry</label><input className="form-control" placeholder="Industry" value={f.industry || ''} onChange={set('industry')} /></div>
            <div className="col-md-6"><label className="form-label">Contact email</label><input type="email" className="form-control" placeholder="hr@company.com" value={f.email || ''} onChange={set('email')} /></div>
            <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" placeholder="Phone" value={f.phone || ''} onChange={set('phone')} /></div>
            <div className="col-md-6"><label className="form-label">Website</label><input className="form-control" placeholder="https://…" value={f.website || ''} onChange={set('website')} /></div>
            <div className="col-md-6"><label className="form-label">City</label><input className="form-control" placeholder="City" value={f.city || ''} onChange={set('city')} /></div>
            <div className="col-12"><label className="form-label">Address</label><input className="form-control" placeholder="Address" value={f.address || ''} onChange={set('address')} /></div>
            <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows={4} placeholder="Tell candidates about your company" value={f.description || ''} onChange={set('description')} /></div>
            <div className="col-12"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
          </form>
        </SectionCard>
        <aside className="cc-company-profile-aside">
          <SectionCard title="Brand & verification" subtitle="Your identity shown across the hiring portal." icon={<Building2 size={16} />} className="cc-company-profile-brand">
            <div className="cc-company-profile-brand-row">
              {logoUrl ? <img src={logoUrl} alt="Company logo" className="cc-company-profile-logo" /> : <span className="cc-company-profile-logo-placeholder">{(f.companyName || '?').trim()[0]?.toUpperCase()}</span>}
              <div className="cc-company-profile-brand-name"><b>{f.companyName || 'Company name'}</b><StatusBadge value={f.verificationStatus} /></div>
            </div>
            <label className="form-label mt-3" htmlFor="company-logo-upload">Company logo</label>
            <input id="company-logo-upload" type="file" accept=".jpg,.jpeg,.png,.webp" className="form-control" onChange={(e) => setLogo(e.target.files[0])} />
            <button type="button" className="btn btn-outline-primary w-100 mt-2" disabled={!logo || logoBusy} onClick={upload}>{logoBusy ? 'Uploading…' : 'Upload logo'}</button>
          </SectionCard>
          <section className="cc-company-profile-progress">
            <div className="cc-company-profile-progress-head"><span className="cc-company-profile-progress-icon"><CheckCircle2 size={17} /></span><span><small>PROFILE COMPLETENESS</small><b>{completion}% complete</b></span></div>
            <div className="cc-company-profile-progress-track" role="progressbar" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${completion}%` }} /></div>
            <p>{completion === 100 ? 'Your company profile is ready for candidates.' : 'Add the remaining details to give candidates a clearer picture of your company.'}</p>
          </section>
          <section className="cc-company-profile-preview">
            <span className="cc-company-profile-preview-label">PROFILE PREVIEW</span>
            <h3>{f.companyName || 'Company name'}</h3>
            <p>{[f.industry, f.city].filter(Boolean).join(' · ') || 'Industry and location will appear here.'}</p>
            {f.email && <small>{f.email}</small>}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function Verification() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const res = useFetch(async () => (await api.get('/company/documents')).data.data, []);
  const profileRes = useFetch(async () => (await api.get('/company/profile')).data.data, []);
  const [file, setFile] = useState(null);
  const [dtype, setDtype] = useState('Registration Certificate');
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData(); fd.append('file', file); fd.append('documentType', dtype);
    try { await api.post('/company/documents', fd); toast.success('Document uploaded for TPO review.'); setFile(null); res.reload(); }
    catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  const del = async (id) => { const r = await Swal.fire({ title: 'Delete document?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e11d48' }); if (!r.isConfirmed) return; try { await api.delete('/company/documents/' + id); res.reload(); } catch (e) { toast.error(apiErrorMessage(e)); } };
  const vp = profileRes.data?.verificationStatus;
  return (
    <div className="cc-page">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Verification"
        description="Upload documents for TPO review. Jobs can be posted once verified."
        eyebrow="Company / Verification"
        actions={vp ? <StatusBadge value={vp} /> : null}
      />
      {vp === 'pending' && <div className="alert alert-info py-2 mb-3">Your documents are under review by the TPO team. You will be notified once verified.</div>}
      {vp === 'rejected' && <div className="alert alert-danger py-2 mb-3">Verification was rejected. Please upload updated documents and contact the TPO.</div>}
      {vp === 'verified' && <div className="alert alert-success py-2 mb-3"><CheckCircle2 size={14} className="me-1" style={{ verticalAlign: '-2px' }} />Your company is verified — you can post jobs freely.</div>}
      <SectionCard title="Upload document" icon={<Plus size={16} />}>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <select className="form-select" style={{ maxWidth: 260 }} value={dtype} onChange={(e) => setDtype(e.target.value)}>
            <option>Registration Certificate</option><option>GST</option><option>PAN</option><option>Letterhead</option><option>Other</option>
          </select>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="form-control" style={{ maxWidth: 320 }} onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn btn-primary" disabled={!file || busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</button>
        </div>
      </SectionCard>
      <SectionCard title={`Documents (${(res.data || []).length})`} icon={<FileText size={16} />}>
        <DataTable
          columns={[
            { key: 'documentType', header: 'Type', render: (d) => <b className="small">{d.documentType}</b> },
            { key: 'documentName', header: 'File', render: (d) => <span className="small text-muted">{d.documentName}</span> },
            { key: 'uploadedAt', header: 'Uploaded', render: (d) => <span className="small">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}</span> },
            { key: 'actions', header: '', render: (d) => <button className="btn btn-sm btn-outline-danger" onClick={() => del(d._id)}><Trash2 size={14} /> Delete</button> },
          ]}
          rows={res.data || []}
          loading={res.loading}
          empty="No documents uploaded"
          emptyHint="Upload at least a registration certificate to get verified."
        />
      </SectionCard>
    </div>
  );
}
