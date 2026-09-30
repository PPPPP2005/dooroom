import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Empty, IconBadge, Muted, Screen, SkeletonList, Title, colors } from '../../components/ui';
import { api } from '../../lib/api';

const TYPE = {
  mismatch: ['alert', colors.danger],
  room_change: ['pin', colors.warn],
  notice: ['bell', colors.brand],
};

export default function Notifications() {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => { try { setRows(await api.get('/notifications/me')); } catch { setRows([]); } }, []);

  // simple polling; swap for push notifications (expo-notifications) later
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const read = async (n) => {
    if (n.read) return;
    setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    api.patch(`/notifications/${n.id}/read`).catch(() => {});
  };

  return (
    <Screen onRefresh={load}>
      <Title>การแจ้งเตือน</Title>
      {!rows && <SkeletonList />}
      {rows && !rows.length && <Empty icon="bell">ไม่มีการแจ้งเตือน</Empty>}
      {(rows || []).map((n, i) => {
        const [icon, color] = TYPE[n.type] || TYPE.notice;
        return (
          <Card key={n.id} index={i} onPress={() => read(n)} style={{ flexDirection: 'row', gap: 12, opacity: n.read ? 0.62 : 1 }}>
            <IconBadge name={icon} color={color} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '600', color: colors.ink, flexShrink: 1 }}>{n.title}</Text>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand }} />}
              </View>
              <Muted>{n.message}</Muted>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
