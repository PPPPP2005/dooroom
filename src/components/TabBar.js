import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { Gradient, colors } from './ui';

const ND = Platform.OS !== 'web';
const ICON = {
  schedule: 'calendar', scan: 'qr', history: 'clock', notifications: 'bell',
  profile: 'user', announce: 'message',
};
const FAB = 'scan'; // แท็บสแกนเป็นปุ่มวงกลมเรืองแสงตรงกลาง

// แท็บบาร์สีเข้ม: ไอคอนที่เลือกมีกรอบม่วงเลื่อนตาม + ปุ่มสแกนเป็นวงกลมเรืองแสง
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const routes = state.routes.filter((r) => descriptors[r.key].options.href !== null);
  const activeKey = state.routes[state.index]?.key;
  const idx = routes.findIndex((r) => r.key === activeKey);
  const itemW = routes.length ? w / routes.length : 0;
  const pillVisible = idx >= 0 && routes[idx].name !== FAB;

  const x = useRef(new Animated.Value(0)).current;
  const vis = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!itemW) return;
    if (idx >= 0) Animated.spring(x, { toValue: idx * itemW, speed: 16, bounciness: 8, useNativeDriver: ND }).start();
    Animated.timing(vis, { toValue: pillVisible ? 1 : 0, duration: 200, useNativeDriver: ND }).start();
  }, [idx, itemW, pillVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.row} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {!!itemW && (
          <Animated.View pointerEvents="none" style={[s.pillWrap, { width: itemW, opacity: vis, transform: [{ translateX: x }] }]}>
            <View style={s.pill} />
          </Animated.View>
        )}
        {routes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = route.key === activeKey;
          const label = options.title ?? route.name;
          const onPress = () => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !ev.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const Cmp = route.name === FAB ? FabItem : Item;
          return <Cmp key={route.key} focused={focused} label={label} icon={ICON[route.name] || 'home'} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

function Item({ focused, label, icon, onPress }) {
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: focused ? 1 : 0, speed: 18, bounciness: 12, useNativeDriver: ND }).start();
  }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  const color = focused ? colors.brandLight : colors.muted;
  return (
    <Pressable onPress={onPress} style={s.item} accessibilityRole="button" accessibilityState={{ selected: focused }}>
      <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
        <Icon name={icon} size={22} color={color} stroke={focused ? 2.1 : 1.8} />
      </Animated.View>
      <Text numberOfLines={1} style={[s.label, { color, fontWeight: focused ? '700' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

function FabItem({ focused, label, icon, onPress }) {
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: focused ? 1 : 0, speed: 18, bounciness: 12, useNativeDriver: ND }).start();
  }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable onPress={onPress} style={[s.item, { paddingVertical: 2 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: focused }}>
      <Animated.View style={[s.fab, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
        <Gradient from="#A78BFA" to="#6D28D9" />
        <Icon name={icon} size={24} color="#fff" stroke={2.1} />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: 'rgba(16,11,36,0.98)', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  pillWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, paddingHorizontal: 6 },
  pill: { flex: 1, backgroundColor: colors.brandSoft, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 3 },
  label: { fontSize: 11 },
  fab: {
    width: 50, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#8B5CF6', shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
});
