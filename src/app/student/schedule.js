import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ScheduleCard from '../../components/ScheduleCard';
import { Appear, Badge, Empty, Hero, Muted, Screen, SkeletonList, Title, colors } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { DAYS, roomLabel, todayDow } from '../../lib/format';

export default function StudentSchedule() {
  const { profile } = useAuth();
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    try { setRows(await api.get('/schedules/me')); } catch { setRows([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = todayDow();
  const days = [...new Set((rows || []).map((r) => r.dayOfWeek))].sort((a, b) => a - b);
  const todays = (rows || []).filter((r) => r.dayOfWeek === today).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const first = String(profile?.name || '').trim().split(/\s+/)[0];
  let n = 0;

  return (
    <Screen onRefresh={load}>
      {!!first && <Muted>สวัสดี {first} 👋</Muted>}
      <Title>ตารางเรียนของฉัน</Title>
      {rows && rows.length > 0 && (
        <Hero>
          <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' }}>คาบเรียนวันนี้</Text>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 }}>{todays.length ? `${todays.length} คาบ` : 'ไม่มีคาบเรียน'}</Text>
          {!!todays.length && <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>คาบแรก {todays[0].startTime} · ห้อง {roomLabel(todays[0].room)}</Text>}
        </Hero>
      )}
      {!rows && <SkeletonList />}
      {rows && !rows.length && <Empty icon="calendar">ยังไม่มีตารางเรียน</Empty>}
      {days.map((d) => (
        <View key={d} style={{ gap: 10, marginTop: 6 }}>
          <Appear delay={Math.min(n, 8) * 55} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: d === today ? colors.brandLight : colors.sub }}>{DAYS[d]}</Text>
            {d === today && <Badge label="วันนี้" />}
          </Appear>
          {rows.filter((r) => r.dayOfWeek === d).map((r) => <ScheduleCard key={r.id} r={r} today={d === today} index={++n} />)}
        </View>
      ))}
    </Screen>
  );
}
