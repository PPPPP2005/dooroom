import { Tabs } from 'expo-router';
import TabBar from '../../components/TabBar';
import { colors } from '../../components/ui';

export default function StudentLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="schedule" options={{ title: 'ตารางเรียน' }} />
      <Tabs.Screen name="history" options={{ title: 'ประวัติ' }} />
      <Tabs.Screen name="scan" options={{ title: 'สแกน' }} />
      <Tabs.Screen name="notifications" options={{ title: 'แจ้งเตือน' }} />
      <Tabs.Screen name="profile" options={{ title: 'บัญชี' }} />
    </Tabs>
  );
}
