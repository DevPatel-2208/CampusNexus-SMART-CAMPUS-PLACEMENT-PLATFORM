const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/** Normalize legacy PHP $2y$ hashes so bcryptjs ($2a$) can verify them. */
function normalizeHash(hash = '') {
  if (hash.startsWith('$2y$')) return '$2a$' + hash.slice(4);
  return hash;
}

async function hashPassword(plain) { return bcrypt.hash(plain, 12); }
async function verifyPassword(plain, hash) {
  if (!hash) return false;
  try { return await bcrypt.compare(plain, normalizeHash(hash)); } catch { return false; }
}

const BLOCKED_PASSWORDS = new Set(['password', 'password123', '12345678', 'qwerty123', 'career123', 'changeme123']);
function passwordStrengthError(v = '') {
  if (v.length < 8) return 'Password must contain at least 8 characters.';
  if (BLOCKED_PASSWORDS.has(v.toLowerCase())) return 'This password is too common. Choose another.';
  if (!/[A-Z]/.test(v)) return 'Password must contain an uppercase letter.';
  if (!/[a-z]/.test(v)) return 'Password must contain a lowercase letter.';
  if (!/[0-9]/.test(v)) return 'Password must contain a number.';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Password must contain a special character.';
  return null;
}

function randomOtp() { return String(crypto.randomInt(100000, 1000000)); }
function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }

module.exports = { normalizeHash, hashPassword, verifyPassword, passwordStrengthError, randomOtp, sha256 };
