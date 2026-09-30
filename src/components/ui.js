import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Icon from './Icon';

// ───────── ธีม: Smart Campus — ม่วงเข้มเกือบดำ + ม่วงเรืองแสง ─────────
// หมายเหตุ: สีที่ถูกใช้ต่อท้ายด้วย alpha (`${color}1A`) ต้องเป็น hex 6 หลักเสมอ
export const colors = {
  bg: '#0B0716',
  card: '#151030',
  cardHi: '#1C1640',
  field: '#120E27',
  fieldFocus: '#1A1438',
  ink: '#F5F2FF',
  sub: '#C9C2E6',
  muted: '#8E85B3',
  brand: '#8B5CF6',
  brandDeep: '#6D28D9',
  brandLight: '#A78BFA',
  brandSoft: 'rgba(139,92,246,0.18)',
  accent: '#60A5FA',
  line: 'rgba(167,139,250,0.16)',
  lineStrong: 'rgba(167,139,250,0.32)',
  track: 'rgba(167,139,250,0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.14)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.14)',
};

// สีสำหรับพื้นที่ "กระดาษสีขาว" (QR ที่ต้องสแกน/พิมพ์) — ต้องเป็นตัวอักษรเข้มบนพื้นขาวเสมอ
export const paper = { ink: '#150F2E', sub: '#4B4470', muted: '#8A82AD', brand: '#6D28D9', line: '#E4DFF5' };

const ND = Platform.OS !== 'web'; // native driver ใช้ได้เฉพาะมือถือ
export const ease = Easing.out(Easing.cubic);

// ───────── ตัวช่วยแอนิเมชัน ─────────
function useFlag(flag, duration = 200) {
  const v = useRef(new Animated.Value(flag ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: flag ? 1 : 0, duration, easing: ease, useNativeDriver: false }).start();
  }, [flag]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

// ค่อย ๆ ลอยขึ้น + จางเข้า (ใส่ delay เพื่อให้รายการเด้งเข้าทีละใบ)
export function Appear({ children, delay = 0, distance = 14, duration = 420, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: ease, useNativeDriver: ND }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

// เด้งขยายเข้า (ใช้กับผลลัพธ์ / QR)
export function Pop({ children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, speed: 14, bounciness: 9, useNativeDriver: ND }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[{ opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

const APressable = Animated.createAnimatedComponent(Pressable);

// กดแล้วยุบเบา ๆ ปล่อยแล้วเด้งกลับ
export function PressScale({ children, onPress, disabled, style, scaleTo = 0.97, ...rest }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x) => Animated.spring(v, { toValue: x, speed: 50, bounciness: 7, useNativeDriver: ND }).start();
  return (
    <APressable
      {...rest}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={[style, { transform: [{ scale: v }] }]}
    >
      {children}
    </APressable>
  );
}

// ───────── กราฟิก (react-native-svg) ─────────
let gradSeq = 0;
const useGradId = (prefix) => useState(() => `${prefix}${++gradSeq}`)[0];

// พื้นไล่สีเต็มพื้นที่ของ parent (parent ต้องมี overflow: 'hidden' + borderRadius ถ้าต้องการมุมโค้ง)
export function Gradient({ from = '#7C3AED', to = colors.brandDeep }) {
  const id = useGradId('lg');
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// แสงม่วงฟุ้งด้านหลังทุกหน้า (มุมขวาบน + มุมซ้ายล่าง)
function Ambient() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="ambA" cx="100%" cy="0%" r="80%">
            <Stop offset="0" stopColor="#7C3AED" stopOpacity="0.32" />
            <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ambB" cx="0%" cy="100%" r="75%">
            <Stop offset="0" stopColor="#4F46E5" stopOpacity="0.24" />
            <Stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ambA)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ambB)" />
      </Svg>
    </View>
  );
}

