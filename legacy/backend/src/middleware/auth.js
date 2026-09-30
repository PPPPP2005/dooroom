const { admin, db } = require('../config/firebase');
const { HttpError, ah } = require('../utils/http');

const authenticate = ah(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'missing_token');
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'invalid_token');
  }
  const snap = await db.collection('users').doc(decoded.uid).get();
  if (!snap.exists) throw new HttpError(403, 'no_profile');
  if (snap.data().active === false) throw new HttpError(403, 'account_disabled');
  req.user = { uid: decoded.uid, id: decoded.uid, ...snap.data() };
  next();
});

const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'forbidden'));
  return next();
};

module.exports = { authenticate, requireRole };
