
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { app } from '../../firebase';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth(app);

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      login(userCredential.user, 'admin');
      navigate('/admin/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        console.error("Admin login error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-soft-lg">
        <div className="text-center">
            <img src="https://spt-curriculum.vercel.app/spt.png" alt="Logo" className="w-20 h-20 mx-auto" />
          <h2 className="mt-4 text-3xl font-bold text-brand-primary">ผู้ดูแลระบบ</h2>
          <p className="mt-2 text-gray-600">กรุณาลงชื่อเข้าใช้เพื่อจัดการข้อมูล</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              placeholder="อีเมล"
            />
          </div>
          <div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              placeholder="รหัสผ่าน"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
