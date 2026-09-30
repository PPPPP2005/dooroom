// Usage: npm run create-admin -- admin@example.com "StrongPass123" "ผู้ดูแลระบบ"
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { admin, db } = require('../src/config/firebase');

(async () => {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('usage: npm run create-admin -- <email> <password> [name]');
    process.exit(1);
  }
  let record;
  try {
    record = await admin.auth().getUserByEmail(email);
  } catch {
    record = await admin.auth().createUser({ email, password, displayName: name });
  }
  await db.collection('users').doc(record.uid).set({
    email, name, role: 'admin', active: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('admin ready:', email, record.uid);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
