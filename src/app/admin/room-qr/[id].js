import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Appear, Button, Card, Muted, Pop, Screen, SkeletonList, Title, paper } from '../../../components/ui';
import { api } from '../../../lib/api';
import { roomQrPayload } from '../../../lib/format';

const PRINT_CSS = '@media print{body *{visibility:hidden!important}#print-area,#print-area *{visibility:visible!important}#print-area{position:absolute;left:0;top:0;width:100%;border:0!important;box-shadow:none!important}}';

// หน้า QR ถาวรของห้อง — พิมพ์แล้วติดหน้าห้องได้เลย (QR ไม่หมดอายุ)
export default function RoomQr() {
  const { id } = useLocalSearchParams();
  const [room, setRoom] = useState(undefined);

  useEffect(() => {
    api.get('/rooms').then((list) => setRoom(list.find((r) => r.id === id) || null)).catch(() => setRoom(null));
  }, [id]);

  // ตอนสั่งพิมพ์บนเว็บ ให้พิมพ์เฉพาะใบป้าย QR
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const el = document.createElement('style');
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  if (room === undefined) return <Screen edges={[]}><SkeletonList n={1} /></Screen>;
  if (!room) return <Screen edges={[]}><Muted>ไม่พบห้องนี้</Muted></Screen>;
  const payload = roomQrPayload(room);

  return (
    <Screen edges={[]}>
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 14 }}>
        <Appear>
          <Title>QR Code ประจำห้อง</Title>
          <Muted style={{ marginTop: 4 }}>ติดหน้าห้องได้ถาวร นักศึกษาสแกนเพื่อตรวจว่ามาถูกห้องตามตารางหรือไม่ (รวมกรณีอาจารย์แจ้งย้ายห้อง)</Muted>
        </Appear>

        <Pop>
          <View nativeID="print-area" style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: paper.line, alignItems: 'center', padding: 28, gap: 6 }}>
            <Text style={{ color: paper.brand, fontWeight: '800', fontSize: 16, letterSpacing: -0.2 }}>DooRoom</Text>
            <Text style={{ fontSize: 44, fontWeight: '800', color: paper.ink, letterSpacing: -1, marginTop: 4 }}>ห้อง {room.code}</Text>
            {!!(room.name || room.building) && <Text style={{ fontSize: 16, color: paper.sub }}>{[room.name, room.building].filter(Boolean).join(' · ')}</Text>}
            <View style={{ padding: 14, borderRadius: 18, borderWidth: 1, borderColor: paper.line, marginVertical: 16 }}>
              <QRCode value={payload} size={240} color={paper.ink} backgroundColor="#fff" />
            </View>
            <Text style={{ fontSize: 15, color: paper.sub, textAlign: 'center' }}>สแกนเพื่อตรวจสอบว่าคุณมาถูกห้องเรียนหรือไม่</Text>
            <Text style={{ fontSize: 11, color: paper.muted, marginTop: 6 }}>{payload}</Text>
          </View>
        </Pop>

        {Platform.OS === 'web' ? (
          <Button title="พิมพ์ป้าย QR" icon="download" onPress={() => window.print()} />
        ) : (
          <Card><Muted>ต้องการพิมพ์ป้าย ให้เปิดหน้านี้จากเว็บ (npm run web) แล้วกด "พิมพ์ป้าย QR"</Muted></Card>
        )}
      </View>
    </Screen>
  );
}
