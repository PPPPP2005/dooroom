import { Stack } from 'expo-router';
import { colors } from '../../components/ui';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }} />;
}
