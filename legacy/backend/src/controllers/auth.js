const { admin, db } = require('../config/firebase');
const { HttpError, ah } = require('../utils/http');
const { ts } = require('../utils/firestore');
const { logActivity } = require('../utils/activity');

// Public self-registration: always creates a STUDENT. Teachers/admins are created by an admin.
exports.register = ah(async (req, res) => {
  const { email, password, name, studentCode } = req.body || {};
  if (!email || !password || !name) throw new HttpError(400, 'email_password_name_required');
  if (String(password).length < 6) throw new HttpError(400, 'password_too_short');
  let record;
  try {
    record = await admin.auth().createUser({ email, password, displayName: name });
  } catch (e) {
    throw new HttpError(400, e.code || 'create_user_failed');
  }
  await db.collection('users').doc(record.uid).set({
    email, name, role: 'student', studentCode: studentCode || null, active: true, createdAt: ts(),
  });
  await logActivity(record.uid, 'register');
  res.status(201).json({ uid: record.uid });
});

// Email/password login through Firebase REST API (used by the admin web; mobile uses the Firebase client SDK)
exports.login = ah(async (req, res) => {
  const { email, password } = req.body || {};
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) throw new HttpError(500, 'FIREBASE_WEB_API_KEY_not_set');
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await r.json();
  if (!r.ok) throw new HttpError(401, 'invalid_credentials');
  const snap = await db.collection('users').doc(data.localId).get();
  if (!snap.exists || snap.data().active === false) throw new HttpError(403, 'account_disabled');
  await logActivity(data.localId, 'login', { via: 'web' });
  res.json({ token: data.idToken, refreshToken: data.refreshToken, user: { id: data.localId, ...snap.data() } });
});

exports.me = ah(async (req, res) => {
  if (req.query.login) await logActivity(req.user.uid, 'login', { via: 'app' });
  const { uid, ...profile } = req.user;
  res.json(profile);
});
