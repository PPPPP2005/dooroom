// นิยามหน้าจัดการข้อมูลของแอดมิน (เพิ่ม/แก้ไข/ลบ) — ใช้กับ src/app/admin/manage/[key].js
import { DAYS } from './format';

export const ROLE_LABEL = { student: 'นักศึกษา', teacher: 'อาจารย์', admin: 'ผู้ดูแลระบบ' };
const opt = (list, label) => list.map((x) => ({ value: x.id, label: label(x) }));

export const RES = {
  users: {
    title: 'ผู้ใช้งาน', path: '/users',
    rowTitle: (r) => r.name,
    rowLines: (r) => [r.email, `${ROLE_LABEL[r.role] || r.role}${r.studentCode ? ` · รหัส ${r.studentCode}` : ''}${r.active === false ? ' · ปิดใช้งาน' : ''}`],
    form: ({ editing }) => [
      { k: 'name', label: 'ชื่อ-สกุล', required: true },
      { k: 'email', label: 'อีเมล', type: 'email', createOnly: true, required: true },
      { k: 'password', label: editing ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน (อย่างน้อย 6 ตัว)', type: 'password', required: !editing },
      { k: 'role', label: 'สิทธิ์', type: 'select', required: true, options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })) },
      { k: 'studentCode', label: 'รหัสนักศึกษา / รหัสอาจารย์' },
      { k: 'active', label: 'สถานะ', type: 'select', bool: true, required: true, options: [{ value: 'true', label: 'เปิดใช้งาน' }, { value: 'false', label: 'ปิดใช้งาน' }] },
    ],
  },
  courses: {
    title: 'รายวิชา', path: '/courses',
    rowTitle: (r) => `${r.code} ${r.name}`,
    rowLines: (r, L) => [`${r.credits ?? '-'} หน่วยกิต · อาจารย์ ${L.userName[r.teacherId] || '-'}`],
    form: ({ L }) => [
      { k: 'code', label: 'รหัสวิชา', required: true },
      { k: 'name', label: 'ชื่อวิชา', required: true },
      { k: 'credits', label: 'หน่วยกิต', type: 'number' },
      { k: 'teacherId', label: 'อาจารย์ผู้สอน', type: 'select', options: opt(L.teachers, (u) => u.name) },
    ],
  },
  rooms: {
    title: 'ห้องเรียน', path: '/rooms',
    rowTitle: (r) => `${r.code}${r.name ? ` · ${r.name}` : ''}`,
    rowLines: (r) => [`${r.building || '-'} · ความจุ ${r.capacity ?? '-'} ที่นั่ง`],
    form: () => [
      { k: 'code', label: 'รหัสห้อง', required: true },
      { k: 'name', label: 'ชื่อห้อง' },
      { k: 'building', label: 'อาคาร' },
      { k: 'capacity', label: 'ความจุ', type: 'number' },
    ],
  },
  schedules: {
    title: 'ตารางเรียน', path: '/schedules',
    rowTitle: (r) => (r.course ? `${r.course.code} ${r.course.name}` : '(วิชาถูกลบ)'),
    rowLines: (r) => [`${DAYS[r.dayOfWeek]} ${r.startTime}–${r.endTime}`, `ห้อง ${r.room?.code || '-'} · อาจารย์ ${r.teacher?.name || '-'}`],
    form: ({ L }) => [
      { k: 'courseId', label: 'วิชา', type: 'select', required: true, options: opt(L.courses, (c) => `${c.code} ${c.name}`) },
      { k: 'roomId', label: 'ห้อง', type: 'select', required: true, options: opt(L.rooms, (r) => r.code) },
      { k: 'teacherId', label: 'อาจารย์', type: 'select', required: true, options: opt(L.teachers, (u) => u.name) },
      { k: 'dayOfWeek', label: 'วัน', type: 'select', required: true, options: Object.entries(DAYS).filter(([v]) => v !== '0' && DAYS[v]).map(([value, label]) => ({ value, label })) },
      { k: 'startTime', label: 'เวลาเริ่ม (HH:MM)', type: 'time', required: true },
      { k: 'endTime', label: 'เวลาสิ้นสุด (HH:MM)', type: 'time', required: true },
    ],
  },
  enrollments: {
    title: 'การลงทะเบียนเรียน', path: '/enrollments', noEdit: true,
    rowTitle: (r, L) => L.courseName[r.courseId] || r.courseId,
    rowLines: (r, L) => [`นักศึกษา: ${L.userLabel[r.studentId] || r.studentId}`],
    form: ({ L }) => [
      { k: 'courseId', label: 'วิชา', type: 'select', required: true, options: opt(L.courses, (c) => `${c.code} ${c.name}`) },
      { k: 'studentId', label: 'นักศึกษา', type: 'select', required: true, options: opt(L.students, (u) => `${u.studentCode || ''} ${u.name}`.trim()) },
    ],
  },
};

export async function loadLookups(api) {
  const [users, courses, rooms] = await Promise.all([api.get('/users'), api.get('/courses'), api.get('/rooms')]);
  return {
    users, courses, rooms,
    teachers: users.filter((u) => u.role === 'teacher'),
    students: users.filter((u) => u.role === 'student'),
    userName: Object.fromEntries(users.map((u) => [u.id, u.name])),
    userLabel: Object.fromEntries(users.map((u) => [u.id, `${u.studentCode ? `${u.studentCode} ` : ''}${u.name}`])),
    courseName: Object.fromEntries(courses.map((c) => [c.id, `${c.code} ${c.name}`])),
  };
}
