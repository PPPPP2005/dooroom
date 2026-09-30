import { Text, View } from 'react-native';
import { Badge, Card, IconBadge, Muted, colors } from './ui';
import { courseColor, roomLabel } from '../lib/format';

// การ์ดคาบเรียน: เวลาอยู่ซ้าย รายละเอียดอยู่ขวา แต่ละวิชามีสีประจำตัว (เหมือนหน้า Timetable ในภาพอ้างอิง)
export default function ScheduleCard({ r, today, index, teacher = true, children }) {
  const c = courseColor(r.course?.code || r.course?.name);
  return (
    <Card
      index={index}
      style={{
        flexDirection: 'row', gap: 14, padding: 0, overflow: 'hidden',
        backgroundColor: `${c}${today ? '20' : '12'}`,
        borderColor: `${c}${today ? '66' : '33'}`,
        shadowColor: c, shadowOpacity: today ? 0.28 : 0.1,
      }}
    >
      <View style={{ width: 4, backgroundColor: today ? c : `${c}66` }} />
      <View style={{ paddingVertical: 14, alignItems: 'flex-start', minWidth: 52 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{r.startTime}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>{r.endTime}</Text>
      </View>
      <View style={{ flex: 1, paddingVertical: 14, gap: 4 }}>
        <Text style={{ fontWeight: '600', fontSize: 16, color: colors.ink }}>{r.course?.code} {r.course?.name}</Text>
        <Muted>ห้อง {roomLabel(r.room)}</Muted>
        {teacher && <Muted>อาจารย์ {r.teacher?.name || '-'}</Muted>}
        {r.roomMovedToday && <Badge label="ย้ายห้องวันนี้" color={colors.warn} />}
        {children}
      </View>
      <View style={{ paddingTop: 14, paddingRight: 14 }}>
        <IconBadge name="book" color={c} size={36} />
      </View>
    </Card>
  );
}
