// Alert.alert ใช้ไม่ได้บนเว็บ (react-native-web ไม่รองรับ) จึงมีตัวช่วยที่ทำงานได้ทั้งเว็บและมือถือ
import { Alert, Platform } from 'react-native';

export function notify(title, message) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

// คืน Promise<boolean>
export function confirmDialog(title, message, { okText = 'ตกลง', destructive = false } = {}) {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message ? `${title}\n\n${message}` : title) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
