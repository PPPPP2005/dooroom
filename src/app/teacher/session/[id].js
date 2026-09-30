import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Appear, Badge, Button, Card, Muted, Pop, Screen, Segmented, SkeletonList, Stat, Title, colors, paper } from '../../../components/ui';
import { api } from '../../../lib/api';
import { confirmDialog, notify } from '../../../lib/dialog';
import { STATUS_COLOR, STATUS_LABEL, roomLabel } from '../../../lib/format';

const ORDER = ['present', 'late', 'absent', 'leave'];
const OPTIONS = ORDER.map((k) => ({ key: k, label: STATUS_LABEL[k], color: STATUS_COLOR[k] }));

export default function Session() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [session, setSession] = useState(null);

  const load = useCallback(async () => {
    try { setSession(await api.get(`/sessions/${id}`)); } catch (e) { notify('โหลดไม่สำเร็จ', e.message); }
  }, [id]);

  // รายชื่อสดขณะนักศึกษาสแกน
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const setStatus = async (studentId, status) => {
    try { await api.patch(`/attendance/${id}/${studentId}`, { status }); load(); } catch (e) { notify('แก้ไขไม่ได้', e.message); }
  };
  const close = async () => {
    const ok = await confirmDialog('ปิดการเช็กชื่อ?', 'นักศึกษาที่ยังไม่เช็กชื่อจะถูกบันทึกเป็น "ขาดเรียน"', { okText: 'ปิด', destructive: true });
    if (!ok) return;
    try { await api.post(`/sessions/${id}/close`); load(); } catch (e) { notify('ปิดไม่ได้', e.message); }
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/teacher/schedule'));

  if (!session) {
    return (
      <Screen>
        <Button title="กลับ" variant="ghost" icon="chevronLeft" size="sm" onPress={back} style={{ alignSelf: 'flex-start' }} />
        <SkeletonList />
      </Screen>
    );
  }
  const open = session.status === 'open';
  const counts = ORDER.map((k) => [k, session.roster.filter((r) => r.status === k).length]);
  const pending = session.roster.filter((r) => !r.status).length;

  return (
    <Screen>
      <Button title="กลับ" variant="ghost" icon="chevronLeft" size="sm" onPress={back} style={{ alignSelf: 'flex-start', marginLeft: -8 }} />
      <Appear>
        <Title>{session.course?.code} {session.course?.name}</Title>
        <Muted style={{ marginTop: 4 }}>ห้อง {roomLabel(session.room)} · {session.startTime}–{session.endTime} · {session.date}</Muted>
      </Appear>

      {open && session.qrPayload && (
        <Pop>
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 16 }}>
              <QRCode value={session.qrPayload} size={220} color={paper.ink} backgroundColor="#fff" />
            </View>
            <Muted style={{ marginTop: 12 }}>ให้นักศึกษาสแกน QR นี้ด้วยกล้องมือถือ</Muted>
            <Text selectable style={{ marginTop: 6, fontSize: 11, color: colors.muted, textAlign: 'center' }}>{session.qrPayload}</Text>
          </Card>
        </Pop>
      )}
      {!open && <Badge label="ปิดการเช็กชื่อแล้ว" color={colors.muted} />}

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {counts.map(([k, n]) => <Stat key={k} label={STATUS_LABEL[k]} value={n} color={STATUS_COLOR[k]} />)}
        <Stat label="รอเช็กชื่อ" value={pending} color={colors.muted} />
      </View>

      {session.roster.map((r, i) => (
        <Card key={r.studentId} index={i} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '600', flex: 1, color: colors.ink }}>{r.studentCode ? `${r.studentCode}  ` : ''}{r.name}</Text>
            {!r.status && <Badge label="รอเช็กชื่อ" color={colors.muted} />}
          </View>
          <Segmented options={OPTIONS} value={r.status} onChange={(k) => setStatus(r.studentId, k)} />
        </Card>
      ))}

      {open && <Button title="ปิดการเช็กชื่อ" variant="danger" onPress={close} style={{ marginTop: 6 }} />}
    </Screen>
  );
}
