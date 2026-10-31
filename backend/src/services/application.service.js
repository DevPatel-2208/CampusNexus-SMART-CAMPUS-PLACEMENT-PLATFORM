const { Application } = require('../models/Application');

/**
 * Append a status event to an application's history (parity with legacy
 * `application_events` table). Returns the mutated document when one is given.
 */
function recordStatus(appDoc, status, note = null, by = null) {
  if (!appDoc) return appDoc;
  appDoc.status = status;
  appDoc.history.push({ status, note: note || null, by: by || null, at: new Date() });
  return appDoc;
}

async function recordStatusById(appId, status, note = null, by = null) {
  return Application.findByIdAndUpdate(
    appId,
    { status, $push: { history: { status, note: note || null, by: by || null, at: new Date() } } },
    { new: true }
  );
}

module.exports = { recordStatus, recordStatusById };
