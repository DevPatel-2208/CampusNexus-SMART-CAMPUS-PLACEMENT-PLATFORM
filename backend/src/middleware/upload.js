const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { ApiError } = require('../utils/helpers');

const DIRS = {
  resume: 'uploads/resumes',
  photo: 'uploads/profile_photos',
  logo: 'uploads/company_logos',
  document: 'uploads/company_documents',
  offer: 'uploads/offer_letters',
};
for (const d of Object.values(DIRS)) fs.mkdirSync(path.join(__dirname, '../../', d), { recursive: true });

const MIME_BY_EXT = {
  pdf: ['application/pdf'],
  doc: ['application/msword', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'],
};
const RULES = {
  resume: { exts: ['pdf', 'doc', 'docx'], max: 5 * 1024 * 1024 },
  photo: { exts: ['jpg', 'jpeg', 'png'], max: 2 * 1024 * 1024, image: true },
  logo: { exts: ['jpg', 'jpeg', 'png', 'webp'], max: 2 * 1024 * 1024, image: true },
  document: { exts: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'], max: 5 * 1024 * 1024 },
  offer: { exts: ['pdf', 'doc', 'docx'], max: 5 * 1024 * 1024 },
};

function sniffOk(buffer, ext) {
  if (buffer.slice(0, 5).toString() === '%PDF-') return ext === 'pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ['jpg', 'jpeg'].includes(ext);
  if (buffer[0] === 0x89 && buffer.slice(1, 4).toString() === 'PNG') return ext === 'png';
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return ext === 'webp';
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return ['docx', 'doc'].includes(ext); // ZIP (docx)
  if (buffer.slice(0, 8).toString() === '{\\rtf1' || buffer.slice(0, 4).toString() === '\xD0\xCF\x11\xE0') return ext === 'doc';
  return true; // unknown signature → allow if ext+mime passed (parity with PHP octet-stream passthrough)
}

function uploader(kind) {
  const rule = RULES[kind];
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../', DIRS[kind])),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '') || 'bin';
      cb(null, `${kind}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: rule.max, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
      if (!rule.exts.includes(ext)) return cb(ApiError.badRequest(`File type .${ext || '?'} not allowed. Allowed: ${rule.exts.join(', ')}`));
      const allowed = MIME_BY_EXT[ext] || [];
      if (file.mimetype && allowed.length && !allowed.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
        return cb(ApiError.badRequest(`MIME type ${file.mimetype} does not match .${ext}`));
      }
      cb(null, true);
    },
  }).single('file');
}

function verifySniff(kind, filePath) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const buf = fs.readFileSync(filePath).slice(0, 16);
  if (!sniffOk(buf, ext)) { fs.unlinkSync(filePath); throw ApiError.badRequest('File content does not match its extension'); }
}

function removeFile(relOrAbs) {
  try {
    const p = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(__dirname, '../../', relOrAbs);
    const root = path.join(__dirname, '../../', 'uploads');
    if (!path.resolve(p).startsWith(path.resolve(root))) return; // traversal guard
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch { /* ignore */ }
}

module.exports = { uploader, verifySniff, removeFile, DIRS, RULES };
