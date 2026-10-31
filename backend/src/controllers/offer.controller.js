const { Selection, Offer, Placement, OFFER_STATUSES } = require('../models/Application');
const { Application } = require('../models/Application');
const CompanyProfile = require('../models/CompanyProfile');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { ApiError, asyncHandler, paginate, escapeRegex } = require('../utils/helpers');
const { notifyUser } = require('../services/notify.service');
const { recordStatus } = require('../services/application.service');
const { expireOffers, LIVE_OFFER } = require('../services/offer.service');
const audit = require('../services/audit.service');
const { verifySniff, removeFile } = require('../middleware/upload');
const { buildPdf } = require('../services/pdf.service');
const fs = require('fs');
const path = require('path');

async function ownCompany(userId) {
  const cp = await CompanyProfile.findOne({ user: userId });
  if (!cp) throw ApiError.badRequest('Company profile not found.');
  return cp;
}

/** Build an $or clause matching student name/email or company name. */
async function nameSearch(search) {
  const rx = new RegExp(escapeRegex(search), 'i');
  const [studs, comps] = await Promise.all([
    User.find({ role: 'student', $or: [{ name: rx }, { email: rx }] }).select('_id'),
    CompanyProfile.find({ companyName: rx }).select('_id'),
  ]);
  return [{ student: { $in: studs.map((s) => s._id) } }, { company: { $in: comps.map((c) => c._id) } }];
}

const decide = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const { applicationId, status, remarks } = req.body;
  if (!['Selected', 'Rejected', 'On Hold'].includes(status)) throw ApiError.badRequest('Invalid decision.');
  if (status === 'Rejected' && (!remarks || remarks.trim().length < 5)) throw ApiError.badRequest('Rejection reason is required (min 5 characters).');
  const app = await Application.findById(applicationId).populate('job');
  if (!app) throw ApiError.notFound('Application not found');
  if (String(app.job.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  const sel = await Selection.findOneAndUpdate(
    { application: app._id }, { application: app._id, company: cp._id, student: app.student, selectionStatus: status, remarks: remarks || null }, { new: true, upsert: true }
  );
  if (status === 'Selected') { recordStatus(app, 'Selected', null, req.user._id); app.rejectionReason = null; await app.save(); }
  else if (status === 'Rejected') { recordStatus(app, 'Rejected', remarks, req.user._id); app.rejectionReason = remarks; await app.save(); }
  await notifyUser(app.student, status === 'Selected' ? 'You are shortlisted' : `Selection update: ${status}`, `${cp.companyName}: ${status} — ${app.job.title}`, { type: 'selection', referenceId: sel._id, priority: 'high', actionUrl: '/student/applications' });
  audit('selection', 'selections', `${cp.companyName} marked application ${app._id} as ${status}`, req.user._id, req);
  res.json({ success: true, data: sel });
});

const listSelections = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.user.role === 'company') { const cp = await ownCompany(req.user._id); filter.company = cp._id; }
  if (req.query.status) filter.selectionStatus = req.query.status;
  if (req.query.search) filter.$or = await nameSearch(req.query.search);
  const [items, total] = await Promise.all([
    Selection.find(filter).populate('student', 'name email').populate('company', 'companyName').populate({ path: 'application', populate: { path: 'job', select: 'title' } }).sort({ selectedAt: -1 }).skip(skip).limit(limit),
    Selection.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const OFFER_LETTER_FIELDS = ['department', 'workMode', 'terms', 'remarks', 'representativeName', 'representativeDesignation'];

const createOffer = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const { selectionId, studentId, jobId, position, salary, joiningDate, location, employmentType, offerExpiry } = req.body;
  const sel = selectionId ? await Selection.findById(selectionId) : null;
  if (selectionId && (!sel || sel.selectionStatus !== 'Selected')) throw ApiError.badRequest('Offer requires a Selected selection.');
  let letter = null;
  if (req.file) { verifySniff('offer', req.file.path); letter = 'uploads/offer_letters/' + path.basename(req.file.path); }
  const extra = {};
  for (const k of OFFER_LETTER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, k)) extra[k] = String(req.body[k] || '').trim() || null;
  }
  if (extra.workMode && !['Onsite', 'Hybrid', 'Remote'].includes(extra.workMode)) delete extra.workMode;
  const offer = await Offer.create({
    selection: sel?._id || null, student: sel?.student || studentId, company: cp._id, job: sel ? (await Application.findById(sel.application).select('job')).job : jobId,
    position, salary, joiningDate: joiningDate || null, location, employmentType, offerExpiry: offerExpiry || null,
    ...extra,
    offerLetter: letter, status: 'draft',
  });
  audit('offer_create', 'offers', `Offer drafted for ${position}`, req.user._id, req);
  res.status(201).json({ success: true, data: offer });
});

