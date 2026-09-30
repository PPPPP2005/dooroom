import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Icon from '../../components/Icon';
import QrScanner from '../../components/QrScanner';
import { Button, Card, Choice, Field, Muted, Pop, Screen, Title, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { notify } from '../../lib/dialog';
import { STATUS_LABEL, isRoomQr, roomLabel, roomQrPayload } from '../../lib/format';

// โทนของผลลัพธ์ที่แสดงใต้กล้อง
const TONE = {
  success: { color: colors.success, soft: colors.successSoft, icon: 'check' },
  warn: { color: colors.warn, soft: colors.warnSoft, icon: 'pin' },
  info: { color: colors.brand, soft: colors.brandSoft, icon: 'clock' },
  danger: { color: colors.danger, soft: colors.dangerSoft, icon: 'x' },
};
const ROOM_TONE = { correct: 'success', correct_moved: 'success', moved_away: 'warn', other_time: 'info', wrong_room: 'danger', no_class: 'danger' };

export default function Scan() {
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState(null); // { tone, title, text, note }
  const [manual, setManual] = useState('');
  const [openSessions, setOpenSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const busy = useRef(false);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    api.get('/demo/open-sessions').then(setOpenSessions).catch(() => {});
    api.get('/rooms').then(setRooms).catch(() => {});
    return () => setFocused(false);
  }, []));

  // QR หน้าห้อง (ถาวร) → ตรวจว่ามาถูกห้องไหม
  const verifyRoom = async (data) => {
    try {
      const r = await api.post('/rooms/verify', { qr: data });
      setResult({ tone: ROOM_TONE[r.kind] || 'info', title: r.title, text: r.message, note: r.ok ? 'ต่อไปสแกน QR ที่อาจารย์แสดงในห้องเพื่อเช็กชื่อ' : null, room: r.room });
    } catch (e) {
      setResult({ tone: 'danger', title: 'อ่าน QR ไม่ได้', text: e.message });
    }
  };

  // QR ของอาจารย์ (เปิดเช็กชื่อ) → เช็กชื่อเข้าเรียน
  const checkIn = async (data) => {
    try {
      const r = await api.post('/attendance/check-in', { qr: data });
      const text = r.alreadyCheckedIn ? `คุณเช็กชื่อคาบนี้ไปแล้ว (${STATUS_LABEL[r.status]})` : `เช็กชื่อสำเร็จ: ${STATUS_LABEL[r.status]}`;
      setResult({ tone: 'success', title: 'สำเร็จ', text });
      notify(r.alreadyCheckedIn ? 'เช็กชื่อแล้ว' : 'เช็กชื่อสำเร็จ', STATUS_LABEL[r.status]);
    } catch (e) {
      // wrong_room_or_subject / wrong_time มีข้อความบอกว่าตอนนี้ควรเรียนวิชาอะไร ห้องไหน (และสร้างการแจ้งเตือนให้)
      setResult({ tone: 'danger', title: 'ไม่สำเร็จ', text: e.message });
      notify('เข้าห้องไม่ตรงตามตาราง', e.message);
    }
  };

  const submit = async (data) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await (isRoomQr(data) ? verifyRoom(data) : checkIn(data));
    } finally {
      setTimeout(() => { busy.current = false; }, 2500); // กันสแกนซ้ำรัว ๆ
    }
  };

  const tone = result && TONE[result.tone];

  return (
    <Screen>
      <Title>สแกน QR</Title>
      <Muted>สแกน QR หน้าห้องเพื่อเช็กว่ามาถูกห้องไหม หรือสแกน QR ของอาจารย์เพื่อเช็กชื่อ</Muted>
      <QrScanner active={focused} onScan={submit} hint="ส่องที่ QR หน้าห้อง หรือ QR ที่อาจารย์แสดง" />

      {result && (
        <Pop key={`${result.tone}|${result.title}|${result.text}`}>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderColor: tone.color, backgroundColor: tone.soft }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tone.color, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={tone.icon} size={20} color="#fff" stroke={2.4} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: tone.color }}>{result.title}</Text>
              <Text style={{ color: colors.ink, lineHeight: 21 }}>{result.text}</Text>
              {!!result.note && <Muted style={{ marginTop: 4 }}>{result.note}</Muted>}
            </View>
          </Card>
        </Pop>
      )}

      <Card index={1}>
        <Text style={{ fontWeight: '600', color: colors.ink }}>วางรหัส QR ด้วยตนเอง</Text>
        <Muted>ใช้เมื่อกล้องสแกนไม่ได้ (รหัสขึ้นต้นด้วย doroom: หรือ doroom-room:)</Muted>
        <Field placeholder="doroom:…" value={manual} onChangeText={setManual} style={{ marginTop: 8 }} />
        <Button title="ส่งรหัส" icon="send" onPress={() => submit(manual.trim())} disabled={!manual.trim()} style={{ marginTop: 8 }} />
      </Card>

      <Card index={2}>
        <Text style={{ fontWeight: '600', color: colors.ink }}>สแกนจำลอง QR หน้าห้อง (โหมดทดสอบ)</Text>
        <Muted>เลือกห้องเพื่อจำลองการสแกน QR ที่ติดหน้าห้อง</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {rooms.map((r) => <Choice key={r.id} onPress={() => submit(roomQrPayload(r))}>{roomLabel(r)}</Choice>)}
        </View>
      </Card>

      <Card index={3}>
        <Text style={{ fontWeight: '600', color: colors.ink }}>สแกนจำลองเช็กชื่อ (โหมดทดสอบ)</Text>
        <Muted>คาบที่อาจารย์เปิดเช็กชื่อค้างไว้ในเครื่องนี้ — กดเพื่อจำลองการสแกน</Muted>
        {!openSessions.length && <Muted style={{ marginTop: 6 }}>ยังไม่มีคาบที่เปิดอยู่ (ให้อาจารย์เปิดเช็กชื่อก่อน)</Muted>}
        {openSessions.map((s) => (
          <View key={s.id} style={{ marginTop: 10, gap: 6 }}>
            <Text style={{ color: colors.ink }}>{s.course?.code} {s.course?.name} · ห้อง {roomLabel(s.room)}</Text>
            <Button title="จำลองสแกน QR นี้" variant="secondary" icon="qr" onPress={() => submit(s.qrPayload)} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
