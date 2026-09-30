const { db } = require('../config/firebase');
const { HttpError, ah } = require('../utils/http');
const { getByIds, ts } = require('../utils/firestore');
const { nowParts } = require('../utils/time');
const { notify, logActivity } = require('../utils/activity');
const { loadOwnedSchedule } = require('./sessions');

// POST /announcements
// { scheduleId, type: 'notice' | 'room_change', title?, message, newRoomId?, date? }
// -> notifies every student enrolled in that schedule's course.
exports.create = ah(async (req, res) => {
  const { scheduleId, type = 'notice', message, newRoomId } = req.body || {};
  if (!scheduleId || !message) throw new HttpError(400, 'scheduleId_and_message_required');
  if (!['notice', 'room_change'].includes(type)) throw new HttpError(400, 'invalid_type');
  const schedule = await loadOwnedSchedule(scheduleId, req.user);
  const date = req.body.date || nowParts().date;

  let title = req.body.title || 'ประกาศจากอาจารย์';
  let text = message;
  if (type === 'room_change') {
    if (!newRoomId) throw new HttpError(400, 'newRoomId_required');
    const [room] = await getByIds('rooms', [newRoomId]);
    if (!room) throw new HttpError(400, 'room_not_found');
    // Remember the one-off move; schedule listings and new sessions use it for that date
    await db.collection('schedules').doc(scheduleId).update({ [`roomOverrides.${date}`]: newRoomId });
    const open = await db.collection('sessions').where('scheduleId', '==', scheduleId).where('date', '==', date).get();
    await Promise.all(open.docs.map((d) => d.ref.update({ roomId: newRoomId })));
    title = req.body.title || 'ย้ายห้องเรียน';
    text = `${message} (ห้องใหม่: ${room.code}${room.name ? ` ${room.name}` : ''}, วันที่ ${date})`;
  }

  const [course] = await getByIds('courses', [schedule.courseId]);
  const en = await db.collection('enrollments').where('courseId', '==', schedule.courseId).get();
  const studentIds = en.docs.map((d) => d.data().studentId);
  await db.collection('announcements').add({
    scheduleId, courseId: schedule.courseId, type, title, message: text, newRoomId: newRoomId || null,
    date, createdBy: req.user.uid, createdAt: ts(),
  });
  await notify(studentIds, {
    type, title: `${title}${course ? ` – ${course.name}` : ''}`, message: text,
    data: { scheduleId, courseId: schedule.courseId, newRoomId: newRoomId || null, date },
  });
  await logActivity(req.user.uid, 'announcement.create', { scheduleId, type, recipients: studentIds.length });
  res.status(201).json({ ok: true, recipients: studentIds.length });
});
