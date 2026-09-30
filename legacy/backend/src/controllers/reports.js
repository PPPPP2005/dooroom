const { db } = require('../config/firebase');
const { ah } = require('../utils/http');
const { getByIds, indexById, queryIn } = require('../utils/firestore');

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// GET /reports/attendance?courseId=&from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
// One row per (course, student) with counts per status and attendance rate.
exports.attendanceSummary = ah(async (req, res) => {
  const { courseId, from, to, format } = req.query;
  let q = db.collection('attendance');
  if (courseId) q = q.where('courseId', '==', courseId);
  const snap = await q.get();
  let rows = snap.docs.map((d) => d.data());
  if (from) rows = rows.filter((r) => r.date >= from);
  if (to) rows = rows.filter((r) => r.date <= to);

  const agg = {};
  rows.forEach((r) => {
    const k = `${r.courseId}|${r.studentId}`;
    agg[k] = agg[k] || { courseId: r.courseId, studentId: r.studentId, present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    agg[k][r.status] = (agg[k][r.status] || 0) + 1;
    agg[k].total += 1;
  });
  const list = Object.values(agg);
  const [courses, students] = await Promise.all([
    getByIds('courses', list.map((x) => x.courseId)), getByIds('users', list.map((x) => x.studentId)),
  ]);
  const C = indexById(courses); const S = indexById(students);
  const out = list.map((x) => ({
    ...x,
    courseCode: C[x.courseId]?.code, courseName: C[x.courseId]?.name,
    studentCode: S[x.studentId]?.studentCode, studentName: S[x.studentId]?.name,
    rate: x.total ? Math.round(((x.present + x.late) / x.total) * 100) : 0,
  })).sort((a, b) => String(a.courseCode).localeCompare(String(b.courseCode)) || String(a.studentCode).localeCompare(String(b.studentCode)));

  if (format === 'csv') {
    const head = ['courseCode', 'courseName', 'studentCode', 'studentName', 'present', 'late', 'absent', 'leave', 'total', 'rate%'];
    const lines = [head.join(',')].concat(out.map((o) => [o.courseCode, o.courseName, o.studentCode, o.studentName,
      o.present, o.late, o.absent, o.leave, o.total, o.rate].map(csvCell).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    return res.send(`\uFEFF${lines.join('\n')}`); // BOM so Excel reads Thai correctly
  }
  return res.json(out);
});

// GET /logs?userId=  (admin) latest 200 activity logs
exports.logs = ah(async (req, res) => {
  let q = db.collection('activityLogs');
  if (req.query.userId) q = q.where('userId', '==', req.query.userId);
  const snap = await q.orderBy('createdAt', 'desc').limit(200).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const users = indexById(await getByIds('users', rows.map((r) => r.userId)));
  res.json(rows.map((r) => ({ ...r, userName: users[r.userId]?.name, userEmail: users[r.userId]?.email })));
});
