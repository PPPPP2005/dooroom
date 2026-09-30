export const DAYS = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
export const STATUS_LABEL = { present: 'มาเรียน', late: 'สาย', absent: 'ขาดเรียน', leave: 'ลา' };
export const STATUS_COLOR = { present: '#34D399', late: '#FBBF24', absent: '#F87171', leave: '#60A5FA' };

// สีประจำวิชา (ได้สีเดิมทุกครั้งสำหรับรหัสวิชาเดียวกัน) — ต้องเป็น hex 6 หลัก
const COURSE_COLORS = ['#8B5CF6', '#34D399', '#FBBF24', '#60A5FA', '#F472B6', '#22D3EE'];
export const courseColor = (key = '') => {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
};

// JS weekday (Sun=0) -> our Mon=1..Sun=7
export const todayDow = () => ((new Date().getDay() + 6) % 7) + 1;

export const roomLabel = (room) => (room ? `${room.code}${room.name ? ` · ${room.name}` : ''}` : '-');

export const PAYLOAD_HELP = 'doroom:<sessionId>:<token>:<scheduleId>';

// CSV (มี BOM ให้ Excel อ่านภาษาไทยได้)
export function toCsv(rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['รหัสวิชา', 'ชื่อวิชา', 'รหัสนักศึกษา', 'ชื่อ', 'มา', 'สาย', 'ขาด', 'ลา', 'รวม', '% เข้าเรียน'];
  const body = rows.map((o) => [o.courseCode, o.courseName, o.studentCode, o.studentName, o.present, o.late, o.absent, o.leave, o.total, o.rate].map(cell).join(','));
  return `\uFEFF${[head.map(cell).join(','), ...body].join('\n')}`;
}

// QR ถาวรติดหน้าห้อง: doroom-room:<roomId>:<roomCode>
export const roomQrPayload = (room) => `doroom-room:${room.id}:${room.code}`;
export const isRoomQr = (s) => String(s || '').trim().startsWith('doroom-room:');
