import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Empty, Muted, Screen, SkeletonList, colors } from '../../components/ui';
import { api } from '../../lib/api';
import { notify } from '../../lib/dialog';

export default function AdminLogs() {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    try { setRows(await api.get('/logs')); } catch (e) { notify('โหลดไม่สำเร็จ', e.message); setRows([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen edges={[]} onRefresh={load}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 10 }}>
        <Muted>แสดง 200 รายการล่าสุด</Muted>
        {!rows && <SkeletonList />}
        {rows && !rows.length && <Empty icon="activity">ยังไม่มีบันทึก</Empty>}
        {(rows || []).map((l, i) => (
          <Card key={l.id} index={i}>
            <Text style={{ fontWeight: '600', color: colors.ink }}>{l.action}</Text>
            <Muted>{new Date(l.createdAt).toLocaleString('th-TH')} · {l.userName || l.userId}{l.userEmail ? ` (${l.userEmail})` : ''}</Muted>
            {l.meta && Object.keys(l.meta).length > 0 && <Muted style={{ fontSize: 12 }}>{JSON.stringify(l.meta)}</Muted>}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
