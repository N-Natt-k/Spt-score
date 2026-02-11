
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Settings, Users, ArrowRight } from 'lucide-react';
import { app } from '../../firebase';
import { getFirestore, collection, getDocs, getCountFromServer } from 'firebase/firestore';

const db = getFirestore(app);

interface Project {
  id: string;
  name: string;
  studentCount: number;
  subjectsCount: number;
  isVisible: boolean;
}

const AdminDashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsCollection = collection(db, 'projects');
        const projectSnapshot = await getDocs(projectsCollection);
        
        const projectsData = await Promise.all(projectSnapshot.docs.map(async (doc) => {
          const project = { id: doc.id, ...doc.data() };
          
          // Get student count from subcollection
          const scoresCollection = collection(db, 'projects', doc.id, 'scores');
          const snapshot = await getCountFromServer(scoresCollection);
          const studentCount = snapshot.data().count;

          return {
            id: project.id,
            name: project.name,
            studentCount: studentCount,
            subjectsCount: project.subjects?.length || 0,
            isVisible: project.isVisible || false,
          };
        }));

        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div>กำลังโหลดโครงการ...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark">จัดการโครงการ</h1>
          <p className="text-lg text-gray-600">เพิ่ม แก้ไข และดูภาพรวมโครงการทั้งหมด</p>
        </div>
        <button className="flex items-center space-x-2 px-5 py-3 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-opacity-90 transition-colors duration-200 shadow-sm">
          <PlusCircle size={20} />
          <span>เพิ่มโครงการใหม่</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col">
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-brand-primary">{project.name}</h2>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${project.isVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {project.isVisible ? 'แสดงผล' : 'ซ่อน'}
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Users size={16} />
                  <span>{project.studentCount} คน</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings size={16} />
                  <span>{project.subjectsCount} วิชา</span>
                </div>
              </div>
            </div>
            <Link 
              to={`/admin/project/${project.id}`}
              className="flex items-center justify-center space-x-2 p-4 bg-gray-50 hover:bg-gray-100 text-brand-primary font-semibold transition-colors duration-200"
            >
              <span>จัดการโครงการ</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
