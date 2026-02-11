import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  initializeApp 
} from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  writeBatch
} from "firebase/firestore";
import { 
  User, 
  Lock, 
  LogOut, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Trash2, 
  Save, 
  ChevronLeft, 
  Settings, 
  BarChart3, 
  Users,
  Download,
  Edit,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBWJmndz8RpKxW2DwPbl6P--G6QhDTqlqA",
  authDomain: "spt-score.firebaseapp.com",
  projectId: "spt-score",
  storageBucket: "spt-score.firebasestorage.app",
  messagingSenderId: "159154369203",
  appId: "1:159154369203:web:7cfb79bc3b65bb4d75b6c6",
  measurementId: "G-ZH8KVVWWK0"
};

const LOGO_URL = "https://spt-curriculum.vercel.app/spt.png";
const TIMEOUT_MINUTES = 5;

// --- FIREBASE INIT ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use global variable for app ID or default
const APP_ID = typeof window !== 'undefined' && (window as any).__app_id 
  ? (window as any).__app_id 
  : 'spt-admissions-v1';

// --- TYPES ---

interface Subject {
  id: string;
  name: string;
  maxScore: number;
  weight: number; // 1 = 100%
}

interface Project {
  id: string;
  name: string;
  subjects: Subject[];
  tieBreakers: string[]; // List of subject IDs in order
  isVisible: boolean;
  createdAt: number;
}

interface StudentRegistration {
  id: string; // Firestore Doc ID
  projectId: string;
  nationalId: string;
  examId: string;
  prefix: string;
  firstName: string;
  lastName: string;
  prevSchool: string;
  scores: { [subjectId: string]: number }; // Raw scores
  // Calculated fields (optional to store, but we can calc on fly)
  totalScore?: number;
}

// --- UTILS ---

const formatScore = (num: number) => Number(num).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calculateStats = (registrations: StudentRegistration[], project: Project) => {
  // Deep clone to avoid mutating state directly during sort
  const data = registrations.map(reg => {
    let total = 0;
    project.subjects.forEach(sub => {
      total += (reg.scores[sub.id] || 0) * (sub.weight || 1);
    });
    return { ...reg, totalScore: total };
  });

  // Sort Logic with Tie Breakers
  data.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    
    for (const subId of project.tieBreakers) {
      const scoreA = a.scores[subId] || 0;
      const scoreB = b.scores[subId] || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
    }
    return 0;
  });

  // Assign Ranks
  const rankedData = data.map((item, index) => ({
    ...item,
    rank: index + 1,
    percentile: 100 - ((index + 1) / data.length * 100)
  }));

  // Subject Stats
  const subjectStats: any = {};
  project.subjects.forEach(sub => {
    const scores = rankedData.map(d => d.scores[sub.id] || 0);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length || 0;
    
    // Sort just this subject for ranking
    const sortedScores = [...scores].sort((a, b) => b - a);

    subjectStats[sub.id] = { max, min, avg, sortedScores };
  });

  return { rankedData, subjectStats };
};

// --- COMPONENTS ---

// 1. UI PRIMITIVES

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-200 ring-pink-500",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm ring-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 ring-red-200",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input 
      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
      {...props}
    />
  </div>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// 2. MAIN APPLICATION