const issueOffer = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const offer = await Offer.findOne({ _id: req.params.id, company: cp._id }).populate('job', 'title');
  if (!offer) throw ApiError.notFound('Offer not found');
  if (offer.status !== 'draft') throw ApiError.badRequest('Only draft offers can be issued.');
  offer.status = 'pending'; offer.issueDate = new Date(); await offer.save();
  await notifyUser(offer.student, 'Offer received', `${cp.companyName} offered ${offer.position}.`, { type: 'offer', referenceId: offer._id, priority: 'high', actionUrl: '/student/offers' });
  audit('offer', 'offers', `Offer issued to student ${offer.student}`, req.user._id, req);
  res.json({ success: true, data: offer });
});

const companyOffers = asyncHandler(async (req, res) => {
  await expireOffers();
  const cp = await ownCompany(req.user._id);
  res.json({ success: true, data: await Offer.find({ company: cp._id }).populate('student', 'name email').populate('job', 'title').sort({ createdAt: -1 }) });
});
const myOffers = asyncHandler(async (req, res) => {
  await expireOffers();
  res.json({ success: true, data: await Offer.find({ student: req.user._id }).populate('company', 'companyName').populate('job', 'title').sort({ createdAt: -1 }) });
});
const allOffers = asyncHandler(async (req, res) => {
  await expireOffers();
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = await nameSearch(req.query.search);
    filter.$or.push({ position: new RegExp(escapeRegex(req.query.search), 'i') });
  }
  const [items, total] = await Promise.all([
    Offer.find(filter).populate('student', 'name email').populate('company', 'companyName').populate('job', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Offer.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const getOne = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id)
    .populate('company', 'companyName city website')
    .populate('student', 'name email')
    .populate('job', 'title location')
    .populate('selection', 'selectionStatus remarks');
  if (!offer) throw ApiError.notFound('Offer not found');
  const uid = String(req.user._id);
  if (req.user.role === 'student' && String(offer.student?._id || offer.student) !== uid) throw ApiError.forbidden('Access denied');
  if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    if (String(offer.company?._id || offer.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  res.json({ success: true, data: offer });
});

const patchOffer = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const offer = await Offer.findOne({ _id: req.params.id, company: cp._id });
  if (!offer) throw ApiError.notFound('Offer not found');
  // Parity with legacy edit_offer.php: only draft or pending offers are editable.
  if (!['draft', 'pending'].includes(offer.status)) throw ApiError.badRequest(`Only draft or pending offers can be edited. This offer is ${offer.status}.`);
  const { position, salary, joiningDate, location, employmentType, offerExpiry } = req.body;
  if (position !== undefined) {
    if (!String(position).trim()) throw ApiError.badRequest('Position is required.');
    if (String(position).length > 120) throw ApiError.badRequest('Position must be within 120 characters.');
    offer.position = String(position).trim();
  }
  if (salary !== undefined) offer.salary = String(salary).slice(0, 50) || null;
  if (joiningDate !== undefined) {
    if (!joiningDate) throw ApiError.badRequest('Joining date is required.');
    if (isNaN(new Date(joiningDate))) throw ApiError.badRequest('Joining date must be valid.');
    offer.joiningDate = joiningDate;
  }
  if (location !== undefined) offer.location = String(location).slice(0, 120) || null;
  if (employmentType !== undefined) offer.employmentType = employmentType || null;
  if (offerExpiry !== undefined) {
    if (offerExpiry && isNaN(new Date(offerExpiry))) throw ApiError.badRequest('Offer expiry date must be valid.');
    offer.offerExpiry = offerExpiry || null;
  }
  for (const k of OFFER_LETTER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, k)) offer[k] = String(req.body[k] || '').trim() || null;
  }
  if (offer.workMode && !['Onsite', 'Hybrid', 'Remote'].includes(offer.workMode)) offer.workMode = null;
  if (req.file) {
    verifySniff('offer', req.file.path);
    if (offer.offerLetter) removeFile(offer.offerLetter);
    offer.offerLetter = 'uploads/offer_letters/' + path.basename(req.file.path);
  }
  await offer.save();
  audit('offer_edit', 'offers', `Offer ${offer._id} (${offer.position}) edited`, req.user._id, req);
  res.json({ success: true, data: offer });
});

