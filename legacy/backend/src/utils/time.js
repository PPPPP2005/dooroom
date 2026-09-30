const TZ = () => process.env.APP_TIMEZONE || 'Asia/Bangkok';
const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Current date / weekday (Mon=1..Sun=7) / minutes-since-midnight in the app timezone
function nowParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ(), year: 'numeric', month: '2-digit', day: '2-digit',
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
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
const isHHMM = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));

module.exports = { nowParts, toMinutes, isHHMM };
