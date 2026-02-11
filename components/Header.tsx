
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { AuthContext } from '../App';

const Header: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-4">
            <img src="https://spt-curriculum.vercel.app/spt.png" alt="Satri Phatthalung School Logo" className="h-12 w-12" />
            <div className="text-brand-primary">
              <h1 className="text-xl font-bold">ระบบตรวจสอบคะแนน</h1>
              <p className="text-sm">โรงเรียนสตรีพัทลุง</p>
            </div>
          </Link>
          {user && (
             <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors duration-200"
            >
              <LogOut size={16} />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