const withdrawOffer = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 3) throw ApiError.badRequest('Withdrawal reason is required.');
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw ApiError.notFound('Offer not found');
  if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    if (String(offer.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  if (!['draft', ...LIVE_OFFER].includes(offer.status)) throw ApiError.badRequest(`Cannot withdraw an offer with status ${offer.status}.`);
  offer.status = 'withdrawn'; offer.withdrawReason = reason; await offer.save();
  await notifyUser(offer.student, 'Offer withdrawn', `An offer for ${offer.position} was withdrawn.`, { type: 'offer', referenceId: offer._id, priority: 'high' });
  res.json({ success: true, data: offer });
});

const acceptOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, student: req.user._id });
  if (!offer) throw ApiError.notFound('Offer not found');
  if (offer.offerExpiry && new Date(offer.offerExpiry) < new Date(new Date().toDateString())) { offer.status = 'expired'; await offer.save(); throw ApiError.gone('Offer has expired.'); }
  if (!LIVE_OFFER.includes(offer.status)) throw ApiError.badRequest(`Offer is ${offer.status}.`);
  offer.status = 'accepted'; await offer.save();
  const placement = await Placement.create({
    student: offer.student, company: offer.company, job: offer.job, offer: offer._id,
    position: offer.position, package: offer.salary, joiningDate: offer.joiningDate, location: offer.location,
    placementDate: new Date(), status: 'Placed',
  });
  await StudentProfile.findOneAndUpdate({ user: offer.student }, { placementStatus: 'placed' });
  const app = await Application.findOne({ student: offer.student, job: offer.job });
  if (app) { recordStatus(app, 'Placed', 'Offer accepted', offer.student); await app.save(); }
  audit('offer_accept', 'offers', `Offer accepted: ${offer.position}`, req.user._id, req);
  res.json({ success: true, data: { offer, placement } });
});

const rejectOffer = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 5 || reason.trim().length > 1000) throw ApiError.badRequest('Rejection reason must be 5–1000 characters.');
  const offer = await Offer.findOne({ _id: req.params.id, student: req.user._id });
  if (!offer) throw ApiError.notFound('Offer not found');
  if (!LIVE_OFFER.includes(offer.status)) throw ApiError.badRequest(`Offer is ${offer.status}.`);
  offer.status = 'rejected'; offer.studentRejectReason = reason; await offer.save();
  res.json({ success: true, data: offer });
});

