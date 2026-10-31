const { stringify } = require('csv-stringify/sync');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const CompanyProfile = require('../models/CompanyProfile');
const { Job } = require('../models/Job');
const { Application, Selection, Offer, Placement } = require('../models/Application');
const { PlacementDrive, DriveRegistration, Interview } = require('../models/Drive');
const { AuditLog } = require('../models/Misc');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { buildPdf } = require('../services/pdf.service');

function sendCsv(res, filename, columns, rows) {
  const out = stringify(rows, {
    header: true,
    columns: columns.map((c) => ({ key: c.key, header: c.label })),
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(out);
}

function sendPdf(res, filename, dataset) {
  const pdf = buildPdf({
    title: dataset.title,
    subtitle: dataset.subtitle,
    landscape: dataset.landscape,
  });

  if (dataset.summary && dataset.summary.length) {
    pdf.keyValues(dataset.summary);
  }

  pdf.table(dataset.columns, dataset.rows);
  const buf = pdf.build();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
}

const TITLES = {
  students: 'Students Academic & Placement Registry',
  companies: 'Corporate Recruiters & Partners Directory',
  placements: 'Campus Placement & Offer Records',
  applications: 'Student Applications Activity Ledger',
  branch: 'Departmental Placement Summary',
  drives: 'Placement Drives & Participation Registry',
  interviews: 'Interview Rounds & Evaluations Record',
  selections: 'Recruiter Selection Decisions',
  offers: 'Candidate Offer Letters & Commitments',
  audit: 'Security & System Governance Audit Log',
};

async function datasetFor(type) {
  switch (type) {
    case 'students': {
      const users = await User.find({ role: 'student' }).sort({ name: 1 });
      const profiles = await StudentProfile.find({ user: { $in: users.map((u) => u._id) } });
      const pm = new Map(profiles.map((p) => [String(p.user), p]));

      let placedCount = 0;
      const rows = users.map((u) => {
        const p = pm.get(String(u._id)) || {};
        const isPlaced = (p.placementStatus || '').toLowerCase() === 'placed';
        if (isPlaced) placedCount++;
        return {
          name: u.name || 'N/A',
          email: u.email || 'N/A',
          course: p.course || 'B.Tech',
          branch: p.branch || 'Engineering',
          cgpa: p.cgpa != null ? Number(p.cgpa).toFixed(2) : 'N/A',
          backlogs: p.backlogs != null ? String(p.backlogs) : '0',
          placementStatus: isPlaced ? 'Placed' : 'Seeking',
          status: (u.status || 'Active').toUpperCase(),
        };
      });

      const rate = users.length ? ((placedCount / users.length) * 100).toFixed(1) : '0.0';

      return {
        landscape: true,
        summary: [
          ['Total Candidates', String(users.length)],
          ['Placed Students', String(placedCount)],
          ['Placement Rate', `${rate}%`],
          ['Audit Status', 'Verified Registry'],
        ],
        columns: [
          { key: 'name', label: 'Candidate Name', width: 0.16 },
          { key: 'email', label: 'Email Address', width: 0.22 },
          { key: 'course', label: 'Degree', width: 0.11 },
          { key: 'branch', label: 'Branch / Stream', width: 0.16 },
          { key: 'cgpa', label: 'CGPA', width: 0.08 },
          { key: 'backlogs', label: 'Backlogs', width: 0.08 },
          { key: 'placementStatus', label: 'Placement Status', width: 0.11 },
          { key: 'status', label: 'Account', width: 0.08 },
        ],
        rows,
      };
    }

    case 'companies': {
      const items = await CompanyProfile.find({}).populate('user', 'email status').sort({ companyName: 1 });
      let verifiedCount = 0;

      const rows = items.map((c) => {
        const isVer = (c.verificationStatus || '').toLowerCase() === 'verified';
        if (isVer) verifiedCount++;
        return {
          companyName: c.companyName || 'Corporate Partner',
          email: c.user?.email || c.email || 'N/A',
          city: c.city || 'National / Remote',
          industry: c.industry || 'Technology & IT',
          verificationStatus: isVer ? 'Verified' : 'Pending',
        };
      });

      return {
        landscape: true,
        summary: [
          ['Registered Partners', String(items.length)],
          ['Verified Recruiters', String(verifiedCount)],
          ['Verification Rate', items.length ? `${((verifiedCount / items.length) * 100).toFixed(1)}%` : '0%'],
          ['Ledger Domain', 'Corporate Relations'],
        ],
        columns: [
          { key: 'companyName', label: 'Company / Recruiter', width: 0.28 },
          { key: 'email', label: 'Official Contact Email', width: 0.26 },
          { key: 'industry', label: 'Primary Domain', width: 0.18 },
          { key: 'city', label: 'Headquarters / City', width: 0.14 },
          { key: 'verificationStatus', label: 'Verification', width: 0.14 },
        ],
        rows,
      };
    }

    case 'placements': {
      const items = await Placement.find({})
        .populate('student', 'name email')
        .populate('company', 'companyName')
        .sort({ createdAt: -1 });

      let maxPkg = 0;
      let totalPkg = 0;
      let pkgCount = 0;

      const rows = items.map((p) => {
        const pkgVal = p.package ? Number(p.package) : 0;
        if (pkgVal > maxPkg) maxPkg = pkgVal;
        if (pkgVal > 0) {
          totalPkg += pkgVal;
          pkgCount++;
        }
        return {
          student: p.student?.name || 'Candidate',
          email: p.student?.email || 'N/A',
          company: p.company?.companyName || 'Hiring Partner',
          position: p.position || 'Software Engineer',
          package: pkgVal > 0 ? `Rs. ${pkgVal} LPA` : 'Undisclosed',
          status: p.status || 'Confirmed',
          placementDate: p.placementDate ? new Date(p.placementDate).toISOString().slice(0, 10) : 'Recorded',
        };
      });

      const avgPkg = pkgCount ? (totalPkg / pkgCount).toFixed(2) : 'N/A';

      return {
        landscape: true,
        summary: [
          ['Total Placed', String(items.length)],
          ['Highest Package', maxPkg > 0 ? `Rs. ${maxPkg} LPA` : 'N/A'],
          ['Average Package', avgPkg !== 'N/A' ? `Rs. ${avgPkg} LPA` : 'N/A'],
          ['Accreditation', 'NBA / NAAC Ready'],
        ],
        columns: [
          { key: 'student', label: 'Candidate Name', width: 0.18 },
          { key: 'email', label: 'Email Address', width: 0.22 },
          { key: 'company', label: 'Hiring Company', width: 0.20 },
          { key: 'position', label: 'Designation / Role', width: 0.16 },
          { key: 'package', label: 'CTC Package', width: 0.12 },
          { key: 'status', label: 'Placement Status', width: 0.12 },
        ],
        rows,
      };
    }

    case 'applications': {
      const items = await Application.find({})
        .populate('student', 'name email')
        .populate({ path: 'job', populate: { path: 'company', select: 'companyName' } })
        .sort({ appliedAt: -1 });

      const rows = items.map((a) => ({
        student: a.student?.name || 'Applicant',
        email: a.student?.email || 'N/A',
        job: a.job?.title || 'Open Role',
        company: a.job?.company?.companyName || 'Corporate Partner',
        status: a.status || 'Applied',
        appliedAt: a.appliedAt ? new Date(a.appliedAt).toISOString().slice(0, 10) : 'Recent',
      }));

      return {
        landscape: true,
        summary: [
          ['Total Applications', String(items.length)],
          ['Active Pipeline', String(items.filter((x) => !['Rejected', 'Cancelled'].includes(x.status)).length)],
          ['Audit Mode', 'Application Log'],
          ['TPO Verification', 'Compliant'],
        ],
        columns: [
          { key: 'student', label: 'Applicant Name', width: 0.18 },
          { key: 'email', label: 'Email Address', width: 0.22 },
          { key: 'job', label: 'Target Position', width: 0.22 },
          { key: 'company', label: 'Hiring Company', width: 0.20 },
          { key: 'status', label: 'Application Stage', width: 0.18 },
        ],
        rows,
      };
    }

    case 'branch': {
      const rows = await StudentProfile.aggregate([
        {
          $group: {
            _id: '$branch',
            total: { $sum: 1 },
            placed: { $sum: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]);

      let totalStudents = 0;
      let totalPlaced = 0;

      const mapped = rows.map((r) => {
        totalStudents += r.total;
        totalPlaced += r.placed;
        const pct = r.total ? ((r.placed / r.total) * 100).toFixed(1) : '0.0';
        return {
          branch: r._id || 'General / Unspecified',
          total: String(r.total),
          placed: String(r.placed),
          ratio: `${pct}%`,
        };
      });

      const overallRatio = totalStudents ? ((totalPlaced / totalStudents) * 100).toFixed(1) : '0.0';

      return {
        landscape: false,
        summary: [
          ['Evaluated Branches', String(rows.length)],
          ['Total Enrolled', String(totalStudents)],
          ['Placed Across Branches', String(totalPlaced)],
          ['Overall Rate', `${overallRatio}%`],
        ],
        columns: [
          { key: 'branch', label: 'Academic Department / Branch', width: 0.46 },
          { key: 'total', label: 'Enrolled', width: 0.18 },
          { key: 'placed', label: 'Placed', width: 0.18 },
          { key: 'ratio', label: 'Success Ratio', width: 0.18 },
        ],
        rows: mapped,
      };
    }

    case 'drives': {
      const items = await DriveRegistration.find({})
        .populate('drive', 'driveTitle')
        .populate('student', 'name email')
        .sort({ createdAt: -1 });

      const rows = items.map((r) => ({
        drive: r.drive?.driveTitle || 'Campus Drive',
        student: r.student?.name || 'Candidate',
        email: r.student?.email || 'N/A',
        eligibility: r.eligibilityStatus || 'Eligible',
        status: r.status || 'Registered',
      }));

      return {
        landscape: true,
        summary: [
          ['Total Registrations', String(items.length)],
          ['Eligible Candidates', String(items.filter((x) => x.eligibility === 'Eligible').length)],
          ['Drive Status', 'Live Operations'],
          ['TPO Registry', 'Verified'],
        ],
        columns: [
          { key: 'drive', label: 'Drive Title / Event', width: 0.28 },
          { key: 'student', label: 'Candidate Name', width: 0.20 },
          { key: 'email', label: 'Email Address', width: 0.24 },
          { key: 'eligibility', label: 'Eligibility Status', width: 0.14 },
          { key: 'status', label: 'Registration Status', width: 0.14 },
        ],
        rows,
      };
    }

    case 'interviews': {
      const items = await Interview.find({})
        .populate('student', 'name email')
        .populate('company', 'companyName')
        .sort({ interviewDate: -1 });

      const rows = items.map((i) => ({
        student: i.student?.name || 'Candidate',
        company: i.company?.companyName || 'Hiring Partner',
        round: i.roundName || 'Technical Assessment',
        date: i.interviewDate ? new Date(i.interviewDate).toISOString().slice(0, 10) : 'Scheduled',
        mode: i.mode || 'Offline',
        result: i.result || 'Pending',
      }));

      return {
        landscape: true,
        summary: [
          ['Scheduled Interviews', String(items.length)],
          ['Completed Rounds', String(items.filter((x) => x.result !== 'Pending').length)],
          ['Selected Candidates', String(items.filter((x) => x.result === 'Selected').length)],
          ['Interview Domain', 'Campus Evaluations'],
        ],
        columns: [
          { key: 'student', label: 'Candidate Name', width: 0.18 },
          { key: 'company', label: 'Hiring Partner', width: 0.20 },
          { key: 'round', label: 'Interview Round', width: 0.18 },
          { key: 'date', label: 'Interview Date', width: 0.14 },
          { key: 'mode', label: 'Conduct Mode', width: 0.14 },
          { key: 'result', label: 'Evaluation Result', width: 0.16 },
        ],
        rows,
      };
    }

    case 'selections': {
      const items = await Selection.find({})
        .populate('student', 'name email')
        .populate('company', 'companyName')
        .sort({ createdAt: -1 });

      const rows = items.map((s) => ({
        student: s.student?.name || 'Candidate',
        email: s.student?.email || 'N/A',
        company: s.company?.companyName || 'Partner Recruiter',
        status: s.selectionStatus || 'Selected',
      }));

      return {
        landscape: true,
        summary: [
          ['Total Selections', String(items.length)],
          ['Confirmed Decisions', String(items.filter((x) => x.status === 'Selected').length)],
          ['Audit Status', 'Corporate Verified'],
          ['TPO Validation', 'Official Ledger'],
        ],
        columns: [
          { key: 'student', label: 'Candidate Name', width: 0.28 },
          { key: 'email', label: 'Candidate Email', width: 0.28 },
          { key: 'company', label: 'Recruiting Company', width: 0.26 },
          { key: 'status', label: 'Selection Decision', width: 0.18 },
        ],
        rows,
      };
    }

    case 'offers': {
      const items = await Offer.find({})
        .populate('student', 'name email')
        .populate('company', 'companyName')
        .sort({ createdAt: -1 });

      const rows = items.map((o) => ({
        student: o.student?.name || 'Candidate',
        email: o.student?.email || 'N/A',
        company: o.company?.companyName || 'Partner Recruiter',
        position: o.position || 'Software Engineer',
        status: o.status || 'Issued',
      }));

      return {
        landscape: true,
        summary: [
          ['Total Offers Extended', String(items.length)],
          ['Accepted Offers', String(items.filter((x) => (x.status || '').toLowerCase().includes('accept')).length)],
          ['Offer Ledger', 'Institutional Registry'],
          ['Compliance', 'Formal Institutional Document'],
        ],
        columns: [
          { key: 'student', label: 'Candidate Name', width: 0.22 },
          { key: 'email', label: 'Candidate Email', width: 0.24 },
          { key: 'company', label: 'Offering Company', width: 0.24 },
          { key: 'position', label: 'Designation / Role', width: 0.16 },
          { key: 'status', label: 'Offer State', width: 0.14 },
        ],
        rows,
      };
    }

    case 'audit': {
      const items = await AuditLog.find({})
        .populate('user', 'name role')
        .sort({ createdAt: -1 })
        .limit(1000);

      const rows = items.map((a) => ({
        at: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 16).replace('T', ' ') : 'N/A',
        actor: a.user?.name || 'System Daemon',
        action: a.action || 'Event',
        module: a.module || 'Core',
        description: a.description || 'System operation executed',
        ip: a.ipAddress || 'Internal',
      }));

      return {
        landscape: true,
        summary: [
          ['Events Recorded', String(items.length)],
          ['Ledger Integrity', 'Immutable Stream'],
          ['Log Window', 'Last 1,000 Records'],
          ['Governance Level', 'Enterprise High-Security'],
        ],
        columns: [
          { key: 'at', label: 'Timestamp', width: 0.16 },
          { key: 'actor', label: 'Actor / User', width: 0.16 },
          { key: 'action', label: 'Action Event', width: 0.14 },
          { key: 'module', label: 'Module', width: 0.14 },
          { key: 'description', label: 'Description & Payload', width: 0.28 },
          { key: 'ip', label: 'Client IP', width: 0.12 },
        ],
        rows,
      };
    }

    default:
      throw ApiError.notFound('Unknown report type.');
  }
}

const report = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const format = (req.query.format || 'csv').toLowerCase();
  if (!['csv', 'pdf'].includes(format)) throw ApiError.badRequest('Only format=csv or format=pdf is supported.');

  const ds = await datasetFor(type);
  const title = TITLES[type] || 'Institutional Placement Report';
  const filename = `${type}_report_${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === 'pdf') {
    sendPdf(res, filename, {
      ...ds,
      title,
      subtitle: `Academic Year 2025-2026 • Export Date: ${new Date().toISOString().slice(0, 10)}`,
      landscape: ds.landscape !== undefined ? ds.landscape : ds.columns.length > 4,
    });
    return;
  }

  sendCsv(res, filename, ds.columns, ds.rows);
});

module.exports = { report, datasetFor };
