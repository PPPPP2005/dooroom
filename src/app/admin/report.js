import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Badge, Button, Card, Choice, Empty, Field, Muted, ProgressBar, Screen, SkeletonList, Stat, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { saveTextFile } from '../../lib/download';
import { notify } from '../../lib/dialog';
import { STATUS_COLOR, STATUS_LABEL, toCsv } from '../../lib/format';

const KEYS = ['present', 'late', 'absent', 'leave'];
const rateColor = (p) => (p >= 80 ? colors.success : p >= 60 ? colors.warn : colors.danger);

export default function AdminReport() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState(null);

  const load = useCallback(async (cid = courseId) => {
    try {
      const qs = [cid && `courseId=${encodeURIComponent(cid)}`, from.trim() && `from=${from.trim()}`, to.trim() && `to=${to.trim()}`].filter(Boolean).join('&');
      setRows(await api.get(`/reports/attendance${qs ? `?${qs}` : ''}`));
    } catch (e) { notify('สร้างรายงานไม่สำเร็จ', e.message); setRows([]); }
  }, [courseId, from, to]);

  useFocusEffect(useCallback(() => { api.get('/courses').then(setCourses).catch(() => {}); load(); }, [load]));

  const csv = async () => {
    try { await saveTextFile('attendance-report.csv', toCsv(rows || [])); } catch (e) { notify('บันทึกไฟล์ไม่สำเร็จ', e.message); }
  };

  const totals = KEYS.map((k) => [k, (rows || []).reduce((n, r) => n + r[k], 0)]);

  return (
    <Screen edges={[]} onRefresh={() => load()}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 10 }}>
        <Muted>วิชา</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Choice selected={!courseId} onPress={() => { setCourseId(''); load(''); }}>ทุกวิชา</Choice>
          {courses.map((c) => <Choice key={c.id} selected={courseId === c.id} onPress={() => { setCourseId(c.id); load(c.id); }}>{c.code}</Choice>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field placeholder="จาก YYYY-MM-DD" value={from} onChangeText={setFrom} style={{ flex: 1 }} />
          <Field placeholder="ถึง YYYY-MM-DD" value={to} onChangeText={setTo} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="สร้างรายงาน" onPress={() => load()} style={{ flex: 1 }} />
          <Button title="ดาวน์โหลด CSV" icon="download" variant="secondary" onPress={csv} disabled={!rows?.length} style={{ flex: 1 }} />
        </View>

        {rows?.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {totals.map(([k, n]) => <Stat key={k} label={`${STATUS_LABEL[k]}รวม`} value={n} color={STATUS_COLOR[k]} />)}
          </View>
        )}
        {!rows && <SkeletonList />}
        {rows && !rows.length && <Empty icon="file">ไม่มีข้อมูลในช่วงที่เลือก</Empty>}
        {(rows || []).map((r, i) => (
          <Card key={`${r.courseId}_${r.studentId}`} index={i} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '600', flex: 1, color: colors.ink }}>{r.studentCode} {r.studentName}</Text>
              <Text style={{ fontWeight: '700', fontSize: 17, color: rateColor(r.rate) }}>{r.rate}%</Text>
            </View>
            <ProgressBar value={r.rate} color={rateColor(r.rate)} />
            <Muted>{r.courseCode} {r.courseName} · รวม {r.total} คาบ</Muted>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {KEYS.map((k) => <Badge key={k} label={`${STATUS_LABEL[k]} ${r[k]}`} color={STATUS_COLOR[k]} />)}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
