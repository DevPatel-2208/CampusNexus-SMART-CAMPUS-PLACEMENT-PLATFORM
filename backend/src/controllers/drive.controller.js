const { PlacementDrive, DriveRegistration, DRIVE_STATUSES } = require('../models/Drive');
const { ApiError, asyncHandler, paginate, escapeRegex } = require('../utils/helpers');
const { checkDriveEligibility, driveRegistrationOpen } = require('../services/eligibility.service');
const audit = require('../services/audit.service');

function syncStatus(drive) {
  // Forward-only auto-sync (parity with PHP cc_sync_drive_statuses)
  const now = new Date();
  if (['completed', 'cancelled'].includes(drive.status)) return drive.status;
  if (drive.registrationStart && now < new Date(drive.registrationStart)) return 'upcoming';
  if (drive.registrationStart && drive.registrationEnd && now >= new Date(drive.registrationStart) && now <= new Date(drive.registrationEnd)) return 'registration_open';
  if (drive.registrationEnd && now > new Date(drive.registrationEnd) && now < new Date(drive.driveDate)) return 'registration_closed';
  if (now.toDateString() === new Date(drive.driveDate).toDateString()) return 'ongoing';
  if (now > new Date(drive.driveDate)) return 'completed';
  return drive.status;
}

/* ---- Drive conflict validation (parity with PHP includes/drive_validation.php) ---- */
function normTime(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
function sameDay(a, b) {
  const x = new Date(a); const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  // Adjacent slots (10:00-11:00 vs 11:00-12:00) are allowed — strict </>.
  const norm = (s, e) => [s === null ? 0 : s, e === null ? 24 * 60 : e];
  const [as, ae] = norm(aStart, aEnd);
  const [bs, be] = norm(bStart, bEnd);
  return as < be && bs < ae;
}
function normVenue(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

function validateDriveTimes(startTime, endTime) {
  const st = normTime(startTime); const et = normTime(endTime);
  if (startTime && st === null) throw ApiError.badRequest('Invalid start time.');
  if (endTime && et === null) throw ApiError.badRequest('Invalid end time.');
  if (st !== null && et !== null && st >= et) throw ApiError.badRequest('End time must be later than start time.');
}

async function findConflicts({ company, driveDate, startTime, endTime, venue, excludeId }) {
  if (!driveDate) return { venue: [], company: [] };
  const day = new Date(driveDate);
  const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);
  const filter = { driveDate: { $gte: startOfDay, $lt: endOfDay } };
  if (excludeId) filter._id = { $ne: excludeId };
  const candidates = await PlacementDrive.find(filter).populate('company', 'companyName');
  const st = normTime(startTime); const et = normTime(endTime);
  const v = normVenue(venue);
  const venueConflicts = [];
  const companyConflicts = [];
  for (const d of candidates) {
    const overlap = overlaps(st, et, normTime(d.startTime), normTime(d.endTime));
    if (v && normVenue(d.venue) === v && overlap) {
      venueConflicts.push({ id: d._id, driveTitle: d.driveTitle, venue: d.venue, slot: `${d.startTime || ''}-${d.endTime || ''}` });
    }
    if (company && String(d.company?._id || d.company) === String(company) && overlap) {
      companyConflicts.push({ id: d._id, driveTitle: d.driveTitle, companyName: d.company?.companyName || '', slot: `${d.startTime || ''}-${d.endTime || ''}` });
    }
  }
  return { venue: venueConflicts, company: companyConflicts };
}

function assertNoConflict(conflicts) {
  const parts = [];
  if (conflicts.venue.length) parts.push(`venue already booked (${conflicts.venue.map((c) => c.driveTitle).join(', ')})`);
  if (conflicts.company.length) parts.push(`company has a conflicting drive (${conflicts.company.map((c) => c.driveTitle).join(', ')})`);
  if (parts.length) throw ApiError.conflict(`Drive scheduling conflict: ${parts.join('; ')}.`);
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.company) filter.company = req.query.company;
  if (req.query.mode) filter.mode = req.query.mode;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    const cos = await PlacementDrive.db.model('CompanyProfile').find({ companyName: rx }).select('_id');
    filter.$or = [{ driveTitle: rx }, { company: { $in: cos.map((c) => c._id) } }];
  }
  const wantsStudentView = req.query.scope === 'student' && req.user && req.user.role === 'student';
  const sort = wantsStudentView ? { driveDate: -1 } : { driveDate: 1 };
  const [items, total] = await Promise.all([
    PlacementDrive.find(filter).populate('company', 'companyName city').populate('job', 'title').sort(sort).skip(skip).limit(limit),
    PlacementDrive.countDocuments(filter),
  ]);
  if (!wantsStudentView) {
    const regCounts = await DriveRegistration.aggregate([
      { $match: { drive: { $in: items.map((d) => d._id) } } },
      { $group: { _id: '$drive', n: { $sum: 1 } } },
    ]);
    const rcMap = new Map(regCounts.map((r) => [String(r._id), r.n]));
    const withCounts = items.map((d) => ({ ...d.toObject(), regCount: rcMap.get(String(d._id)) || 0 }));
    res.json({ success: true, data: withCounts, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
    return;
  }
  let registrations = [];
  if (req.user) registrations = await DriveRegistration.find({ student: req.user._id }).select('drive status eligibilityStatus');
  const regMap = new Map(registrations.map((r) => [String(r.drive), r]));
  const enriched = await Promise.all(items.map(async (d) => {
    const elig = await checkDriveEligibility(d, req.user._id);
    return {
      drive: d,
      regCount: await DriveRegistration.countDocuments({ drive: d._id }),
      eligibility: { eligible: !!elig.eligible, reasons: elig.reasons || [] },
      myRegistration: regMap.get(String(d._id)) || null,
    };
  }));
  const summary = {
    all: total,
    upcoming: items.filter((d) => d.status === 'upcoming').length,
    eligible: enriched.filter((e) => e.eligibility.eligible).length,
    registered: registrations.length,
  };
  res.json({ success: true, data: enriched, summary, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

/* Completed/cancelled drives with participation aggregates — parity with
   legacy tpo/drive_history.php (registrations, shortlisted, selected). */
const history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const status = ['completed', 'cancelled'].includes(req.query.status) ? req.query.status : null;
  const filter = status ? { status } : { status: { $in: ['completed', 'cancelled'] } };
  if (req.query.mode) filter.mode = req.query.mode;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
    const cos = await PlacementDrive.db.model('CompanyProfile').find({ companyName: rx }).select('_id');
    filter.$or = [{ driveTitle: rx }, { company: { $in: cos.map((c) => c._id) } }];
  }
  const [items, total] = await Promise.all([
    PlacementDrive.find(filter).populate('company', 'companyName city').sort({ driveDate: -1 }).skip(skip).limit(limit),
    PlacementDrive.countDocuments(filter),
  ]);
  const withCounts = await Promise.all(items.map(async (d) => {
    const [regCount, shortlistedCount, selectedCount] = await Promise.all([
      DriveRegistration.countDocuments({ drive: d._id }),
      DriveRegistration.countDocuments({ drive: d._id, status: 'shortlisted' }),
      DriveRegistration.countDocuments({ drive: d._id, status: 'selected' }),
    ]);
    return { drive: d, regCount, shortlistedCount, selectedCount };
  }));
  const [completed, cancelled, participants] = await Promise.all([
    PlacementDrive.countDocuments({ status: 'completed' }),
    PlacementDrive.countDocuments({ status: 'cancelled' }),
    DriveRegistration.countDocuments({ drive: { $in: await PlacementDrive.find({ status: 'completed' }).select('_id') } }),
  ]);
  res.json({ success: true, data: withCounts, summary: { completed, cancelled, participants }, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const create = asyncHandler(async (req, res) => {
  const { eligibility, ...rest } = req.body;
  validateDriveTimes(rest.startTime, rest.endTime);
  const conflicts = await findConflicts({ company: rest.company, driveDate: rest.driveDate, startTime: rest.startTime, endTime: rest.endTime, venue: rest.venue });
  assertNoConflict(conflicts);
  const drive = await PlacementDrive.create({ ...rest, eligibility: eligibility || {}, createdBy: req.user._id });
  audit('drive_create', 'drives', `Drive created: ${drive.driveTitle}`, req.user._id, req);
  res.status(201).json({ success: true, data: drive });
});

const getOne = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id).populate('company').populate('job');
  if (!drive) throw ApiError.notFound('Drive not found');
  const [regCount, myRegistration] = await Promise.all([
    DriveRegistration.countDocuments({ drive: drive._id }),
    req.user ? DriveRegistration.findOne({ drive: drive._id, student: req.user._id }) : null,
  ]);
  const seatsFull = !!(drive.maxStudents && regCount >= drive.maxStudents);
  res.json({ success: true, data: { drive, regCount, myRegistration: myRegistration || null, registrationOpen: driveRegistrationOpen(drive), seatsFull } });
});

const update = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) throw ApiError.notFound('Drive not found');
  const { eligibility, ...rest } = req.body;
  const merged = { ...drive.toObject(), ...rest };
  validateDriveTimes(merged.startTime, merged.endTime);
  const conflicts = await findConflicts({ company: merged.company, driveDate: merged.driveDate, startTime: merged.startTime, endTime: merged.endTime, venue: merged.venue, excludeId: drive._id });
  assertNoConflict(conflicts);
  Object.assign(drive, rest);
  if (eligibility) drive.eligibility = { ...drive.eligibility, ...eligibility };
  await drive.save();
  audit('drive_update', 'drives', `Drive updated: ${drive.driveTitle}`, req.user._id, req);
  res.json({ success: true, data: drive });
});

