/* doroom admin web – plain JS, talks to the Express API at /api */
const API = '/api';
const DAYS = { 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสบดี', 5: 'ศุกร์', 6: 'เสาร์', 7: 'อาทิตย์' };
const $ = (s) => document.querySelector(s);
let token = sessionStorage.getItem('doroom_token');
let lookups = {};

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat().forEach((k) => el.append(k instanceof Node ? k : document.createTextNode(k ?? '')));
  return el;
}

async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && token) { logout(); throw new Error('session_expired'); }
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/* ---------- resources (generic CRUD tables) ---------- */
const opt = (list, label) => list.map((x) => ({ value: x.id, label: label(x) }));
const RES = {
  users: {
    title: 'ผู้ใช้งาน', path: '/users',
    cols: [['name', 'ชื่อ'], ['email', 'อีเมล'], ['role', 'สิทธิ์'], ['studentCode', 'รหัส นศ.'], ['active', 'ใช้งาน', (v) => (v === false ? 'ปิด' : 'เปิด')]],
    form: () => [
      { k: 'name', label: 'ชื่อ-สกุล', required: true },
      { k: 'email', label: 'อีเมล', type: 'email', createOnly: true, required: true },
      { k: 'password', label: 'รหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)', type: 'password' },
      { k: 'role', label: 'สิทธิ์', type: 'select', options: ['student', 'teacher', 'admin'].map((r) => ({ value: r, label: r })) },
      { k: 'studentCode', label: 'รหัสนักศึกษา / รหัสอาจารย์' },
      { k: 'active', label: 'สถานะ', type: 'select', options: [{ value: 'true', label: 'เปิดใช้งาน' }, { value: 'false', label: 'ปิดใช้งาน' }], bool: true },
    ],
  },
  courses: {
    title: 'รายวิชา', path: '/courses',
    cols: [['code', 'รหัสวิชา'], ['name', 'ชื่อวิชา'], ['credits', 'หน่วยกิต'], ['teacherId', 'อาจารย์', (v) => lookups.userName?.[v] || '-']],
    form: () => [
      { k: 'code', label: 'รหัสวิชา', required: true }, { k: 'name', label: 'ชื่อวิชา', required: true },
      { k: 'credits', label: 'หน่วยกิต', type: 'number' },
      { k: 'teacherId', label: 'อาจารย์ผู้สอน', type: 'select', options: opt(lookups.teachers, (u) => u.name) },
    ],
  },
  rooms: {
    title: 'ห้องเรียน', path: '/rooms',
    cols: [['code', 'รหัสห้อง'], ['name', 'ชื่อ'], ['building', 'อาคาร'], ['capacity', 'ความจุ']],
    form: () => [
      { k: 'code', label: 'รหัสห้อง', required: true }, { k: 'name', label: 'ชื่อห้อง' },
      { k: 'building', label: 'อาคาร' }, { k: 'capacity', label: 'ความจุ', type: 'number' },
    ],
  },
  schedules: {
    title: 'ตารางเรียน', path: '/schedules',
    cols: [['course', 'วิชา', (v) => (v ? `${v.code} ${v.name}` : '-')], ['room', 'ห้อง', (v) => v?.code || '-'],
      ['teacher', 'อาจารย์', (v) => v?.name || '-'], ['dayOfWeek', 'วัน', (v) => DAYS[v]], ['startTime', 'เริ่ม'], ['endTime', 'สิ้นสุด']],
    form: () => [
      { k: 'courseId', label: 'วิชา', type: 'select', options: opt(lookups.courses, (c) => `${c.code} ${c.name}`), required: true },
      { k: 'roomId', label: 'ห้อง', type: 'select', options: opt(lookups.rooms, (r) => r.code), required: true },
      { k: 'teacherId', label: 'อาจารย์', type: 'select', options: opt(lookups.teachers, (u) => u.name), required: true },
      { k: 'dayOfWeek', label: 'วัน', type: 'select', options: Object.entries(DAYS).map(([v, l]) => ({ value: v, label: l })), required: true },
      { k: 'startTime', label: 'เวลาเริ่ม (HH:MM)', type: 'time', required: true },
      { k: 'endTime', label: 'เวลาสิ้นสุด (HH:MM)', type: 'time', required: true },
    ],
  },
  enrollments: {
    title: 'การลงทะเบียนเรียน', path: '/enrollments', noEdit: true,
    cols: [['courseId', 'วิชา', (v) => lookups.courseName?.[v] || v], ['studentId', 'นักศึกษา', (v) => lookups.userName?.[v] || v]],
    form: () => [
      { k: 'courseId', label: 'วิชา', type: 'select', options: opt(lookups.courses, (c) => `${c.code} ${c.name}`), required: true },
      { k: 'studentId', label: 'นักศึกษา', type: 'select', options: opt(lookups.students, (u) => `${u.studentCode || ''} ${u.name}`), required: true },
    ],
  },
};

