const os = require('os');
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Reuse an already-cached MongoDB binary so the test suite never triggers a fresh
// ~500MB download. mongodb-memory-server reads these env vars at create() time.
(function useCachedBinary() {
  if (process.env.MONGOMS_SYSTEM_BINARY || process.env.MONGOMS_VERSION) return;
  const dirs = [
    path.join(os.homedir(), '.cache', 'mongodb-binaries'),
    path.join(process.cwd(), '.cache', 'mongodb-binaries'),
    path.join(process.cwd(), 'node_modules', '.cache', 'mongodb-memory-server'),
  ];
  for (const dir of dirs) {
    try {
      const exe = fs.readdirSync(dir)
        .find((f) => /^mongod($|[-.])/.test(f) && f.endsWith('.exe') && !f.endsWith('.lock'));
      if (exe) { process.env.MONGOMS_SYSTEM_BINARY = path.join(dir, exe); return; }
    } catch { /* directory missing — try next */ }
  }
})();

let mongo;
beforeAll(async () => {
  // If TEST_MONGO_URI is set (local mongod / Atlas), use it and skip the
  // ~500MB in-memory MongoDB binary download entirely.
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI);
    return;
  }
  // The cached system binary may be MongoDB >= 7, which removed the
  // "ephemeralForTest" engine that mongodb-memory-server picks by default when
  // it cannot detect the binary version. wiredTiger works on every supported version.
  mongo = await MongoMemoryServer.create({ instance: { storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongo.getUri());
}, 300000);
afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const c of Object.values(collections)) await c.deleteMany({});
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function makeUser(role = 'student', over = {}) {
  const User = require('../src/models/User');
  const { hashPassword } = require('../src/utils/crypto');
  const u = await User.create({ name: 'Test User', email: `${role}-${Date.now()}-${Math.random()}@test.local`, password: await hashPassword('Test@1234'), role, status: 'active', emailVerifiedAt: new Date(), ...over });
  return u;
}
function tokenFor(user) {
  const { signAccess } = require('../src/middleware/auth');
  return signAccess(user);
}
module.exports = { makeUser, tokenFor };
