import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import AuthBackdrop from '../../components/AuthBackdrop';
import { Appear, Button, Field, Muted, Screen, Title, colors } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { notify } from '../../lib/dialog';

export default function Register() {
  const { register } = useAuth();
  const [f, setF] = useState({ name: '', studentCode: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      await register(f);
    } catch (e) {
      notify('สมัครไม่สำเร็จ', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuthBackdrop />
      <Screen transparent>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 12, marginTop: 20 }}>
          <Appear>
            <Title>สมัครสมาชิก</Title>
            <Muted style={{ marginTop: 4 }}>สำหรับนักศึกษา (บัญชีอาจารย์และแอดมินสร้างโดยผู้ดูแลระบบ) — ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น</Muted>
          </Appear>
          <Appear delay={100} style={{ gap: 12, marginTop: 8 }}>
            <Field placeholder="ชื่อ-สกุล" value={f.name} onChangeText={set('name')} autoCapitalize="words" />
            <Field placeholder="รหัสนักศึกษา" value={f.studentCode} onChangeText={set('studentCode')} />
            <Field placeholder="อีเมล" keyboardType="email-address" value={f.email} onChangeText={set('email')} />
            <Field placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" secureTextEntry value={f.password} onChangeText={set('password')} />
            <Button title="สมัครสมาชิก" onPress={submit} loading={busy} disabled={!f.name || !f.email || f.password.length < 6} />
            <Link href="/login" style={{ color: colors.brandLight, textAlign: 'center', marginTop: 4, fontWeight: '500' }}>มีบัญชีแล้ว? เข้าสู่ระบบ</Link>
          </Appear>
        </View>
      </Screen>
    </View>
  );
}
