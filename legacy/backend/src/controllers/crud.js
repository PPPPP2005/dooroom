const { db } = require('../config/firebase');
const { HttpError, ah, pick } = require('../utils/http');
const { ts } = require('../utils/firestore');
const { logActivity } = require('../utils/activity');

/**
 * Build handlers for a simple admin-managed collection.
 * opts.fields   : whitelisted fields
 * opts.validate : async (data, existing, id) => void (throw HttpError)
 * opts.idFrom   : (data) => custom document id (used to prevent duplicates)
 */
function crud(collection, opts) {
  const { fields, validate, idFrom } = opts;
  return {
    list: ah(async (req, res) => {
      let q = db.collection(collection);
      Object.entries(req.query).forEach(([k, v]) => { if (fields.includes(k)) q = q.where(k, '==', v); });
      const snap = await q.get();
      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }),
    create: ah(async (req, res) => {
      const data = pick(req.body || {}, fields);
      if (validate) await validate(data, null, null);
      const ref = idFrom ? db.collection(collection).doc(idFrom(data)) : db.collection(collection).doc();
      if (idFrom && (await ref.get()).exists) throw new HttpError(409, 'already_exists');
      await ref.set({ ...data, createdAt: ts() });
      await logActivity(req.user.uid, `${collection}.create`, { id: ref.id });
      res.status(201).json({ id: ref.id, ...data });
    }),
    update: ah(async (req, res) => {
      const ref = db.collection(collection).doc(req.params.id);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpError(404, 'not_found');
      const data = pick(req.body || {}, fields);
      if (validate) await validate({ ...snap.data(), ...data }, snap.data(), req.params.id);
      await ref.update({ ...data, updatedAt: ts() });
      await logActivity(req.user.uid, `${collection}.update`, { id: req.params.id });
      res.json({ id: req.params.id, ...snap.data(), ...data });
    }),
    remove: ah(async (req, res) => {
      await db.collection(collection).doc(req.params.id).delete();
      await logActivity(req.user.uid, `${collection}.delete`, { id: req.params.id });
      res.json({ ok: true });
    }),
  };
}
module.exports = { crud };
