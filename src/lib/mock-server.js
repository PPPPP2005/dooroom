// "Backend จำลอง" ที่ทำงานในเครื่อง — ตรรกะเดียวกับ Express + Firestore เดิม แต่อ่าน/เขียนข้อมูลจาก mock-db
import { commit, db, getUid, newId, newToken, nowIso, ready, resetDb, setUid } from './mock-db';
import { nowParts, toMinutes, isHHMM } from './time';
import { CHECKIN_EARLY_MINUTES as EARLY, CHECKIN_LATE_AFTER_MINUTES as LATE_AFTER, STRICT_TIME } from './config';

const MESSAGES = {
  invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  account_disabled: 'บัญชีนี้ถูกปิดใช้งาน',
  forbidden: 'ไม่มีสิทธิ์ใช้งานส่วนนี้',
  not_found: 'ไม่พบข้อมูล',
  invalid_qr: 'QR Code ไม่ถูกต้องหรือหมดอายุ',
  invalid_status: 'สถานะไม่ถูกต้อง',
  session_not_found: 'ไม่พบคาบเช็กชื่อ',
  schedule_not_found: 'ไม่พบตารางเรียน',
  not_your_schedule: 'คาบนี้ไม่ใช่ของคุณ',
  not_scheduled_today: 'วันนี้ไม่มีคาบนี้ในตาราง',
  session_already_closed: 'คาบนี้ปิดการเช็กชื่อไปแล้ว',
  student_not_in_course: 'นักศึกษาไม่ได้ลงทะเบียนวิชานี้',
  room_conflict: 'ห้องนี้ถูกใช้งานในช่วงเวลาดังกล่าวแล้ว',
  teacher_conflict: 'อาจารย์มีสอนในช่วงเวลาดังกล่าวแล้ว',
  invalid_time_range: 'ช่วงเวลาไม่ถูกต้อง (เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด)',
  invalid_dayOfWeek: 'วันไม่ถูกต้อง',
  already_exists: 'มีข้อมูลนี้อยู่แล้ว',
  email_taken: 'อีเมลนี้ถูกใช้งานแล้ว',
  password_too_short: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  room_in_use: 'ห้องนี้ถูกใช้ในตารางเรียน ลบตารางเรียนที่เกี่ยวข้องก่อน',
  teacher_in_use: 'อาจารย์คนนี้ยังมีตารางสอนอยู่ ลบหรือย้ายตารางสอนก่อน',
  cannot_delete_self: 'ลบบัญชีที่กำลังใช้งานอยู่ไม่ได้',
  cannot_change_own_role_or_disable_self: 'เปลี่ยนสิทธิ์/ปิดใช้งานบัญชีตัวเองไม่ได้',
  invalid_role: 'สิทธิ์ไม่ถูกต้อง',
  invalid_body: 'ข้อมูลไม่ครบถ้วน',
  wrong_room_or_subject: 'คุณไม่ได้ลงทะเบียนในวิชานี้ (เข้าผิดห้องหรือผิดวิชา)',
  wrong_time: 'ไม่อยู่ในช่วงเวลาเช็กชื่อของคาบนี้',
};

export class ApiError extends Error {
  constructor(code, message, data) {
    super(message || MESSAGES[code] || code);
    this.code = code;
    this.data = data;
  }
}

const required = (data, keys) => {
  keys.forEach((k) => {
    if (data[k] === undefined || data[k] === null || data[k] === '') throw new ApiError(`${k}_required`, `กรุณากรอกข้อมูลที่จำเป็นให้ครบ (${k})`);
  });
};
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const byId = (list, id) => list.find((x) => x.id === id);
const indexById = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const publicUser = (u) => { if (!u) return null; const { password, ...rest } = u; return rest; }; // eslint-disable-line no-unused-vars
const qrPayload = (s) => `doroom:${s.id}:${s.token}:${s.scheduleId}`; // ส่วนที่ 4 (scheduleId) ใช้ให้สแกนข้ามอุปกรณ์ได้ในโหมดจำลอง
const STATUSES = ['present', 'absent', 'late', 'leave'];

function log(userId, action, meta = {}) {
  db().logs.push({ id: newId('log'), userId, action, meta, createdAt: nowIso() });
  if (db().logs.length > 1000) db().logs.splice(0, db().logs.length - 1000);
}

function notify(userIds, { type, title, message, data = {} }) {
  [...new Set(userIds)].forEach((uid) => {
    db().notifications.push({ id: newId('n'), userId: uid, type, title, message, data, read: false, createdAt: nowIso() });
  });
}

const effectiveRoomId = (s, date) => (s.roomOverrides && s.roomOverrides[date]) || s.roomId;

