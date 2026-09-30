const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');

const auth = require('../controllers/auth');
const users = require('../controllers/users');
const catalog = require('../controllers/catalog');
const sessions = require('../controllers/sessions');
const attendance = require('../controllers/attendance');
const announcements = require('../controllers/announcements');
const notifications = require('../controllers/notifications');
const reports = require('../controllers/reports');

const admin = requireRole('admin');
const teacher = requireRole('teacher', 'admin');
const student = requireRole('student');

// --- public
router.get('/health', (_req, res) => res.json({ ok: true, app: 'doroom' }));
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

// --- everything below needs a valid Firebase ID token
router.use(authenticate);
router.get('/auth/me', auth.me);

// users (admin)
router.get('/users', admin, users.list);
router.post('/users', admin, users.create);
router.patch('/users/:id', admin, users.update);
router.delete('/users/:id', admin, users.remove);

// catalog: everyone can read rooms/courses; admin writes
const resource = (path, c) => {
  router.get(path, c.list);
  router.post(path, admin, c.create);
  router.patch(`${path}/:id`, admin, c.update);
  router.delete(`${path}/:id`, admin, c.remove);
};
resource('/rooms', catalog.rooms);
resource('/courses', catalog.courses);
router.get('/enrollments', admin, catalog.enrollments.list);
router.post('/enrollments', admin, catalog.enrollments.create);
router.delete('/enrollments/:id', admin, catalog.enrollments.remove);

// schedules
router.get('/schedules/me', catalog.mine);
router.get('/schedules', admin, catalog.listPopulated);
router.post('/schedules', admin, catalog.schedules.create);
router.patch('/schedules/:id', admin, catalog.schedules.update);
router.delete('/schedules/:id', admin, catalog.schedules.remove);

// attendance sessions (teacher)
router.get('/sessions/today', teacher, sessions.today);
router.post('/sessions', teacher, sessions.open);
router.get('/sessions/:id', teacher, sessions.detail);
router.post('/sessions/:id/close', teacher, sessions.close);

// attendance
router.post('/attendance/check-in', student, attendance.checkIn);
router.get('/attendance/me', student, attendance.mine);
router.get('/attendance', admin, attendance.list);
router.patch('/attendance/:sessionId/:studentId', teacher, attendance.edit);

// announcements & notifications
router.post('/announcements', teacher, announcements.create);
router.get('/notifications/me', notifications.mine);
router.patch('/notifications/:id/read', notifications.markRead);

// reports & logs (admin)
router.get('/reports/attendance', admin, reports.attendanceSummary);
router.get('/logs', admin, reports.logs);

module.exports = router;
