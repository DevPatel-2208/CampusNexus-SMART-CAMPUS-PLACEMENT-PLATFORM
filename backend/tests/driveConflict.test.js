const { _internals } = require('../src/controllers/drive.controller');

describe('drive conflict rules (parity with includes/drive_validation.php)', () => {
  const { normTime, overlaps, normVenue } = _internals;

  test('normTime parses HH:MM and rejects invalid', () => {
    expect(normTime('10:30')).toBe(630);
    expect(normTime('09:00:00')).toBe(540);
    expect(normTime('')).toBeNull();
    expect(normTime('25:00')).toBeNull();
    expect(normTime('12:60')).toBeNull();
  });

  test('adjacent slots are allowed (strict overlap)', () => {
    // 10:00-11:00 vs 11:00-12:00 -> NOT overlapping
    expect(overlaps(normTime('10:00'), normTime('11:00'), normTime('11:00'), normTime('12:00'))).toBe(false);
  });

  test('partially and fully overlapping slots conflict', () => {
    expect(overlaps(normTime('10:00'), normTime('12:00'), normTime('11:00'), normTime('13:00'))).toBe(true);
    expect(overlaps(normTime('10:00'), normTime('14:00'), normTime('11:00'), normTime('12:00'))).toBe(true);
  });

  test('missing times fall back to full-day span', () => {
    // one drive has no times -> treated as 00:00-24:00, so overlap with any slot
    expect(overlaps(null, null, normTime('09:00'), normTime('10:00'))).toBe(true);
  });

  test('venue comparison is trimmed and case-insensitive', () => {
    expect(normVenue('  Main   Hall ')).toBe(normVenue('main   hall'));
  });

  test('validateDriveTimes rejects end <= start', () => {
    expect(() => _internals.validateDriveTimes('11:00', '10:00')).toThrow();
    expect(() => _internals.validateDriveTimes('10:00', '11:00')).not.toThrow();
  });
});
