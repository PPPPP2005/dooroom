// ตัวเรียก API หน้าตาเดิม (api.get/post/patch/del) แต่ไม่ยิงเครือข่าย — เรียก Backend จำลองในเครื่องแทน
// เมื่อจะต่อ Backend จริงกลับมา แก้ไฟล์นี้ให้กลับไปใช้ fetch ได้เลย โดยหน้าจออื่นไม่ต้องแก้
import { handle } from './mock-server';

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms)); // จำลองความหน่วงของเครือข่าย

async function request(method, path, body) {
  await delay();
  return handle(method, path, body);
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, body),
  patch: (p, body) => request('PATCH', p, body),
  del: (p) => request('DELETE', p),
};
