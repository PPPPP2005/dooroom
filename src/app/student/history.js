import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Badge, Card, Empty, Label, Muted, ProgressBar, Ring, Screen, SkeletonList, Title, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/format';

const KEYS = ['present', 'late', 'absent', 'leave'];
const rateColor = (p) => (p >= 80 ? colors.success : p >= 60 ? colors.warn : colors.danger);

export default function History() {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => { try { setRows(await api.get('/attendance/me')); } catch { setRows([]); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // สรุปรายวิชา
  const summary = {};
  (rows || []).forEach((r) => {
    const k = r.courseId;
    summary[k] = summary[k] || { course: r.course, present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    summary[k][r.status] += 1;
    summary[k].total += 1;
  });
  const list = Object.values(summary);
  const totals = KEYS.map((k) => [k, (rows || []).filter((r) => r.status === k).length]);
  const overall = rows && rows.length ? Math.round(((totals[0][1] + totals[1][1]) / rows.length) * 100) : 0;

  return (
    <Screen onRefresh={load}>
      <Title>ประวัติการเข้าเรียน</Title>
      {!rows && <SkeletonList />}
      {rows && !rows.length && <Empty icon="clock">ยังไม่มีประวัติ</Empty>}

      {rows && rows.length > 0 && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Ring value={overall} label="เข้าเรียน" />
          <View style={{ flex: 1, gap: 9 }}>
            <Text style={{ fontWeight: '700', color: colors.ink, marginBottom: 2 }}>ภาพรวมการเข้าเรียน</Text>
            {totals.map(([k, n]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLOR[k] }} />
                <Text style={{ flex: 1, color: colors.sub, fontSize: 14 }}>{STATUS_LABEL[k]}</Text>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{n}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {list.length > 0 && <Label>สรุปรายวิชา</Label>}
      {list.map((s, i) => {
        const pct = Math.round(((s.present + s.late) / s.total) * 100);
        return (
          <Card key={s.course?.id || s.course?.code} index={i} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '600', flex: 1, color: colors.ink }}>{s.course?.code} {s.course?.name}</Text>
              <Text style={{ fontWeight: '700', fontSize: 18, color: rateColor(pct) }}>{pct}%</Text>
            </View>
            <ProgressBar value={pct} color={rateColor(pct)} />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {KEYS.map((k) => <Badge key={k} label={`${STATUS_LABEL[k]} ${s[k]}`} color={STATUS_COLOR[k]} />)}
            </View>
            <Muted>เข้าเรียน (มา+สาย) {s.present + s.late} จาก {s.total} คาบ</Muted>
          </Card>
        );
      })}

      {rows && rows.length > 0 && <Label style={{ marginTop: 12 }}>รายการทั้งหมด</Label>}
      {(rows || []).map((r, i) => (
        <Card key={r.id} index={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '600', flex: 1, color: colors.ink }}>{r.course?.code} {r.course?.name}</Text>
            <Badge label={STATUS_LABEL[r.status] || r.status} color={STATUS_COLOR[r.status]} />
          </View>
          <Muted>{r.date}</Muted>
        </Card>
      ))}
    </Screen>
  );
}
