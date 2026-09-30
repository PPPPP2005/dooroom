import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import FormModal from '../../../components/FormModal';
import { Button, Card, Empty, Field, Muted, Screen, SkeletonList, colors } from '../../../components/ui';
import { api } from '../../../lib/api';
import { RES, loadLookups } from '../../../lib/admin-resources';
import { confirmDialog, notify } from '../../../lib/dialog';

export default function Manage() {
  const { key } = useLocalSearchParams();
  const router = useRouter();
  const res = RES[key];
  const [rows, setRows] = useState(null);
  const [L, setL] = useState(null);
  const [form, setForm] = useState(null); // { row|null }
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!res) return;
    try {
      const [lookups, list] = await Promise.all([loadLookups(api), api.get(res.path)]);
      setL(lookups); setRows(list);
    } catch (e) { notify('โหลดไม่สำเร็จ', e.message); setRows([]); }
  }, [res]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!res) return <Screen edges={[]}><Empty icon="search">ไม่พบหน้านี้</Empty></Screen>;

  const remove = async (r) => {
    const ok = await confirmDialog('ยืนยันการลบ?', res.rowTitle(r, L), { okText: 'ลบ', destructive: true });
    if (!ok) return;
    try { await api.del(`${res.path}/${r.id}`); load(); } catch (e) { notify('ลบไม่ได้', e.message); }
  };

  const fields = form && L ? res.form({ L, editing: !!form.row }).filter((f) => !(form.row && f.createOnly)) : [];
  const shown = (rows || []).filter((r) => !q.trim() || [res.rowTitle(r, L || {}), ...res.rowLines(r, L || {})].join(' ').toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Screen edges={[]} onRefresh={load}>
      <Stack.Screen options={{ title: res.title }} />
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Field placeholder="ค้นหา…" value={q} onChangeText={setQ} style={{ flex: 1 }} />
          <Button title="เพิ่ม" icon="plus" onPress={() => setForm({ row: null })} disabled={!L} />
        </View>
        <Muted>ทั้งหมด {rows ? rows.length : '…'} รายการ</Muted>
        {!rows && <SkeletonList />}
        {rows && !shown.length && <Empty icon="search">ไม่มีข้อมูล</Empty>}
        {L && shown.map((r, i) => (
          <Card key={r.id} index={i}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{res.rowTitle(r, L)}</Text>
            {res.rowLines(r, L).map((line, i) => <Muted key={i}>{line}</Muted>)}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {key === 'rooms' && <Button title="QR ห้อง" icon="qr" size="sm" onPress={() => router.push(`/admin/room-qr/${r.id}`)} />}
              {!res.noEdit && <Button title="แก้ไข" icon="edit" size="sm" variant="secondary" onPress={() => setForm({ row: r })} />}
              <Button title="ลบ" icon="trash" size="sm" variant="danger" onPress={() => remove(r)} />
            </View>
          </Card>
        ))}
      </View>

      <FormModal
        visible={!!form}
        title={`${form?.row ? 'แก้ไข' : 'เพิ่ม'}${res.title}`}
        fields={fields}
        initial={form?.row || (key === 'users' ? { role: 'student', active: true } : undefined)}
        onCancel={() => setForm(null)}
        onSubmit={async (body) => {
          await api[form.row ? 'patch' : 'post'](form.row ? `${res.path}/${form.row.id}` : res.path, body);
          setForm(null); load();
        }}
      />
    </Screen>
  );
}