async function loadLookups() {
  const [users, courses, rooms] = await Promise.all([api('/users'), api('/courses'), api('/rooms')]);
  lookups = {
    users, courses, rooms,
    teachers: users.filter((u) => u.role === 'teacher'),
    students: users.filter((u) => u.role === 'student'),
    userName: Object.fromEntries(users.map((u) => [u.id, u.name])),
    courseName: Object.fromEntries(courses.map((c) => [c.id, `${c.code} ${c.name}`])),
  };
}

function table(cols, rows, actions) {
  return h('table', {},
    h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c[1])), actions ? h('th') : null)),
    h('tbody', {}, rows.map((r) => h('tr', {},
      cols.map(([k, , fmt]) => h('td', {}, fmt ? fmt(r[k], r) : (r[k] ?? ''))),
      actions ? h('td', { class: 'actions' }, actions(r)) : null))));
}

function openForm(res, row, onSaved) {
  const dlg = $('#dialog'); const form = $('#dialog-form');
  const fields = res.form().filter((f) => !(row && f.createOnly));
  form.replaceChildren(
    h('h3', {}, `${row ? 'แก้ไข' : 'เพิ่ม'}${res.title}`),
    ...fields.map((f) => h('div', {},
      h('label', {}, f.label),
      f.type === 'select'
        ? h('select', { name: f.k, required: f.required }, h('option', { value: '' }, '— เลือก —'),
          f.options.map((o) => h('option', { value: o.value, selected: row && String(row[f.k]) === String(o.value) }, o.label)))
        : h('input', { name: f.k, type: f.type || 'text', required: f.required && !(f.type === 'password'), value: row && f.type !== 'password' ? (row[f.k] ?? '') : '' }))),
    h('p', { id: 'form-error', class: 'error' }),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'secondary', onclick: () => dlg.close() }, 'ยกเลิก'),
      h('button', { type: 'submit' }, 'บันทึก')));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = {};
    fields.forEach((f) => {
      const v = new FormData(form).get(f.k);
      if (v === '' || v == null) return;
      body[f.k] = f.bool ? v === 'true' : f.type === 'number' ? Number(v) : v;
    });
    try {
      await api(row ? `${res.path}/${row.id}` : res.path, { method: row ? 'PATCH' : 'POST', body });
      dlg.close(); onSaved();
    } catch (err) { $('#form-error').textContent = `ผิดพลาด: ${err.message}`; }
  };
  dlg.showModal();
}

async function renderResource(key) {
  const res = RES[key];
  await loadLookups();
  const rows = await api(res.path);
  $('#page-actions').replaceChildren(h('button', { onclick: () => openForm(res, null, () => renderResource(key)) }, '+ เพิ่ม'));
  $('#content').replaceChildren(table(res.cols, rows, (r) => [
    res.noEdit ? null : h('button', { class: 'secondary', onclick: () => openForm(res, r, () => renderResource(key)) }, 'แก้ไข'),
    h('button', { class: 'danger', onclick: async () => {
      if (!confirm('ยืนยันการลบ?')) return;
      try { await api(`${res.path}/${r.id}`, { method: 'DELETE' }); renderResource(key); } catch (e) { alert(e.message); }
    } }, 'ลบ'),
  ]));
}

