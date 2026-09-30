import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, Card, Choice, Field, Label, Muted, Screen, Title } from '../../components/ui';
import { notify } from '../../lib/dialog';
import { api } from '../../lib/api';
import { DAYS, roomLabel } from '../../lib/format';

export default function Announce() {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [scheduleId, setScheduleId] = useState(null);
  const [type, setType] = useState('notice');
  const [newRoomId, setNewRoomId] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get('/schedules/me').then(setSchedules).catch(() => {});
    api.get('/rooms').then(setRooms).catch(() => {});
  }, []));

  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post('/announcements', { scheduleId, type, message, newRoomId: type === 'room_change' ? newRoomId : undefined });
      notify('ส่งแล้ว', `แจ้งนักศึกษา ${r.recipients} คน`);
      setMessage(''); setNewRoomId(null);
    } catch (e) {
      notify('ส่งไม่สำเร็จ', e.message);
    } finally {
      setBusy(false);
    }
  };

  const ready = scheduleId && message.trim() && (type === 'notice' || newRoomId);

  return (
    <Screen>
      <Title>ประกาศ / ย้ายห้อง</Title>
      <Muted>เลือกคาบเรียน แล้วแจ้งนักศึกษาที่ลงทะเบียนในคาบนั้น (ย้ายห้องมีผลกับวันนี้)</Muted>

      <Label>คาบเรียน</Label>
      <View style={{ gap: 8 }}>
        {schedules.map((s) => (
          <Choice key={s.id} selected={scheduleId === s.id} onPress={() => setScheduleId(s.id)}>
            {s.course?.code} {s.course?.name} · {DAYS[s.dayOfWeek]} {s.startTime}–{s.endTime} · ห้อง {s.room?.code}
          </Choice>
        ))}
      </View>

      <Label>ประเภท</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Choice selected={type === 'notice'} onPress={() => setType('notice')}>ประกาศทั่วไป</Choice>
        <Choice selected={type === 'room_change'} onPress={() => setType('room_change')}>ย้ายห้อง</Choice>
      </View>

      {type === 'room_change' && (
        <Card>
          <Label style={{ marginTop: 0 }}>ห้องใหม่</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {rooms.map((r) => <Choice key={r.id} selected={newRoomId === r.id} onPress={() => setNewRoomId(r.id)}>{roomLabel(r)}</Choice>)}
          </View>
        </Card>
      )}

      <Field placeholder="ข้อความ เช่น วันนี้ย้ายไปเรียนห้องใหม่" multiline value={message} onChangeText={setMessage} style={{ minHeight: 100, textAlignVertical: 'top' }} />
      <Button title="ส่งประกาศ" icon="send" onPress={send} loading={busy} disabled={!ready} />
    </Screen>
  );
}
