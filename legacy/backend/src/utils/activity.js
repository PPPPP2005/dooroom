const { db } = require('../config/firebase');
const { ts } = require('./firestore');

// Best-effort audit log (login, edits, ...). Never throws.
async function logActivity(userId, action, meta = {}) {
  try {
    await db.collection('activityLogs').add({ userId, action, meta, createdAt: ts() });
  } catch (e) {
    console.error('logActivity failed', e.message);
  }
}

async function notify(userIds, { type, title, message, data = {} }) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  const batch = db.batch();
  ids.forEach((uid) => {
    batch.set(db.collection('notifications').doc(), {
      userId: uid, type, title, message, data, read: false, createdAt: ts(),
    });
  });
  await batch.commit();
}

module.exports = { logActivity, notify };