function populate(schedules) {
  const D = db();
  const today = nowParts().date;
  return schedules.map((s) => {
    const rid = effectiveRoomId(s, today);
    const t = byId(D.users, s.teacherId);
    return {
      ...s,
      course: byId(D.courses, s.courseId) || null,
      room: byId(D.rooms, rid) || null,
      roomMovedToday: rid !== s.roomId,
      teacher: t ? { id: t.id, name: t.name } : null,
    };
  });
}

function ownedSchedule(scheduleId, user) {
  const s = byId(db().schedules, scheduleId);
  if (!s) throw new ApiError('schedule_not_found');
  if (user.role !== 'admin' && s.teacherId !== user.id) throw new ApiError('not_your_schedule');
  return s;
}

/* ---------------- Auth ---------------- */
export async function login(email, password) {
  await ready();
  const u = db().users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!u || u.password !== password) throw new ApiError('invalid_credentials');
  if (u.active === false) throw new ApiError('account_disabled');
  await setUid(u.id);
  log(u.id, 'login', { via: 'app' });
  await commit();
  return publicUser(u);
}

export async function register({ email, password, name, studentCode }) {
  await ready();
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || !password || !name) throw new ApiError('invalid_body', 'กรุณากรอกชื่อ อีเมล และรหัสผ่าน');
  if (String(password).length < 6) throw new ApiError('password_too_short');
  if (db().users.some((x) => x.email.toLowerCase() === mail)) throw new ApiError('email_taken');
  const u = { id: newId('u'), role: 'student', name: name.trim(), email: mail, password, studentCode: studentCode || null, active: true, createdAt: nowIso() };
  db().users.push(u);
  log(u.id, 'register');
  await setUid(u.id);
  await commit();
  return publicUser(u);
}

export async function restore() {
  await ready();
  const u = byId(db().users, getUid());
  if (!u || u.active === false) { await setUid(null); return null; }
  return publicUser(u);
}

export async function logout() {
  await ready();
  const uid = getUid();
  if (uid) { log(uid, 'logout'); await commit(); }
  await setUid(null);
}

/* ---------------- CRUD (ห้อง / วิชา / ตาราง / ลงทะเบียน) ---------------- */
function crud(collection, { fields, validate, idFrom, beforeRemove }) {
  return {
    list: ({ query }) => db()[collection].filter((r) => Object.entries(query).every(([k, v]) => !fields.includes(k) || String(r[k]) === String(v))),
    create: ({ user, body }) => {
      const data = pick(body, fields);
      if (validate) validate(data, null);
      const id = idFrom ? idFrom(data) : newId(collection.slice(0, 2));
      if (byId(db()[collection], id)) throw new ApiError('already_exists');
      const row = { id, ...data, createdAt: nowIso() };
      if (collection === 'schedules') row.roomOverrides = {};
      db()[collection].push(row);
      log(user.id, `${collection}.create`, { id });
      return row;
    },
    update: ({ user, params, body }) => {
      const row = byId(db()[collection], params.id);
      if (!row) throw new ApiError('not_found');
      const data = pick(body, fields);
      if (validate) validate({ ...row, ...data }, params.id);
      Object.assign(row, data, { updatedAt: nowIso() });
      log(user.id, `${collection}.update`, { id: params.id });
      return row;
    },
    remove: ({ user, params }) => {
      if (!byId(db()[collection], params.id)) throw new ApiError('not_found');
      if (beforeRemove) beforeRemove(params.id);
      db()[collection] = db()[collection].filter((r) => r.id !== params.id);
      log(user.id, `${collection}.delete`, { id: params.id });
      return { ok: true };
    },
  };
}

const overlaps = (a, b) => toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);

const rooms = crud('rooms', {
  fields: ['code', 'name', 'building', 'capacity'],
  validate: (d) => required(d, ['code']),
  beforeRemove: (id) => { if (db().schedules.some((s) => s.roomId === id)) throw new ApiError('room_in_use'); },
});

const courses = crud('courses', {
  fields: ['code', 'name', 'credits', 'teacherId'],
  validate: (d) => required(d, ['code', 'name']),
  beforeRemove: (id) => { // ลบวิชา = ลบตาราง การลงทะเบียน และประวัติของวิชานั้นด้วย
    const D = db();
    D.schedules = D.schedules.filter((s) => s.courseId !== id);
    D.enrollments = D.enrollments.filter((e) => e.courseId !== id);
    D.sessions = D.sessions.filter((s) => s.courseId !== id);
    D.attendance = D.attendance.filter((a) => a.courseId !== id);
  },
});

const enrollments = crud('enrollments', {
  fields: ['courseId', 'studentId'],
  validate: (d) => required(d, ['courseId', 'studentId']),
  idFrom: (d) => `${d.courseId}_${d.studentId}`,
});

