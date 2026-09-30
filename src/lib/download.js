import { Platform, Share } from 'react-native';

// เว็บ: ดาวน์โหลดไฟล์ทันที / มือถือ: เปิดหน้าต่างแชร์ข้อความ CSV
export async function saveTextFile(filename, text, mime = 'text/csv;charset=utf-8') {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: filename, message: text });
}
