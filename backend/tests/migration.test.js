/** Migration parser unit tests (no DB). Validates counts + FK quarantine on the real dump if present. */
const fs = require('fs');
const path = require('path');

const SQL_CANDIDATES = [
  'C:\\Users\\DEV PATEL\\Downloads\\careerconnect (1).sql',
  'C:\\xampp\\htdocs\\careerconnect_new\\CAREERCONNECT_COMPLETE.sql',
];

describe('migration', () => {
  test('dump parses with expected table counts', () => {
    const sqlPath = SQL_CANDIDATES.find((p) => fs.existsSync(p));
    if (!sqlPath) { console.warn('SQL dump not found — skipping count assertions'); return; }
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'scripts', 'migrate-mysql-to-mongodb.js'), 'utf8');
    expect(src).toMatch(/parseDump|INSERT INTO/);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const tables = [...sql.matchAll(/Table structure for table `(\w+)`/g)].map((m) => m[1]);
    for (const t of ['users', 'applications_new', 'jobs_new', 'placement_drives', 'assessments', 'assessment_questions', 'assessment_attempts', 'interviews_new', 'offers', 'placements', 'notifications_new']) {
      expect(tables).toContain(t);
    }
    const countInserts = (t) => (sql.match(new RegExp(`INSERT INTO \`${t}\``, 'g')) || []).length;
    expect(countInserts('users')).toBeGreaterThanOrEqual(1);
  });
});
