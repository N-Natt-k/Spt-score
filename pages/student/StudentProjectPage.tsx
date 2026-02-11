
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, BarChart2, TrendingUp, User as UserIcon, ChevronsLeft, Target, Star, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { db } from '../../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { AuthContext } from '../../App';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
    <div className={`flex items-center p-4 bg-white rounded-xl shadow-soft`}>
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const StudentProjectPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { user } = useContext(AuthContext);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId || !user) return;

            try {
                // 1. Fetch project details
                const projectDoc = await getDoc(doc(db, 'projects', projectId));
                if (!projectDoc.exists()) {
                    throw new Error("Project not found");
                }
                const projectData = { id: projectDoc.id, ...projectDoc.data() };

                // 2. Fetch all scores for the project to calculate stats
                const scoresCollection = collection(db, 'projects', projectId, 'scores');
                const scoresSnapshot = await getDocs(scoresCollection);
                const allScores = scoresSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. Find the current student's score
                const studentScoreData = allScores.find(s => s.id === user.uid);
                if (!studentScoreData) {
                    throw new Error("Student score not found for this project");
                }
                
                // 4. Calculate stats
                const totalParticipants = allScores.length;
                const totalScores = allScores.map(s => s.totalScore);
                const highestScore = Math.max(...totalScores);
                const rank = allScores.filter(s => s.totalScore > studentScoreData.totalScore).length + 1;

                const subjects = projectData.subjects.map((subj: any) => {
                    const subjectScores = allScores.map(s => s.scores[subj.name] || 0);
                    const studentSubjScore = studentScoreData.scores[subj.name] || 0;
                    const highest = Math.max(...subjectScores);
                    const average = subjectScores.reduce((a, b) => a + b, 0) / totalParticipants;
                    const subjectRank = allScores.filter(s => (s.scores[subj.name] || 0) > studentSubjScore).length + 1;
                    const percentile = ((totalParticipants - subjectRank) / totalParticipants) * 100;
                    
                    return {
                        name: subj.name,
                        score: studentSubjScore,
                        maxScore: subj.maxScore,
                        average: average.toFixed(2),
                        highest,
                        percentile: percentile.toFixed(2),
                        rank: subjectRank,
                        total: totalParticipants,
                    };
                });
                
                setData({
                    projectName: projectData.name,
                    examId: studentScoreData.examId,
                    totalScore: studentScoreData.totalScore,
                    maxTotalScore: projectData.subjects.reduce((sum: number, s: any) => sum + s.maxScore, 0),
                    rank,
                    totalParticipants,
                    highestScore,
                    studentName: user.name,
                    studentSchool: user.school,
                    subjects,
                });

            } catch (error) {
                console.error("Error fetching project data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, user]);

    if (loading) {
        return <div>กำลังโหลดข้อมูลคะแนน...</div>;
    }
    if (!data) {
        return <div>ไม่พบข้อมูลโครงการ หรือคุณไม่ได้เข้าร่วมโครงการนี้</div>;
    }

    const chartData = data.subjects.map((s:any) => ({ name: s.name, YourScore: s.score, Average: parseFloat(s.average), Highest: s.highest }));

    return (
        <div>
            <Link to="/student/dashboard" className="inline-flex items-center text-brand-primary hover:underline mb-6">
                <ChevronsLeft size={18} className="mr-1" />
                กลับไปหน้าหลัก
            </Link>
            
            <h1 className="text-3xl font-extrabold text-brand-dark mb-4">{data.projectName}</h1>
            
            <div className="p-6 bg-white rounded-2xl shadow-soft-lg mb-8">
                <div className="flex items-center space-x-4 border-b pb-4 mb-4">
                    <UserIcon size={40} className="text-brand-primary"/>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{data.studentName}</h2>
                        <p className="text-gray-600">โรงเรียน: {data.studentSchool} | เลขประจำตัวผู้เข้าสอบ: {data.examId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<Target size={24} />} label="คะแนนรวม" value={`${data.totalScore}/${data.maxTotalScore}`} color="bg-blue-100 text-blue-600" />
                    <StatCard icon={<Award size={24} />} label="Ranking" value={`#${data.rank}/${data.totalParticipants}`} color="bg-green-100 text-green-600" />
                    <StatCard icon={<Star size={24} />} label="คะแนนสูงสุด" value={`${data.highestScore}`} color="bg-yellow-100 text-yellow-600" />
                    <StatCard icon={<TrendingUp size={24} />} label="เปอร์เซ็นไทล์รวม" value={`P${((1 - data.rank / data.totalParticipants) * 100).toFixed(2)}`} color="bg-purple-100 text-purple-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-brand-dark flex items-center"><BookOpen size={24} className="mr-2"/>คะแนนรายวิชา</h3>
                    {data.subjects.map((subject: any) => (
                        <div key={subject.name} className="p-5 bg-white rounded-xl shadow-soft">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-lg font-bold text-brand-primary">{subject.name}</h4>
                                <span className="text-lg font-bold text-gray-700">{subject.score}<span className="text-sm text-gray-500">/{subject.maxScore}</span></span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${(subject.score / subject.maxScore) * 100}%` }}></div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-3 text-sm">
                                <div><p className="text-gray-500">ร้อยละ</p><p className="font-semibold">{((subject.score / subject.maxScore) * 100).toFixed(2)}%</p></div>
                                <div><p className="text-gray-500">ค่าเฉลี่ย</p><p className="font-semibold">{subject.average}</p></div>
                                <div><p className="text-gray-500">สูงสุด</p><p className="font-semibold">{subject.highest}</p></div>
                                <div><p className="text-gray-500">Ranking</p><p className="font-semibold">#{subject.rank}/{subject.total}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div>
                     <h3 className="text-2xl font-bold text-brand-dark mb-4 flex items-center"><BarChart2 size={24} className="mr-2"/>สถิติเปรียบเทียบ</h3>
                     <div className="p-4 bg-white rounded-xl shadow-soft h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip wrapperClassName="rounded-md shadow-lg" />
                                <Bar dataKey="YourScore" name="คะแนนของคุณ">
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#005B96" />
                                  ))}
                                </Bar>
                                <Bar dataKey="Average" name="ค่าเฉลี่ย" fill="#64C5B1" />
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProjectPage;