/* ---------- attendance records / report / logs ---------- */
async function renderAttendance() {
  await loadLookups();
  const course = h('select', {}, h('option', { value: '' }, 'ทุกวิชา'), opt(lookups.courses, (c) => `${c.code} ${c.name}`).map((o) => h('option', { value: o.value }, o.label)));
  const date = h('input', { type: 'date' });
  const body = h('div');
  const load = async () => {
    const qs = new URLSearchParams(); if (course.value) qs.set('courseId', course.value); if (date.value) qs.set('date', date.value);
    const rows = await api(`/attendance?${qs}`);
    body.replaceChildren(table([['date', 'วันที่'], ['courseCode', 'รหัสวิชา'], ['courseName', 'วิชา'], ['studentCode', 'รหัส นศ.'],
      ['studentName', 'ชื่อ'], ['status', 'สถานะ'], ['method', 'วิธี']], rows));
  };
  $('#page-actions').replaceChildren(course, date, h('button', { onclick: load }, 'ค้นหา'));
  $('#content').replaceChildren(body); load();
}

async function renderReport() {
  await loadLookups();
  const course = h('select', {}, h('option', { value: '' }, 'ทุกวิชา'), opt(lookups.courses, (c) => `${c.code} ${c.name}`).map((o) => h('option', { value: o.value }, o.label)));
  const from = h('input', { type: 'date' }); const to = h('input', { type: 'date' });
  const body = h('div');
  const qs = () => { const p = new URLSearchParams(); if (course.value) p.set('courseId', course.value); if (from.value) p.set('from', from.value); if (to.value) p.set('to', to.value); return p; };
  const load = async () => {
    const rows = await api(`/reports/attendance?${qs()}`);
    body.replaceChildren(table([['courseCode', 'รหัสวิชา'], ['studentCode', 'รหัส นศ.'], ['studentName', 'ชื่อ'], ['present', 'มา'], ['late', 'สาย'],
      ['absent', 'ขาด'], ['leave', 'ลา'], ['total', 'รวม'], ['rate', '% เข้าเรียน']], rows));
  };
  const csv = async () => {
    const p = qs(); p.set('format', 'csv');
    const r = await api(`/reports/attendance?${p}`, { raw: true });
    const url = URL.createObjectURL(await r.blob());
    h('a', { href: url, download: 'attendance-report.csv' }).click();
  };
  $('#page-actions').replaceChildren(course, from, to, h('button', { onclick: load }, 'สร้างรายงาน'), h('button', { class: 'secondary', onclick: csv }, 'ดาวน์โหลด CSV'));
  $('#content').replaceChildren(body); load();
}

async function renderLogs() {
  const rows = await api('/logs');
  $('#page-actions').replaceChildren();
  $('#content').replaceChildren(table([['createdAt', 'เวลา', (v) => (v?._seconds ? new Date(v._seconds * 1000).toLocaleString('th-TH') : '')],
    ['userName', 'ผู้ใช้'], ['userEmail', 'อีเมล'], ['action', 'การกระทำ'], ['meta', 'รายละเอียด', (v) => JSON.stringify(v || {})]], rows));
}

/* ---------- shell ---------- */
const PAGES = [
  ...Object.keys(RES).map((k) => ({ id: k, title: RES[k].title, render: () => renderResource(k) })),
  { id: 'attendance', title: 'ข้อมูลการเข้าห้องเรียน', render: renderAttendance },
  { id: 'report', title: 'รายงานสรุป', render: renderReport },
  { id: 'logs', title: 'ประวัติการเข้าใช้งาน', render: renderLogs },
];

async function show(id) {
  const page = PAGES.find((p) => p.id === id);
  $('#page-title').textContent = page.title;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  try { await page.render(); } catch (e) { $('#content').replaceChildren(h('p', { class: 'error' }, `ผิดพลาด: ${e.message}`)); }
}

function startApp() {
  $('#login-view').hidden = true; $('#app-view').hidden = false;
  $('#nav').replaceChildren(...PAGES.map((p) => h('button', { 'data-id': p.id, onclick: () => show(p.id) }, p.title)));
  show('users');
}
function logout() {
  token = null; sessionStorage.removeItem('doroom_token');
  $('#app-view').hidden = true; $('#login-view').hidden = false;
}

$('#logout').onclick = logout;
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const r = await api('/auth/login', { method: 'POST', body: { email: f.get('email'), password: f.get('password') } });
    if (r.user.role !== 'admin') throw new Error('not_admin');
    token = r.token; sessionStorage.setItem('doroom_token', token);
    startApp();
  } catch (err) { $('#login-error').textContent = err.message === 'not_admin' ? 'บัญชีนี้ไม่ใช่ผู้ดูแลระบบ' : 'เข้าสู่ระบบไม่สำเร็จ'; }
};
if (token) startApp();
