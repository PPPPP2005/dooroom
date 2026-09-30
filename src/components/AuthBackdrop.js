import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const ND = Platform.OS !== 'web';
let seq = 0;

// วงแสงฟุ้ง (radial gradient จางออกด้านนอก) ลอยขึ้นลงช้า ๆ
function Glow({ size, color, opacity = 0.5, style, dy = 14, duration = 5200 }) {
  const id = useState(() => `glow${++seq}`)[0];
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={[{ position: 'absolute', width: size, height: size, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

// แสงม่วง/น้ำเงิน/ชมพูลอยช้า ๆ ด้านหลังหน้าล็อกอิน/สมัครสมาชิก
export default function AuthBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Glow size={420} color="#7C3AED" opacity={0.55} style={{ top: -150, right: -140 }} />
      <Glow size={320} color="#4F46E5" opacity={0.4} dy={-16} duration={6400} style={{ top: 200, left: -150 }} />
      <Glow size={280} color="#C026D3" opacity={0.28} dy={10} duration={4600} style={{ bottom: -60, right: -70 }} />
    </View>
  );
}
