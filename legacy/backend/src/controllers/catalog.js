// Rooms, courses, schedules, enrollments (admin-managed)
const { db } = require('../config/firebase');
const { HttpError, ah } = require('../utils/http');
const { getByIds, indexById, queryIn } = require('../utils/firestore');
const { isHHMM, toMinutes, nowParts } = require('../utils/time');
const { crud } = require('./crud');

const required = (data, keys) => {
  keys.forEach((k) => { if (data[k] === undefined || data[k] === '') throw new HttpError(400, `${k}_required`); });
};

exports.rooms = crud('rooms', {
  fields: ['code', 'name', 'building', 'capacity'],
  validate: async (d) => required(d, ['code']),
});

exports.courses = crud('courses', {
  fields: ['code', 'name', 'credits', 'teacherId'],
  validate: async (d) => required(d, ['code', 'name']),
});

exports.enrollments = crud('enrollments', {
  fields: ['courseId', 'studentId'],
  validate: async (d) => required(d, ['courseId', 'studentId']),
  idFrom: (d) => `${d.courseId}_${d.studentId}`,
});

// Schedule: prevent a room or a teacher from being double-booked at the same time
const overlaps = (a, b) => toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);

exports.schedules = crud('schedules', {
  fields: ['courseId', 'roomId', 'teacherId', 'dayOfWeek', 'startTime', 'endTime'],
  validate: async (d, _existing, id) => {
    required(d, ['courseId', 'roomId', 'teacherId', 'dayOfWeek', 'startTime', 'endTime']);
    d.dayOfWeek = Number(d.dayOfWeek);
    if (!(d.dayOfWeek >= 1 && d.dayOfWeek <= 7)) throw new HttpError(400, 'invalid_dayOfWeek');
    if (!isHHMM(d.startTime) || !isHHMM(d.endTime) || toMinutes(d.startTime) >= toMinutes(d.endTime)) {
      throw new HttpError(400, 'invalid_time_range');
    }
    const same = await db.collection('schedules').where('dayOfWeek', '==', d.dayOfWeek).get();
    same.forEach((doc) => {
      if (doc.id === id) return;
      const o = doc.data();
      if (!overlaps(d, o)) return;
      if (o.roomId === d.roomId) throw new HttpError(409, 'room_conflict', { with: doc.id });
      if (o.teacherId === d.teacherId) throw new HttpError(409, 'teacher_conflict', { with: doc.id });
    });
  },
});

// Attach course / room / teacher info to schedules. Room takes today's override into account.
async function populate(schedules) {
  const [courses, rooms, teachers] = await Promise.all([
    getByIds('courses', schedules.map((s) => s.courseId)),
    getByIds('rooms', schedules.flatMap((s) => [s.roomId, ...Object.values(s.roomOverrides || {})])),
    getByIds('users', schedules.map((s) => s.teacherId)),
  ]);
  const C = indexById(courses); const R = indexById(rooms); const T = indexById(teachers);
  const today = nowParts().date;
  return schedules.map((s) => {
    const effectiveRoomId = (s.roomOverrides && s.roomOverrides[today]) || s.roomId;
    return {
      ...s,
      course: C[s.courseId] || null,
      room: R[effectiveRoomId] || null,
      roomMovedToday: effectiveRoomId !== s.roomId,
      teacher: T[s.teacherId] ? { id: s.teacherId, name: T[s.teacherId].name } : null,
    };
  });
}
exports.populate = populate;

// GET /schedules/me  -> student: enrolled courses' schedules, teacher: own teaching schedules
exports.mine = ah(async (req, res) => {
  let list = [];
  if (req.user.role === 'teacher') {
    const snap = await db.collection('schedules').where('teacherId', '==', req.user.uid).get();
    list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (req.user.role === 'student') {
    const en = await db.collection('enrollments').where('studentId', '==', req.user.uid).get();
    const courseIds = en.docs.map((d) => d.data().courseId);
    list = courseIds.length ? await queryIn('schedules', 'courseId', courseIds) : [];
  } else {
    const snap = await db.collection('schedules').get();
    list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const out = (await populate(list)).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  res.json(out);
});

exports.listPopulated = ah(async (_req, res) => {
  const snap = await db.collection('schedules').get();
  res.json(await populate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
});
