import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import ScheduleCard from '../../components/ScheduleCard';
import { Appear, Badge, Button, Empty, Muted, Screen, SkeletonList, Title, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { STRICT_TIME } from '../../lib/config';
import { notify } from '../../lib/dialog';
import { DAYS, todayDow } from '../../lib/format';

export default function TeacherSchedule() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => { try { setRows(await api.get('/schedules/me')); } catch { setRows([]); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAttendance = async (schedule) => {
    setBusyId(schedule.id);
    try {
      const s = await api.post('/sessions', { scheduleId: schedule.id });
      router.push(`/teacher/session/${s.id}`);
    } catch (e) {
      notify('เปิดเช็กชื่อไม่ได้', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const today = todayDow();
  const days = [...new Set((rows || []).map((r) => r.dayOfWeek))].sort((a, b) => a - b);
  let n = 0;

  return (
    <Screen onRefresh={load}>
      <Title>ตารางสอนของฉัน</Title>
      {!STRICT_TIME && <Muted>โหมดเดโม: เปิดเช็กชื่อได้ทุกคาบ ไม่ต้องตรงวัน/เวลาจริง</Muted>}
      {!rows && <SkeletonList />}
      {rows && !rows.length && <Empty icon="calendar">ยังไม่มีตารางสอน</Empty>}
      {days.map((d) => (
        <View key={d} style={{ gap: 10, marginTop: 6 }}>
          <Appear delay={Math.min(n, 8) * 55} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: d === today ? colors.brandLight : colors.sub }}>{DAYS[d]}</Text>
            {d === today && <Badge label="วันนี้" />}
          </Appear>
          {rows.filter((r) => r.dayOfWeek === d).map((r) => (
            <ScheduleCard key={r.id} r={r} today={d === today} index={++n} teacher={false}>
              {(d === today || !STRICT_TIME) && (
                <Button title="เปิดเช็กชื่อคาบนี้" icon="qr" size="sm" onPress={() => openAttendance(r)} loading={busyId === r.id} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
              )}
            </ScheduleCard>
          ))}
        </View>
      ))}
    </Screen>
  );
}
