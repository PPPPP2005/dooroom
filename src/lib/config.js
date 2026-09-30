// โหมดข้อมูลจำลอง (Mock) — ไม่มี Firebase / Database / Backend
export const MOCK = true;

// false = โหมดเดโม: เปิดเช็กชื่อได้ทุกคาบ และสแกนได้โดยไม่ตรวจช่วงเวลา (ทดสอบได้ทุกวัน/ทุกเวลา)
// true  = ตรวจเหมือนระบบจริง: ต้องเป็นวันของคาบนั้น และอยู่ในช่วง (เริ่ม −15 นาที ถึงจบคาบ)
export const STRICT_TIME = false;

export const CHECKIN_EARLY_MINUTES = 15;
export const CHECKIN_LATE_AFTER_MINUTES = 15;
export const APP_TIMEZONE = 'Asia/Bangkok';

// เปลี่ยนเลขเวอร์ชันเมื่อแก้โครงสร้าง seed เพื่อให้ข้อมูลในเบราว์เซอร์ถูกสร้างใหม่
export const STORAGE_KEY = 'doroom_mock_db_v1';
export const SESSION_KEY = 'doroom_mock_session_v1';

export const DEMO_ACCOUNTS = [
  { role: 'student', label: 'นักศึกษา', email: 'student1@doroom.test', password: 'student123' },
  { role: 'teacher', label: 'อาจารย์', email: 'teacher1@doroom.test', password: 'teacher123' },
  { role: 'admin', label: 'ผู้ดูแลระบบ', email: 'admin@doroom.test', password: 'admin123' },
];