export default function App() {
  // Global State
  const [user, setUser] = useState<any>(null); // Admin User
  const [studentId, setStudentId] = useState<string | null>(null); // Student Session (National ID)
  const [view, setView] = useState('home'); // home, student-dash, admin-dash, admin-project
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  
  // Idle Timer
  const lastActivity = useRef(Date.now());

  // Routing Simulation
  const navigate = (path: string, params?: any) => {
    window.history.pushState(params, '', path);
    handleRoute(path, params);
  };

  const handleRoute = (path: string, params?: any) => {
    // Simple router logic
    if (path === '/' || path === '/home') setView('home');
    else if (path === '/student/dashboard') setView('student-dash');
    else if (path === '/admin/dashboard') setView('admin-dash');
    else if (path.startsWith('/admin/project/')) {
        setView('admin-project');
        // If params provided, set project, else we need to fetch by ID (omitted for brevity in single file, assuming params pass)
        if(params?.project) setCurrentProject(params.project);
    }
    window.scrollTo(0,0);
  };

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      // Basic handling of back button to at least go home or reset view
      if (window.location.pathname === '/') setView('home');
      else handleRoute(window.location.pathname, e.state);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Auth & Idle Check
  useEffect(() => {
    // Check activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetTimer = () => lastActivity.current = Date.now();
    activityEvents.forEach(e => window.addEventListener(e, resetTimer));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > TIMEOUT_MINUTES * 60 * 1000) {
        if (user || studentId) {
          handleLogout();
          alert("หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่");
        }
      }
    }, 10000);

    // Firebase Auth
    const initAuth = async () => {
       if ((window as any).__initial_auth_token) {
           await signInWithCustomToken(auth, (window as any).__initial_auth_token);
       } else {
           await signInAnonymously(auth);
       }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u && !u.isAnonymous ? u : null); // Only count non-anonymous as Admin
      setLoading(false);
    });

    return () => {
      activityEvents.forEach(e => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
      unsubscribe();
    };
  }, [user, studentId]);

  // Data Fetching
  useEffect(() => {
    if (!user && !studentId) return;

    const fetchProjects = async () => {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'projects'));
      const snapshot = await getDocs(q);
      const projList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      setProjects(projList);
    };

    fetchProjects();
  }, [user, studentId, view]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setStudentId(null);
    navigate('/');
  };

  // --- VIEWS ---

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={LOGO_URL} alt="Logo" className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <h1 className="font-bold text-pink-700 text-lg">Satri Phatthalung School</h1>
              <p className="text-xs text-gray-500">Admissions System</p>
            </div>
          </div>
          {(user || studentId) && (
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut size={18} />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-140px)]">
        
        {view === 'home' && (
          <HomeView 
            onStudentLogin={(id) => { setStudentId(id); navigate('/student/dashboard'); }}
            onAdminLogin={() => navigate('/admin/dashboard')}
          />
        )}

        {view === 'student-dash' && studentId && (
          <StudentDashboard 
            studentId={studentId} 
            projects={projects}
          />
        )}

        {view === 'admin-dash' && user && (
          <AdminDashboard 
            projects={projects} 
            onRefresh={() => setView('admin-dash')} // Trigger re-render
            onSelectProject={(p) => {
              setCurrentProject(p);
              navigate(`/admin/project/${p.id}`, { project: p });
            }}
          />
        )}

        {view === 'admin-project' && user && currentProject && (
          <AdminProjectDetail 
            project={currentProject}
            onBack={() => navigate('/admin/dashboard')}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} โรงเรียนสตรีพัทลุง | Satri Phatthalung School</p>
          <p className="text-xs mt-1">System by Admissions Team</p>
        </div>
      </footer>
    </div>
  );
}

// --- SUB-VIEWS ---

