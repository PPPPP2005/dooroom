const crypto = require('crypto');
const { db } = require('../config/firebase');
const { HttpError, ah } = require('../utils/http');
const { toObj, getByIds, queryIn, ts } = require('../utils/firestore');
const { nowParts } = require('../utils/time');
const { logActivity } = require('../utils/activity');
const { populate } = require('./catalog');

const STATUSES = ['present', 'absent', 'late', 'leave'];
exports.STATUSES = STATUSES;

async function loadOwnedSchedule(scheduleId, user) {
  const schedule = toObj(await db.collection('schedules').doc(scheduleId).get());
  if (!schedule) throw new HttpError(404, 'schedule_not_found');
  if (user.role !== 'admin' && schedule.teacherId !== user.uid) throw new HttpError(403, 'not_your_schedule');
  return schedule;
}
exports.loadOwnedSchedule = loadOwnedSchedule;

const qrPayload = (s) => `doroom:${s.id}:${s.token}`;

// POST /sessions {scheduleId} -> teacher opens attendance for today's period
exports.open = ah(async (req, res) => {
  const schedule = await loadOwnedSchedule(req.body.scheduleId, req.user);
  const now = nowParts();
  if (schedule.dayOfWeek !== now.dow) throw new HttpError(400, 'not_scheduled_today');

  const existing = await db.collection('sessions')
    .where('scheduleId', '==', schedule.id).where('date', '==', now.date).limit(1).get();
  if (!existing.empty) {
    const s = { id: existing.docs[0].id, ...existing.docs[0].data() };
    if (s.status === 'closed') throw new HttpError(409, 'session_already_closed');
    return res.json({ ...s, qrPayload: qrPayload(s) });
  }
  const roomId = (schedule.roomOverrides && schedule.roomOverrides[now.date]) || schedule.roomId;
  const ref = db.collection('sessions').doc();
  const data = {
    scheduleId: schedule.id, courseId: schedule.courseId, roomId, teacherId: schedule.teacherId,
    date: now.date, startTime: schedule.startTime, endTime: schedule.endTime,
    token: crypto.randomBytes(8).toString('hex'), status: 'open', openedBy: req.user.uid, openedAt: ts(),
  };
  await ref.set(data);
  await logActivity(req.user.uid, 'session.open', { sessionId: ref.id });
  const s = { id: ref.id, ...data };
  res.status(201).json({ ...s, qrPayload: qrPayload(s) });
});

// GET /sessions/:id -> session + roster with current attendance status
exports.detail = ah(async (req, res) => {
  const session = toObj(await db.collection('sessions').doc(req.params.id).get());
  if (!session) throw new HttpError(404, 'session_not_found');
  await loadOwnedSchedule(session.scheduleId, req.user);
  const [course] = await getByIds('courses', [session.courseId]);
  const [room] = await getByIds('rooms', [session.roomId]);
  const en = await db.collection('enrollments').where('courseId', '==', session.courseId).get();
  const students = await getByIds('users', en.docs.map((d) => d.data().studentId));
  const att = await db.collection('attendance').where('sessionId', '==', session.id).get();
  const byStudent = Object.fromEntries(att.docs.map((d) => [d.data().studentId, { id: d.id, ...d.data() }]));
  const roster = students
    .map((s) => ({
      studentId: s.id, name: s.name, studentCode: s.studentCode || null,
      status: byStudent[s.id]?.status || null, checkedInAt: byStudent[s.id]?.checkedInAt || null,
    }))
    .sort((a, b) => String(a.studentCode).localeCompare(String(b.studentCode)));
  res.json({ ...session, course, room, roster, qrPayload: session.status === 'open' ? qrPayload(session) : null });
});

// POST /sessions/:id/close -> students without a record become "absent"
exports.close = ah(async (req, res) => {
  const ref = db.collection('sessions').doc(req.params.id);
  const session = toObj(await ref.get());
  if (!session) throw new HttpError(404, 'session_not_found');
  await loadOwnedSchedule(session.scheduleId, req.user);
  if (session.status === 'closed') return res.json({ ok: true });

  const en = await db.collection('enrollments').where('courseId', '==', session.courseId).get();
  const att = await db.collection('attendance').where('sessionId', '==', session.id).get();
  const have = new Set(att.docs.map((d) => d.data().studentId));
  const batch = db.batch();
  en.docs.forEach((d) => {
    const { studentId } = d.data();
    if (have.has(studentId)) return;
    batch.set(db.collection('attendance').doc(`${session.id}_${studentId}`), {
      sessionId: session.id, scheduleId: session.scheduleId, courseId: session.courseId,
      studentId, date: session.date, status: 'absent', method: 'auto_close', createdAt: ts(),
    });
  });
  batch.update(ref, { status: 'closed', closedAt: ts() });
  await batch.commit();
  await logActivity(req.user.uid, 'session.close', { sessionId: session.id });
  res.json({ ok: true });
});

// GET /sessions/today -> for a teacher: today's sessions (to resume an open one)
exports.today = ah(async (req, res) => {
  const snap = await db.collection('sessions')
    .where('teacherId', '==', req.user.uid).where('date', '==', nowParts().date).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data(), token: undefined })));
});
