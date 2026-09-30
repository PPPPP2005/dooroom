const { admin, db } = require('../config/firebase');
const { HttpError, ah, pick } = require('../utils/http');
const { ts } = require('../utils/firestore');
const { logActivity } = require('../utils/activity');

const ROLES = ['student', 'teacher', 'admin'];
const FIELDS = ['name', 'role', 'active', 'studentCode', 'teacherCode', 'faculty', 'phone'];

exports.list = ah(async (req, res) => {
  let q = db.collection('users');
  if (req.query.role) q = q.where('role', '==', req.query.role);
  const snap = await q.get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

exports.create = ah(async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name || !ROLES.includes(role)) throw new HttpError(400, 'invalid_body');
  let record;
  try {
    record = await admin.auth().createUser({ email, password, displayName: name });
  } catch (e) {
    throw new HttpError(400, e.code || 'create_user_failed');
  }
  await db.collection('users').doc(record.uid).set({
    ...pick(req.body, FIELDS), email, active: true, createdAt: ts(),
  });
  await logActivity(req.user.uid, 'user.create', { target: record.uid, role });
  res.status(201).json({ id: record.uid });
});

exports.update = ah(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (data.role && !ROLES.includes(data.role)) throw new HttpError(400, 'invalid_role');
  if (req.params.id === req.user.uid && (data.role || data.active === false)) {
    throw new HttpError(400, 'cannot_change_own_role_or_disable_self');
  }
  await db.collection('users').doc(req.params.id).update(data);
  if (data.active !== undefined) await admin.auth().updateUser(req.params.id, { disabled: !data.active });
  if (req.body.password) await admin.auth().updateUser(req.params.id, { password: req.body.password });
  await logActivity(req.user.uid, 'user.update', { target: req.params.id, fields: Object.keys(data) });
  res.json({ ok: true });
});

exports.remove = ah(async (req, res) => {
  if (req.params.id === req.user.uid) throw new HttpError(400, 'cannot_delete_self');
  await admin.auth().deleteUser(req.params.id).catch(() => {});
  await db.collection('users').doc(req.params.id).delete();
  await logActivity(req.user.uid, 'user.delete', { target: req.params.id });
  res.json({ ok: true });
});