const conflictCheck = asyncHandler(async (req, res) => {
  const { company, driveDate, startTime, endTime, venue, excludeId } = req.query;
  const st = normTime(startTime); const et = normTime(endTime);
  const timeError = (st !== null && et !== null && st >= et) ? 'End time must be later than start time.' : null;
  const conflicts = await findConflicts({ company, driveDate, startTime, endTime, venue, excludeId });
  res.json({ success: true, data: { ok: !timeError && !conflicts.venue.length && !conflicts.company.length, timeError, venue: conflicts.venue, company: conflicts.company } });
});

const remove = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findByIdAndDelete(req.params.id);
  if (!drive) throw ApiError.notFound('Drive not found');
  await DriveRegistration.deleteMany({ drive: drive._id });
  res.json({ success: true, data: { message: 'Drive deleted' } });
});

const putEligibility = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) throw ApiError.notFound('Drive not found');
  drive.eligibility = { ...drive.eligibility, ...req.body };
  await drive.save();
  res.json({ success: true, data: drive });
});

const myEligibility = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) throw ApiError.notFound('Drive not found');
  res.json({ success: true, data: await checkDriveEligibility(drive, req.user._id) });
});

const register = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) throw ApiError.notFound('Drive not found');
  if (!driveRegistrationOpen(drive)) throw ApiError.badRequest('Registration is closed for this drive.');
  const { eligible, reasons } = await checkDriveEligibility(drive, req.user._id);
  if (!eligible) throw ApiError.forbidden(`Not eligible: ${reasons.map((r) => r.detail).join('; ')}`);
  if (drive.maxStudents) {
    const count = await DriveRegistration.countDocuments({ drive: drive._id });
    if (count >= drive.maxStudents) throw ApiError.conflict('Drive seats are full.');
  }
  try {
    const reg = await DriveRegistration.create({ drive: drive._id, student: req.user._id, eligibilityStatus: 'eligible', status: 'registered' });
    res.status(201).json({ success: true, data: reg });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Already registered for this drive.');
    throw e;
  }
});

const registrations = asyncHandler(async (req, res) => {
  const regs = await DriveRegistration.find({ drive: req.params.id }).populate('student', 'name email').sort({ registeredAt: -1 });
  res.json({ success: true, data: regs });
});

const patchRegistration = asyncHandler(async (req, res) => {
  const reg = await DriveRegistration.findOne({ _id: req.params.regId, drive: req.params.id });
  if (!reg) throw ApiError.notFound('Registration not found');
  if (!['registered', 'shortlisted', 'rejected', 'selected'].includes(req.body.status)) throw ApiError.badRequest('Invalid status.');
  reg.status = req.body.status; await reg.save();
  res.json({ success: true, data: reg });
});

module.exports = { list, history, create, getOne, update, remove, putEligibility, myEligibility, register, registrations, patchRegistration, conflictCheck, syncStatus, DRIVE_STATUSES, _internals: { normTime, overlaps, normVenue, validateDriveTimes } };
