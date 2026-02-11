
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProjectPage from './pages/admin/AdminProjectPage';
import StudentLoginPage from './pages/student/StudentLoginPage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentProjectPage from './pages/student/StudentProjectPage';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface User {
  uid: string;
  name: string;
  [key: string]: any; 
}

export const AuthContext = React.createContext<{
  user: User | null;
  role: 'student' | 'admin' | null;
  loading: boolean;
  login: (user: any, role: 'student' | 'admin') => void;
  logout: () => void;
}>({
  user: null,
  role: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'student' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for student session from localStorage
    const savedStudent = localStorage.getItem('studentUser');
    if (savedStudent) {
      const studentData = JSON.parse(savedStudent);
      setUser({ uid: studentData.nationalId, name: `${studentData.firstName} ${studentData.lastName}`, ...studentData });
      setRole('student');
      setLoading(false);
      return;
    }

    // Check for admin session from Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Here you might want to fetch admin-specific profile data from Firestore
        setUser({ uid: firebaseUser.uid, name: 'ผู้ดูแลระบบ', email: firebaseUser.email });
        setRole('admin');
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const login = (userData: any, userRole: 'student' | 'admin') => {
    if (userRole === 'student') {
      localStorage.setItem('studentUser', JSON.stringify(userData));
      setUser({ uid: userData.nationalId, name: `${userData.firstName} ${userData.lastName}`, ...userData });
    } else { // Admin login is handled by onAuthStateChanged
        setUser({ uid: userData.uid, name: 'ผู้ดูแลระบบ', email: userData.email });
    }
    setRole(userRole);
  };

  const logout = async () => {
    if (role === 'admin') {
      await signOut(auth);
    } else if (role === 'student') {
      localStorage.removeItem('studentUser');
    }
    setUser(null);
    setRole(null);
  };

  if (loading) {
      return <div className="flex justify-center items-center h-screen">กำลังโหลด...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={!user ? <LandingPage /> : (role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/student/dashboard" />)} />
            
            <Route path="/student/login" element={!user ? <StudentLoginPage /> : <Navigate to="/student/dashboard" />} />
            <Route path="/student/dashboard" element={role === 'student' ? <StudentDashboardPage /> : <Navigate to="/" />} />
            <Route path="/student/project/:projectId" element={role === 'student' ? <StudentProjectPage /> : <Navigate to="/" />} />
            
            <Route path="/admin/login" element={!user ? <AdminLoginPage /> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/dashboard" element={role === 'admin' ? <AdminDashboardPage /> : <Navigate to="/" />} />
            <Route path="/admin/project/:projectId" element={role === 'admin' ? <AdminProjectPage /> : <Navigate to="/" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
