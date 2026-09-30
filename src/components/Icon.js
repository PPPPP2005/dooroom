// ไอคอนเส้นบาง (สไตล์ Feather) วาดด้วย react-native-svg ที่โปรเจกต์ใช้อยู่แล้ว — ไม่ต้องติดตั้งแพ็กเกจเพิ่ม
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

const P = (d) => ['p', d];
const L = (x1, y1, x2, y2) => ['l', x1, y1, x2, y2];
const C = (cx, cy, r) => ['c', cx, cy, r];
const R = (x, y, w, h, rx = 0) => ['r', x, y, w, h, rx];
const Y = (pts) => ['y', pts];

const ICONS = {
  calendar: [R(3, 4, 18, 18, 2), L(16, 2, 16, 6), L(8, 2, 8, 6), L(3, 10, 21, 10)],
  scan: [P('M3 7V5a2 2 0 0 1 2-2h2'), P('M17 3h2a2 2 0 0 1 2 2v2'), P('M21 17v2a2 2 0 0 1-2 2h-2'), P('M7 21H5a2 2 0 0 1-2-2v-2'), L(7, 12, 17, 12)],
  clock: [C(12, 12, 10), Y('12 6 12 12 16 14')],
  bell: [P('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'), P('M13.73 21a2 2 0 0 1-3.46 0')],
  user: [P('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'), C(12, 7, 4)],
  users: [P('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), C(9, 7, 4), P('M23 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
  message: [P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')],
  file: [P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), Y('14 2 14 8 20 8'), L(16, 13, 8, 13), L(16, 17, 8, 17)],
  book: [P('M4 19.5A2.5 2.5 0 0 1 6.5 17H20'), P('M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z')],
  home: [P('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'), Y('9 22 9 12 15 12 15 22')],
  clipboard: [P('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'), R(8, 2, 8, 4, 1)],
  checkSquare: [Y('9 11 12 14 22 4'), P('M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11')],
  activity: [Y('22 12 18 12 15 21 9 3 6 12 2 12')],
  chevronRight: [Y('9 18 15 12 9 6')],
  chevronLeft: [Y('15 18 9 12 15 6')],
  plus: [L(12, 5, 12, 19), L(5, 12, 19, 12)],
  check: [Y('20 6 9 17 4 12')],
  x: [L(18, 6, 6, 18), L(6, 6, 18, 18)],
  logout: [P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), Y('16 17 21 12 16 7'), L(21, 12, 9, 12)],
  search: [C(11, 11, 8), L(21, 21, 16.65, 16.65)],
  download: [P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), Y('7 10 12 15 17 10'), L(12, 15, 12, 3)],
  alert: [P('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'), L(12, 9, 12, 13), L(12, 17, 12.01, 17)],
  pin: [P('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'), C(12, 10, 3)],
  door: [P('M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17'), L(2, 21, 22, 21), C(15, 12, 0.6)],
  qr: [R(3, 3, 7, 7, 1), R(14, 3, 7, 7, 1), R(3, 14, 7, 7, 1), L(14, 14, 14, 14.01), L(18, 14, 21, 14), L(14, 18, 14, 21), L(18, 18, 21, 18), L(21, 18, 21, 21)],
  refresh: [Y('23 4 23 10 17 10'), P('M20.49 15a9 9 0 1 1-2.12-9.36L23 10')],
  edit: [P('M12 20h9'), P('M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z')],
  trash: [Y('3 6 5 6 21 6'), P('M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'), P('M10 11v6'), P('M14 11v6'), P('M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2')],
  shield: [P('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')],
  send: [L(22, 2, 11, 13), P('M22 2l-7 20-4-9-9-4z')],
};

export default function Icon({ name, size = 22, color = '#F5F2FF', stroke = 1.9 }) {
  const parts = ICONS[name] || [];
  const common = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {parts.map((p, i) => {
        switch (p[0]) {
          case 'p': return <Path key={i} d={p[1]} {...common} />;
          case 'l': return <Line key={i} x1={p[1]} y1={p[2]} x2={p[3]} y2={p[4]} {...common} />;
          case 'c': return <Circle key={i} cx={p[1]} cy={p[2]} r={p[3]} {...common} />;
          case 'r': return <Rect key={i} x={p[1]} y={p[2]} width={p[3]} height={p[4]} rx={p[5]} {...common} />;
          case 'y': return <Polyline key={i} points={p[1]} {...common} />;
          default: return null;
        }
      })}
    </Svg>
  );
}