const schedules = crud('schedules', {
  fields: ['courseId', 'roomId', 'teacherId', 'dayOfWeek', 'startTime', 'endTime'],
  validate: (d, id) => {
    required(d, ['courseId', 'roomId', 'teacherId', 'dayOfWeek', 'startTime', 'endTime']);
    d.dayOfWeek = Number(d.dayOfWeek);
    if (!(d.dayOfWeek >= 1 && d.dayOfWeek <= 7)) throw new ApiError('invalid_dayOfWeek');
    if (!isHHMM(d.startTime) || !isHHMM(d.endTime) || toMinutes(d.startTime) >= toMinutes(d.endTime)) throw new ApiError('invalid_time_range');
    db().schedules.filter((o) => o.id !== id && o.dayOfWeek === d.dayOfWeek && overlaps(d, o)).forEach((o) => {
      if (o.roomId === d.roomId) throw new ApiError('room_conflict');
      if (o.teacherId === d.teacherId) throw new ApiError('teacher_conflict');
    });
  },
  beforeRemove: (id) => {
    const D = db();
    const sids = D.sessions.filter((s) => s.scheduleId === id).map((s) => s.id);
    D.sessions = D.sessions.filter((s) => s.scheduleId !== id);
    D.attendance = D.attendance.filter((a) => !sids.includes(a.sessionId));
  },
});

/* ---------------- Users (admin) ---------------- */
const USER_FIELDS = ['name', 'role', 'active', 'studentCode', 'teacherCode', 'faculty', 'phone'];
const ROLES = ['student', 'teacher', 'admin'];

const listUsers = ({ query }) => db().users.filter((u) => !query.role || u.role === query.role).map(publicUser);

function createUser({ user, body }) {
  const { email, password, name, role } = body;
  if (!email || !password || !name || !ROLES.includes(role)) throw new ApiError('invalid_body', 'กรุณากรอกชื่อ อีเมล รหัสผ่าน และสิทธิ์');
  if (String(password).length < 6) throw new ApiError('password_too_short');
  const mail = String(email).trim().toLowerCase();
  if (db().users.some((u) => u.email.toLowerCase() === mail)) throw new ApiError('email_taken');
  const row = { id: newId('u'), ...pick(body, USER_FIELDS), email: mail, password, active: body.active !== false, createdAt: nowIso() };
  db().users.push(row);
  log(user.id, 'user.create', { target: row.id, role });
  return { id: row.id };
}

function updateUser({ user, params, body }) {
  const row = byId(db().users, params.id);
  if (!row) throw new ApiError('not_found');
  const data = pick(body, USER_FIELDS);
  if (data.role && !ROLES.includes(data.role)) throw new ApiError('invalid_role');
  if (params.id === user.id && ((data.role && data.role !== row.role) || data.active === false)) throw new ApiError('cannot_change_own_role_or_disable_self');
  Object.assign(row, data);
  if (body.password) {
    if (String(body.password).length < 6) throw new ApiError('password_too_short');
    row.password = body.password;
  }
  log(user.id, 'user.update', { target: params.id, fields: Object.keys(data) });
  return { ok: true };
}

function removeUser({ user, params }) {
  const D = db();
  const row = byId(D.users, params.id);
  if (!row) throw new ApiError('not_found');
  if (params.id === user.id) throw new ApiError('cannot_delete_self');
  if (row.role === 'teacher' && D.schedules.some((s) => s.teacherId === row.id)) throw new ApiError('teacher_in_use');
  D.users = D.users.filter((u) => u.id !== row.id);
  D.enrollments = D.enrollments.filter((e) => e.studentId !== row.id);
  D.attendance = D.attendance.filter((a) => a.studentId !== row.id);
  D.notifications = D.notifications.filter((n) => n.userId !== row.id);
  D.courses.forEach((c) => { if (c.teacherId === row.id) c.teacherId = null; });
  log(user.id, 'user.delete', { target: row.id });
  return { ok: true };
}

/* ---------------- Schedules ---------------- */
function mySchedules({ user }) {
  const D = db();
  let list;
  if (user.role === 'teacher') list = D.schedules.filter((s) => s.teacherId === user.id);
  else if (user.role === 'student') {
    const ids = D.enrollments.filter((e) => e.studentId === user.id).map((e) => e.courseId);
    list = D.schedules.filter((s) => ids.includes(s.courseId));
  } else list = D.schedules;
  return populate(list).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
}

/* ---------------- Sessions (อาจารย์) ---------------- */
function withQr(s) { return { ...s, qrPayload: qrPayload(s) }; }

