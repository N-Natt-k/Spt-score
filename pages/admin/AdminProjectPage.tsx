
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronsLeft, Edit, Trash2, UserPlus, Upload, Download, Eye, EyeOff, ClipboardPaste, ListOrdered, BarChartHorizontalBig } from 'lucide-react';
import { app } from '../../firebase';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const db = getFirestore(app);

interface Student {
    id: string;
    examId: string;
    prefix: string;
    firstName: string;
    lastName: string;
    school: string;
}

const AdminProjectPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) return;
            try {
                // Fetch project details
                const projectDoc = await getDoc(doc(db, 'projects', projectId));
                if (projectDoc.exists()) {
                    setProject({ id: projectDoc.id, ...projectDoc.data() });
                }

                // Fetch students in the project
                const scoresCollection = collection(db, 'projects', projectId, 'scores');
                const scoresSnapshot = await getDocs(scoresCollection);
                const studentsData = scoresSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
                setStudents(studentsData);

            } catch (error) {
                console.error("Error fetching project page data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    const [isPublished, setIsPublished] = useState(project?.isVisible || false);

    useEffect(() => {
        setIsPublished(project?.isVisible || false);
    }, [project]);


    const actionButtons = [
        { icon: UserPlus, label: 'เพิ่มนักเรียน' },
        { icon: Upload, label: 'เพิ่มนักเรียน (CSV)' },
        { icon: Upload, label: 'เพิ่มคะแนน (CSV)' },
        { icon: ClipboardPaste, label: 'กรอกคะแนน' },
        { icon: ListOrdered, label: 'ส่งออกลำดับ (CSV)' },
        { icon: Download, label: 'ส่งออกข้อมูล (CSV)' },
        { icon: BarChartHorizontalBig, label: 'ดูสถิติ' },
        { icon: Trash2, label: 'ลบโครงการ', isDestructive: true },
    ];

    if (loading) {
        return <div>กำลังโหลดข้อมูล...</div>;
    }
    
    if (!project) {
        return <div>ไม่พบโครงการ</div>;
    }

    return (
        <div>
            <Link to="/admin/dashboard" className="inline-flex items-center text-brand-primary hover:underline mb-6">
                <ChevronsLeft size={18} className="mr-1" />
                กลับไปหน้าจัดการโครงการ
            </Link>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-brand-dark">{project.name}</h1>
                    <p className="text-gray-600 mt-1">จัดการข้อมูลนักเรียนและคะแนนสำหรับโครงการ ID: {projectId}</p>
                </div>
                <button 
                    onClick={() => setIsPublished(!isPublished)}
                    className={`mt-4 md:mt-0 flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        isPublished 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                >
                    {isPublished ? <Eye size={18} /> : <EyeOff size={18} />}
                    <span>{isPublished ? 'แสดงผลให้นักเรียน' : 'ซ่อนจากนักเรียน'}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                {actionButtons.map(btn => (
                    <button key={btn.label} className={`flex flex-col items-center justify-center text-center p-3 rounded-lg transition-colors text-sm font-medium ${
                        btn.isDestructive 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                        <btn.icon size={24} className="mb-1.5"/>
                        <span>{btn.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <div className="p-4 border-b">
                    <input type="text" placeholder="ค้นหารายชื่อนักเรียน..." className="w-full md:w-1/3 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เลขประจำตัวสอบ</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-สกุล</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียนเดิม</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">แก้ไข</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.examId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{`${student.prefix}${student.firstName} ${student.lastName}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.school}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-brand-primary hover:text-brand-dark p-1 rounded-md hover:bg-blue-100">
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t text-sm text-gray-600">
                    แสดง {students.length} จาก {students.length} รายการ
                </div>
            </div>
        </div>
    );
};

export default AdminProjectPage;
