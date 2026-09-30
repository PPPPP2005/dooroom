import { Tabs } from 'expo-router';
import TabBar from '../../components/TabBar';
import { colors } from '../../components/ui';

export default function TeacherLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="schedule" options={{ title: 'ตารางสอน' }} />
      <Tabs.Screen name="history" options={{ title: 'รายงาน' }} />
      <Tabs.Screen name="announce" options={{ title: 'ประกาศ' }} />
      <Tabs.Screen name="profile" options={{ title: 'บัญชี' }} />
      {/* หน้ารายละเอียด ไม่แสดงเป็นแท็บ */}
      <Tabs.Screen name="session/[id]" options={{ href: null }} />
    </Tabs>
  );
}
