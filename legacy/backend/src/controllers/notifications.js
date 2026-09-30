const { db } = require('../config/firebase');
const { ah } = require('../utils/http');

exports.mine = ah(async (req, res) => {
  const snap = await db.collection('notifications').where('userId', '==', req.user.uid).limit(100).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
  res.json(rows);
});

exports.markRead = ah(async (req, res) => {
  const ref = db.collection('notifications').doc(req.params.id);
  const snap = await ref.get();
  if (snap.exists && snap.data().userId === req.user.uid) await ref.update({ read: true });
  res.json({ ok: true });
});
