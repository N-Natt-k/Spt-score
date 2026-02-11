
import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthContext } from '../../App';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Project {
  id: string;
  name: string;
}

const StudentDashboardPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user || !user.projects) {
        setLoading(false);
        return;
      }
      try {
        const projectPromises = user.projects.map((projectId: string) => 
          getDoc(doc(db, 'projects', projectId))
        );
        const projectDocs = await Promise.all(projectPromises);
        const studentProjects = projectDocs
          .filter(doc => doc.exists())
          .map(doc => ({ id: doc.id, ...doc.data() } as Project));
        
        setProjects(studentProjects);
      } catch (error) {
        console.error("Error fetching student projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  if (loading) {
    return <div>กำลังโหลดข้อมูลโครงการ...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-dark mb-2">ยินดีต้อนรับ, {user?.name || 'นักเรียน'}</h1>
      <p className="text-lg text-gray-600 mb-8">เลือกโครงการเพื่อดูผลคะแนนของคุณ</p>
      
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Link 
              key={project.id} 
              to={`/student/project/${project.id}`}
              className="block p-6 bg-white rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-brand-primary mb-4 pr-4">{project.name}</h2>
                <div className="bg-brand-primary text-white rounded-full p-2">
                  <ArrowRight size={20} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">คลิกเพื่อดูรายละเอียดคะแนน</p>
            </Link>
          ))}
        </div>
      ) : (
        <p>คุณยังไม่ได้ลงทะเบียนในโครงการใดๆ</p>
      )}
    </div>
  );
};

export default StudentDashboardPage;
