import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Award, Bell, BookOpen, Briefcase, Building2, Calendar, Camera, Check, CheckCircle, CheckCircle2,
  ChevronDown, Clock, Compass, Download, ExternalLink, FileCheck, FileText, FolderKanban,
  GraduationCap, Home, Info, Laptop, Layers, Lock, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, Save, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Upload, User, X,
} from 'lucide-react';
import api, { apiErrorMessage, downloadFile, fileUrl } from '../services/api';
import { useFetch } from '../hooks/useUnread';
import { confirmDanger } from '../services/alerts';
import {
  ChoiceCard, Empty, ErrorState, Field, JobCard, KpiCard,
  Loading, Modal, PageContainer, PageHeader, ProgressIndicator, SectionCard,
  SearchInput,
} from '../components/ui';

/* ==================================================================
   SHARED HELPERS & UTILITIES
   ================================================================== */
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(d).slice(0, 10);
  }
}

function isValidUrl(s) {
  if (!s || !s.trim()) return true;
  try {
    const url = new URL(s.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ==================================================================
   1. EDUCATION PAGE (/student/education)
   ================================================================== */
const QUALIFICATIONS = ['10th', '12th', 'Diploma', 'Graduation', 'Post Graduation', 'Other'];

export function Education() {
  const res = useFetch(async () => (await api.get('/students/education')).data.data, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    qualification: 'Graduation',
    institute: '',
    board: '',
    stream: '',
    university: '',
    course: '',
    branch: '',
    passingYear: '',
    gradeType: 'cgpa',
    cgpa: '',
    percentage: '',
    isPursuing: false,
  });

  const list = res.data || [];

  const openAdd = () => {
    setEditing(null);
    setForm({
      qualification: 'Graduation',
      institute: '',
      board: '',
      stream: '',
      university: '',
      course: '',
      branch: '',
      passingYear: '',
      gradeType: 'cgpa',
      cgpa: '',
      percentage: '',
      isPursuing: false,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const hasCgpa = item.cgpa != null && item.cgpa !== '';
    setForm({
      qualification: item.qualification || 'Graduation',
      institute: item.institute || '',
      board: item.board || '',
      stream: item.stream || '',
      university: item.university || '',
      course: item.course || '',
      branch: item.branch || '',
      passingYear: item.passingYear ? String(item.passingYear) : '',
      gradeType: hasCgpa ? 'cgpa' : 'percentage',
      cgpa: item.cgpa != null ? String(item.cgpa) : '',
      percentage: item.percentage != null ? String(item.percentage) : '',
      isPursuing: item.passingYear == null && (item.cgpa == null && item.percentage == null),
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.qualification) errs.qualification = 'Qualification is required.';
    if (!form.institute.trim()) errs.institute = 'Institute name is required.';
    else if (form.institute.trim().length > 180) errs.institute = 'Institute name must not exceed 180 characters.';

    if (!form.isPursuing && form.passingYear) {
      const yr = Number(form.passingYear);
      if (isNaN(yr) || yr < 1950 || yr > 2100) {
        errs.passingYear = 'Enter a valid year between 1950 and 2100.';
      }
    }

    if (form.gradeType === 'cgpa' && form.cgpa) {
      const g = Number(form.cgpa);
      if (isNaN(g) || g < 0 || g > 10) {
        errs.cgpa = 'CGPA must be a valid number between 0 and 10.';
      }
    } else if (form.gradeType === 'percentage' && form.percentage) {
      const p = Number(form.percentage);
      if (isNaN(p) || p < 0 || p > 100) {
        errs.percentage = 'Percentage must be between 0 and 100.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);

    const payload = {
      qualification: form.qualification,
      institute: form.institute.trim(),
      board: form.board?.trim() || null,
      stream: form.stream?.trim() || null,
      university: form.university?.trim() || null,
      course: form.course?.trim() || null,
      branch: form.branch?.trim() || null,
      passingYear: form.isPursuing ? null : (form.passingYear ? Number(form.passingYear) : null),
      percentage: form.gradeType === 'percentage' && form.percentage ? Number(form.percentage) : null,
      cgpa: form.gradeType === 'cgpa' && form.cgpa ? Number(form.cgpa) : null,
    };

    try {
      if (editing) {
        await api.patch(`/students/education/${editing._id}`, payload);
        toast.success('Education record updated.');
      } else {
        await api.post('/students/education', payload);
        toast.success('Education record added.');
      }
      setModalOpen(false);
      res.reload();
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    const ok = await confirmDanger({
      title: 'Delete education record?',
      text: 'This academic record will be permanently removed from your student profile.',
      confirmButtonText: 'Yes, delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/students/education/${id}`);
      res.reload();
      toast.success('Education record deleted.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  // Summary Metrics
  const highestQual = useMemo(() => {
    const order = ['Post Graduation', 'Graduation', 'Diploma', '12th', '10th', 'Other'];
    for (const q of order) {
      if (list.some((it) => it.qualification === q)) return q;
    }
    return list[0]?.qualification || 'None added';
  }, [list]);

  const latestScore = useMemo(() => {
    const withScore = list.find((it) => it.cgpa != null || it.percentage != null);
    if (!withScore) return '—';
    return withScore.cgpa != null ? `${withScore.cgpa} CGPA` : `${withScore.percentage}%`;
  }, [list]);

  const pursuingCount = useMemo(() => list.filter((it) => !it.passingYear).length, [list]);

  return (
    <PageContainer>
      <PageHeader
        title="Education Profile"
        eyebrow="Academic Background"
        icon={<GraduationCap size={24} />}
        description="Manage your academic degrees, institutions, specializations, and performance records for campus placements."
        actions={
          <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openAdd}>
            <Plus size={16} /> Add Qualification
          </button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<GraduationCap size={20} />} label="Total Records" value={list.length} tone="primary" />
        <KpiCard icon={<Award size={20} />} label="Highest Level" value={highestQual} tone="violet" />
        <KpiCard icon={<Sparkles size={20} />} label="Academic Score" value={latestScore} tone="success" />
        <KpiCard icon={<Clock size={20} />} label="Currently Pursuing" value={pursuingCount ? `${pursuingCount} ongoing` : 'None'} tone="amber" />
      </div>

      {/* Main Content Area */}
      {res.loading ? (
        <Loading rows={3} height={120} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !list.length ? (
        <Empty
          title="No education records found"
          hint="Add your academic history including high school, diploma, undergraduate, or postgraduate qualifications to strengthen your candidate profile."
          icon={<GraduationCap size={44} />}
          action={
            <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openAdd}>
              <Plus size={16} /> Add Your First Qualification
            </button>
          }
        />
      ) : (
        <div className="cc-grid-cards">
          {list.map((it) => {
            const isOngoing = !it.passingYear;
            const scoreLabel = it.cgpa != null ? `CGPA: ${it.cgpa} / 10` : it.percentage != null ? `${it.percentage}%` : null;

            return (
              <motion.article
                key={it._id}
                className="cc-edu-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <div className="cc-edu-card-head">
                    <div className="d-flex align-items-center gap-3">
                      <div className="cc-edu-card-badge-ic">
                        <GraduationCap size={22} />
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <h3 className="cc-edu-card-title">{it.qualification}</h3>
                          {isOngoing ? (
                            <span className="cc-badge green no-dot">Currently Pursuing</span>
                          ) : (
                            <span className="cc-badge gray no-dot">Class of {it.passingYear}</span>
                          )}
                        </div>
                        <div className="cc-edu-card-inst">{it.institute}</div>
                      </div>
                    </div>
                  </div>

                  <div className="cc-edu-card-meta">
                    {(it.course || it.branch) && (
                      <span>
                        <BookOpen size={14} />
                        {[it.course, it.branch].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {(it.university || it.board) && (
                      <span>
                        <Building2 size={14} />
                        {[it.university, it.board].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {it.stream && (
                      <span>
                        <Sparkles size={14} />
                        Stream: {it.stream}
                      </span>
                    )}
                  </div>
                </div>

                <div className="cc-edu-card-foot">
                  <div>
                    {scoreLabel ? (
                      <span className="cc-badge violet no-dot fw-bold">{scoreLabel}</span>
                    ) : (
                      <span className="small text-muted">Grade not specified</span>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      onClick={() => openEdit(it)}
                      title="Edit qualification"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                      onClick={() => del(it._id)}
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Qualification Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !busy && setModalOpen(false)}
        title={editing ? 'Edit Academic Qualification' : 'Add Academic Qualification'}
        description="Provide comprehensive details about your institution, course, and performance."
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-2 w-100">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="edu-form" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={busy}>
              {busy ? <RefreshCw size={14} className="cc-spin" /> : <Save size={14} />}
              {editing ? 'Update Qualification' : 'Save Qualification'}
            </button>
          </div>
        }
      >
        <form id="edu-form" onSubmit={submit} noValidate>
          <div className="row g-3">
            <div className="col-md-6">
              <Field label="Qualification Level" required error={errors.qualification}>
                <select
                  className="form-select"
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                >
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Institute Name" required error={errors.institute} hint="College, University, or School">
                <input
                  type="text"
                  className={`form-control ${errors.institute ? 'is-invalid' : ''}`}
                  placeholder="e.g. National Institute of Technology"
                  value={form.institute}
                  onChange={(e) => setForm({ ...form, institute: e.target.value })}
                  maxLength={180}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Degree / Course" hint="e.g. B.Tech, BCA, Higher Secondary">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bachelor of Technology"
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Branch / Specialization" hint="e.g. Computer Science, Mechanical">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Computer Science and Engineering"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="University / Affiliation" hint="e.g. Mumbai University, Autonomous">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. State Technical University"
                  value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Board / Stream" hint="For 10th/12th or stream focus">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. CBSE / Science with Mathematics"
                  value={form.board}
                  onChange={(e) => setForm({ ...form, board: e.target.value })}
                />
              </Field>
            </div>

            {/* Pursuing Toggle */}
            <div className="col-12">
              <div className="form-check form-switch p-2 rounded border bg-light-subtle d-flex align-items-center gap-2">
                <input
                  className="form-check-input ms-0"
                  type="checkbox"
                  id="edu-pursuing"
                  checked={form.isPursuing}
                  onChange={(e) => setForm({ ...form, isPursuing: e.target.checked })}
                />
                <label className="form-check-label fw-semibold mb-0" htmlFor="edu-pursuing">
                  I am currently pursuing this education (Ongoing degree)
                </label>
              </div>
            </div>

            {/* Passing Year */}
            {!form.isPursuing && (
              <div className="col-md-4">
                <Field label="Passing Year" error={errors.passingYear} hint="Year of graduation">
                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    className={`form-control ${errors.passingYear ? 'is-invalid' : ''}`}
                    placeholder="e.g. 2025"
                    value={form.passingYear}
                    onChange={(e) => setForm({ ...form, passingYear: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {/* Grading Scheme */}
            <div className={form.isPursuing ? 'col-md-6' : 'col-md-4'}>
              <Field label="Grading Format">
                <select
                  className="form-select"
                  value={form.gradeType}
                  onChange={(e) => setForm({ ...form, gradeType: e.target.value })}
                >
                  <option value="cgpa">CGPA (Scale of 10)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </Field>
            </div>

            {/* Grade Input */}
            <div className={form.isPursuing ? 'col-md-6' : 'col-md-4'}>
              {form.gradeType === 'cgpa' ? (
                <Field label="CGPA (0.00 – 10.00)" error={errors.cgpa} hint="e.g. 8.75">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    className={`form-control ${errors.cgpa ? 'is-invalid' : ''}`}
                    placeholder="e.g. 8.5"
                    value={form.cgpa}
                    onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
                  />
                </Field>
              ) : (
                <Field label="Percentage (0 – 100)" error={errors.percentage} hint="e.g. 85.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className={`form-control ${errors.percentage ? 'is-invalid' : ''}`}
                    placeholder="e.g. 85"
                    value={form.percentage}
                    onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

/* ==================================================================
   2. SKILLS PAGE (/student/skills)
   ================================================================== */
const POPULAR_SKILLS = [
  'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'Java',
  'SQL', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS', 'Git', 'Tailwind CSS',
  'REST APIs', 'Data Structures', 'Algorithms', 'Express.js', 'Problem Solving',
];

const PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function Skills() {
  const res = useFetch(async () => (await api.get('/students/skills')).data.data, []);
  const catalog = useFetch(async () => (await api.get('/skills')).data.data, []);

  const [name, setName] = useState('');
  const [proficiency, setProficiency] = useState('Intermediate');
  const [search, setSearch] = useState('');
  const [profFilter, setProfFilter] = useState('All');
  const [busy, setBusy] = useState(false);

  const list = res.data || [];
  const catalogList = catalog.data || [];

  const addSkillName = async (skillToAdd, prof = proficiency) => {
    const clean = String(skillToAdd || '').trim();
    if (!clean) return;

    // Check duplicate locally (case-insensitive)
    const exists = list.some(
      (s) => s.skill?.skillName?.toLowerCase().trim() === clean.toLowerCase()
    );
    if (exists) {
      toast.warn(`"${clean}" is already in your skill profile.`);
      return;
    }

    setBusy(true);
    try {
      await api.post('/students/skills', { skillName: clean, proficiency: prof });
      setName('');
      res.reload();
      toast.success(`Skill "${clean}" added successfully.`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removeSkill = async (skillId, skillTitle) => {
    try {
      await api.delete(`/students/skills/${skillId}`);
      res.reload();
      toast.success(`Removed "${skillTitle}".`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  // Filtered skills
  const filteredList = useMemo(() => {
    return list.filter((s) => {
      const title = s.skill?.skillName || '';
      const matchesSearch = title.toLowerCase().includes(search.toLowerCase());
      const matchesProf = profFilter === 'All' || s.proficiency === profFilter;
      return matchesSearch && matchesProf;
    });
  }, [list, search, profFilter]);

  // KPIs
  const advancedCount = useMemo(
    () => list.filter((s) => s.proficiency === 'Advanced' || s.proficiency === 'Expert').length,
    [list]
  );
  const intermediateCount = useMemo(
    () => list.filter((s) => s.proficiency === 'Intermediate').length,
    [list]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Skills & Competencies"
        eyebrow="Technical Profile"
        icon={<Sparkles size={24} />}
        description="Showcase programming languages, frameworks, developer tools, and domain proficiencies recruiters match against."
        meta={<span className="cc-badge violet no-dot">{list.length} skills added</span>}
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<Sparkles size={20} />} label="Total Skills" value={list.length} tone="primary" />
        <KpiCard icon={<Award size={20} />} label="Advanced / Expert" value={advancedCount} tone="success" />
        <KpiCard icon={<Laptop size={20} />} label="Intermediate" value={intermediateCount} tone="violet" />
        <KpiCard icon={<BookOpen size={20} />} label="Skill Catalog" value={`${catalogList.length}+ in pool`} tone="amber" />
      </div>

      {/* Add Skill Section */}
      <SectionCard title="Add a New Skill" icon={<Plus size={16} />} subtitle="Type a custom skill or select from the platform directory">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addSkillName(name, proficiency);
          }}
          className="row g-2 align-items-center"
        >
          <div className="col-12 col-md-6 col-lg-5">
            <input
              className="form-control"
              list="cc-skills-catalog"
              placeholder="e.g. React, Node.js, Python, PostgreSQL..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
            <datalist id="cc-skills-catalog">
              {catalogList.map((s) => (
                <option key={s._id} value={s.skillName} />
              ))}
            </datalist>
          </div>

          <div className="col-6 col-md-3 col-lg-3">
            <select
              className="form-select"
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              disabled={busy}
            >
              {PROFICIENCIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <button
              type="submit"
              className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-1"
              disabled={!name.trim() || busy}
            >
              {busy ? <RefreshCw size={14} className="cc-spin" /> : <Plus size={15} />}
              Add Skill
            </button>
          </div>
        </form>

        {/* Quick Add Suggestions */}
        <div className="mt-3 pt-3 border-top">
          <div className="small fw-semibold text-muted mb-2">Recommended Industry In-Demand Skills (Click to quick-add):</div>
          <div className="d-flex flex-wrap gap-2">
            {POPULAR_SKILLS.map((item) => {
              const alreadyHas = list.some(
                (s) => s.skill?.skillName?.toLowerCase().trim() === item.toLowerCase()
              );
              return (
                <button
                  key={item}
                  type="button"
                  className={`cc-skill-rec-pill ${alreadyHas ? 'opacity-50' : ''}`}
                  onClick={() => !alreadyHas && addSkillName(item, 'Intermediate')}
                  disabled={alreadyHas || busy}
                  title={alreadyHas ? 'Already in your profile' : `Add ${item}`}
                >
                  {alreadyHas ? <Check size={12} className="text-success" /> : <Plus size={12} />}
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Skills Inventory & Filter Toolbar */}
      <SectionCard
        title="Your Skills Inventory"
        icon={<Sparkles size={16} />}
        subtitle={`${filteredList.length} of ${list.length} skills visible`}
      >
        {/* Search & Filter Toolbar */}
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
          <div style={{ maxWidth: 320, width: '100%' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Filter your skills..." />
          </div>

          <div className="d-flex align-items-center gap-1 flex-wrap">
            <span className="small text-muted me-1">Proficiency:</span>
            {['All', ...PROFICIENCIES].map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${profFilter === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setProfFilter(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {res.loading ? (
          <Loading rows={2} height={50} />
        ) : res.error ? (
          <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
        ) : !list.length ? (
          <Empty
            title="No skills added yet"
            hint="Add technical skills, libraries, frameworks, and programming competencies above to match with employer job descriptions."
            icon={<Sparkles size={40} />}
          />
        ) : !filteredList.length ? (
          <Empty title="No skills match your filters" hint="Try adjusting your search query or proficiency tab filter." bare />
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {filteredList.map((s) => {
              const skillTitle = s.skill?.skillName || 'Skill';
              const dotClass = (s.proficiency || 'intermediate').toLowerCase();

              return (
                <span key={s._id} className="cc-skill-chip" title={`Proficiency: ${s.proficiency}`}>
                  <span className={`cc-skill-prof-dot ${dotClass}`} aria-hidden="true" />
                  <span>{skillTitle}</span>
                  <span className="small text-muted">· {s.proficiency}</span>
                  <button
                    type="button"
                    className="cc-skill-del-btn"
                    onClick={() => removeSkill(s.skill?._id, skillTitle)}
                    aria-label={`Remove ${skillTitle}`}
                    title="Remove skill"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

/* ==================================================================
   3. PROJECTS PAGE (/student/projects)
   ================================================================== */
export function Projects() {
  const res = useFetch(async () => (await api.get('/students/projects')).data.data, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    technologies: '',
    projectUrl: '',
    githubUrl: '',
    startDate: '',
    endDate: '',
    isOngoing: false,
    description: '',
  });

  const list = res.data || [];

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '',
      technologies: '',
      projectUrl: '',
      githubUrl: '',
      startDate: '',
      endDate: '',
      isOngoing: false,
      description: '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      technologies: item.technologies || '',
      projectUrl: item.projectUrl || '',
      githubUrl: item.githubUrl || '',
      startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
      isOngoing: item.startDate && !item.endDate,
      description: item.description || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Project title is required.';
    else if (form.title.trim().length > 180) errs.title = 'Title must be 180 characters or fewer.';

    if (form.projectUrl && !isValidUrl(form.projectUrl)) {
      errs.projectUrl = 'Please enter a valid URL starting with http:// or https://';
    }
    if (form.githubUrl && !isValidUrl(form.githubUrl)) {
      errs.githubUrl = 'Please enter a valid GitHub URL starting with http:// or https://';
    }

    if (!form.isOngoing && form.startDate && form.endDate) {
      if (new Date(form.endDate) < new Date(form.startDate)) {
        errs.endDate = 'End date cannot be earlier than start date.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);

    const payload = {
      title: form.title.trim(),
      technologies: form.technologies.trim() || null,
      projectUrl: form.projectUrl.trim() || null,
      githubUrl: form.githubUrl.trim() || null,
      startDate: form.startDate || null,
      endDate: form.isOngoing ? null : (form.endDate || null),
      description: form.description.trim() || null,
    };

    try {
      if (editing) {
        await api.patch(`/students/projects/${editing._id}`, payload);
        toast.success('Project updated.');
      } else {
        await api.post('/students/projects', payload);
        toast.success('Project added to portfolio.');
      }
      setModalOpen(false);
      res.reload();
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    const ok = await confirmDanger({
      title: 'Delete project record?',
      text: 'This project will be permanently removed from your student portfolio.',
      confirmButtonText: 'Yes, delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/students/projects/${id}`);
      res.reload();
      toast.success('Project deleted.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  // KPIs
  const liveCount = useMemo(() => list.filter((p) => p.projectUrl).length, [list]);
  const repoCount = useMemo(() => list.filter((p) => p.githubUrl).length, [list]);
  const allTechs = useMemo(() => {
    const set = new Set();
    list.forEach((p) => {
      (p.technologies || '').split(',').forEach((t) => {
        const tr = t.trim();
        if (tr) set.add(tr.toLowerCase());
      });
    });
    return set.size;
  }, [list]);

  return (
    <PageContainer>
      <PageHeader
        title="Projects & Portfolio"
        eyebrow="Hands-On Work"
        icon={<FolderKanban size={24} />}
        description="Showcase full-stack applications, research experiments, and open-source contributions."
        actions={
          <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openAdd}>
            <Plus size={16} /> Add Project
          </button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<FolderKanban size={20} />} label="Total Projects" value={list.length} tone="primary" />
        <KpiCard icon={<ExternalLink size={20} />} label="Live Demos" value={liveCount} tone="success" />
        <KpiCard icon={<Laptop size={20} />} label="Repositories" value={repoCount} tone="violet" />
        <KpiCard icon={<Sparkles size={20} />} label="Technologies Used" value={allTechs} tone="amber" />
      </div>

      {res.loading ? (
        <Loading rows={3} height={150} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !list.length ? (
        <Empty
          title="No projects added yet"
          hint="Demonstrate your software engineering capabilities by adding hands-on projects with live demo links and GitHub repositories."
          icon={<FolderKanban size={44} />}
          action={
            <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openAdd}>
              <Plus size={16} /> Add Your First Project
            </button>
          }
        />
      ) : (
        <div className="cc-grid-cards">
          {list.map((p) => {
            const techBadges = (p.technologies || '')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);

            const dateStr = p.startDate
              ? `${fmtDate(p.startDate)} – ${p.endDate ? fmtDate(p.endDate) : 'Present'}`
              : null;

            return (
              <motion.article
                key={p._id}
                className="cc-proj-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <div className="cc-proj-top">
                    <div>
                      <h3 className="cc-proj-title">{p.title}</h3>
                      {dateStr && (
                        <div className="small text-muted d-flex align-items-center gap-1">
                          <Calendar size={12} /> {dateStr}
                        </div>
                      )}
                    </div>
                  </div>

                  {p.description && <p className="cc-proj-desc">{p.description}</p>}

                  {techBadges.length > 0 && (
                    <div className="cc-proj-tags">
                      {techBadges.map((tb, idx) => (
                        <span key={idx} className="cc-proj-tag">{tb}</span>
                      ))}
                    </div>
                  )}

                  <div className="cc-proj-links mt-2">
                    {p.projectUrl && (
                      <a
                        href={p.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      >
                        <ExternalLink size={13} /> Live Demo
                      </a>
                    )}
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      >
                        <Laptop size={13} /> GitHub
                      </a>
                    )}
                  </div>
                </div>

                <div className="cc-proj-foot">
                  <span className="small text-muted">ID: {p._id.slice(-6)}</span>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      onClick={() => openEdit(p)}
                      title="Edit project"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                      onClick={() => del(p._id)}
                      title="Delete project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !busy && setModalOpen(false)}
        title={editing ? 'Edit Project' : 'Add New Project'}
        description="Detail your project features, stack, and repositories."
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-2 w-100">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="proj-form" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={busy}>
              {busy ? <RefreshCw size={14} className="cc-spin" /> : <Save size={14} />}
              {editing ? 'Update Project' : 'Save Project'}
            </button>
          </div>
        }
      >
        <form id="proj-form" onSubmit={submit} noValidate>
          <div className="row g-3">
            <div className="col-12">
              <Field label="Project Title" required error={errors.title}>
                <input
                  type="text"
                  className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                  placeholder="e.g. Distributed Task Scheduler & Analytics Platform"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={180}
                />
              </Field>
            </div>

            <div className="col-12">
              <Field label="Technologies Used" hint="Comma-separated (e.g. React, Node.js, Express, MongoDB, Tailwind)">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. React, Node.js, MongoDB, WebSockets, Docker"
                  value={form.technologies}
                  onChange={(e) => setForm({ ...form, technologies: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Live Demo URL" error={errors.projectUrl} hint="https://yourproject.com">
                <input
                  type="url"
                  className={`form-control ${errors.projectUrl ? 'is-invalid' : ''}`}
                  placeholder="https://my-app.vercel.app"
                  value={form.projectUrl}
                  onChange={(e) => setForm({ ...form, projectUrl: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="GitHub Repository URL" error={errors.githubUrl} hint="https://github.com/user/repo">
                <input
                  type="url"
                  className={`form-control ${errors.githubUrl ? 'is-invalid' : ''}`}
                  placeholder="https://github.com/username/project"
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Start Date">
                <input
                  type="date"
                  className="form-control"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="End Date" error={errors.endDate}>
                <input
                  type="date"
                  className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  disabled={form.isOngoing}
                />
              </Field>
            </div>

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="proj-ongoing"
                  checked={form.isOngoing}
                  onChange={(e) => setForm({ ...form, isOngoing: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
                />
                <label className="form-check-label small fw-semibold" htmlFor="proj-ongoing">
                  This is an ongoing project (Currently in development)
                </label>
              </div>
            </div>

            <div className="col-12">
              <Field label="Project Description" hint="Highlight problem statement, architecture, role, and achievements.">
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe what the application does, key architectural decisions, performance benchmarks, or business impact..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

/* ==================================================================
   4. CERTIFICATIONS PAGE (/student/certifications)
   ================================================================== */
export function Certifications() {
  const res = useFetch(async () => (await api.get('/students/certifications')).data.data, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    credentialUrl: '',
  });

  const list = res.data || [];

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      issuingOrganization: '',
      issueDate: '',
      credentialUrl: '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      issuingOrganization: item.issuingOrganization || '',
      issueDate: item.issueDate ? String(item.issueDate).slice(0, 10) : '',
      credentialUrl: item.credentialUrl || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Certification name is required.';
    else if (form.name.trim().length > 180) errs.name = 'Name must be 180 characters or fewer.';

    if (!form.issuingOrganization.trim()) errs.issuingOrganization = 'Issuing organization is required.';
    else if (form.issuingOrganization.trim().length > 180) errs.issuingOrganization = 'Organization must be 180 characters or fewer.';

    if (form.credentialUrl && !isValidUrl(form.credentialUrl)) {
      errs.credentialUrl = 'Enter a valid verification link starting with http:// or https://';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);

    const payload = {
      name: form.name.trim(),
      issuingOrganization: form.issuingOrganization.trim(),
      issueDate: form.issueDate || null,
      credentialUrl: form.credentialUrl.trim() || null,
    };

    try {
      if (editing) {
        await api.patch(`/students/certifications/${editing._id}`, payload);
        toast.success('Certification updated.');
      } else {
        await api.post('/students/certifications', payload);
        toast.success('Certification added.');
      }
      setModalOpen(false);
      res.reload();
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    const ok = await confirmDanger({
      title: 'Delete certification?',
      text: 'This certificate record will be removed from your profile.',
      confirmButtonText: 'Yes, delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/students/certifications/${id}`);
      res.reload();
      toast.success('Certification deleted.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  // KPIs
  const verifiedCount = useMemo(() => list.filter((c) => c.credentialUrl).length, [list]);
  const issuersCount = useMemo(() => {
    const s = new Set();
    list.forEach((c) => {
      if (c.issuingOrganization) s.add(c.issuingOrganization.toLowerCase().trim());
    });
    return s.size;
  }, [list]);

  return (
    <PageContainer>
      <PageHeader
        title="Certifications & Accreditations"
        eyebrow="Credentials"
        icon={<Award size={24} />}
        description="Showcase professional licenses, vendor certifications, and accredited courses you have completed."
        actions={
          <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openAdd}>
            <Plus size={16} /> Add Certification
          </button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<Award size={20} />} label="Total Certifications" value={list.length} tone="primary" />
        <KpiCard icon={<CheckCircle2 size={20} />} label="Verifiable Credentials" value={verifiedCount} tone="success" />
        <KpiCard icon={<Building2 size={20} />} label="Issuing Bodies" value={issuersCount} tone="violet" />
        <KpiCard icon={<Sparkles size={20} />} label="Recent Achievement" value={list[0]?.name ? `${list[0].name.slice(0, 18)}...` : 'None'} tone="amber" />
      </div>

      {res.loading ? (
        <Loading rows={3} height={120} />
      ) : res.error ? (
        <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
      ) : !list.length ? (
        <Empty
          title="No certifications added yet"
          hint="Boost your placement eligibility by adding credentials from AWS, Google Cloud, Meta, Coursera, HackerRank, or vendor training programs."
          icon={<Award size={44} />}
          action={
            <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openAdd}>
              <Plus size={16} /> Add Your First Certification
            </button>
          }
        />
      ) : (
        <div className="cc-grid-cards">
          {list.map((c) => (
            <motion.article
              key={c._id}
              className="cc-cert-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="cc-cert-top">
                  <div className="cc-cert-icon">
                    <Award size={22} />
                  </div>
                  <div>
                    <h3 className="cc-cert-title">{c.name}</h3>
                    <div className="cc-cert-issuer">{c.issuingOrganization}</div>
                    {c.issueDate && (
                      <div className="small text-muted d-flex align-items-center gap-1 mt-1">
                        <Calendar size={12} /> Issued on {fmtDate(c.issueDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="cc-cert-foot">
                <div>
                  {c.credentialUrl ? (
                    <a
                      href={c.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    >
                      <ExternalLink size={13} /> Verify Credential
                    </a>
                  ) : (
                    <span className="small text-muted">Offline credential</span>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                    onClick={() => openEdit(c)}
                    title="Edit certification"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                    onClick={() => del(c._id)}
                    title="Delete certification"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* Add / Edit Certification Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !busy && setModalOpen(false)}
        title={editing ? 'Edit Certification' : 'Add Certification'}
        description="Enter verified credential details and issuing organization."
        size="md"
        footer={
          <div className="d-flex justify-content-end gap-2 w-100">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="cert-form" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={busy}>
              {busy ? <RefreshCw size={14} className="cc-spin" /> : <Save size={14} />}
              {editing ? 'Update Certification' : 'Save Certification'}
            </button>
          </div>
        }
      >
        <form id="cert-form" onSubmit={submit} noValidate>
          <div className="row g-3">
            <div className="col-12">
              <Field label="Certification Name" required error={errors.name}>
                <input
                  type="text"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="e.g. AWS Certified Solutions Architect – Associate"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={180}
                />
              </Field>
            </div>

            <div className="col-12">
              <Field label="Issuing Organization" required error={errors.issuingOrganization}>
                <input
                  type="text"
                  className={`form-control ${errors.issuingOrganization ? 'is-invalid' : ''}`}
                  placeholder="e.g. Amazon Web Services, Google Cloud, Meta"
                  value={form.issuingOrganization}
                  onChange={(e) => setForm({ ...form, issuingOrganization: e.target.value })}
                  maxLength={180}
                />
              </Field>
            </div>

            <div className="col-12">
              <Field label="Issue Date">
                <input
                  type="date"
                  className="form-control"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-12">
              <Field label="Verification URL / Credential Link" error={errors.credentialUrl} hint="https://credly.com/your-badge or certificate link">
                <input
                  type="url"
                  className={`form-control ${errors.credentialUrl ? 'is-invalid' : ''}`}
                  placeholder="https://www.credly.com/badges/..."
                  value={form.credentialUrl}
                  onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

/* ==================================================================
   5. RESUME PAGE (/student/resume)
   ================================================================== */
export function Resume() {
  const res = useFetch(async () => (await api.get('/students/resumes')).data.data, []);
  const ats = useFetch(async () => (await api.get('/students/resumes/ats')).data.data, []);

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const list = res.data || [];
  const currentResume = list[0] || null;
  const score = ats.data || null;

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Client-side extension validation
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      toast.error('Invalid file format. Only PDF, DOC, and DOCX files are permitted.');
      return;
    }

    // Client-side size check (5 MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      toast.error('File size exceeds the 5 MB limit. Please compress your document.');
      return;
    }

    setFile(selectedFile);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      await api.post('/students/resumes', fd);
      toast.success('Resume uploaded successfully.');
      setFile(null);
      res.reload();
      ats.reload();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    const ok = await confirmDanger({
      title: 'Delete resume?',
      text: 'You will need to upload a new resume before applying to upcoming campus placement drives.',
      confirmButtonText: 'Yes, delete resume',
    });
    if (!ok) return;
    try {
      await api.delete(`/students/resumes/${id}`);
      res.reload();
      ats.reload();
      toast.success('Resume deleted.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const download = async (r) => {
    try {
      await downloadFile(`/resumes/${r._id}/download`, r.fileName);
      toast.info('Downloading resume...');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Resume & ATS Readiness"
        eyebrow="Placement Asset"
        icon={<FileText size={24} />}
        description="Upload your latest professional CV and review your Applicant Tracking System (ATS) profile score."
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard
          icon={<FileText size={20} />}
          label="Resume Status"
          value={currentResume ? 'Active & Ready' : 'Missing'}
          tone={currentResume ? 'success' : 'amber'}
        />
        <KpiCard
          icon={<Sparkles size={20} />}
          label="ATS Profile Score"
          value={score ? `${score.total} / 100` : '—'}
          tone={score?.total >= 70 ? 'success' : score?.total >= 40 ? 'amber' : 'violet'}
        />
        <KpiCard
          icon={<Download size={20} />}
          label="File Format"
          value={currentResume ? (currentResume.fileName.split('.').pop() || 'PDF').toUpperCase() : 'None'}
          tone="primary"
        />
        <KpiCard
          icon={<Clock size={20} />}
          label="Last Upload"
          value={currentResume ? fmtDate(currentResume.uploadedAt) : 'Never'}
          tone="slate"
        />
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="row g-4">
        {/* Left Column: Upload & Current File Management */}
        <div className="col-12 col-xl-7">
          <SectionCard
            title="Upload Document"
            subtitle="Accepted formats: PDF, DOC, DOCX up to 5 MB"
            icon={<Upload size={16} />}
            className="mb-4"
          >
            {/* Drag & Drop Zone */}
            <div
              className={`cc-resume-dropzone ${dragOver ? 'is-dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              onClick={() => document.getElementById('resume-file-input')?.click()}
            >
              <div className="cc-resume-drop-icon">
                <Upload size={28} />
              </div>
              <div>
                <b className="d-block mb-1">Drag and drop your resume file here</b>
                <span className="small text-muted">or click to browse from your device</span>
              </div>
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                className="d-none"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>

            {/* Selected File Banner */}
            {file && (
              <div className="p-3 mt-3 border rounded bg-light-subtle d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <FileCheck size={24} className="text-primary flex-shrink-0" />
                  <div>
                    <b className="d-block text-truncate" style={{ maxWidth: 280 }}>{file.name}</b>
                    <small className="text-muted">{(file.size / 1024).toFixed(1)} KB ready to upload</small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFile(null)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1" onClick={upload} disabled={busy}>
                    {busy ? <RefreshCw size={13} className="cc-spin" /> : <Upload size={13} />}
                    {busy ? 'Uploading...' : 'Confirm Upload'}
                  </button>
                </div>
              </div>
            )}

            <div className="small text-muted mt-3">
              <b>Single Resume Policy:</b> Uploading a new resume will automatically update and replace your active CV across all current campus drive applications.
            </div>
          </SectionCard>

          {/* Current Resume Card */}
          <SectionCard title="Active Resume on File" icon={<FileText size={16} />}>
            {res.loading ? (
              <Loading rows={1} height={70} />
            ) : res.error ? (
              <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
            ) : !currentResume ? (
              <Empty
                title="No resume currently on file"
                hint="Upload your CV using the upload box above so recruiters can review your credentials."
                bare
              />
            ) : (
              <div className="p-3 border rounded bg-surface d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-3">
                  <div className="cc-edu-card-badge-ic" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--cc-primary)' }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1" style={{ fontSize: '1rem' }}>{currentResume.fileName}</h4>
                    <div className="small text-muted d-flex align-items-center gap-2 flex-wrap">
                      <span>{(currentResume.fileSize / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>Uploaded {fmtDate(currentResume.uploadedAt)}</span>
                      <span className="cc-badge green no-dot">Verified</span>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    onClick={() => download(currentResume)}
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                    onClick={() => del(currentResume._id)}
                    title="Delete resume"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: ATS Score Analysis */}
        <div className="col-12 col-xl-5">
          <SectionCard title="ATS Score & Readiness" icon={<Sparkles size={16} />} subtitle="Applicant Tracking System automated readiness evaluation">
            {ats.loading ? (
              <Loading rows={3} height={60} />
            ) : !score ? (
              <Empty title="No ATS telemetry yet" hint="Upload your resume to calculate your comprehensive ATS compatibility score." bare />
            ) : (
              <div>
                <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded border bg-light-subtle">
                  <div className="cc-ring" style={{ '--pct': score.total }}>
                    <span>{score.total}</span>
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '1.1rem' }}>Profile Strength: {score.total}/100</div>
                    <div className="small text-muted mt-1">
                      {score.total >= 70
                        ? 'Excellent — Your profile contains rich credentials aligned for automated recruiter filters.'
                        : score.total >= 40
                        ? 'Good progress — Adding more projects, skills, or certifications will boost shortlisting.'
                        : 'Needs Attention — Complete your education, add projects, and upload a comprehensive CV.'}
                    </div>
                  </div>
                </div>

                <h5 className="fw-bold mb-3 small text-uppercase text-muted">Scoring Breakdown</h5>
                {(score.parts || []).map((p) => {
                  const pct = Math.round((p.score / p.max) * 100);
                  const tone = pct >= 70 ? 'success' : pct >= 40 ? 'amber' : 'danger';
                  return (
                    <div key={p.label} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-semibold">{p.label}</span>
                        <span className="small fw-bold">{p.score} / {p.max} ({pct}%)</span>
                      </div>
                      <ProgressIndicator value={p.score} max={p.max} tone={tone} showPercent={false} />
                    </div>
                  );
                })}

                <div className="p-3 mt-4 rounded border bg-surface">
                  <div className="fw-bold small mb-2 d-flex align-items-center gap-1">
                    <Sparkles size={14} className="text-primary" /> ATS Optimization Tips:
                  </div>
                  <ul className="small text-muted mb-0 ps-3">
                    <li className="mb-1">Ensure project titles specify concrete frameworks and technologies.</li>
                    <li className="mb-1">Quantify project metrics (e.g. "Improved response time by 40%").</li>
                    <li>Add external GitHub and Live Demo URLs for verifiable credentials.</li>
                  </ul>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

/* ==================================================================
   6. PREFERENCES PAGE (/student/preferences)
   ================================================================== */
const POPULAR_ROLES = [
  'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Software Engineer', 'Data Analyst', 'DevOps / Cloud Engineer', 'QA / Test Automation',
];

const POPULAR_LOCATIONS = ['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi-NCR', 'Chennai', 'Remote'];

const WORK_MODES = [
  { value: 'Onsite', label: 'Onsite', icon: <Building2 size={16} />, desc: 'Work from office' },
  { value: 'Remote', label: 'Remote', icon: <Laptop size={16} />, desc: 'Work from home' },
  { value: 'Hybrid', label: 'Hybrid', icon: <Compass size={16} />, desc: 'Flexible office & home' },
];

const JOB_TYPES = [
  { value: 'Full Time', label: 'Full Time', icon: <Briefcase size={16} /> },
  { value: 'Internship', label: 'Internship', icon: <GraduationCap size={16} /> },
  { value: 'Fresher', label: 'Fresher Role', icon: <Sparkles size={16} /> },
  { value: 'Experienced', label: 'Experienced', icon: <Award size={16} /> },
  { value: 'Part Time', label: 'Part Time', icon: <Clock size={16} /> },
];

export function Preferences() {
  const res = useFetch(async () => (await api.get('/students/preferences')).data.data, []);
  const [f, setF] = useState(null);
  const [initialF, setInitialF] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!f && res.data !== undefined) {
    const data = res.data || {};
    setF(data);
    setInitialF(data);
  }

  const isDirty = useMemo(() => {
    if (!f || !initialF) return false;
    return JSON.stringify(f) !== JSON.stringify(initialF);
  }, [f, initialF]);

  const save = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    try {
      await api.put('/students/preferences', f);
      setInitialF(f);
      toast.success('Career preferences updated.');
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const ok = await confirmDanger({
      title: 'Reset all career preferences?',
      text: 'This will reset your preferred roles, locations, job types, and compensation targets.',
      confirmButtonText: 'Yes, clear preferences',
    });
    if (!ok) return;
    try {
      const { data } = await api.delete('/students/preferences');
      const reset = data.data || {};
      setF(reset);
      setInitialF(reset);
      toast.success('Preferences reset.');
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    }
  };

  const revert = () => {
    setF(initialF || {});
    toast.info('Discarded unsaved changes.');
  };

  if (res.loading || !f) return <Loading rows={4} height={70} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const set = (k) => (val) => setF({ ...f, [k]: val === '' ? null : val });

  return (
    <PageContainer>
      <PageHeader
        title="Career & Placement Preferences"
        eyebrow="Targeting Preferences"
        icon={<SlidersHorizontal size={24} />}
        description="Configure your target job titles, preferred work modes, campus placement compensation goals, and locations."
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={clear}
              disabled={busy}
            >
              Reset All
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1"
              onClick={save}
              disabled={busy || !isDirty}
            >
              {busy ? <RefreshCw size={13} className="cc-spin" /> : <Save size={13} />}
              Save Changes
            </button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<Briefcase size={20} />} label="Target Role" value={f.preferredRole || 'Not set'} tone="primary" />
        <KpiCard icon={<MapPin size={20} />} label="Preferred Location" value={f.preferredLocation || 'Any'} tone="violet" />
        <KpiCard icon={<Building2 size={20} />} label="Work Arrangement" value={f.workMode || 'Any'} tone="success" />
        <KpiCard icon={<Award size={20} />} label="Job Format" value={f.preferredJobType || 'Any'} tone="amber" />
      </div>

      {/* Unsaved Changes Banner */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            className="alert alert-warning d-flex align-items-center justify-content-between p-3 rounded mb-0"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <div className="d-flex align-items-center gap-2">
              <Sparkles size={18} className="text-warning flex-shrink-0" />
              <span>You have unsaved changes in your career preferences.</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={revert} disabled={busy}>
                Discard
              </button>
              <button className="btn btn-sm btn-primary" onClick={save} disabled={busy}>
                Save Preferences
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Form Grid */}
      <div className="cc-grid-2col">
        {/* Section 1: Career Direction & Roles */}
        <SectionCard title="Target Role & Location" icon={<Briefcase size={16} />} subtitle="What job profiles are you actively targeting?">
          <div className="mb-3">
            <Field label="Primary Desired Role" hint="e.g. Full Stack Developer, Software Engineer">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Frontend Developer"
                value={f.preferredRole || ''}
                onChange={(e) => set('preferredRole')(e.target.value)}
              />
            </Field>

            <div className="d-flex flex-wrap gap-1 mt-2">
              {POPULAR_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`btn btn-sm ${f.preferredRole === r ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                  onClick={() => set('preferredRole')(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <Field label="Preferred Cities / Locations" hint="Comma-separated or primary destination">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bengaluru, Pune, Hyderabad, Remote"
                value={f.preferredLocation || ''}
                onChange={(e) => set('preferredLocation')(e.target.value)}
              />
            </Field>

            <div className="d-flex flex-wrap gap-1 mt-2">
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`btn btn-sm ${f.preferredLocation?.includes(loc) ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                  onClick={() => set('preferredLocation')(loc)}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label small fw-semibold mb-2">Work Mode Arrangement</label>
            <div className="row g-2">
              {WORK_MODES.map((wm) => (
                <div key={wm.value} className="col-12 col-md-4">
                  <ChoiceCard
                    selected={f.workMode === wm.value}
                    onClick={() => set('workMode')(f.workMode === wm.value ? null : wm.value)}
                    icon={wm.icon}
                    title={wm.label}
                    description={wm.desc}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Compensation & Employment Type */}
        <SectionCard title="Employment & Compensation" icon={<SlidersHorizontal size={16} />} subtitle="Specify your availability and target salary expectations">
          <div className="mb-4">
            <label className="form-label small fw-semibold mb-2">Job Format</label>
            <div className="row g-2">
              {JOB_TYPES.map((jt) => (
                <div key={jt.value} className="col-6 col-sm-4">
                  <ChoiceCard
                    selected={f.preferredJobType === jt.value}
                    onClick={() => set('preferredJobType')(f.preferredJobType === jt.value ? null : jt.value)}
                    icon={jt.icon}
                    title={jt.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <Field label="Expected Annual Package (CTC)" hint="e.g. 6 LPA, 10-12 LPA">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 8 LPA"
                  value={f.expectedSalary || ''}
                  onChange={(e) => set('expectedSalary')(e.target.value)}
                />
              </Field>
            </div>

            <div className="col-md-6">
              <Field label="Experience Level">
                <select
                  className="form-select"
                  value={f.experienceLevel || ''}
                  onChange={(e) => set('experienceLevel')(e.target.value)}
                >
                  <option value="">Select level...</option>
                  <option value="Fresher">Fresher (Campus Graduate)</option>
                  <option value="0-1 years">0 – 1 years</option>
                  <option value="1-3 years">1 – 3 years</option>
                  <option value="3+ years">3+ years</option>
                </select>
              </Field>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Floating Save Controls */}
      <div className="cc-sticky-save-bar">
        <div className="d-flex align-items-center gap-2">
          {isDirty ? (
            <span className="cc-badge amber">Unsaved Modifications</span>
          ) : (
            <span className="cc-badge green">All Preferences Saved</span>
          )}
          <span className="small text-muted d-none d-md-inline">Changes reflect automatically in placement job matching algorithms.</span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {isDirty && (
            <button className="btn btn-outline-secondary btn-sm" onClick={revert} disabled={busy}>
              Discard
            </button>
          )}
          <button className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1" onClick={save} disabled={busy || !isDirty}>
            {busy ? <RefreshCw size={14} className="cc-spin" /> : <Save size={14} />}
            Save Preferences
          </button>
        </div>
      </div>
    </PageContainer>
  );
}

/* ==================================================================
   7. ALERTS PAGE (/student/alerts)
   ================================================================== */
export function Alerts() {
  const res = useFetch(async () => (await api.get('/students/job-alerts')).data.data, []);
  const [f, setF] = useState({ roleKeyword: '', location: '', minSalary: '' });
  const [matches, setMatches] = useState({});
  const [matchesLoading, setMatchesLoading] = useState({});
  const [matchesExpanded, setMatchesExpanded] = useState({});
  const [busy, setBusy] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const list = res.data || [];

  const addAlert = async (e) => {
    e.preventDefault();
    if (!f.roleKeyword.trim()) {
      setFormErrors({ roleKeyword: 'Role keyword is required.' });
      return;
    }
    setFormErrors({});
    setBusy(true);

    try {
      await api.post('/students/job-alerts', {
        roleKeyword: f.roleKeyword.trim(),
        location: f.location.trim() || null,
        minSalary: f.minSalary ? Number(f.minSalary) : null,
      });
      setF({ roleKeyword: '', location: '', minSalary: '' });
      res.reload();
      toast.success('Job search alert created.');
    } catch (e2) {
      toast.error(apiErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    const ok = await confirmDanger({
      title: 'Delete job alert?',
      text: 'You will no longer receive notifications for jobs matching this criteria.',
      confirmButtonText: 'Yes, delete alert',
    });
    if (!ok) return;
    try {
      await api.delete(`/students/job-alerts/${id}`);
      res.reload();
      toast.success('Job alert removed.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const toggleMatches = async (id) => {
    if (matchesExpanded[id]) {
      setMatchesExpanded({ ...matchesExpanded, [id]: false });
      return;
    }

    setMatchesExpanded({ ...matchesExpanded, [id]: true });
    if (!matches[id]) {
      setMatchesLoading({ ...matchesLoading, [id]: true });
      try {
        const { data } = await api.get(`/students/job-alerts/${id}/matches`);
        setMatches((prev) => ({ ...prev, [id]: data.data || [] }));
      } catch (e) {
        toast.error(apiErrorMessage(e));
      } finally {
        setMatchesLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Job Alerts & Notifications"
        eyebrow="Automated Search Agents"
        icon={<Bell size={24} />}
        description="Configure automated job notification agents to monitor new corporate openings and placement drives matching your criteria."
      />

      {/* KPI Stats Strip */}
      <div className="cc-student-kpis">
        <KpiCard icon={<Bell size={20} />} label="Active Alerts" value={list.length} tone="primary" />
        <KpiCard icon={<Search size={20} />} label="Keywords Monitored" value={list.length} tone="violet" />
        <KpiCard icon={<Sparkles size={20} />} label="Matching Engine" value="Real-time" tone="success" />
        <KpiCard icon={<Briefcase size={20} />} label="Drives Notification" value="Enabled" tone="amber" />
      </div>

      {/* Create New Alert Card */}
      <SectionCard title="Create New Job Alert" icon={<Plus size={16} />} subtitle="Enter your desired job title and criteria to monitor">
        <form onSubmit={addAlert} noValidate>
          <div className="row g-2 align-items-start">
            <div className="col-12 col-md-5">
              <Field label="Role Keyword" required error={formErrors.roleKeyword}>
                <input
                  type="text"
                  className={`form-control ${formErrors.roleKeyword ? 'is-invalid' : ''}`}
                  placeholder="e.g. React, Full Stack, Data Analyst, Cloud"
                  value={f.roleKeyword}
                  onChange={(e) => setF({ ...f, roleKeyword: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-12 col-md-4">
              <Field label="Target Location (Optional)">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bengaluru, Remote, Pune"
                  value={f.location}
                  onChange={(e) => setF({ ...f, location: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-12 col-md-3">
              <Field label="Min Salary (₹ Annual)">
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 600000"
                  value={f.minSalary}
                  onChange={(e) => setF({ ...f, minSalary: e.target.value })}
                />
              </Field>
            </div>

            <div className="col-12 mt-2">
              <button
                type="submit"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                disabled={!f.roleKeyword.trim() || busy}
              >
                {busy ? <RefreshCw size={14} className="cc-spin" /> : <Plus size={15} />}
                Create Search Alert
              </button>
            </div>
          </div>
        </form>
      </SectionCard>

      {/* Active Alerts List */}
      <SectionCard
        title="Your Active Search Alerts"
        icon={<Bell size={16} />}
        subtitle={`${list.length} active monitoring agents`}
      >
        {res.loading ? (
          <Loading rows={3} height={90} />
        ) : res.error ? (
          <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />
        ) : !list.length ? (
          <Empty
            title="No search alerts active"
            hint="Create a job alert above to get notified as soon as new campus drives or openings matching your skill set are listed."
            icon={<Bell size={40} />}
          />
        ) : (
          <div className="d-flex flex-column gap-3">
            {list.map((a) => {
              const isExpanded = !!matchesExpanded[a._id];
              const isLoadingMatches = !!matchesLoading[a._id];
              const alertJobs = matches[a._id] || [];

              return (
                <div key={a._id} className="cc-alert-card">
                  <div className="cc-alert-top">
                    <div className="d-flex align-items-center gap-3">
                      <div className="cc-edu-card-badge-ic" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--cc-primary)' }}>
                        <Bell size={20} />
                      </div>
                      <div>
                        <h4 className="cc-alert-title">{a.roleKeyword}</h4>
                        <div className="cc-alert-meta">
                          {a.location ? (
                            <span className="cc-badge gray no-dot">
                              <MapPin size={12} className="me-1" /> {a.location}
                            </span>
                          ) : (
                            <span className="cc-badge gray no-dot">Any Location</span>
                          )}

                          {a.minSalary ? (
                            <span className="cc-badge violet no-dot">
                              ≥ ₹{(a.minSalary / 100000).toFixed(1)} LPA
                            </span>
                          ) : (
                            <span className="cc-badge gray no-dot">Any Salary</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm ${isExpanded ? 'btn-primary' : 'btn-outline-primary'} d-inline-flex align-items-center gap-1`}
                        onClick={() => toggleMatches(a._id)}
                      >
                        <CheckCircle2 size={13} />
                        {isExpanded ? 'Hide Matches' : 'Top Matches'}
                        <ChevronDown size={13} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                        onClick={() => del(a._id)}
                        title="Delete alert"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Matching Jobs Grid */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="mt-3 pt-3 border-top"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <b className="small text-muted">Current Live Matching Openings:</b>
                          {alertJobs.length > 0 && <span className="cc-badge green no-dot">{alertJobs.length} open jobs</span>}
                        </div>

                        {isLoadingMatches ? (
                          <Loading rows={1} height={70} />
                        ) : !alertJobs.length ? (
                          <div className="p-3 text-center border rounded bg-surface-2 small text-muted">
                            No open jobs currently match "{a.roleKeyword}" {a.location ? `in ${a.location}` : ''}. You will be alerted when new opportunities are posted.
                          </div>
                        ) : (
                          <div className="row g-2">
                            {alertJobs.map((j) => (
                              <div key={j._id} className="col-12 col-md-6">
                                <JobCard job={j} to={`/student/jobs/${j._id}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

/* ==================================================================
   8. PROFILE SUMMARY PAGE (/student/profile)
   ================================================================== */
const ProfileField = ({ label, required, help, children, icon: Icon }) => (
  <div className="mb-3">
    <div className="cc-profile-field-label">
      <span className="cc-profile-field-label-text">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
      </span>
      {help && <span className="cc-profile-field-help">{help}</span>}
    </div>
    {children}
  </div>
);

export function Profile() {
  const [activeTab, setActiveTab] = useState('personal');
  const [f, setF] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);

  const res = useFetch(async () => {
    const [meRes, eduRes, skillRes, projRes, resRes, certRes] = await Promise.allSettled([
      api.get('/students/me'),
      api.get('/students/education'),
      api.get('/students/skills'),
      api.get('/students/projects'),
      api.get('/students/resumes'),
      api.get('/students/certifications'),
    ]);

    const me = meRes.status === 'fulfilled' ? meRes.value.data.data : null;
    return {
      user: me?.user,
      profile: me?.profile,
      counts: {
        education: eduRes.status === 'fulfilled' ? (eduRes.value.data?.data?.length || 0) : 0,
        skills: skillRes.status === 'fulfilled' ? (skillRes.value.data?.data?.length || 0) : 0,
        projects: projRes.status === 'fulfilled' ? (projRes.value.data?.data?.length || 0) : 0,
        resumes: resRes.status === 'fulfilled' ? (resRes.value.data?.data?.length || 0) : 0,
        certifications: certRes.status === 'fulfilled' ? (certRes.value.data?.data?.length || 0) : 0,
      },
    };
  }, []);

  useEffect(() => {
    if (res.data?.profile && !initialData) {
      const p = res.data.profile;
      const initial = {
        name: res.data.user?.name || '',
        email: res.data.user?.email || '',
        enrollmentNo: p.enrollmentNo || '',
        phone: p.phone || '',
        dob: p.dob ? p.dob.slice(0, 10) : '',
        gender: p.gender || '',
        city: p.city || '',
        address: p.address || '',
        course: p.course || '',
        branch: p.branch || '',
        semester: p.semester || '',
        cgpa: p.cgpa != null ? p.cgpa : '',
        passingYear: p.passingYear != null ? p.passingYear : '',
        backlogs: p.backlogs != null ? p.backlogs : 0,
        about: p.about || '',
      };
      setF(initial);
      setInitialData(initial);
    }
  }, [res.data, initialData]);

  const isDirty = useMemo(() => {
    if (!f || !initialData) return false;
    return Object.keys(initialData).some((k) => String(f[k] ?? '') !== String(initialData[k] ?? ''));
  }, [f, initialData]);

  const handleReset = () => {
    if (initialData) setF({ ...initialData });
  };

  const handleFieldChange = (key) => (e) => {
    setF((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!f) return;
    if (f.name && f.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long.');
      return;
    }
    if (f.cgpa !== '' && (Number(f.cgpa) < 0 || Number(f.cgpa) > 10)) {
      toast.error('CGPA must be between 0 and 10.');
      return;
    }
    if (f.passingYear !== '') {
      const yr = Number(f.passingYear);
      if (isNaN(yr) || yr < 1950 || yr > 2100) {
        toast.error('Passing year must be between 1950 and 2100.');
        return;
      }
    }
    if (f.backlogs !== '') {
      const bk = Number(f.backlogs);
      if (isNaN(bk) || bk < 0 || bk > 50) {
        toast.error('Backlogs must be between 0 and 50.');
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(),
        enrollmentNo: f.enrollmentNo ? f.enrollmentNo.trim() : null,
        phone: f.phone ? f.phone.trim() : null,
        dob: f.dob || null,
        gender: f.gender || null,
        city: f.city ? f.city.trim() : null,
        address: f.address ? f.address.trim() : null,
        course: f.course ? f.course.trim() : null,
        branch: f.branch ? f.branch.trim() : null,
        semester: f.semester ? f.semester.trim() : null,
        cgpa: f.cgpa !== '' ? Number(f.cgpa) : null,
        passingYear: f.passingYear !== '' ? Number(f.passingYear) : null,
        backlogs: f.backlogs !== '' ? Number(f.backlogs) : 0,
        about: f.about ? f.about.trim() : null,
      };

      const resUpdate = await api.patch('/students/me', payload);
      toast.success('Profile updated successfully!');
      if (resUpdate.data?.data) {
        const updatedProfile = resUpdate.data.data.profile;
        const updatedUser = resUpdate.data.data.user;
        const fresh = {
          name: updatedUser?.name || f.name,
          email: updatedUser?.email || f.email,
          enrollmentNo: updatedProfile?.enrollmentNo || '',
          phone: updatedProfile?.phone || '',
          dob: updatedProfile?.dob ? updatedProfile.dob.slice(0, 10) : '',
          gender: updatedProfile?.gender || '',
          city: updatedProfile?.city || '',
          address: updatedProfile?.address || '',
          course: updatedProfile?.course || '',
          branch: updatedProfile?.branch || '',
          semester: updatedProfile?.semester || '',
          cgpa: updatedProfile?.cgpa != null ? updatedProfile.cgpa : '',
          passingYear: updatedProfile?.passingYear != null ? updatedProfile.passingYear : '',
          backlogs: updatedProfile?.backlogs != null ? updatedProfile.backlogs : 0,
          about: updatedProfile?.about || '',
        };
        setF(fresh);
        setInitialData(fresh);
      }
      res.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo size exceeds 2 MB limit.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append('file', photoFile);
    try {
      await api.post('/students/me/photo', fd);
      toast.success('Profile photo updated successfully!');
      setPhotoFile(null);
      setPhotoPreview(null);
      res.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCancelPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  if (res.loading || !f) return <Loading rows={5} height={90} />;
  if (res.error) return <ErrorState message={apiErrorMessage(res.error)} onRetry={res.reload} />;

  const profile = res.data?.profile || {};
  const user = res.data?.user || {};
  const counts = res.data?.counts || { education: 0, skills: 0, projects: 0, resumes: 0, certifications: 0 };
  const pct = profile.profileCompletion || 0;
  const isPlaced = profile.placementStatus === 'placed';

  return (
    <PageContainer>
      {/* 1. Executive Profile Header Card (Zero Empty Space) */}
      <div className="cc-profile-hero mb-4">
        <div className="cc-profile-hero-body">
          <div className="cc-profile-hero-main">
            {/* Avatar with Camera Trigger */}
            <div className="cc-profile-avatar-container">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="cc-profile-avatar-img" />
              ) : profile.profilePhoto ? (
                <img src={fileUrl(profile.profilePhoto)} alt={f.name} className="cc-profile-avatar-img" />
              ) : (
                <div className="cc-profile-avatar-monogram">
                  {(f.name || user.name || 'S')[0]?.toUpperCase()}
                </div>
              )}
              <label
                htmlFor="cc-avatar-input"
                className="cc-profile-avatar-cam-btn"
                title="Change Profile Photo"
              >
                <Camera size={15} />
                <input
                  id="cc-avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
              </label>
            </div>

            {/* Profile Core Info */}
            <div className="cc-profile-hero-info">
              <div className="cc-profile-hero-title-row">
                <div className="d-flex align-items-center gap-2">
                  <h1 className="cc-profile-hero-name mb-0">{f.name || user.name || 'Student Profile'}</h1>
                  <CheckCircle2 size={19} className="text-primary flex-shrink-0" />
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className={`cc-badge ${isPlaced ? 'green' : 'blue'}`}>
                    <span className="cc-badge-dot" />
                    {isPlaced ? 'Placed' : 'Seeking Placement'}
                  </span>
                  <span className="cc-badge gray">
                    <ShieldCheck size={13} className="text-primary" />
                    Verified Student
                  </span>
                </div>
              </div>

              <div className="cc-profile-hero-email">
                <span>
                  <Mail size={13} className="d-inline me-1" />
                  {user.email || f.email}
                </span>
                {f.enrollmentNo && (
                  <span>
                    <span className="opacity-50 mx-1">·</span>
                    <BookOpen size={13} className="d-inline me-1" />
                    ID: {f.enrollmentNo}
                  </span>
                )}
                {f.phone && (
                  <span>
                    <span className="opacity-50 mx-1">·</span>
                    <Phone size={13} className="d-inline me-1" />
                    {f.phone}
                  </span>
                )}
                {f.city && (
                  <span>
                    <span className="opacity-50 mx-1">·</span>
                    <MapPin size={13} className="d-inline me-1" />
                    {f.city}
                  </span>
                )}
              </div>

              {/* Badges / Quick Info */}
              <div className="cc-profile-hero-pills">
                <span className="cc-badge blue no-dot">
                  <GraduationCap size={13} />
                  {f.course || 'Degree Program'}{f.branch ? ` - ${f.branch}` : ''}
                </span>
                {f.cgpa !== '' && f.cgpa != null && (
                  <span className={`cc-badge ${Number(f.cgpa) >= 8.0 ? 'green' : Number(f.cgpa) >= 6.5 ? 'blue' : 'amber'} no-dot`}>
                    CGPA: {Number(f.cgpa).toFixed(2)} / 10
                  </span>
                )}
                {f.passingYear && (
                  <span className="cc-badge gray no-dot">
                    <Calendar size={12} />
                    Class of {f.passingYear}
                  </span>
                )}
                {f.backlogs != null && (
                  <span className={`cc-badge ${Number(f.backlogs) === 0 ? 'green' : 'amber'} no-dot`}>
                    <ShieldCheck size={12} />
                    {Number(f.backlogs) === 0 ? '0 Backlogs · Eligible for Drives' : `${f.backlogs} Backlog${Number(f.backlogs) > 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Completeness Ring Widget */}
          <div className="cc-profile-hero-stats">
            <div className="cc-ring" style={{ '--pct': pct, width: 56, height: 56 }}>
              <span>{pct}%</span>
            </div>
            <div>
              <div className="cc-profile-strength-title">Profile Strength</div>
              <div className="cc-profile-strength-desc">
                {pct >= 85 ? '100% Ready for Campus Drives' : pct >= 60 ? 'Good Progress · Add more details' : 'Needs attention to unlock top jobs'}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Upload Confirmation Drawer if pending */}
        {photoFile && (
          <div className="cc-profile-photo-drawer">
            <div className="cc-profile-photo-drawer-info">
              {photoPreview && <img src={photoPreview} alt="Preview" className="cc-profile-photo-drawer-thumb" />}
              <div>
                <div className="small fw-bold">New photo selected: {photoFile.name}</div>
                <div className="small text-muted">{(photoFile.size / 1024).toFixed(1)} KB · Ready to save</div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleCancelPhoto}
                disabled={uploadingPhoto}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5"
                onClick={handlePhotoUpload}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <RefreshCw size={14} className="cc-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Confirm & Upload
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Placement Assets Hub (Direct Links with Live Counts) */}
      <div className="mb-4">
        <div className="mb-3">
          <h2 className="h5 fw-bold mb-1" style={{ color: 'var(--cc-text)' }}>Placement Portfolio & Credentials</h2>
          <div className="small" style={{ color: 'var(--cc-muted)' }}>
            Sync your degrees, verified skills, active resumes, and portfolio projects for prospective campus recruiters.
          </div>
        </div>

        <div className="cc-profile-hub-grid">
          <Link to="/student/education" className="cc-profile-hub-card">
            <div>
              <div className="cc-profile-hub-top">
                <div className="cc-profile-hub-icon">
                  <GraduationCap size={22} />
                </div>
                <div className="cc-profile-hub-arrow">
                  <ArrowRight size={15} />
                </div>
              </div>
              <div className="cc-profile-hub-title">Education & Degrees</div>
              <div className="cc-profile-hub-desc">
                High school, diploma, bachelor's, or master's degrees with academic marksheets.
              </div>
            </div>
            <div className="cc-profile-hub-count">
              <CheckCircle size={13} />
              <span>{counts.education > 0 ? `${counts.education} qualification${counts.education > 1 ? 's' : ''} added` : 'Add qualifications'}</span>
            </div>
          </Link>

          <Link to="/student/skills" className="cc-profile-hub-card">
            <div>
              <div className="cc-profile-hub-top">
                <div className="cc-profile-hub-icon" style={{ color: 'var(--cc-secondary)' }}>
                  <Award size={22} />
                </div>
                <div className="cc-profile-hub-arrow">
                  <ArrowRight size={15} />
                </div>
              </div>
              <div className="cc-profile-hub-title">Skills & Endorsements</div>
              <div className="cc-profile-hub-desc">
                Technical competencies, languages, frameworks, and tools verified for hiring filters.
              </div>
            </div>
            <div className="cc-profile-hub-count" style={{ color: 'var(--cc-secondary)' }}>
              <CheckCircle size={13} />
              <span>{counts.skills > 0 ? `${counts.skills} verified skill${counts.skills > 1 ? 's' : ''}` : 'Add technical skills'}</span>
            </div>
          </Link>

          <Link to="/student/projects" className="cc-profile-hub-card">
            <div>
              <div className="cc-profile-hub-top">
                <div className="cc-profile-hub-icon" style={{ color: 'var(--cc-success)' }}>
                  <FolderKanban size={22} />
                </div>
                <div className="cc-profile-hub-arrow">
                  <ArrowRight size={15} />
                </div>
              </div>
              <div className="cc-profile-hub-title">Portfolio Projects</div>
              <div className="cc-profile-hub-desc">
                Real-world software projects, live demo links, and GitHub repository showcases.
              </div>
            </div>
            <div className="cc-profile-hub-count" style={{ color: 'var(--cc-success)' }}>
              <CheckCircle size={13} />
              <span>{counts.projects > 0 ? `${counts.projects} project${counts.projects > 1 ? 's' : ''} showcased` : 'Add project links'}</span>
            </div>
          </Link>

          <Link to="/student/resume" className="cc-profile-hub-card">
            <div>
              <div className="cc-profile-hub-top">
                <div className="cc-profile-hub-icon" style={{ color: 'var(--cc-accent)' }}>
                  <FileText size={22} />
                </div>
                <div className="cc-profile-hub-arrow">
                  <ArrowRight size={15} />
                </div>
              </div>
              <div className="cc-profile-hub-title">Resume & CV Documents</div>
              <div className="cc-profile-hub-desc">
                Primary PDF resumes with instant ATS compatibility checks and recruiter previews.
              </div>
            </div>
            <div className="cc-profile-hub-count" style={{ color: 'var(--cc-accent)' }}>
              <CheckCircle size={13} />
              <span>{counts.resumes > 0 ? `${counts.resumes} resume uploaded` : 'Upload primary resume'}</span>
            </div>
          </Link>

          <Link to="/student/certifications" className="cc-profile-hub-card">
            <div>
              <div className="cc-profile-hub-top">
                <div className="cc-profile-hub-icon" style={{ color: 'var(--cc-warning)' }}>
                  <FileCheck size={22} />
                </div>
                <div className="cc-profile-hub-arrow">
                  <ArrowRight size={15} />
                </div>
              </div>
              <div className="cc-profile-hub-title">Certifications & Badges</div>
              <div className="cc-profile-hub-desc">
                Industry-recognized certificates, hackathon honors, and professional credentials.
              </div>
            </div>
            <div className="cc-profile-hub-count" style={{ color: 'var(--cc-warning)' }}>
              <CheckCircle size={13} />
              <span>{counts.certifications > 0 ? `${counts.certifications} certificate${counts.certifications > 1 ? 's' : ''}` : 'Add certificates'}</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Tabbed Profile Editor */}
      <div className="cc-card">
        {/* Navigation Tabs Bar */}
        <div className="cc-profile-tabs-wrapper">
          <div className="cc-profile-tabs">
            <button
              type="button"
              className={`cc-profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <User size={16} />
              <span>Personal & Contact</span>
            </button>
            <button
              type="button"
              className={`cc-profile-tab ${activeTab === 'academic' ? 'active' : ''}`}
              onClick={() => setActiveTab('academic')}
            >
              <GraduationCap size={16} />
              <span>Academic Details</span>
            </button>
            <button
              type="button"
              className={`cc-profile-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              <Sparkles size={16} />
              <span>Professional Summary</span>
            </button>
          </div>
        </div>

        <div className="cc-card-body p-3 p-md-4">
          <form onSubmit={handleSave}>
            {/* TAB 1: PERSONAL & CONTACT */}
            {activeTab === 'personal' && (
              <div>
                <div className="row g-3 mb-2">
                  <div className="col-12 col-md-6">
                    <ProfileField label="Full Name" required icon={User}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><User size={15} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Aarav Sharma"
                          value={f.name || ''}
                          onChange={handleFieldChange('name')}
                          required
                        />
                      </div>
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-6">
                    <ProfileField
                      label="University Email"
                      help="Managed by College Administration"
                      icon={Mail}
                    >
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><Lock size={15} /></span>
                        <input
                          type="email"
                          className="form-control"
                          value={f.email || ''}
                          disabled
                          readOnly
                        />
                      </div>
                    </ProfileField>
                  </div>
                </div>

                <div className="row g-3 mb-2">
                  <div className="col-12 col-md-4">
                    <ProfileField label="Phone Number" icon={Phone}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><Phone size={15} /></span>
                        <input
                          type="tel"
                          className="form-control"
                          placeholder="+91 98765 43210"
                          value={f.phone || ''}
                          onChange={handleFieldChange('phone')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-4">
                    <ProfileField label="Date of Birth" icon={Calendar}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><Calendar size={15} /></span>
                        <input
                          type="date"
                          className="form-control"
                          value={f.dob || ''}
                          onChange={handleFieldChange('dob')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-4">
                    <ProfileField label="Gender" icon={User}>
                      <select
                        className="form-select"
                        value={f.gender || ''}
                        onChange={handleFieldChange('gender')}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </ProfileField>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <ProfileField label="Current City" icon={MapPin}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><MapPin size={15} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Pune, Maharashtra"
                          value={f.city || ''}
                          onChange={handleFieldChange('city')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-8">
                    <ProfileField label="Permanent Residential Address" icon={Home}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><Home size={15} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Street, landmark, locality, and postal PIN code"
                          value={f.address || ''}
                          onChange={handleFieldChange('address')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACADEMIC DETAILS */}
            {activeTab === 'academic' && (
              <div>
                <div className="cc-profile-notice">
                  <div className="cc-profile-notice-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="cc-profile-notice-text">
                    <strong>Official Academic Audit:</strong> Academic metrics and CGPA scores are cross-verified by the Training & Placement Cell against official university grade sheets during recruitment eligibility audits.
                  </div>
                </div>

                <div className="row g-3 mb-2">
                  <div className="col-12 col-md-4">
                    <ProfileField label="Enrollment / Roll No" help="College Student ID" icon={BookOpen} required>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><BookOpen size={15} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. EN2024CS012"
                          value={f.enrollmentNo || ''}
                          onChange={handleFieldChange('enrollmentNo')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-4">
                    <ProfileField label="Degree / Course" icon={GraduationCap}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><GraduationCap size={15} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. B.Tech / MCA / BCA"
                          value={f.course || ''}
                          onChange={handleFieldChange('course')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-4">
                    <ProfileField label="Branch / Specialization" icon={Laptop}>
                      <div className="cc-profile-input-group">
                        <span className="cc-profile-input-icon"><Laptop size={15} /></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Computer Science & Engineering"
                          value={f.branch || ''}
                          onChange={handleFieldChange('branch')}
                        />
                      </div>
                    </ProfileField>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-3">
                    <ProfileField label="Current Semester" icon={Layers}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 6th Semester"
                        value={f.semester || ''}
                        onChange={handleFieldChange('semester')}
                      />
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-3">
                    <ProfileField label="Cumulative CGPA" help="Scale 0 to 10" icon={Award}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        className="form-control"
                        placeholder="e.g. 8.75"
                        value={f.cgpa ?? ''}
                        onChange={handleFieldChange('cgpa')}
                      />
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-3">
                    <ProfileField label="Graduation / Batch Year" icon={Calendar}>
                      <input
                        type="number"
                        min="1950"
                        max="2100"
                        className="form-control"
                        placeholder="e.g. 2026"
                        value={f.passingYear ?? ''}
                        onChange={handleFieldChange('passingYear')}
                      />
                    </ProfileField>
                  </div>
                  <div className="col-12 col-md-3">
                    <ProfileField label="Active Backlogs" help="0 for none" icon={Clock}>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="form-control"
                        placeholder="0"
                        value={f.backlogs ?? 0}
                        onChange={handleFieldChange('backlogs')}
                      />
                    </ProfileField>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PROFESSIONAL SUMMARY */}
            {activeTab === 'summary' && (
              <div>
                <ProfileField
                  label="Career Objective & Executive Summary"
                  help={`${(f.about || '').length} characters`}
                  icon={Sparkles}
                >
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Provide a compelling career headline summarizing your technical core competencies, noteworthy projects, competitive programming feats, and career ambitions for campus hiring managers..."
                    value={f.about || ''}
                    onChange={handleFieldChange('about')}
                  />
                </ProfileField>

                <div className="cc-profile-notice mt-3 mb-0">
                  <div className="cc-profile-notice-icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="cc-profile-notice-text">
                    <strong>Recruiter Recommendation:</strong> Candidates with a personalized executive summary highlighting key strengths (e.g., Full-Stack Web Development, Data Structures & Algorithms, Cloud Infrastructure) experience a <strong>40% higher shortlist rate</strong> during on-campus recruitment drives.
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="cc-profile-action-bar">
              <div>
                {isDirty ? (
                  <span className="cc-badge amber no-dot d-inline-flex align-items-center gap-2 py-1.5 px-3">
                    <span className="cc-badge-dot bg-warning" />
                    <strong>Unsaved changes</strong> — Click Save to persist updates
                  </span>
                ) : (
                  <span className="small text-muted d-inline-flex align-items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-success" /> Profile records are up to date
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                {isDirty && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={handleReset}
                    disabled={busy}
                  >
                    Discard Changes
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary px-4 d-inline-flex align-items-center gap-2"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <RefreshCw size={15} className="cc-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
