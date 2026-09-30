import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { Appear, Avatar, Button, Card, IconBadge, Label, Muted, Screen, Title, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { confirmDialog, notify } from '../../lib/dialog';

const DATA = [
  ['/admin/manage/users', 'users', 'ผู้ใช้งาน', 'เพิ่ม/แก้ไข/ลบ นักศึกษา อาจารย์ ผู้ดูแลระบบ', '#8B5CF6'],
  ['/admin/manage/courses', 'book', 'รายวิชา', 'รหัสวิชา ชื่อวิชา หน่วยกิต อาจารย์ผู้สอน', '#60A5FA'],
  ['/admin/manage/rooms', 'home', 'ห้องเรียน', 'รหัสห้อง อาคาร ความจุ + พิมพ์ QR ติดหน้าห้อง', '#FBBF24'],
  ['/admin/manage/schedules', 'calendar', 'ตารางเรียน / ตารางสอน', 'กำหนดวัน เวลา ห้อง (ระบบกันห้อง/อาจารย์ชนเวลา)', '#34D399'],
  ['/admin/manage/enrollments', 'clipboard', 'การลงทะเบียนเรียน', 'จับนักศึกษาเข้าวิชา', '#F472B6'],
];
const REPORTS = [
  ['/admin/attendance', 'checkSquare', 'ข้อมูลการเข้าห้องเรียน', 'ดูและแก้ไขสถานะการเข้าเรียนทั้งระบบ', '#34D399'],
  ['/admin/report', 'file', 'รายงานสรุป', 'สรุปมา/สาย/ขาด/ลา ต่อวิชา ต่อคน + ดาวน์โหลด CSV', '#8B5CF6'],
  ['/admin/logs', 'activity', 'ประวัติการเข้าใช้งาน', 'บันทึกการล็อกอินและการแก้ไขข้อมูล', '#22D3EE'],
];

export default function AdminHome() {
  const { profile, logout } = useAuth();
  const router = useRouter();

  const reset = async () => {
    const ok = await confirmDialog('รีเซ็ตข้อมูลจำลอง?', 'ข้อมูลที่เพิ่ม/แก้ไข/เช็กชื่อไว้ทั้งหมดจะถูกล้าง และกลับเป็นข้อมูลตัวอย่างเริ่มต้น', { okText: 'รีเซ็ต', destructive: true });
    if (!ok) return;
    try { await api.post('/admin/reset'); notify('รีเซ็ตแล้ว', 'กลับเป็นข้อมูลตัวอย่างเริ่มต้นเรียบร้อย'); } catch (e) { notify('รีเซ็ตไม่สำเร็จ', e.message); }
  };

  let n = 0;
  const item = ([href, icon, title, desc, tint]) => (
    <Card key={href} index={++n} onPress={() => router.push(href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <IconBadge name={icon} color={tint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600', fontSize: 16, color: colors.ink }}>{title}</Text>
        <Muted>{desc}</Muted>
      </View>
      <Icon name="chevronRight" size={18} color={colors.muted} />
    </Card>
  );

  return (
    <Screen edges={[]}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 12 }}>
        <Appear style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={profile?.name} size={52} />
          <View style={{ flex: 1 }}>
            <Title>สวัสดี {profile?.name}</Title>
            <Muted>เมนูจัดการระบบ (โหมดข้อมูลจำลอง)</Muted>
          </View>
        </Appear>
        <Label style={{ marginTop: 10 }}>จัดการข้อมูล</Label>
        {DATA.map(item)}
        <Label style={{ marginTop: 10 }}>รายงานและตรวจสอบ</Label>
        {REPORTS.map(item)}
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button title="รีเซ็ตข้อมูลจำลอง" variant="secondary" icon="refresh" onPress={reset} />
          <Button title="ออกจากระบบ" variant="danger" icon="logout" onPress={logout} />
        </View>
      </View>
    </Screen>
  );
}
