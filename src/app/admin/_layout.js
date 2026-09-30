import { Stack } from 'expo-router';
import { colors } from '../../components/ui';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'กลับ',
        animation: 'slide_from_right',
        headerShadowVisible: false,
        headerTintColor: colors.brandLight,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontWeight: '700', color: colors.ink },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'ผู้ดูแลระบบ' }} />
      <Stack.Screen name="manage/[key]" options={{ title: 'จัดการข้อมูล' }} />
      <Stack.Screen name="room-qr/[id]" options={{ title: 'QR Code ห้อง' }} />
      <Stack.Screen name="attendance" options={{ title: 'ข้อมูลการเข้าห้องเรียน' }} />
      <Stack.Screen name="report" options={{ title: 'รายงานสรุป' }} />
      <Stack.Screen name="logs" options={{ title: 'ประวัติการเข้าใช้งาน' }} />
    </Stack>
  );
}
