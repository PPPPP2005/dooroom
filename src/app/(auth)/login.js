import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link } from 'expo-router';
import AuthBackdrop from '../../components/AuthBackdrop';
import Icon from '../../components/Icon';
import { Appear, Button, Field, Gradient, IconBadge, Muted, PressScale, Screen, colors } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { DEMO_ACCOUNTS } from '../../lib/config';
import { notify } from '../../lib/dialog';

const ROLE_ICON = { student: 'book', teacher: 'users', admin: 'shield' };
const ROLE_COLOR = { student: '#8B5CF6', teacher: '#34D399', admin: '#FBBF24' };

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e = email, p = password) => {
    setBusy(true);
    try {
      await login(e, p);
    } catch (err) {
      notify('เข้าสู่ระบบไม่สำเร็จ', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuthBackdrop />
      <Screen transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 14, marginTop: 36, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <Appear>
            <View style={{ width: 60, height: 60, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#8B5CF6', shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }}>
              <Gradient from="#A78BFA" to="#6D28D9" />
              <Icon name="door" size={30} color="#fff" stroke={2} />
            </View>
            <Text style={{ fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 }}>DooRoom</Text>
            <Muted style={{ marginTop: 2 }}>เช็กชื่อเข้าห้องเรียนให้ตรงวิชา ตรงห้อง ตรงเวลา</Muted>
          </Appear>

          <Appear delay={120} style={{ gap: 12, marginTop: 18 }}>
            <Field placeholder="อีเมล" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Field placeholder="รหัสผ่าน" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={() => submit()} />
            <Button title="เข้าสู่ระบบ" onPress={() => submit()} loading={busy} disabled={!email || !password} />
            <Link href="/register" style={{ color: colors.brandLight, textAlign: 'center', marginTop: 2, fontWeight: '500' }}>ยังไม่มีบัญชี? สมัครสมาชิก (นักศึกษา)</Link>
          </Appear>

          <Appear delay={240} style={{ marginTop: 22, gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 }}>ทดลองใช้ด้วยบัญชีตัวอย่าง (โหมด Mock)</Text>
            {DEMO_ACCOUNTS.map((a) => (
              <PressScale
                key={a.role}
                disabled={busy}
                onPress={() => submit(a.email, a.password)}
                scaleTo={0.98}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12 }}
              >
                <IconBadge name={ROLE_ICON[a.role] || 'user'} color={ROLE_COLOR[a.role]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 15 }}>เข้าในบทบาท{a.label}</Text>
                  <Muted style={{ fontSize: 12 }}>{a.email} / {a.password}</Muted>
                </View>
                <Icon name="chevronRight" size={18} color={colors.muted} />
              </PressScale>
            ))}
          </Appear>
        </KeyboardAvoidingView>
      </Screen>
    </View>
  );
}
