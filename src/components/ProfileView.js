import { View } from 'react-native';
import { Text } from 'react-native';
import { Appear, Avatar, Badge, Button, Card, Muted, Screen, Title, colors } from './ui';
import { useAuth } from '../lib/auth-context';

export default function ProfileView({ roleLabel, showCode }) {
  const { profile, logout } = useAuth();
  return (
    <Screen>
      <Title>บัญชีของฉัน</Title>
      <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
        <Avatar name={profile?.name} size={72} />
        <Text style={{ fontWeight: '700', fontSize: 20, color: colors.ink, marginTop: 8 }}>{profile?.name}</Text>
        <Muted>{profile?.email}</Muted>
        <View style={{ marginTop: 6 }}><Badge label={roleLabel} /></View>
        {showCode && profile?.studentCode ? <Muted style={{ marginTop: 4 }}>รหัสนักศึกษา {profile.studentCode}</Muted> : null}
      </Card>
      <Appear delay={150}>
        <Button title="ออกจากระบบ" variant="secondary" icon="logout" onPress={logout} />
      </Appear>
    </Screen>
  );
}
