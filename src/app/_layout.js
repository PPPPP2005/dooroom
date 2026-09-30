import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth-context';

const HOME = { student: '/student/schedule', teacher: '/teacher/schedule', admin: '/admin' };

function Gate() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user) {
      if (!inAuth) router.replace('/login');
    } else if (profile) {
      // keep each role inside its own area
      if (inAuth || segments[0] !== profile.role) router.replace(HOME[profile.role] || '/login');
    }
  }, [loading, user, profile, segments, router]);

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.brandLight} /></View>;
  }
  // เปลี่ยนระหว่างหน้าล็อกอิน ↔ พื้นที่ของแต่ละบทบาทด้วย fade นุ่ม ๆ
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Gate />
    </AuthProvider>
  );
}
