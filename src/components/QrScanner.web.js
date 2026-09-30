// ตัวสแกน QR บนเว็บ: เปิดกล้องด้วย getUserMedia แล้วถอดรหัสด้วย BarcodeDetector (ถ้าเบราว์เซอร์มี) หรือ jsQR
// หมายเหตุ: เบราว์เซอร์อนุญาตกล้องเฉพาะ https:// หรือ http://localhost เท่านั้น
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import jsQR from 'jsqr';
import ScanFrame from './ScanFrame';
import { Muted } from './ui';

export default function QrScanner({ active = true, onScan, hint }) {
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return undefined;
    let stream; let raf; let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detector = typeof window !== 'undefined' && 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;

    const tick = async () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        try {
          let text = null;
          if (detector) {
            const codes = await detector.detect(v);
            if (codes.length) text = codes[0].rawValue;
          }
          if (!text) {
            const w = Math.min(v.videoWidth, 640);
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w; canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const res = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
            if (res) text = res.data;
          }
          if (text) onScanRef.current(text);
        } catch { /* เฟรมนี้อ่านไม่ได้ ข้ามไป */ }
      }
      raf = setTimeout(tick, 200);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('เบราว์เซอร์นี้เปิดกล้องไม่ได้ — ต้องเปิดผ่าน https:// หรือ http://localhost (หรือใช้ช่องวางรหัส QR ด้านล่างแทน)');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
        tick();
      } catch (e) {
        setError(e?.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง — กดอนุญาตกล้องในเบราว์เซอร์แล้วลองใหม่' : `เปิดกล้องไม่สำเร็จ (${e?.name || 'error'})`);
      }
    })();

    return () => { stopped = true; clearTimeout(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [active]);

  return (
    <View style={{ height: 340, borderRadius: 24, overflow: 'hidden', backgroundColor: '#07040F', borderWidth: 1, borderColor: 'rgba(167,139,250,0.32)', alignItems: 'center', justifyContent: 'center' }}>
      {error ? (
        <View style={{ padding: 20 }}><Muted style={{ color: '#fff', textAlign: 'center' }}>{error}</Muted></View>
      ) : (
        <>
          <video ref={videoRef} muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
          <ScanFrame hint={hint} />
        </>
      )}
    </View>
  );
}