// การ์ดไล่สีม่วงเด่น ๆ (เหมือนการ์ด "Today's Classes" ในภาพอ้างอิง)
export function Hero({ children, style, index = 0 }) {
  return (
    <Appear delay={Math.min(index, 8) * 55}>
      <View style={[s.heroWrap, style]}>
        <View style={s.heroClip}>
          <Gradient from="#7C3AED" to="#35197F" />
          <View style={{ position: 'absolute', right: -36, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.09)' }} />
          <View style={{ position: 'absolute', right: 40, bottom: -60, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          {children}
        </View>
      </View>
    </Appear>
  );
}

// วงแหวนแสดงเปอร์เซ็นต์ (เหมือน "Overall Attendance" ในภาพอ้างอิง)
export function Ring({ value = 0, size = 112, stroke = 12, label }) {
  const id = useGradId('rg');
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#C4B5FD" />
            <Stop offset="1" stopColor="#7C3AED" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: size * 0.26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>{Math.round(pct)}%</Text>
      {!!label && <Text style={{ fontSize: 11, color: colors.muted, marginTop: -1 }}>{label}</Text>}
    </View>
  );
}

// ───────── โครงหน้า ─────────
export function Screen({ children, scroll = true, padded = true, edges = ['top'], onRefresh, transparent }) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh && (
    <RefreshControl
      refreshing={refreshing}
      tintColor={colors.brandLight}
      colors={[colors.brand]}
      progressBackgroundColor={colors.card}
      onRefresh={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }}
    />
  );
  return (
    <SafeAreaView style={[s.screen, transparent && { backgroundColor: 'transparent' }]} edges={edges}>
      {!transparent && <Ambient />}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[padded && s.pad, { gap: 12, paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh || undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded && s.pad]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export const Title = ({ children }) => <Text style={s.title}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[s.muted, style]}>{children}</Text>;
export const Label = ({ children, style }) => <Text style={[s.label, style]}>{children}</Text>;

export function Card({ children, style, onPress, index = 0 }) {
  return (
    <Appear delay={Math.min(index, 8) * 55}>
      {onPress ? (
        <PressScale onPress={onPress} scaleTo={0.985} style={[s.card, style]}>{children}</PressScale>
      ) : (
        <View style={[s.card, style]}>{children}</View>
      )}
    </Appear>
  );
}

// ───────── ปุ่ม ─────────
const VARIANTS = {
  primary: { bg: colors.brandDeep, fg: '#fff', bd: 'transparent' },
  secondary: { bg: colors.brandSoft, fg: colors.brandLight, bd: colors.lineStrong },
  danger: { bg: colors.dangerSoft, fg: colors.danger, bd: 'rgba(248,113,113,0.3)' },
  ghost: { bg: 'transparent', fg: colors.sub, bd: 'transparent' },
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, size = 'md', icon }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const small = size === 'sm';
  const primary = variant === 'primary' || !VARIANTS[variant];
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.96}
      style={[small ? s.btnWrapSm : s.btnWrap, primary && s.glow, { opacity: disabled ? 0.45 : 1 }, style]}
    >
      <View style={[s.btn, small && s.btnSm, !primary && { backgroundColor: v.bg, borderWidth: 1, borderColor: v.bd }]}>
        {primary && <Gradient from="#8B5CF6" to="#6D28D9" />}
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <>
            {!!icon && <Icon name={icon} size={small ? 15 : 18} color={v.fg} />}
            <Text style={[s.btnText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
          </>
        )}
      </View>
    </PressScale>
  );
}

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

export function Field({ style, onFocus, onBlur, ...props }) {
  const [focus, setFocus] = useState(false);
  const f = useFlag(focus);
  return (
    <AnimatedInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.brand}
      keyboardAppearance="dark"
      autoCapitalize="none"
      {...props}
      onFocus={(e) => { setFocus(true); onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); onBlur?.(e); }}
      style={[
        s.input,
        Platform.select({ web: { outlineStyle: 'none' } }),
        {
          borderColor: f.interpolate({ inputRange: [0, 1], outputRange: ['rgba(167,139,250,0.16)', '#8B5CF6'] }),
          backgroundColor: f.interpolate({ inputRange: [0, 1], outputRange: [colors.field, colors.fieldFocus] }),
        },
        style,
      ]}
    />
  );
}