function openSession({ user, body }) {
  const sc = ownedSchedule(body.scheduleId, user);
  const now = nowParts();
  if (STRICT_TIME && sc.dayOfWeek !== now.dow) throw new ApiError('not_scheduled_today');
  const existing = db().sessions.find((s) => s.scheduleId === sc.id && s.date === now.date);
  if (existing) {
    if (existing.status === 'closed') {
      if (STRICT_TIME) throw new ApiError('session_already_closed');
      // โหมดเดโม: เปิดคาบเดิมของวันนี้ซ้ำได้ เพื่อทดสอบสแกนซ้ำ
      existing.status = 'open';
      delete existing.closedAt;
      log(user.id, 'session.reopen', { sessionId: existing.id });
    }
    return withQr(existing);
  }
  const s = {
    id: newId('ss'), scheduleId: sc.id, courseId: sc.courseId, roomId: effectiveRoomId(sc, now.date), teacherId: sc.teacherId,
    date: now.date, startTime: sc.startTime, endTime: sc.endTime, token: newToken(), status: 'open', openedBy: user.id, openedAt: nowIso(),
  };
  db().sessions.push(s);
  log(user.id, 'session.open', { sessionId: s.id });
  return withQr(s);
}

function sessionDetail({ user, params }) {
  const D = db();
  const s = byId(D.sessions, params.id);
  if (!s) throw new ApiError('session_not_found');
  ownedSchedule(s.scheduleId, user);
  const att = Object.fromEntries(D.attendance.filter((a) => a.sessionId === s.id).map((a) => [a.studentId, a]));
  const roster = D.enrollments.filter((e) => e.courseId === s.courseId)
    .map((e) => byId(D.users, e.studentId)).filter(Boolean)
    .map((u) => ({ studentId: u.id, name: u.name, studentCode: u.studentCode || null, status: att[u.id]?.status || null, checkedInAt: att[u.id]?.checkedInAt || null }))
    .sort((a, b) => String(a.studentCode).localeCompare(String(b.studentCode)));
  return { ...s, course: byId(D.courses, s.courseId) || null, room: byId(D.rooms, s.roomId) || null, roster, qrPayload: s.status === 'open' ? qrPayload(s) : null };
}

function closeSession({ user, params }) {
  const D = db();
  const s = byId(D.sessions, params.id);
  if (!s) throw new ApiError('session_not_found');
  ownedSchedule(s.scheduleId, user);
  if (s.status === 'closed') return { ok: true };
  const have = new Set(D.attendance.filter((a) => a.sessionId === s.id).map((a) => a.studentId));
  D.enrollments.filter((e) => e.courseId === s.courseId && !have.has(e.studentId)).forEach((e) => {
    D.attendance.push({ id: `${s.id}_${e.studentId}`, sessionId: s.id, scheduleId: s.scheduleId, courseId: s.courseId, studentId: e.studentId, date: s.date, status: 'absent', method: 'auto_close', createdAt: nowIso() });
  });
  s.status = 'closed';
  s.closedAt = nowIso();
  log(user.id, 'session.close', { sessionId: s.id });
  return { ok: true };
}

function mySessions({ user }) {
  const D = db();
  return D.sessions.filter((s) => user.role === 'admin' || s.teacherId === user.id)
    .map((s) => {
      const rows = D.attendance.filter((a) => a.sessionId === s.id);
      const counts = Object.fromEntries(STATUSES.map((k) => [k, rows.filter((r) => r.status === k).length]));
      return { id: s.id, date: s.date, status: s.status, startTime: s.startTime, endTime: s.endTime, course: byId(D.courses, s.courseId) || null, room: byId(D.rooms, s.roomId) || null, counts, total: D.enrollments.filter((e) => e.courseId === s.courseId).length };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.startTime).localeCompare(String(a.startTime)));
}

// รายการคาบที่เปิดอยู่ — ใช้กับปุ่ม "สแกนจำลอง" ในโหมดทดสอบ (เครื่องเดียวสาธิตได้ครบทั้งอาจารย์และนักศึกษา)
function demoOpenSessions() {
  const D = db();
  return D.sessions.filter((s) => s.status === 'open').map((s) => ({
    id: s.id, date: s.date, course: byId(D.courses, s.courseId) || null, room: byId(D.rooms, s.roomId) || null, qrPayload: qrPayload(s),
  }));
}

/* ---------------- Attendance ---------------- */
function currentClassOf(studentId) {
  const D = db();
  const ids = D.enrollments.filter((e) => e.studentId === studentId).map((e) => e.courseId);
  const now = nowParts();
  const list = D.schedules.filter((s) => ids.includes(s.courseId) && s.dayOfWeek === now.dow
    && now.minutes >= toMinutes(s.startTime) - EARLY && now.minutes <= toMinutes(s.endTime));
  return list.length ? populate(list)[0] : null;
}

