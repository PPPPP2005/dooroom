import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Choice, Field, Muted, colors } from './ui';

const ND = Platform.OS !== 'web';

// ฟอร์มเพิ่ม/แก้ไขแบบ bottom sheet — fields: [{ k, label, type, options, required, bool, createOnly }]
export default function FormModal({ visible, title, fields, initial, onCancel, onSubmit }) {
  const [v, setV] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const p = useRef(new Animated.Value(0)).current; // 0 = ซ่อน, 1 = แสดง

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(p, { toValue: 1, speed: 15, bounciness: 5, useNativeDriver: ND }).start();
    } else {
      Animated.timing(p, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;
    const init = {};
    fields.forEach((f) => {
      const cur = initial?.[f.k];
      init[f.k] = f.type === 'password' ? '' : cur === undefined || cur === null ? (f.bool ? 'true' : '') : String(cur);
    });
    setV(init); setError('');
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const body = {};
    for (const f of fields) {
      const val = (v[f.k] ?? '').trim();
      if (f.required && f.type !== 'password' && !val) { setError(`กรุณากรอก "${f.label}"`); return; }
      if (val === '') continue;
      body[f.k] = f.bool ? val === 'true' : f.type === 'number' ? Number(val) : val;
    }
    setBusy(true); setError('');
    try { await onSubmit(body); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onCancel}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(4,2,12,.72)', opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '90%' }}>
          <Animated.View
            style={{
              backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.lineStrong,
              maxWidth: 560, width: '100%', alignSelf: 'center', maxHeight: '100%',
              transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get('window').height * 0.5, 0] }) }],
            }}
          >
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: 14 }} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 12, letterSpacing: -0.3 }}>{title}</Text>
            <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {fields.map((f) => (
                <View key={f.k} style={{ gap: 6 }}>
                  <Muted>{f.label}{f.required ? ' *' : ''}</Muted>
                  {f.type === 'select' ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {!f.required && <Choice selected={!v[f.k]} onPress={() => setV((q) => ({ ...q, [f.k]: '' }))}>— ไม่ระบุ —</Choice>}
                      {f.options.map((o) => (
                        <Choice key={o.value} selected={String(v[f.k]) === String(o.value)} onPress={() => setV((q) => ({ ...q, [f.k]: String(o.value) }))}>{o.label}</Choice>
                      ))}
                    </View>
                  ) : (
                    <Field
                      value={v[f.k] ?? ''}
                      onChangeText={(t) => setV((q) => ({ ...q, [f.k]: t }))}
                      secureTextEntry={f.type === 'password'}
                      keyboardType={f.type === 'number' ? 'numeric' : f.type === 'email' ? 'email-address' : 'default'}
                      placeholder={f.placeholder || (f.type === 'time' ? 'HH:MM เช่น 09:00' : '')}
                      autoCapitalize={f.type === 'text' || !f.type ? 'sentences' : 'none'}
                    />
                  )}
                </View>
              ))}
              {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Button title="ยกเลิก" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
                <Button title="บันทึก" icon="check" onPress={submit} loading={busy} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
