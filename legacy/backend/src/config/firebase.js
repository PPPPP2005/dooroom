const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (keyPath) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const serviceAccount = require(path.resolve(keyPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // falls back to GOOGLE_APPLICATION_CREDENTIALS
    admin.initializeApp();
  }
}

const db = admin.firestore();
module.exports = { admin, db };
