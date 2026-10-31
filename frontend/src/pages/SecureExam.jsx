import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Maximize, Shield, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import api, { apiErrorMessage } from '../services/api';
import { confirmAction } from '../services/alerts';

const VIOLATIONS = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'CONTEXT_MENU', 'SHORTCUT_ATTEMPT', 'PRINTSCREEN_ATTEMPT', 'NETWORK_INTERRUPTION', 'SAVE_FAIL'];
const formatTime = (seconds) => {
  const s = Math.max(0, seconds || 0);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function AssessmentOpen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const receiveSubmission = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'campusnexus:assessment-submitted' && event.data?.type !== 'careerconnect:assessment-submitted') return;
      const attemptId = String(event.data.attemptId || '');
      if (!/^[a-f\d]{24}$/i.test(attemptId)) return;
      navigate(`/student/attempt/${attemptId}`, { replace: true });
    };
    window.addEventListener('message', receiveSubmission);
    return () => window.removeEventListener('message', receiveSubmission);
  }, [navigate]);

  const openExam = () => {
    if (!agreed) return;
    const sessionKey = `cc-exam-session:${id}`;
    let sessionId = sessionStorage.getItem(sessionKey) || sessionStorage.getItem('cc-exam-session');
    if (!sessionId) {
      sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(sessionKey, sessionId);
    }
    const url = `${window.location.origin}/student/exam/${id}?session=${encodeURIComponent(sessionId)}`;
    const width = Math.min(window.screen.availWidth || 1440, 1600);
    const height = Math.min(window.screen.availHeight || 900, 1000);
    const examWindow = window.open(url, '_blank', `popup=yes,width=${width},height=${height},left=20,top=20,resizable=yes,scrollbars=yes`);
    if (!examWindow) {
      toast.info('Popup blocked. Opening the secure assessment in this tab.');
      navigate(`/student/exam/${id}?session=${encodeURIComponent(sessionId)}`);
      return;
    }
    examWindow.focus();
  };

  return (
    <div className="cc-exam-intro">
      <Link className="cc-exam-back" to="/student/assessments"><ChevronLeft size={16} /> My assessments</Link>
      <section className="cc-exam-intro-card">
        <div className="cc-exam-intro-icon"><Shield size={25} /></div>
        <span className="cc-exam-eyebrow">SECURE ASSESSMENT</span>
        <h1>Get ready for your assessment</h1>
        <p className="cc-exam-intro-copy">Your exam opens in a dedicated window. Enter fullscreen there before the server timer starts. Your answers save automatically.</p>
        <div className="cc-exam-rule-grid">
          <div><CheckCircle2 size={18} /><span>Questions appear one at a time. You can move between them.</span></div>
          <div><Clock size={18} /><span>The server controls the timer. Leaving does not pause it.</span></div>
          <div><ShieldAlert size={18} /><span>Leaving the exam, fullscreen, or using copy and paste is recorded.</span></div>
          <div><Check size={18} /><span>Three integrity violations block and submit the attempt.</span></div>
        </div>
        <label className="cc-exam-agreement"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>I have read and agree to follow these assessment instructions.</span></label>
        <button className="btn btn-primary cc-exam-open-btn" disabled={!agreed} onClick={openExam}><Maximize size={16} /> Open secure exam window <ChevronRight size={16} /></button>
        <p className="cc-exam-popup-note">If your browser blocks pop-ups, the exam opens in this tab.</p>
      </section>
    </div>
  );
}

