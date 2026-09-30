import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as mockLogin, logout as mockLogout, register as mockRegister, restore } from './mock-server';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// โหมดจำลอง: ไม่ใช้ Firebase Auth — ตรวจอีเมล/รหัสผ่านกับข้อมูลจำลอง และจำผู้ใช้ที่ล็อกอินไว้ในเบราว์เซอร์
export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null); // { id, name, role, ... }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restore().then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => { setProfile(await mockLogin(email, password)); }, []);
  const register = useCallback(async (data) => { setProfile(await mockRegister(data)); }, []);
  const logout = useCallback(async () => { await mockLogout(); setProfile(null); }, []);

  const value = useMemo(() => ({ user: profile, profile, loading, login, register, logout }), [profile, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
