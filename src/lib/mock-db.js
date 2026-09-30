// ฐานข้อมูลจำลอง: เก็บทั้งหมดเป็น JSON เดียวใน AsyncStorage
// (บนเว็บ = localStorage ของเบราว์เซอร์ / บนมือถือ = พื้นที่เก็บของแอป) ล้างได้จากปุ่ม "รีเซ็ตข้อมูล" ของแอดมิน
// หมายเหตุ: รหัสผ่านเก็บเป็นข้อความธรรมดาเพราะเป็นข้อมูลจำลองเท่านั้น — ห้ามใช้กับระบบจริง
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_KEY, STORAGE_KEY } from './config';
import { pastDateOfDow } from './time';

let state = null;
let currentUid = null;

export const newId = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const newToken = () => Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
export const nowIso = () => new Date().toISOString();

function seed() {
  const users = [
    { id: 'u_admin', role: 'admin', name: 'ผู้ดูแลระบบ', email: 'admin@doroom.test', password: 'admin123', active: true },
    { id: 'u_t1', role: 'teacher', name: 'อ.สมชาย ใจดี', email: 'teacher1@doroom.test', password: 'teacher123', studentCode: 'T001', active: true },
    { id: 'u_t2', role: 'teacher', name: 'อ.สุดา พัฒนา', email: 'teacher2@doroom.test', password: 'teacher123', studentCode: 'T002', active: true },
    ...[
      ['สมหญิง รักเรียน', '6601001'], ['ธนากร มั่นคง', '6601002'], ['พิมพ์ชนก สายสุวรรณ', '6601003'], ['กิตติพงษ์ ศรีสวัสดิ์', '6601004'],
      ['ณัฐธิดา แก้วมณี', '6601005'], ['วรากร ทองดี', '6601006'], ['ปวีณา จันทร์เพ็ญ', '6601007'], ['อภิชาติ บุญมา', '6601008'],
    ].map(([name, code], i) => ({
      id: `u_s${i + 1}`, role: 'student', name, studentCode: code, email: `student${i + 1}@doroom.test`, password: 'student123', active: true,
    })),
  ];
  const rooms = [
    { id: 'r1', code: 'A101', name: 'ห้องบรรยาย 1', building: 'อาคาร A', capacity: 60 },
    { id: 'r2', code: 'A102', name: 'ห้องบรรยาย 2', building: 'อาคาร A', capacity: 50 },
    { id: 'r3', code: 'B201', name: 'ห้องปฏิบัติการคอมพิวเตอร์ 1', building: 'อาคาร B', capacity: 40 },
    { id: 'r4', code: 'B202', name: 'ห้องปฏิบัติการคอมพิวเตอร์ 2', building: 'อาคาร B', capacity: 40 },
  ];
  const courses = [
    { id: 'c1', code: 'CS101', name: 'การเขียนโปรแกรมเบื้องต้น', credits: 3, teacherId: 'u_t1' },
    { id: 'c2', code: 'CS201', name: 'โครงสร้างข้อมูล', credits: 3, teacherId: 'u_t1' },
    { id: 'c3', code: 'MA101', name: 'แคลคูลัส 1', credits: 3, teacherId: 'u_t2' },
    { id: 'c4', code: 'EN101', name: 'ภาษาอังกฤษเพื่อการสื่อสาร', credits: 2, teacherId: 'u_t2' },
  ];
  const schedules = [
    { id: 'sc1', courseId: 'c1', roomId: 'r1', teacherId: 'u_t1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00', roomOverrides: {} },
    { id: 'sc2', courseId: 'c3', roomId: 'r2', teacherId: 'u_t2', dayOfWeek: 2, startTime: '09:00', endTime: '12:00', roomOverrides: {} },
    { id: 'sc3', courseId: 'c2', roomId: 'r3', teacherId: 'u_t1', dayOfWeek: 3, startTime: '13:00', endTime: '16:00', roomOverrides: {} },
    { id: 'sc4', courseId: 'c3', roomId: 'r1', teacherId: 'u_t2', dayOfWeek: 3, startTime: '09:00', endTime: '11:00', roomOverrides: {} },
    { id: 'sc5', courseId: 'c4', roomId: 'r2', teacherId: 'u_t2', dayOfWeek: 4, startTime: '13:00', endTime: '15:00', roomOverrides: {} },
    { id: 'sc6', courseId: 'c1', roomId: 'r3', teacherId: 'u_t1', dayOfWeek: 5, startTime: '09:00', endTime: '11:00', roomOverrides: {} },
  ];
  const members = {
    c1: ['u_s1', 'u_s2', 'u_s3', 'u_s4', 'u_s5', 'u_s6'],
    c2: ['u_s1', 'u_s2', 'u_s3', 'u_s7', 'u_s8'],
    c3: ['u_s1', 'u_s4', 'u_s5', 'u_s6', 'u_s7'],
    c4: ['u_s1', 'u_s2', 'u_s8'],
  };
  const enrollments = Object.entries(members).flatMap(([courseId, ids]) => ids.map((studentId) => ({ id: `${courseId}_${studentId}`, courseId, studentId })));

  // ประวัติย้อนหลัง 3 สัปดาห์ของทุกคาบ เพื่อให้หน้าประวัติ/รายงานมีข้อมูลตั้งแต่เริ่มต้น
  const sessions = [];
  const attendance = [];
  schedules.forEach((sc, si) => {
    for (let k = 0; k < 3; k += 1) {
      const date = pastDateOfDow(sc.dayOfWeek, k);
      const sid = `ss_${sc.id}_${k}`;
      sessions.push({
        id: sid, scheduleId: sc.id, courseId: sc.courseId, roomId: sc.roomId, teacherId: sc.teacherId, date,
        startTime: sc.startTime, endTime: sc.endTime, token: `seed${si}${k}`, status: 'closed', openedBy: sc.teacherId, openedAt: nowIso(), closedAt: nowIso(),
      });
      members[sc.courseId].forEach((studentId, i) => {
        const n = (i * 5 + k * 3 + si * 2) % 10;
        const status = n < 6 ? 'present' : n < 8 ? 'late' : n < 9 ? 'absent' : 'leave';
        attendance.push({
          id: `${sid}_${studentId}`, sessionId: sid, scheduleId: sc.id, courseId: sc.courseId, studentId, date, status,
          method: status === 'absent' ? 'auto_close' : status === 'leave' ? 'manual' : 'qr',
        });
      });
    }
  });

  const notifications = [{
    id: 'n_seed1', userId: 'u_s1', type: 'notice', title: 'ยินดีต้อนรับสู่ DooRoom (ข้อมูลจำลอง)',
    message: 'ระบบนี้ทำงานด้วยข้อมูลจำลองที่เก็บในเบราว์เซอร์ ยังไม่เชื่อมต่อ Firebase หรือ Backend', read: false, createdAt: nowIso(),
  }];

  return { users, rooms, courses, schedules, enrollments, sessions, attendance, announcements: [], notifications, logs: [] };
}

let readyPromise = null;
export function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        state = raw ? JSON.parse(raw) : null;
        currentUid = await AsyncStorage.getItem(SESSION_KEY);
      } catch { state = null; }
      if (!state) { state = seed(); await commit(); }
    })();
  }
  return readyPromise;
}

export const db = () => state;
export async function commit() {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* เต็ม/ถูกบล็อก: ใช้ต่อในหน่วยความจำ */ }
}

export async function resetDb() {
  state = seed();
  await commit();
}

export const getUid = () => currentUid;
export async function setUid(uid) {
  currentUid = uid || null;
  try { if (uid) await AsyncStorage.setItem(SESSION_KEY, uid); else await AsyncStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}