export function Badge({ label, color = colors.brandLight, dot = true }) {
  return (
    <View style={[s.badge, { backgroundColor: `${color}22` }]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ชิปเลือก — สีเปลี่ยนแบบนุ่ม ๆ ตอนเลือก
export function Choice({ selected, onPress, children, style }) {
  const f = useFlag(!!selected);
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      style={[s.choice, {
        backgroundColor: f.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.03)', 'rgba(139,92,246,0.24)'] }),
        borderColor: f.interpolate({ inputRange: [0, 1], outputRange: ['rgba(167,139,250,0.16)', '#8B5CF6'] }),
      }, style]}
    >
      <Animated.Text style={{ fontSize: 14, fontWeight: '500', color: f.interpolate({ inputRange: [0, 1], outputRange: ['#C9C2E6', '#DDD6FE'] }) }}>
        {children}
      </Animated.Text>
    </PressScale>
  );
}

// ปุ่มเลือกสถานะแบบแถบ (มา/สาย/ขาด/ลา) — options: [{ key, label, color }]
export function Segmented({ options, value, onChange }) {
  return (
    <View style={s.seg}>
      {options.map((o) => <SegItem key={o.key} o={o} on={value === o.key} onPress={() => onChange(o.key)} />)}
    </View>
  );
}
function SegItem({ o, on, onPress }) {
  const f = useFlag(on);
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.94}
      style={[s.segItem, { backgroundColor: f.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0)', `${o.color}30`] }) }]}
    >
      <Animated.Text style={{ fontSize: 13, fontWeight: '600', color: f.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, o.color] }) }}>{o.label}</Animated.Text>
    </PressScale>
  );
}

// ───────── องค์ประกอบเล็ก ๆ ─────────
export function Avatar({ name = '?', size = 44 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.lineStrong }}>
      <Gradient from="#7C3AED" to="#3B1D8F" />
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{String(name).trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// กล่องไอคอนสีเรืองเบา ๆ (เหมือนไอคอน Quick Access ในภาพอ้างอิง)
export function IconBadge({ name, color = colors.brandLight, size = 40 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 13, backgroundColor: `${color}26`, borderWidth: 1, borderColor: `${color}55`, alignItems: 'center', justifyContent: 'center', shadowColor: color, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Stat({ label, value, color = colors.ink }) {
  return (
    <View style={s.stat}>
      <Text style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value = 0, color = colors.brand, height = 6 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(100, value)), duration: 800, easing: ease, useNativeDriver: false }).start();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: 'rgba(167,139,250,0.2)', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }) }, style]} />;
}

export function SkeletonList({ n = 3 }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={[s.card, { gap: 10 }]}>
          <Skeleton w="55%" h={16} />
          <Skeleton w="80%" h={12} />
          <Skeleton w="35%" h={12} />
        </View>
      ))}
    </>
  );
}

export function Empty({ children, icon = 'book' }) {
  return (
    <Appear style={{ alignItems: 'center', marginTop: 48, gap: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={colors.brandLight} />
      </View>
      <Muted style={{ textAlign: 'center' }}>{children}</Muted>
    </Appear>
  );
}

export const Center = ({ children }) => <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;

export { RefreshControl };

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingTop: 16 },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.sub, letterSpacing: 0.3, marginTop: 6 },
  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 4,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: '#7C3AED', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  heroWrap: { borderRadius: 22, shadowColor: '#8B5CF6', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
  heroClip: { borderRadius: 22, overflow: 'hidden', padding: 18, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  btnWrap: { borderRadius: 14 },
  btnWrapSm: { borderRadius: 11 },
  glow: { shadowColor: '#8B5CF6', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  btn: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnSm: { minHeight: 0, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 11 },
  btnText: { fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  choice: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 },
  seg: { flexDirection: 'row', backgroundColor: colors.field, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: colors.line },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  stat: { flex: 1, minWidth: 64, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, alignItems: 'center', gap: 2 },
});