const myPlacements = asyncHandler(async (req, res) => {
  const items = await Placement.find({ student: req.user._id }).populate('company', 'companyName').populate('job', 'title').sort({ placementDate: -1 });
  res.json({ success: true, data: items });
});
const allPlacements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.year) filter.placementDate = { $gte: new Date(`${req.query.year}-01-01`), $lt: new Date(`${+req.query.year + 1}-01-01`) };
  if (req.user.role === 'company') { const cp = await ownCompany(req.user._id); filter.company = cp._id; }
  if (req.query.search) filter.$or = await nameSearch(req.query.search);
  const [items, total] = await Promise.all([
    Placement.find(filter).populate('student', 'name email').populate('company', 'companyName').populate('job', 'title').sort({ placementDate: -1 }).skip(skip).limit(limit),
    Placement.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const letterPdf = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id)
    .populate('company', 'companyName city website')
    .populate('student', 'name email')
    .populate('job', 'title');
  if (!offer) throw ApiError.notFound('Offer not found');
  const uid = String(req.user._id);
  const isOwnerStudent = String(offer.student?._id || offer.student) === uid;
  if (req.user.role === 'student' && !isOwnerStudent) throw ApiError.forbidden('Access denied');
  if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    if (String(offer.company?._id || offer.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }

  // Prefer the company-uploaded letter when present.
  if (offer.offerLetter) {
    const abs = path.isAbsolute(offer.offerLetter) ? offer.offerLetter : path.join(__dirname, '../../', offer.offerLetter);
    if (fs.existsSync(abs)) { res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`); return res.sendFile(abs); }
  }

  const company = offer.company || {};
  const student = offer.student || {};
  const job = offer.job || {};
  const ref = `CC-OFFER-${String(offer._id).slice(-8).toUpperCase()}`;
  const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

  const pdf = buildPdf({
    title: String(company.companyName || 'CareerConnect'),
    subtitle: [company.city, company.website].filter(Boolean).join('  |  ') || '',
    footer: `CareerConnect · Offer Letter · ${ref}`,
  });

  // ---- Letterhead ----
  pdf.heading('OFFER OF EMPLOYMENT');
  pdf.keyValues([
    ['Ref No', ref],
    ['Date', fmt(offer.issueDate || offer.createdAt)],
  ]);

  // ---- Recipient ----
  pdf.paragraph('To,');
  pdf.paragraph(`${student.name || 'Candidate'}${student.email ? ` — ${student.email}` : ''}`);

  // ---- Subject ----
  pdf.subheading(`Subject: Offer of Employment — ${offer.position}${job.title ? ` (${job.title})` : ''}`);
  pdf.paragraph(`Dear ${student.name || 'Candidate'},`);

  // ---- Body ----
  pdf.paragraph(
    `${company.companyName || 'The company'} is pleased to offer you the position of ${offer.position}${job.title ? ` (${job.title})` : ''}.`
  );

  // ---- Offer details table ----
  const detailRows = [
    ['Position', offer.position || '—'],
    ['Department', offer.department || '—'],
    ['Location', offer.location || '—'],
    ['Compensation', offer.salary || '—'],
    ['Employment Type', offer.employmentType || '—'],
    ['Joining Date', fmt(offer.joiningDate)],
    ['Offer Valid Until', fmt(offer.offerExpiry)],
  ];
  pdf.table(
    [{ key: 'k', label: 'Detail', width: 0.34 }, { key: 'v', label: 'Information', width: 0.66 }],
    detailRows.map(([k, v]) => ({ k, v }))
  );

  // ---- Terms & conditions ----
  if (offer.terms) {
    pdf.subheading('Terms & Conditions');
    pdf.paragraph(offer.terms);
  }
  if (offer.remarks) {
    pdf.subheading('Remarks');
    pdf.paragraph(offer.remarks);
  }

  // ---- Closing ----
  pdf.paragraph('We look forward to welcoming you to our team. Please accept or respond to this offer through the CareerConnect portal.');
  pdf.paragraph('Sincerely,');
  pdf.paragraph(`${offer.representativeName || ''}${offer.representativeDesignation ? `, ${offer.representativeDesignation}` : ''}`);
  pdf.paragraph(`${company.companyName || 'Company'}`);

  const buf = pdf.build();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="offer-${offer._id}.pdf"`);
  res.send(buf);
});

module.exports = { decide, listSelections, createOffer, getOne, patchOffer, issueOffer, companyOffers, myOffers, allOffers, withdrawOffer, acceptOffer, rejectOffer, myPlacements, allPlacements, letterPdf, OFFER_STATUSES };
