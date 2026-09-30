const { db } = require('../config/firebase');
const { HttpError, ah } = require('../utils/http');
const { toObj, getByIds, queryIn, indexById, ts } = require('../utils/firestore');
const { nowParts, toMinutes } = require('../utils/time');
const { notify, logActivity } = require('../utils/activity');
const { STATUSES, loadOwnedSchedule } = require('./sessions');
const { populate } = require('./catalog');

const EARLY = () => Number(process.env.CHECKIN_EARLY_MINUTES || 15);
const LATE_AFTER = () => Number(process.env.CHECKIN_LATE_AFTER_MINUTES || 15);

// The class this student should be attending right now (if any) - used in mismatch messages
async function currentClassOf(studentId) {
  const en = await db.collection('enrollments').where('studentId', '==', studentId).get();
  const courseIds = en.docs.map((d) => d.data().courseId);
  if (!courseIds.length) return null;
  const now = nowParts();
  const list = (await queryIn('schedules', 'courseId', courseIds)).filter((s) => s.dayOfWeek === now.dow
    && now.minutes >= toMinutes(s.startTime) - EARLY() && now.minutes <= toMinutes(s.endTime));
  return list.length ? (await populate(list))[0] : null;
}

async function reject(student, reason, message, sessionInfo) {
  const should = await currentClassOf(student.uid);
  const hint = should
    ? ` ตอนนี้คุณควรเรียน ${should.course?.name || ''} ที่ห้อง ${should.room?.code || should.room?.name || '-'}`
    : '';
  await notify([student.uid], {
    type: 'mismatch', title: 'เข้าห้องเรียนไม่ตรงตามตาราง', message: message + hint,
    data: { reason, ...sessionInfo },
  });
  throw new HttpError(409, reason, { message: message + hint, shouldBeAt: should ? { room: should.room, course: should.course } : null });
}

// POST /attendance/check-in { qr: "doroom:<sessionId>:<token>" }
exports.checkIn = ah(async (req, res) => {
  const parts = String(req.body.qr || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'doroom') throw new HttpError(400, 'invalid_qr');
  const [, sessionId, token] = parts;

  const session = toObj(await db.collection('sessions').doc(sessionId).get());
  if (!session || session.token !== token) throw new HttpError(400, 'invalid_qr');

  const info = { sessionId, courseId: session.courseId, roomId: session.roomId };
  const now = nowParts();

  // 1) wrong subject / room: student is not enrolled in this session's course
  const enrolled = await db.collection('enrollments').doc(`${session.courseId}_${req.user.uid}`).get();
  if (!enrolled.exists) {
    return reject(req.user, 'wrong_room_or_subject', 'คุณไม่ได้ลงทะเบียนในวิชานี้ (เข้าผิดห้องหรือผิดวิชา)', info);
  }
  // 2) wrong time: session closed or outside today's time window
  const start = toMinutes(session.startTime); const end = toMinutes(session.endTime);
  if (session.status !== 'open' || session.date !== now.date || now.minutes < start - EARLY() || now.minutes > end) {
    return reject(req.user, 'wrong_time', 'ไม่อยู่ในช่วงเวลาเช็กชื่อของคาบนี้', info);
  }

  const status = now.minutes > start + LATE_AFTER() ? 'late' : 'present';
  const ref = db.collection('attendance').doc(`${sessionId}_${req.user.uid}`);
  const prev = await ref.get();
  if (prev.exists && prev.data().method !== 'auto_close') {
    return res.json({ ok: true, alreadyCheckedIn: true, status: prev.data().status });
  }
  await ref.set({
    sessionId, scheduleId: session.scheduleId, courseId: session.courseId, studentId: req.user.uid,
    date: session.date, status, method: 'qr', checkedInAt: ts(),
  });
  res.json({ ok: true, status });
});

// PATCH /attendance/:sessionId/:studentId { status }  (teacher owning the schedule, or admin)
exports.edit = ah(async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) throw new HttpError(400, 'invalid_status');
  const session = toObj(await db.collection('sessions').doc(req.params.sessionId).get());
  if (!session) throw new HttpError(404, 'session_not_found');
  await loadOwnedSchedule(session.scheduleId, req.user);
  const en = await db.collection('enrollments').doc(`${session.courseId}_${req.params.studentId}`).get();
  if (!en.exists) throw new HttpError(400, 'student_not_in_course');
  await db.collection('attendance').doc(`${session.id}_${req.params.studentId}`).set({
    sessionId: session.id, scheduleId: session.scheduleId, courseId: session.courseId,
    studentId: req.params.studentId, date: session.date, status, method: 'manual',
    editedBy: req.user.uid, editedAt: ts(),
  }, { merge: true });
  await logActivity(req.user.uid, 'attendance.edit', { sessionId: session.id, studentId: req.params.studentId, status });
  res.json({ ok: true });
});

// GET /attendance/me -> student's own history
exports.mine = ah(async (req, res) => {
  const snap = await db.collection('attendance').where('studentId', '==', req.user.uid).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const courses = indexById(await getByIds('courses', rows.map((r) => r.courseId)));
  res.json(rows
    .map((r) => ({ ...r, course: courses[r.courseId] || null }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))));
});

// GET /attendance?courseId=&date=&studentId=  (admin)
exports.list = ah(async (req, res) => {
  let q = db.collection('attendance');
  ['courseId', 'date', 'studentId', 'status'].forEach((k) => { if (req.query[k]) q = q.where(k, '==', req.query[k]); });
  const snap = await q.limit(500).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const [courses, students] = await Promise.all([
    getByIds('courses', rows.map((r) => r.courseId)), getByIds('users', rows.map((r) => r.studentId)),
  ]);
  const C = indexById(courses); const S = indexById(students);
  res.json(rows.map((r) => ({
    ...r, courseName: C[r.courseId]?.name, courseCode: C[r.courseId]?.code,
    studentName: S[r.studentId]?.name, studentCode: S[r.studentId]?.studentCode,
  })).sort((a, b) => String(b.date).localeCompare(String(a.date))));
});