function reject(student, reason, message, info) {
  const should = currentClassOf(student.id);
  const hint = should ? ` ตอนนี้คุณควรเรียน ${should.course?.name || ''} ที่ห้อง ${should.room?.code || should.room?.name || '-'}` : '';
  notify([student.id], { type: 'mismatch', title: 'เข้าห้องเรียนไม่ตรงตามตาราง', message: message + hint, data: { reason, ...info } });
  log(student.id, 'checkin.rejected', { reason, ...info });
  commit(); // บันทึกแจ้งเตือนก่อน throw
  throw new ApiError(reason, message + hint, { shouldBeAt: should ? { room: should.room, course: should.course } : null });
}

function upsertAttendance(rec) {
  const list = db().attendance;
  const i = list.findIndex((a) => a.id === rec.id);
  if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
}

function checkIn({ user, body }) {
  const D = db();
  const parts = String(body.qr || '').trim().split(':');
  if ((parts.length !== 3 && parts.length !== 4) || parts[0] !== 'doroom') throw new ApiError('invalid_qr');
  const [, sessionId, token, scheduleId] = parts;

  let session = byId(D.sessions, sessionId);
  if (!session && scheduleId) {
    // สแกน QR ที่สร้างจากอีกอุปกรณ์ (ข้อมูลจำลองแยกกันคนละเครื่อง): สร้างคาบเงาจากตารางเรียนที่ seed เหมือนกัน
    const sc = byId(D.schedules, scheduleId);
    if (sc) {
      const now = nowParts();
      session = { id: sessionId, scheduleId: sc.id, courseId: sc.courseId, roomId: effectiveRoomId(sc, now.date), teacherId: sc.teacherId, date: now.date, startTime: sc.startTime, endTime: sc.endTime, token, status: 'open', mirrored: true, openedAt: nowIso() };
      D.sessions.push(session);
    }
  }
  if (!session || session.token !== token) throw new ApiError('invalid_qr');

  const info = { sessionId, courseId: session.courseId, roomId: session.roomId };
  if (!byId(D.enrollments, `${session.courseId}_${user.id}`)) reject(user, 'wrong_room_or_subject', MESSAGES.wrong_room_or_subject, info);

  const now = nowParts();
  const sc = byId(D.schedules, session.scheduleId);
  const start = toMinutes(session.startTime);
  const end = toMinutes(session.endTime);
  const inWindow = (!sc || sc.dayOfWeek === now.dow) && now.minutes >= start - EARLY && now.minutes <= end;
  if (session.status !== 'open' || (STRICT_TIME && (session.date !== now.date || !inWindow))) reject(user, 'wrong_time', MESSAGES.wrong_time, info);

  const status = inWindow && now.minutes > start + LATE_AFTER ? 'late' : 'present';
  const id = `${sessionId}_${user.id}`;
  const prev = byId(D.attendance, id);
  if (prev && prev.method !== 'auto_close') return { ok: true, alreadyCheckedIn: true, status: prev.status };
  upsertAttendance({ id, sessionId, scheduleId: session.scheduleId, courseId: session.courseId, studentId: user.id, date: session.date, status, method: 'qr', checkedInAt: nowIso() });
  log(user.id, 'checkin', { sessionId, status });
  return { ok: true, status };
}

