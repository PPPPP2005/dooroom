import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

const ND = Platform.OS !== 'web';
const SIZE = 216;
const CORNER = { position: 'absolute', width: 34, height: 34, borderColor: '#A78BFA', borderWidth: 4 };

// กรอบสแกนแบบมุมสี่ด้าน + เส้นสแกนวิ่งขึ้นลง (ใช้ร่วมกันทั้งมือถือและเว็บ)
export default function ScanFrame({ hint }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View pointerEvents="none" style={s.wrap}>
      <View style={{ width: SIZE, height: SIZE }}>
        <View style={[CORNER, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 18 }]} />
        <View style={[CORNER, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 18 }]} />
        <View style={[CORNER, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 18 }]} />
        <View style={[CORNER, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 18 }]} />
        <Animated.View style={[s.line, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, SIZE - 14] }) }] }]} />
      </View>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 18 },
  line: { position: 'absolute', left: 14, right: 14, height: 2, borderRadius: 2, backgroundColor: '#C4B5FD', shadowColor: '#8B5CF6', shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  hint: { color: '#fff', backgroundColor: 'rgba(11,7,22,.72)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, textAlign: 'center', marginHorizontal: 16, overflow: 'hidden', fontSize: 13 },
});
