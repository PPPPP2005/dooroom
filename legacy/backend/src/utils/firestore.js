const { admin, db } = require('../config/firebase');

const toObj = (doc) => (doc.exists ? { id: doc.id, ...doc.data() } : null);
const chunk = (arr, n = 30) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function getByIds(collection, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const results = [];
  for (const part of chunk(unique)) {
    const snap = await db.collection(collection)
      .where(admin.firestore.FieldPath.documentId(), 'in', part).get();
    snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

async function queryIn(collection, field, values) {
  const results = [];
  for (const part of chunk([...new Set(values)])) {
    const snap = await db.collection(collection).where(field, 'in', part).get();
    snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

const indexById = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const ts = () => admin.firestore.FieldValue.serverTimestamp();

module.exports = { toObj, chunk, getByIds, queryIn, indexById, ts };