/* ---------------- ตรวจห้องจาก QR ถาวรหน้าห้อง ---------------- */
// QR หน้าห้องมีรูปแบบ doroom-room:<roomId>:<roomCode> — ไม่หมดอายุ ติดไว้ถาวรได้
// นักศึกษาสแกนแล้วระบบเทียบกับตารางเรียนของตัวเอง (รวมการย้ายห้องที่อาจารย์แจ้งไว้วันนี้)
function verifyRoom({ user, body }) {
  const D = db();
  const parts = String(body.qr || '').trim().split(':');
  if (parts[0] !== 'doroom-room' || !parts[1]) throw new ApiError('invalid_qr', 'QR Code นี้ไม่ใช่ QR ของห้องเรียน');
  const room = byId(D.rooms, parts[1]) || D.rooms.find((r) => parts[2] && r.code === parts[2]);
  if (!room) throw new ApiError('invalid_qr', 'ไม่พบห้องนี้ในระบบ (QR อาจเก่าหรือห้องถูกลบไปแล้ว)');

  const now = nowParts();
  const ids = D.enrollments.filter((e) => e.studentId === user.id).map((e) => e.courseId);
  const mine = D.schedules.filter((s) => ids.includes(s.courseId));
  const eff = (s) => effectiveRoomId(s, now.date);
  const inWindow = (s) => s.dayOfWeek === now.dow && now.minutes >= toMinutes(s.startTime) - EARLY && now.minutes <= toMinutes(s.endTime);
  const describe = (s) => ({
    course: byId(D.courses, s.courseId) || null,
    startTime: s.startTime, endTime: s.endTime, dayOfWeek: s.dayOfWeek,
    room: byId(D.rooms, eff(s)) || null,
    originalRoom: byId(D.rooms, s.roomId) || null,
    teacher: (() => { const t = byId(D.users, s.teacherId); return t ? { id: t.id, name: t.name } : null; })(),
  });
  const label = (c) => `${c.course?.code || ''} ${c.course?.name || ''}`.trim();
  const rl = (r) => (r ? `${r.code}${r.name ? ` ${r.name}` : ''}` : '-');
  const done = (kind, title, message, extra = {}) => {
    log(user.id, 'roomcheck', { roomId: room.id, kind });
    return { ok: kind === 'correct' || kind === 'correct_moved', kind, title, message, room, demo: !STRICT_TIME, ...extra };
  };

  const current = mine.filter(inWindow);

  // 1) มีเรียนตอนนี้ และห้องนี้คือห้องที่ต้องเรียน (รวมกรณีย้ายมาห้องนี้)
  const here = current.find((s) => eff(s) === room.id);
  if (here) {
    const c = describe(here);
    return here.roomId !== room.id
      ? done('correct_moved', 'คุณมาถูกห้องแล้ว (ห้องใหม่)', `วันนี้วิชา ${label(c)} ย้ายมาเรียนที่ห้อง ${rl(room)} (จากห้อง ${rl(c.originalRoom)}) · ${c.startTime}–${c.endTime}`, { class: c })
      : done('correct', 'คุณมาถูกห้องแล้ว', `วิชา ${label(c)} · ${c.startTime}–${c.endTime}`, { class: c });
  }

  // 2) ห้องนี้เคยเป็นห้องเรียนของคุณ แต่อาจารย์แจ้งย้ายไปห้องอื่นแล้ว (คาบที่กำลังเรียนมาก่อน)
  const moved = mine.filter((s) => s.roomId === room.id && eff(s) !== room.id)
    .sort((a, b) => Number(inWindow(b)) - Number(inWindow(a)));
  if (moved.length && (inWindow(moved[0]) || !current.length)) {
    const c = describe(moved[0]);
    return done('moved_away', 'วิชานี้ย้ายห้องแล้ว', `อาจารย์แจ้งย้ายวิชา ${label(c)} (${c.startTime}–${c.endTime}) ไปเรียนที่ห้อง ${rl(c.room)} วันนี้`, { class: c, shouldBe: c });
  }

  // 3) ตอนนี้มีเรียน แต่เป็นห้องอื่น
  if (current.length) {
    const c = describe(current[0]);
    return done('wrong_room', 'คุณไม่มีเรียนห้องนี้', `ตอนนี้คุณควรเรียน ${label(c)} ที่ห้อง ${rl(c.room)} (${c.startTime}–${c.endTime})`, { shouldBe: c });
  }

  // 4) วันนี้มีเรียนห้องนี้ แต่คนละช่วงเวลา
  const laterHere = mine.filter((s) => s.dayOfWeek === now.dow && eff(s) === room.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (laterHere.length) {
    const c = describe(laterHere[0]);
    return done('other_time', 'ยังไม่ใช่ช่วงเวลาเรียนของห้องนี้', `วันนี้คุณมีเรียนห้องนี้ วิชา ${label(c)} เวลา ${c.startTime}–${c.endTime}`, { class: c });
  }

  // 5) โหมดเดโม: ไม่ตรวจวัน/เวลา — ถ้าห้องนี้อยู่ในตารางของคุณวันใดก็ถือว่าถูกห้อง
  if (!STRICT_TIME) {
    const inHere = mine.filter((s) => eff(s) === room.id);
    const any = inHere.find((s) => s.roomId !== room.id) || inHere[0]; // ให้ความสำคัญกับคาบที่ย้ายมาห้องนี้วันนี้
    if (any) {
      const c = describe(any);
      if (any.roomId !== room.id) {
        return done('correct_moved', 'คุณมาถูกห้องแล้ว (ห้องใหม่)', `วันนี้วิชา ${label(c)} ย้ายมาเรียนที่ห้อง ${rl(room)} (จากห้อง ${rl(c.originalRoom)}) · ${c.startTime}–${c.endTime}`, { class: c });
      }
      return done('correct', 'คุณมาถูกห้องแล้ว', `ห้องนี้อยู่ในตารางเรียนของคุณ: ${label(c)} · ${DAY_TH[c.dayOfWeek]} ${c.startTime}–${c.endTime} (โหมดเดโม ไม่ตรวจวัน/เวลา)`, { class: c });
    }
  }

  // 6) ไม่มีเรียนห้องนี้
  const next = mine.filter((s) => s.dayOfWeek === now.dow && toMinutes(s.startTime) > now.minutes).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const c = next ? describe(next) : null;
  return done('no_class', 'คุณไม่มีเรียนห้องนี้',
    c ? `คาบถัดไปของคุณวันนี้: ${label(c)} ห้อง ${rl(c.room)} เวลา ${c.startTime}` : 'ห้องนี้ไม่อยู่ในตารางเรียนของคุณ', c ? { shouldBe: c } : {});
}
const DAY_TH = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

function editAttendance({ user, params, body }) {
  const D = db();
  if (!STATUSES.includes(body.status)) throw new ApiError('invalid_status');
  const s = byId(D.sessions, params.sessionId);
  if (!s) throw new ApiError('session_not_found');
  ownedSchedule(s.scheduleId, user);
  if (!byId(D.enrollments, `${s.courseId}_${params.studentId}`)) throw new ApiError('student_not_in_course');
  upsertAttendance({ id: `${s.id}_${params.studentId}`, sessionId: s.id, scheduleId: s.scheduleId, courseId: s.courseId, studentId: params.studentId, date: s.date, status: body.status, method: 'manual', editedBy: user.id, editedAt: nowIso() });
  log(user.id, 'attendance.edit', { sessionId: s.id, studentId: params.studentId, status: body.status });
  return { ok: true };
}

function myAttendance({ user }) {
  const D = db();
  return D.attendance.filter((a) => a.studentId === user.id)
    .map((a) => ({ ...a, course: byId(D.courses, a.courseId) || null }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function listAttendance({ query }) {
  const D = db();
  const C = indexById(D.courses);
  const S = indexById(D.users);
  return D.attendance
    .filter((a) => ['courseId', 'date', 'studentId', 'status'].every((k) => !query[k] || a[k] === query[k]))
    .slice(0, 500)
    .map((a) => ({ ...a, courseName: C[a.courseId]?.name, courseCode: C[a.courseId]?.code, studentName: S[a.studentId]?.name, studentCode: S[a.studentId]?.studentCode }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/* ---------------- Announcements / notifications ---------------- */
function createAnnouncement({ user, body }) {
  const D = db();
  const { scheduleId, type = 'notice', message, newRoomId } = body;
  if (!scheduleId || !message) throw new ApiError('invalid_body', 'กรุณาเลือกคาบเรียนและพิมพ์ข้อความ');
  if (!['notice', 'room_change'].includes(type)) throw new ApiError('invalid_body');
  const sc = ownedSchedule(scheduleId, user);
  const date = body.date || nowParts().date;
  let title = body.title || 'ประกาศจากอาจารย์';
  let text = message;
  if (type === 'room_change') {
    if (!newRoomId) throw new ApiError('invalid_body', 'กรุณาเลือกห้องใหม่');
    const room = byId(D.rooms, newRoomId);
    if (!room) throw new ApiError('not_found', 'ไม่พบห้องที่เลือก');
    sc.roomOverrides = { ...(sc.roomOverrides || {}), [date]: newRoomId };
    D.sessions.filter((s) => s.scheduleId === scheduleId && s.date === date).forEach((s) => { s.roomId = newRoomId; });
    title = body.title || 'ย้ายห้องเรียน';
    text = `${message} (ห้องใหม่: ${room.code}${room.name ? ` ${room.name}` : ''}, วันที่ ${date})`;
  }
  const course = byId(D.courses, sc.courseId);
  const studentIds = D.enrollments.filter((e) => e.courseId === sc.courseId).map((e) => e.studentId);
  D.announcements.push({ id: newId('an'), scheduleId, courseId: sc.courseId, type, title, message: text, newRoomId: newRoomId || null, date, createdBy: user.id, createdAt: nowIso() });
  notify(studentIds, { type, title: `${title}${course ? ` – ${course.name}` : ''}`, message: text, data: { scheduleId, courseId: sc.courseId, newRoomId: newRoomId || null, date } });
  log(user.id, 'announcement.create', { scheduleId, type, recipients: studentIds.length });
  return { ok: true, recipients: studentIds.length };
}

const myNotifications = ({ user }) => db().notifications.filter((n) => n.userId === user.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 100);

function markRead({ user, params }) {
  const n = byId(db().notifications, params.id);
  if (n && n.userId === user.id) n.read = true;
  return { ok: true };
}

/* ---------------- Reports / logs (admin) ---------------- */
function attendanceReport({ query }) {
  const D = db();
  const rows = D.attendance.filter((r) => (!query.courseId || r.courseId === query.courseId) && (!query.from || r.date >= query.from) && (!query.to || r.date <= query.to));
  const agg = {};
  rows.forEach((r) => {
    const k = `${r.courseId}|${r.studentId}`;
    agg[k] = agg[k] || { courseId: r.courseId, studentId: r.studentId, present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    agg[k][r.status] = (agg[k][r.status] || 0) + 1;
    agg[k].total += 1;
  });
  const C = indexById(D.courses);
  const S = indexById(D.users);
  return Object.values(agg).map((x) => ({
    ...x, courseCode: C[x.courseId]?.code, courseName: C[x.courseId]?.name, studentCode: S[x.studentId]?.studentCode, studentName: S[x.studentId]?.name,
    rate: x.total ? Math.round(((x.present + x.late) / x.total) * 100) : 0,
  })).sort((a, b) => String(a.courseCode).localeCompare(String(b.courseCode)) || String(a.studentCode).localeCompare(String(b.studentCode)));
}

function listLogs({ query }) {
  const D = db();
  const U = indexById(D.users);
  return D.logs.filter((l) => !query.userId || l.userId === query.userId).slice(-200).reverse()
    .map((l) => ({ ...l, userName: U[l.userId]?.name, userEmail: U[l.userId]?.email }));
}

async function resetAll() {
  await resetDb();
  return { ok: true };
}

/* ---------------- Router ---------------- */
const ADMIN = ['admin'];
const TEACHER = ['teacher', 'admin'];
const STUDENT = ['student'];
const ANY = null;

const resource = (path, c) => [
  ['GET', path, ANY, c.list], ['POST', path, ADMIN, c.create], ['PATCH', `${path}/:id`, ADMIN, c.update], ['DELETE', `${path}/:id`, ADMIN, c.remove],
];

const ROUTES = [
  ['GET', '/users', ADMIN, listUsers], ['POST', '/users', ADMIN, createUser], ['PATCH', '/users/:id', ADMIN, updateUser], ['DELETE', '/users/:id', ADMIN, removeUser],
  ...resource('/rooms', rooms),
  ...resource('/courses', courses),
  ['GET', '/enrollments', ADMIN, enrollments.list], ['POST', '/enrollments', ADMIN, enrollments.create], ['DELETE', '/enrollments/:id', ADMIN, enrollments.remove],
  ['GET', '/schedules/me', ANY, mySchedules],
  ['GET', '/schedules', ADMIN, () => populate(db().schedules)],
  ['POST', '/schedules', ADMIN, schedules.create], ['PATCH', '/schedules/:id', ADMIN, schedules.update], ['DELETE', '/schedules/:id', ADMIN, schedules.remove],
  ['GET', '/sessions/mine', TEACHER, mySessions],
  ['POST', '/sessions', TEACHER, openSession],
  ['GET', '/sessions/:id', TEACHER, sessionDetail],
  ['POST', '/sessions/:id/close', TEACHER, closeSession],
  ['GET', '/demo/open-sessions', STUDENT, demoOpenSessions],
  ['POST', '/attendance/check-in', STUDENT, checkIn],
  ['POST', '/rooms/verify', STUDENT, verifyRoom],
  ['GET', '/attendance/me', STUDENT, myAttendance],
  ['GET', '/attendance', ADMIN, listAttendance],
  ['PATCH', '/attendance/:sessionId/:studentId', TEACHER, editAttendance],
  ['POST', '/announcements', TEACHER, createAnnouncement],
  ['GET', '/notifications/me', ANY, myNotifications],
  ['PATCH', '/notifications/:id/read', ANY, markRead],
  ['GET', '/reports/attendance', ADMIN, attendanceReport],
  ['GET', '/logs', ADMIN, listLogs],
  ['POST', '/admin/reset', ADMIN, resetAll],
].map(([method, pattern, roles, fn]) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  return { method, re, keys, roles, fn };
});

const parseQuery = (qs) => Object.fromEntries(qs.split('&').filter(Boolean).map((p) => {
  const [k, ...v] = p.split('=');
  return [decodeURIComponent(k), decodeURIComponent(v.join('=').replace(/\+/g, ' '))];
}));

export async function handle(method, fullPath, body) {
  await ready();
  const [path, qs = ''] = fullPath.split('?');
  const query = parseQuery(qs);
  for (const r of ROUTES) {
    const m = r.method === method && path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const user = byId(db().users, getUid());
    if (!user || user.active === false) throw new ApiError('forbidden', 'กรุณาเข้าสู่ระบบใหม่');
    if (r.roles && !r.roles.includes(user.role)) throw new ApiError('forbidden');
    const out = await r.fn({ user, params, query, body: body || {} });
    await commit();
    return out === undefined ? { ok: true } : JSON.parse(JSON.stringify(out));
  }
  throw new ApiError('not_found', `ไม่พบเส้นทาง ${method} ${path}`);
}
