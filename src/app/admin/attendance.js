import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Badge, Button, Card, Choice, Empty, Field, Muted, Screen, Segmented, SkeletonList, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { notify } from '../../lib/dialog';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/format';

const KEYS = ['present', 'late', 'absent', 'leave'];
const OPTIONS = KEYS.map((k) => ({ key: k, label: STATUS_LABEL[k], color: STATUS_COLOR[k] }));
const METHOD = { qr: 'สแกน QR', manual: 'แก้ไขด้วยมือ', auto_close: 'ปิดคาบอัตโนมัติ' };

export default function AdminAttendance() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [rows, setRows] = useState(null);

  const load = useCallback(async (cid = courseId, d = date) => {
    try {
      const qs = [cid && `courseId=${encodeURIComponent(cid)}`, d.trim() && `date=${encodeURIComponent(d.trim())}`].filter(Boolean).join('&');
      setRows(await api.get(`/attendance${qs ? `?${qs}` : ''}`));
    } catch (e) { notify('โหลดไม่สำเร็จ', e.message); setRows([]); }
  }, [courseId, date]);

  useFocusEffect(useCallback(() => { api.get('/courses').then(setCourses).catch(() => {}); load(); }, [load]));

  const setStatus = async (r, status) => {
    try { await api.patch(`/attendance/${r.sessionId}/${r.studentId}`, { status }); load(); } catch (e) { notify('แก้ไขไม่ได้', e.message); }
  };

  return (
    <Screen edges={[]} onRefresh={() => load()}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 10 }}>
        <Muted>กรองตามวิชา</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Choice selected={!courseId} onPress={() => { setCourseId(''); load('', date); }}>ทุกวิชา</Choice>
          {courses.map((c) => <Choice key={c.id} selected={courseId === c.id} onPress={() => { setCourseId(c.id); load(c.id, date); }}>{c.code}</Choice>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field placeholder="วันที่ YYYY-MM-DD (เว้นว่าง = ทุกวัน)" value={date} onChangeText={setDate} style={{ flex: 1 }} />
          <Button title="ค้นหา" icon="search" onPress={() => load()} />
        </View>
        <Muted>พบ {rows ? rows.length : '…'} รายการ</Muted>
        {!rows && <SkeletonList />}
        {rows && !rows.length && <Empty icon="checkSquare">ไม่พบข้อมูล</Empty>}
        {(rows || []).map((r, i) => (
          <Card key={r.id} index={i} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '600', flex: 1, color: colors.ink }}>{r.studentCode} {r.studentName}</Text>
              <Badge label={STATUS_LABEL[r.status] || r.status} color={STATUS_COLOR[r.status]} />
            </View>
            <Muted>{r.date} · {r.courseCode} {r.courseName} · {METHOD[r.method] || r.method}</Muted>
            <Segmented options={OPTIONS} value={r.status} onChange={(k) => setStatus(r, k)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