export function Exam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionKey = `cc-exam-session:${id}`;
  const [sessionId] = useState(() => new URLSearchParams(window.location.search).get('session') || sessionStorage.getItem(sessionKey) || sessionStorage.getItem('cc-exam-session') || window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [paper, setPaper] = useState(null);
  const [starting, setStarting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [saveStatus, setSaveStatus] = useState('All changes saved');
  const [online, setOnline] = useState(navigator.onLine);
  const [fullscreenLost, setFullscreenLost] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [integrityStatus, setIntegrityStatus] = useState('NORMAL');
  const pending = useRef({});
  const lastViolation = useRef(0);
  const blocked = useRef(false);
  const submitting = useRef(false);
  const submitRef = useRef(null);
  const attemptId = paper?.attemptId;

  function returnToResult(attempt) {
    const resultPath = `/student/attempt/${attempt}`;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'campusnexus:assessment-submitted', attemptId: attempt }, window.location.origin);
        window.close();
        window.setTimeout(() => { if (!window.closed) navigate(resultPath, { replace: true }); }, 250);
        return;
      }
    } catch { /* If the opener is unavailable, show the result in this tab. */ }
    navigate(resultPath, { replace: true });
  }

  useEffect(() => { sessionStorage.setItem(sessionKey, sessionId); }, [sessionKey, sessionId]);

  async function reportViolation(type, description) {
    if (!attemptId || blocked.current || !VIOLATIONS.includes(type)) return;
    const now = Date.now();
    if (now - lastViolation.current < 1200) return;
    lastViolation.current = now;
    try {
      const { data } = await api.post(`/attempts/${attemptId}/violation`, { type, description });
      const result = data.data;
      setViolationCount(result.violationCount || 0);
      setIntegrityStatus(result.integrityStatus || 'NORMAL');
      if (result.blocked) {
        blocked.current = true;
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        toast.error('Assessment blocked after repeated integrity violations. Saved answers were submitted.');
        returnToResult(attemptId);
      } else toast.warning(`Integrity alert ${result.violationCount}/3 · ${description}`);
    } catch { /* The server remains authoritative for attempt state. */ }
  }

  async function saveAnswer(questionId, selected) {
    if (!attemptId) return;
    try {
      await api.post(`/attempts/${attemptId}/answer`, { questionId, selected });
      if (pending.current[questionId] === selected) delete pending.current[questionId];
      setSaveStatus('All changes saved');
    } catch {
      setSaveStatus(online ? 'Retrying save…' : 'Waiting for connection');
      if (online) reportViolation('SAVE_FAIL', 'An answer could not be saved');
    }
  }

  function flushPending() {
    Object.entries(pending.current).forEach(([questionId, selected]) => saveAnswer(questionId, selected));
  }

  async function submitExam(auto = false) {
    if (!attemptId || submitting.current) return;
    if (!auto) {
      const confirmed = await confirmAction({ title: 'Submit assessment?', text: 'After submission, your answers cannot be changed.', icon: 'question', confirmButtonText: 'Submit assessment' });
      if (!confirmed) return;
    }
    submitting.current = true;
    try {
      await Promise.all(Object.entries(pending.current).map(([questionId, selected]) => api.post(`/attempts/${attemptId}/answer`, { questionId, selected }).catch(() => {})));
      await api.post(`/attempts/${attemptId}/submit`);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      returnToResult(attemptId);
    } catch (error) {
      submitting.current = false;
      toast.error(apiErrorMessage(error));
    }
  }
  submitRef.current = submitExam;

  async function beginExam() {
    if (starting) return;
    setStarting(true);
    try {
      if (!document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen) throw new Error('Fullscreen mode is not supported in this browser.');
        await document.documentElement.requestFullscreen();
      }
      if (!document.fullscreenElement) throw new Error('Allow fullscreen mode to start the secure assessment.');
      const { data } = await api.post(`/assessments/${id}/start`, { sessionId });
      const activePaper = data.data;
      const restored = {};
      activePaper.answers?.forEach((entry) => { restored[entry.question] = entry.selected; });
      setAnswers(restored);
      setViolationCount(activePaper.violationCount || 0);
      setIntegrityStatus(activePaper.integrityStatus || 'NORMAL');
      setPaper(activePaper);
    } catch (error) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      toast.error(error.message?.includes('Fullscreen') ? error.message : apiErrorMessage(error));
    } finally { setStarting(false); }
  }

  useEffect(() => {
    if (!paper?.expiresAt) return undefined;
    const tick = () => {
      const next = Math.max(0, Math.floor((new Date(paper.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0) submitRef.current?.(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [paper]);

  useEffect(() => {
    if (!attemptId) return undefined;
    let active = true;
    const report = (type, description) => { if (active) reportViolation(type, description); };
    const heartbeat = setInterval(() => api.post(`/attempts/${attemptId}/heartbeat`).catch(() => {}), 12000);
    const autosave = setInterval(flushPending, 8000);
    const onVisibility = () => { if (document.hidden) report('TAB_SWITCH', 'Switched away from the exam'); };
    const onBlur = () => report('WINDOW_BLUR', 'Exam window lost focus');
    const onFullscreen = () => {
      if (!document.fullscreenElement && !submitting.current) {
        setFullscreenLost(true);
        report('FULLSCREEN_EXIT', 'Exited fullscreen mode');
      } else setFullscreenLost(false);
    };
    const onCopy = (event) => { event.preventDefault(); report('COPY_ATTEMPT', 'Copy attempted'); };
    const onCut = (event) => { event.preventDefault(); report('CUT_ATTEMPT', 'Cut attempted'); };
    const onPaste = (event) => { event.preventDefault(); report('PASTE_ATTEMPT', 'Paste attempted'); };
    const onContext = (event) => { event.preventDefault(); report('CONTEXT_MENU', 'Context menu opened'); };
    const onDrag = (event) => { event.preventDefault(); report('COPY_ATTEMPT', 'Drag or text export attempted'); };
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      if (event.key === 'PrintScreen') report('PRINTSCREEN_ATTEMPT', 'Print Screen key pressed');
      else if (event.key === 'F12' || ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v', 'p', 's', 'u'].includes(key)) || ((event.ctrlKey || event.metaKey) && event.shiftKey && ['i', 'j', 'c'].includes(key))) {
        event.preventDefault(); report('SHORTCUT_ATTEMPT', 'Restricted keyboard shortcut pressed');
      }
    };
    const onOffline = () => { setOnline(false); report('NETWORK_INTERRUPTION', 'Network connection lost'); };
    const onOnline = () => { setOnline(true); flushPending(); };
    const onSelect = (event) => event.preventDefault();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('keydown', onKey);
    document.addEventListener('selectstart', onSelect);
    document.addEventListener('dragstart', onDrag);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      clearInterval(heartbeat); clearInterval(autosave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('selectstart', onSelect);
      document.removeEventListener('dragstart', onDrag);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [attemptId]);

  if (!paper) return (
    <main className="cc-exam-page cc-exam-gate">
      <div className="cc-exam-gate-brand"><span className="cc-exam-brand-mark">C</span><span>CampusNexus<small>SECURE EXAM</small></span></div>
      <section className="cc-exam-gate-card">
        <div className="cc-exam-gate-icon"><Shield size={27} /></div>
        <span className="cc-exam-eyebrow">SECURE SESSION READY</span>
        <h1>Start your assessment</h1>
        <p>Enter fullscreen to load your questions and start the official timer. Keep this window active until you submit.</p>
        <div className="cc-exam-gate-checks"><span><CheckCircle2 size={16} /> Questions appear one at a time</span><span><CheckCircle2 size={16} /> Answers save automatically</span><span><CheckCircle2 size={16} /> Integrity checks are active</span></div>
        <button className="cc-exam-start-btn" disabled={starting} onClick={beginExam}>{starting ? <><span className="cc-exam-spinner" /> Preparing secure attempt…</> : <><Maximize size={17} /> Enter fullscreen &amp; start</>}</button>
        <Link className="cc-exam-exit-link" to={`/student/assessments/${id}`}>Return to assessment instructions</Link>
      </section>
      <p className="cc-exam-gate-foot">CampusNexus secure assessment · Do not close this window while an attempt is active</p>
    </main>
  );

  const questions = paper.questions || [];
  const question = questions[current];
  const answered = Object.values(answers).filter(Boolean).length;
  const timer = secondsLeft === null ? '—' : formatTime(secondsLeft);
  if (!question) return <main className="cc-exam-page cc-exam-gate"><p>No questions are available for this attempt.</p></main>;

  const choose = (letter) => {
    const selected = answers[question._id] === letter ? null : letter;
    setAnswers((previous) => ({ ...previous, [question._id]: selected }));
    pending.current[question._id] = selected;
    setSaveStatus('Saving answer…');
    saveAnswer(question._id, selected);
  };

  return (
    <main className="cc-exam-page">
      <header className="cc-exam-topbar">
        <div className="cc-exam-brand"><span className="cc-exam-brand-mark">C</span><span>CampusNexus<small>SECURE ASSESSMENT</small></span></div>
        <div className="cc-exam-title"><span>Assessment in progress</span><strong>{paper.title || 'Assessment'}</strong></div>
        <div className="cc-exam-status"><span className={`cc-exam-save ${saveStatus !== 'All changes saved' ? 'is-saving' : ''}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? saveStatus : 'Offline · reconnecting'}</span><span className={`cc-exam-clock ${secondsLeft !== null && secondsLeft < 300 ? 'is-low' : ''}`}><Clock size={16} /><b>{timer}</b><small>REMAINING</small></span></div>
      </header>
      <div className="cc-exam-workspace">
        <section className="cc-exam-main">
          <div className="cc-exam-progress-head"><div><span className="cc-exam-eyebrow">QUESTION {String(current + 1).padStart(2, '0')} OF {String(questions.length).padStart(2, '0')}</span><h1>{answered} of {questions.length} answered</h1></div><span className={`cc-exam-integrity ${integrityStatus === 'FLAGGED' ? 'is-flagged' : ''}`}><Shield size={15} />{integrityStatus === 'FLAGGED' ? 'Integrity flagged' : 'Integrity active'} · {violationCount}/3</span></div>
          <div className="cc-exam-progress-track"><span style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }} /></div>
          <article className="cc-exam-question-card" key={question._id}>
            <div className="cc-exam-question-meta"><span>QUESTION {String(current + 1).padStart(2, '0')}</span><span>{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span></div>
            <h2>{question.question}</h2>
            <div className="cc-exam-options" role="radiogroup" aria-label={`Answers for question ${current + 1}`}>
              {Object.entries(question.options || {}).map(([letter, text]) => <button key={letter} type="button" role="radio" aria-checked={answers[question._id] === letter} className={`cc-exam-option ${answers[question._id] === letter ? 'is-selected' : ''}`} onClick={() => choose(letter)}><span className="cc-exam-option-key">{letter}</span><span>{text}</span>{answers[question._id] === letter && <CheckCircle2 size={18} />}</button>)}
            </div>
          </article>
          <div className="cc-exam-nav-row"><button className="cc-exam-nav-btn" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}><ChevronLeft size={17} /> Previous</button><span className="cc-exam-answer-hint">{answers[question._id] ? 'Your answer is saved automatically' : 'Choose an answer or continue without answering'}</span>{current < questions.length - 1 ? <button className="cc-exam-nav-btn is-primary" onClick={() => setCurrent((value) => value + 1)}>Next <ChevronRight size={17} /></button> : <button className="cc-exam-nav-btn is-submit" onClick={() => submitExam(false)}>Review &amp; submit <Check size={16} /></button>}</div>
        </section>
        <aside className="cc-exam-side">
          <section className="cc-exam-side-card"><div className="cc-exam-side-heading"><div><span className="cc-exam-eyebrow">YOUR PROGRESS</span><h2>Question navigator</h2></div><span>{answered}/{questions.length}</span></div><div className="cc-exam-question-grid">{questions.map((item, index) => <button type="button" key={item._id} className={`cc-exam-question-jump ${index === current ? 'is-current' : ''} ${answers[item._id] ? 'is-answered' : ''}`} onClick={() => setCurrent(index)} aria-label={`Go to question ${index + 1}`} aria-current={index === current ? 'step' : undefined}>{String(index + 1).padStart(2, '0')}</button>)}</div><div className="cc-exam-legend"><span><i className="answered" />Answered</span><span><i />Not answered</span></div></section>
          <section className="cc-exam-side-card cc-exam-integrity-card"><div className="cc-exam-integrity-icon"><Shield size={18} /></div><div><b>Integrity monitor</b><p>{violationCount === 0 ? 'Keep this exam window active.' : `${violationCount} of 3 integrity alerts recorded.`}</p></div><span className={integrityStatus === 'FLAGGED' ? 'is-flagged' : ''}>{integrityStatus === 'FLAGGED' ? 'Flagged' : 'Active'}</span></section>
          <button className="cc-exam-submit-full" onClick={() => submitExam(false)}>Submit assessment</button>
        </aside>
      </div>
      {fullscreenLost && <div className="cc-exam-fs-overlay"><section><div className="cc-exam-gate-icon"><Maximize size={25} /></div><span className="cc-exam-eyebrow">FULLSCREEN REQUIRED</span><h2>Return to your assessment</h2><p>Leaving fullscreen was recorded. Your server timer is still running.</p><button className="cc-exam-start-btn" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}><Maximize size={16} /> Return to fullscreen</button></section></div>}
    </main>
  );
}
