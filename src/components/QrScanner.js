// ตัวสแกน QR บนมือถือ (iOS/Android) ใช้ expo-camera — บนเว็บจะใช้ QrScanner.web.js แทนอัตโนมัติ
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScanFrame from './ScanFrame';
import { Button, Muted, colors } from './ui';

export default function QrScanner({ active = true, onScan, hint }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={s.box}><Muted>กำลังตรวจสอบสิทธิ์กล้อง…</Muted></View>;
  if (!permission.granted) {
    return (
      <View style={[s.box, { gap: 14, padding: 24, backgroundColor: colors.brandSoft }]}>
        <Text style={{ textAlign: 'center', color: colors.ink }}>ต้องอนุญาตให้ใช้กล้องเพื่อสแกน QR Code</Text>
        <Button title="อนุญาตใช้กล้อง" icon="scan" onPress={requestPermission} />
      </View>
    );
  }
  return (
    <View style={s.box}>
      {active && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onScan(data)} />
      )}
      <ScanFrame hint={hint} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { height: 340, borderRadius: 24, overflow: 'hidden', backgroundColor: '#07040F', borderWidth: 1, borderColor: 'rgba(167,139,250,0.32)', alignItems: 'center', justifyContent: 'center' },
});
