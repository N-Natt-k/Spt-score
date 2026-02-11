
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { app } from '../../firebase';
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore(app);

const StudentLoginPage: React.FC = () => {
  const [nationalId, setNationalId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId.length !== 13 || !/^\d+$/.test(nationalId)) {
      setError('กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้อง');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const studentDocRef = doc(db, 'students', nationalId);
      const studentDocSnap = await getDoc(studentDocRef);

      if (studentDocSnap.exists()) {
        const studentData = studentDocSnap.data();
        login({ nationalId, ...studentData }, 'student');
        navigate('/student/dashboard');
      } else {
        setError('ไม่พบข้อมูลนักเรียนสำหรับเลขประจำตัวนี้');
      }
    } catch (err) {
      console.error("Error logging in student:", err);
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-soft-lg">
        <div className="text-center">
            <img src="https://spt-curriculum.vercel.app/spt.png" alt="Logo" className="w-20 h-20 mx-auto" />
          <h2 className="mt-4 text-3xl font-bold text-brand-primary">เข้าสู่ระบบสำหรับนักเรียน</h2>
          <p className="mt-2 text-gray-600">กรอกเลขประจำตัวประชาชน 13 หลัก</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="nationalId" className="sr-only">เลขประจำตัวประชาชน</label>
            <input
              id="nationalId"
              name="nationalId"
              type="text"
              maxLength={13}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              placeholder="เลขประจำตัวประชาชน 13 หลัก"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
            >
              {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentLoginPage;
