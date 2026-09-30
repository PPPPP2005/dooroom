import { APP_TIMEZONE } from './config';

const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// วันที่ / วันในสัปดาห์ (จันทร์=1..อาทิตย์=7) / นาทีนับจากเที่ยงคืน ตามเขตเวลาของแอป
export function nowParts(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t).value;
    let hour = parseInt(get('hour'), 10);
    if (hour === 24) hour = 0;
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      dow: DOW[get('weekday')],
      minutes: hour * 60 + parseInt(get('minute'), 10),
    };
  } catch {
    const p = (n) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      dow: ((d.getDay() + 6) % 7) + 1,
      minutes: d.getHours() * 60 + d.getMinutes(),
    };
  }
}

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
export const isHHMM = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));

// วันที่ (YYYY-MM-DD) ของวันในสัปดาห์ dow ที่ผ่านมาล่าสุด (ก่อนวันนี้) ย้อนไป weeksBack สัปดาห์
export function pastDateOfDow(dow, weeksBack = 0) {
  const t = nowParts();
  let diff = (t.dow - dow + 7) % 7;
  if (diff === 0) diff = 7;
  const d = new Date();
  d.setDate(d.getDate() - diff - 7 * weeksBack);
  return nowParts(d).date;
}