function HomeView({ onStudentLogin, onAdminLogin }: { onStudentLogin: (id: string) => void, onAdminLogin: () => void }) {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId.length !== 13) {
      setError("กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้อง");
      return;
    }
    onStudentLogin(nationalId);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError('');
    try {
      await signInWithEmailAndPassword(getAuth(), email, password);
      onAdminLogin();
    } catch (err: any) {
      console.error(err);
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-10 pb-20">
      <div className="text-center mb-8 animate-in slide-in-from-bottom-5 duration-500">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">ตรวจสอบคะแนนสอบเข้า</h2>
        <p className="text-gray-500">โรงเรียนสตรีพัทลุง</p>
      </div>

      <Card className="w-full max-w-md animate-in zoom-in-95 duration-300">
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('student')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'student' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            สำหรับนักเรียน
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            สำหรับผู้ดูแล
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><div className="w-1 h-full bg-red-500 rounded"></div>{error}</div>}
          
          {activeTab === 'student' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 mb-4">
                <Search className="text-blue-600 mt-1 shrink-0" size={20} />
                <p className="text-sm text-blue-800">กรอกเลขประจำตัวประชาชน 13 หลักเพื่อตรวจสอบผลคะแนนของท่าน</p>
              </div>
              <Input 
                label="เลขประจำตัวประชาชน" 
                placeholder="XXXXXXXXXXXXX" 
                value={nationalId}
                onChange={(e: any) => setNationalId(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                required
              />
              <Button type="submit" className="w-full h-11 text-lg mt-2">เข้าสู่ระบบ</Button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
              <Input label="Password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
              <Button type="submit" className="w-full h-11 text-lg mt-2" disabled={loggingIn}>
                {loggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

function StudentDashboard({ studentId, projects }: { studentId: string, projects: Project[] }) {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [projectStats, setProjectStats] = useState<{[pid: string]: any}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const studentRegs: StudentRegistration[] = [];
      const statsMap: any = {};

      // 1. Find all registrations for this student ID
      const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'), 
        where('nationalId', '==', studentId)
      );
      const snapshot = await getDocs(q);
      
      const myRegs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentRegistration));
      
      // 2. For each project I'm in, fetch ALL students to calc rank/percentile
      // Note: In a massive scale app, this should be pre-calculated by cloud functions. 
      // For a school with < 2000 students, client-side calc is acceptable for this demo.
      
      for (const myReg of myRegs) {
        const project = projects.find(p => p.id === myReg.projectId);
        if (!project || !project.isVisible) continue; // Skip if project hidden or not found

        // Fetch all peers for this project
        const peersQ = query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'),
          where('projectId', '==', myReg.projectId)
        );
        const peersSnap = await getDocs(peersQ);
        const peers = peersSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRegistration));

        const { rankedData, subjectStats } = calculateStats(peers, project);
        
        // Find me in ranked data
        const myRankedData = rankedData.find(r => r.nationalId === studentId);
        
        if (myRankedData) {
          studentRegs.push(myRankedData);
          statsMap[project.id] = { subjectStats, totalStudents: rankedData.length, highestTotal: rankedData[0].totalScore };
        }
      }

      setRegistrations(studentRegs);
      setProjectStats(statsMap);
      setLoading(false);
    };

    loadData();
  }, [studentId, projects]);

  if (loading) return <div className="text-center py-20 text-gray-500">กำลังโหลดข้อมูล...</div>;

  if (registrations.length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-sm inline-block">
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-800">ไม่พบข้อมูลการสมัครสอบ</h3>
          <p className="text-gray-500 mt-2">โปรดตรวจสอบเลขบัตรประชาชน หรือประกาศผลสอบยังไม่เปิดใช้งาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="bg-pink-100 p-3 rounded-full">
           <User className="text-pink-600" size={32} />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-gray-800">{registrations[0].prefix}{registrations[0].firstName} {registrations[0].lastName}</h2>
           <p className="text-gray-500">โรงเรียนเดิม: {registrations[0].prevSchool}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {registrations.map(reg => {
          const project = projects.find(p => p.id === reg.projectId);
          if (!project) return null;
          
          const stats = projectStats[project.id];
          const totalMax = project.subjects.reduce((sum, s) => sum + (s.maxScore * s.weight), 0);

          return (
            <Card key={reg.id} className="overflow-hidden border-t-4 border-t-pink-500">
              {/* Header Part */}
              <div className="bg-gradient-to-r from-pink-50 to-white p-6 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-pink-700">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-2 text-gray-600">
                      <span className="bg-white px-2 py-1 rounded border text-sm font-mono">ID: {reg.examId}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="text-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 min-w-[100px]">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Ranking</p>
                        <p className="text-2xl font-bold text-pink-600">#{reg.rank as any}</p>
                        <p className="text-xs text-gray-400">จาก {stats?.totalStudents}</p>
                     </div>
                     <div className="text-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 min-w-[100px]">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Total Score</p>
                        <p className="text-2xl font-bold text-gray-800">{formatScore(reg.totalScore || 0)}</p>
                        <p className="text-xs text-gray-400">เต็ม {formatScore(totalMax)}</p>
                     </div>
                  </div>
                </div>
              </div>

              {/* Subject Details Table */}
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold">รายวิชา</th>
                      <th className="py-3 px-4 text-center">คะแนนที่ได้</th>
                      <th className="py-3 px-4 text-center">คะแนนเต็ม</th>
                      <th className="py-3 px-4 text-center">%</th>
                      <th className="py-3 px-4 text-center text-gray-400 hidden sm:table-cell">ค่าเฉลี่ย</th>
                      <th className="py-3 px-4 text-center text-gray-400 hidden sm:table-cell">สูงสุด</th>
                      <th className="py-3 px-4 text-center font-semibold text-pink-600">Ranking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {project.subjects.map(sub => {
                      const score = reg.scores[sub.id] || 0;
                      const subStat = stats?.subjectStats[sub.id];
                      const percent = (score / sub.maxScore) * 100;
                      
                      // Calculate Subject Rank on fly
                      const subRank = subStat ? subStat.sortedScores.indexOf(score) + 1 : '-';

                      return (
                        <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-800">{sub.name}</td>
                          <td className="py-3 px-4 text-center font-bold text-gray-800">{formatScore(score)}</td>
                          <td className="py-3 px-4 text-center text-gray-500">{sub.maxScore}</td>
                          <td className="py-3 px-4 text-center text-gray-600">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${percent >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {formatScore(percent)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-400 hidden sm:table-cell">{subStat ? formatScore(subStat.avg) : '-'}</td>
                          <td className="py-3 px-4 text-center text-gray-400 hidden sm:table-cell">{subStat ? formatScore(subStat.max) : '-'}</td>
                          <td className="py-3 px-4 text-center font-bold text-pink-600">#{subRank}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AdminDashboard({ projects, onRefresh, onSelectProject }: any) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  
  const handleAddProject = async () => {
    if(!newProjName) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'projects'), {
      name: newProjName,
      subjects: [],
      tieBreakers: [],
      isVisible: false,
      createdAt: Date.now()
    });
    setNewProjName('');
    setShowAddModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">จัดการโครงการสอบ</h2>
         <Button onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> เพิ่มโครงการ
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p: Project) => (
          <Card key={p.id} className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => onSelectProject(p)}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${p.isVisible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-pink-600 flex items-center gap-1">จัดการ <Settings size={14}/></span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{p.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{p.subjects.length} รายวิชา</p>
              <div className="w-full bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex justify-between items-center">
                 <span>Created</span>
                 <span>{new Date(p.createdAt).toLocaleDateString('th-TH')}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="เพิ่มโครงการใหม่">
        <div className="space-y-4">
          <Input 
            label="ชื่อโครงการ" 
            placeholder="เช่น ห้องเรียนพิเศษ วิทย์-คณิต" 
            value={newProjName}
            onChange={(e: any) => setNewProjName(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>ยกเลิก</Button>
            <Button onClick={handleAddProject}>สร้างโครงการ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdminProjectDetail({ project, onBack }: { project: Project, onBack: () => void }) {
  const [tab, setTab] = useState<'students' | 'settings' | 'stats'>('students');
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [rankedStudents, setRankedStudents] = useState<any[]>([]); // Includes calculated stats
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Edit State
  const [showImportStudent, setShowImportStudent] = useState(false);
  const [showImportScores, setShowImportScores] = useState(false);
  const [importText, setImportText] = useState('');
  const [editStudent, setEditStudent] = useState<StudentRegistration | null>(null);

  // Settings State
  const [subjects, setSubjects] = useState<Subject[]>(project.subjects || []);
  const [tieBreakers, setTieBreakers] = useState<string[]>(project.tieBreakers || []);
  const [isVisible, setIsVisible] = useState(project.isVisible);

  useEffect(() => {
    fetchStudents();
  }, [project]);

  const fetchStudents = async () => {
    setLoading(true);
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'),
      where('projectId', '==', project.id)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRegistration));
    setStudents(list);

    // Calc stats immediately
    const { rankedData, subjectStats } = calculateStats(list, { ...project, subjects }); // Use current subjects state if changed but not saved? No, use project.
    setRankedStudents(rankedData);
    setStats({ subjectStats, total: list.length });
    
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'projects', project.id);
    await updateDoc(ref, {
      subjects,
      tieBreakers,
      isVisible
    });
    alert("บันทึกการตั้งค่าแล้ว");
  };

  const handleDeleteProject = async () => {
    if (!confirm(`ยืนยันการลบโครงการ ${project.name} และข้อมูลนักเรียนทั้งหมด?`)) return;
    
    setLoading(true);
    // 1. Delete all students (batch)
    const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'),
        where('projectId', '==', project.id)
      );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    
    // 2. Delete project
    batch.delete(doc(db, 'artifacts', APP_ID, 'public', 'data', 'projects', project.id));
    
    await batch.commit();
    onBack();
  };

  const handleImportStudents = async () => {
     // Format: ID13, ExamID, Prefix, Name, Surname, School
     const lines = importText.trim().split('\n');
     const batch = writeBatch(db);
     let count = 0;

     lines.forEach(line => {
       const cols = line.split(/[,\t]+/).map(s => s.trim());
       if (cols.length < 5) return;
       const [natId, examId, prefix, first, last, school] = cols;
       const newRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'));
       batch.set(newRef, {
         projectId: project.id,
         nationalId: natId,
         examId: examId,
         prefix: prefix,
         firstName: first,
         lastName: last,
         prevSchool: school || '-',
         scores: {}
       });
       count++;
     });

     await batch.commit();
     setImportText('');
     setShowImportStudent(false);
     fetchStudents();
     alert(`นำเข้านักเรียน ${count} คนสำเร็จ`);
  };

  const handleImportScores = async () => {
    // Format: ExamID/NatID, Score1, Score2...
    // We need to map registered students by ExamID or NatID for quick lookup
    const studentMap = new Map();
    students.forEach(s => {
        studentMap.set(s.examId, s);
        studentMap.set(s.nationalId, s);
    });

    const lines = importText.trim().split('\n');
    const batch = writeBatch(db);
    let updated = 0;

    lines.forEach(line => {
        const cols = line.split(/[,\t]+/).map(s => s.trim());
        const id = cols[0];
        const student = studentMap.get(id);
        
        if (student) {
            const scores: any = { ...student.scores };
            project.subjects.forEach((sub, idx) => {
                if (cols[idx + 1]) scores[sub.id] = parseFloat(cols[idx + 1]);
            });
            
            const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'registrations', student.id);
            batch.update(ref, { scores });
            updated++;
        }
    });

    await batch.commit();
    setImportText('');
    setShowImportScores(false);
    fetchStudents();
    alert(`อัปเดตคะแนน ${updated} รายการสำเร็จ`);
  };

  const handleExportCSV = () => {
    // BOM for Thai Excel support
    let csvContent = "\uFEFFลำดับ,เลขประจำตัวผู้เข้าสอบ,เลขประชาชน,ชื่อ-สกุล,โรงเรียนเดิม,";
    project.subjects.forEach(s => csvContent += `${s.name} (${s.maxScore}),`);
    csvContent += "คะแนนรวม\n";

    rankedStudents.forEach(row => {
        csvContent += `${row.rank},${row.examId},${row.nationalId},"${row.prefix}${row.firstName} ${row.lastName}",${row.prevSchool},`;
        project.subjects.forEach(s => {
            csvContent += `${row.scores[s.id] || 0},`;
        });
        csvContent += `${row.totalScore}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ranking_${project.name}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="animate-in slide-in-from-right-10 duration-500 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={onBack}><ChevronLeft size={20} /></Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
          <p className="text-sm text-gray-500">จัดการข้อมูลและคะแนน</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'students', label: 'รายชื่อและคะแนน', icon: Users },
          { id: 'stats', label: 'สถิติภาพรวม', icon: BarChart3 },
          { id: 'settings', label: 'ตั้งค่าโครงการ', icon: Settings },
        ].map(t => (
           <button
             key={t.id}
             onClick={() => setTab(t.id as any)}
             className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'border-pink-600 text-pink-600 bg-pink-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
             <t.icon size={18} /> {t.label}
           </button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="space-y-4">
           <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowImportStudent(true)}><Users size={16}/> นำเข้ารายชื่อ</Button>
              <Button variant="secondary" onClick={() => setShowImportScores(true)}><FileSpreadsheet size={16}/> กรอกคะแนน (CSV/Paste)</Button>
              <Button variant="primary" onClick={handleExportCSV}><Download size={16}/> ส่งออก CSV</Button>
           </div>

           <Card className="overflow-hidden">
             <div className="overflow-x-auto max-h-[600px]">
               <table className="w-full text-sm text-left relative">
                 <thead className="sticky top-0 bg-gray-50 shadow-sm z-10">
                   <tr className="text-gray-600 font-semibold border-b border-gray-200">
                     <th className="py-3 px-4">Ranking</th>
                     <th className="py-3 px-4">Exam ID</th>
                     <th className="py-3 px-4">ชื่อ-สกุล</th>
                     {project.subjects.map(s => (
                       <th key={s.id} className="py-3 px-4 text-center">{s.name} ({s.maxScore})</th>
                     ))}
                     <th className="py-3 px-4 text-center font-bold text-gray-800">Total</th>
                     <th className="py-3 px-4 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {loading ? (
                     <tr><td colSpan={10} className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr>
                   ) : rankedStudents.map((std) => (
                     <tr key={std.id} className="hover:bg-pink-50/30 transition-colors">
                       <td className="py-3 px-4 font-bold text-pink-600">#{std.rank}</td>
                       <td className="py-3 px-4 font-mono">{std.examId}</td>
                       <td className="py-3 px-4">
                         <div className="font-medium">{std.prefix}{std.firstName} {std.lastName}</div>
                         <div className="text-xs text-gray-400">{std.nationalId}</div>
                       </td>
                       {project.subjects.map(s => (
                         <td key={s.id} className="py-3 px-4 text-center">{std.scores[s.id] || '-'}</td>
                       ))}
                       <td className="py-3 px-4 text-center font-bold text-gray-800">{formatScore(std.totalScore)}</td>
                       <td className="py-3 px-4 text-center">
                         <button onClick={() => setEditStudent(std)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </Card>
        </div>
      )}

      {tab === 'stats' && stats && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
               <h3 className="text-lg font-bold mb-4">คะแนนเฉลี่ยรายวิชา</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={project.subjects.map(s => ({ name: s.name, avg: stats.subjectStats[s.id]?.avg || 0 }))}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="name" />
                     <YAxis />
                     <Tooltip />
                     <Bar dataKey="avg" fill="#db2777" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </Card>
            <Card className="p-6">
               <h3 className="text-lg font-bold mb-4">ภาพรวมโครงการ</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-4 rounded-xl text-center">
                    <p className="text-gray-500 text-sm">จำนวนผู้สมัคร</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                    <p className="text-xs text-gray-400">คน</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl text-center">
                    <p className="text-gray-500 text-sm">คะแนนสูงสุด</p>
                    <p className="text-3xl font-bold text-pink-600">{formatScore(rankedStudents[0]?.totalScore || 0)}</p>
                    <p className="text-xs text-gray-400">คะแนน</p>
                 </div>
               </div>
            </Card>
         </div>
      )}

      {tab === 'settings' && (
        <div className="max-w-2xl space-y-6">
           <Card className="p-6 space-y-4">
             <h3 className="font-bold text-lg">การแสดงผล</h3>
             <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                   <p className="font-medium">เปิดให้นักเรียนตรวจสอบคะแนน</p>
                   <p className="text-xs text-gray-500">หากปิด นักเรียนจะไม่เห็นโครงการนี้ในหน้าตรวจสอบ</p>
                </div>
                <button 
                  onClick={() => setIsVisible(!isVisible)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isVisible ? 'left-7' : 'left-1'}`}></div>
                </button>
             </div>
           </Card>

           <Card className="p-6 space-y-4">
              <div className="flex justify-between">
                <h3 className="font-bold text-lg">รายวิชาและน้ำหนัก</h3>
                <Button variant="secondary" className="text-xs" onClick={() => {
                   const id = 'sub_' + Date.now();
                   setSubjects([...subjects, { id, name: 'วิชาใหม่', maxScore: 100, weight: 1 }]);
                }}><Plus size={14}/> เพิ่มวิชา</Button>
              </div>
              <div className="space-y-3">
                 {subjects.map((sub, idx) => (
                    <div key={sub.id} className="flex gap-2 items-center">
                       <Input 
                         value={sub.name} 
                         onChange={(e: any) => {
                            const newSubs = [...subjects];
                            newSubs[idx].name = e.target.value;
                            setSubjects(newSubs);
                         }}
                         placeholder="ชื่อวิชา"
                       />
                       <div className="w-24">
                          <Input 
                            type="number" 
                            value={sub.maxScore} 
                            onChange={(e: any) => {
                                const newSubs = [...subjects];
                                newSubs[idx].maxScore = parseFloat(e.target.value);
                                setSubjects(newSubs);
                            }}
                            placeholder="Max"
                          />
                       </div>
                       <button onClick={() => setSubjects(subjects.filter(s => s.id !== sub.id))} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>
           </Card>

           <Card className="p-6 space-y-4">
              <h3 className="font-bold text-lg">การจัดลำดับ (Tie Breakers)</h3>
              <p className="text-sm text-gray-500">หากคะแนนรวมเท่ากัน ให้ดูคะแนนวิชาใดก่อน (เรียงลำดับ)</p>
              <div className="flex flex-wrap gap-2">
                 {tieBreakers.map((tid, idx) => {
                    const sub = subjects.find(s => s.id === tid);
                    return (
                       <div key={idx} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          {idx + 1}. {sub?.name || 'Unknown'}
                          <button onClick={() => setTieBreakers(tieBreakers.filter((_, i) => i !== idx))} className="hover:text-pink-900">&times;</button>
                       </div>
                    );
                 })}
              </div>
              <div className="flex gap-2 mt-2">
                 {subjects.filter(s => !tieBreakers.includes(s.id)).map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setTieBreakers([...tieBreakers, s.id])}
                      className="px-2 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-pink-500 hover:text-pink-500"
                    >
                       + {s.name}
                    </button>
                 ))}
              </div>
           </Card>

           <div className="flex justify-between pt-4">
              <Button variant="danger" onClick={handleDeleteProject}><Trash2 size={16}/> ลบโครงการ</Button>
              <Button onClick={handleSaveSettings}><Save size={16}/> บันทึกการตั้งค่า</Button>
           </div>
        </div>
      )}

      {/* Modals for Import */}
      <Modal isOpen={showImportStudent} onClose={() => setShowImportStudent(false)} title="นำเข้ารายชื่อนักเรียน">
         <div className="space-y-4">
            <p className="text-sm text-gray-500">วางข้อมูลจาก Excel (คัดลอกเฉพาะข้อมูลไม่เอาหัวตาราง): <br/>รูปแบบ: <code>ID13, เลขที่สอบ, คำนำหน้า, ชื่อ, สกุล, โรงเรียนเดิม</code></p>
            <textarea 
               className="w-full h-48 p-3 border rounded-lg font-mono text-xs bg-gray-50"
               placeholder={`1234567890123	001	ด.ช.	รักเรียน	เพียรศึกษา	อนุบาลพัทลุง\n...`}
               value={importText}
               onChange={e => setImportText(e.target.value)}
            ></textarea>
            <div className="flex justify-end">
               <Button onClick={handleImportStudents}>นำเข้าข้อมูล</Button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={showImportScores} onClose={() => setShowImportScores(false)} title="กรอกคะแนน (วางจาก Excel)">
         <div className="space-y-4">
            <p className="text-sm text-gray-500">
               รูปแบบ: <code>เลขที่สอบ(หรือเลขปชช), คะแนนวิชาที่ 1, คะแนนวิชาที่ 2, ...</code> (ตามลำดับวิชาที่ตั้งค่าไว้)
            </p>
            <div className="flex gap-2 text-xs text-pink-600 font-medium bg-pink-50 p-2 rounded">
               <span>ลำดับวิชา: </span>
               {project.subjects.map((s, i) => <span key={s.id}>{i+1}.{s.name} </span>)}
            </div>
            <textarea 
               className="w-full h-48 p-3 border rounded-lg font-mono text-xs bg-gray-50"
               placeholder={`001	80.5	92	45\n002	75	88	50`}
               value={importText}
               onChange={e => setImportText(e.target.value)}
            ></textarea>
            <div className="flex justify-end">
               <Button onClick={handleImportScores}>อัปเดตคะแนน</Button>
            </div>
         </div>
      </Modal>
      
      {/* Edit Single Student Modal */}
      <Modal isOpen={!!editStudent} onClose={() => setEditStudent(null)} title="แก้ไขข้อมูลนักเรียน">
         {editStudent && (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <Input label="ชื่อ" value={editStudent.firstName} onChange={(e:any) => setEditStudent({...editStudent, firstName: e.target.value})} />
                  <Input label="สกุล" value={editStudent.lastName} onChange={(e:any) => setEditStudent({...editStudent, lastName: e.target.value})} />
               </div>
               <Input label="โรงเรียนเดิม" value={editStudent.prevSchool} onChange={(e:any) => setEditStudent({...editStudent, prevSchool: e.target.value})} />
               <div className="border-t pt-4">
                  <p className="font-medium mb-2">คะแนน</p>
                  <div className="grid grid-cols-2 gap-4">
                     {project.subjects.map(s => (
                        <Input 
                           key={s.id}
                           label={s.name}
                           type="number"
                           value={editStudent.scores[s.id] || ''}
                           onChange={(e: any) => {
                              setEditStudent({
                                 ...editStudent,
                                 scores: { ...editStudent.scores, [s.id]: parseFloat(e.target.value) }
                              });
                           }}
                        />
                     ))}
                  </div>
               </div>
               <div className="flex justify-between pt-4">
                  <Button variant="danger" onClick={async () => {
                     if(!confirm('ลบนักเรียนคนนี้?')) return;
                     await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'registrations', editStudent.id));
                     setEditStudent(null);
                     fetchStudents();
                  }}>ลบ</Button>
                  <Button onClick={async () => {
                     await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'registrations', editStudent.id), {
                        firstName: editStudent.firstName,
                        lastName: editStudent.lastName,
                        prevSchool: editStudent.prevSchool,
                        scores: editStudent.scores
                     });
                     setEditStudent(null);
                     fetchStudents();
                  }}>บันทึก</Button>
               </div>
            </div>
         )}
      </Modal>

    </div>
  );
}

