import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { Badge, Card, Empty, Muted, ProgressBar, Screen, SkeletonList, Title, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { STATUS_COLOR, STATUS_LABEL, roomLabel } from '../../lib/format';

const KEYS = ['present', 'late', 'absent', 'leave'];

// ประวัติคาบที่เคยเปิดเช็กชื่อ + สรุปจำนวนมา/สาย/ขาด/ลา — กดเข้าไปดู/แก้สถานะรายคนได้
export default function TeacherHistory() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => { try { setRows(await api.get('/sessions/mine')); } catch { setRows([]); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen onRefresh={load}>
      <Title>ประวัติ / รายงานการเช็กชื่อ</Title>
      <Muted>แตะที่คาบเพื่อดูรายชื่อและแก้ไขสถานะย้อนหลัง</Muted>
      {!rows && <SkeletonList />}
      {rows && !rows.length && <Empty icon="file">ยังไม่มีประวัติการเช็กชื่อ</Empty>}
      {(rows || []).map((s, i) => {
        const attended = s.counts.present + s.counts.late;
        const pct = s.total ? Math.round((attended / s.total) * 100) : 0;
        const open = s.status === 'open';
        return (
          <Card key={s.id} index={i} onPress={() => router.push(`/teacher/session/${s.id}`)} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '600', flex: 1, color: colors.ink }}>{s.course?.code} {s.course?.name}</Text>
              <Badge label={open ? 'กำลังเปิด' : 'ปิดแล้ว'} color={open ? colors.success : colors.muted} />
            </View>
            <Muted>{s.date} · {s.startTime}–{s.endTime} · ห้อง {roomLabel(s.room)}</Muted>
            <ProgressBar value={pct} color={pct >= 80 ? colors.success : pct >= 60 ? colors.warn : colors.danger} />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {KEYS.map((k) => <Badge key={k} label={`${STATUS_LABEL[k]} ${s.counts[k]}`} color={STATUS_COLOR[k]} />)}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Muted>เข้าเรียน {attended}/{s.total} คน{s.total ? ` (${pct}%)` : ''}</Muted>
              <Icon name="chevronRight" size={18} color={colors.muted} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
