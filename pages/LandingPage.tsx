
import React from 'react';
import { Link } from 'react-router-dom';
import { User, Shield } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-brand-primary tracking-tight">ยินดีต้อนรับ</h2>
        <p className="mt-4 text-lg text-gray-600">กรุณาเลือกประเภทผู้ใช้งานเพื่อเข้าสู่ระบบ</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Link
          to="/student/login"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl shadow-soft hover:shadow-soft-lg transform hover:-translate-y-1 transition-all duration-300"
        >
          <div className="p-5 bg-blue-100 rounded-full mb-6">
            <User className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">สำหรับนักเรียน</h3>
          <p className="mt-2 text-gray-500">ตรวจสอบคะแนน</p>
        </Link>
        <Link
          to="/admin/login"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl shadow-soft hover:shadow-soft-lg transform hover:-translate-y-1 transition-all duration-300"
        >
          <div className="p-5 bg-green-100 rounded-full mb-6">
            <Shield className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">สำหรับผู้ดูแลระบบ</h3>
          <p className="mt-2 text-gray-500">จัดการข้อมูล</p>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
