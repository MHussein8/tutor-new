import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import '../styles/TeacherDashboard.css';

// استيراد المكونات
import StudentListPanel from '../components/StudentListPanel';
import Sidebar from '../components/Sidebar';
import AddStudentModal from '../components/AddStudentModal';
import DailyAssessmentForm from '../components/DailyAssessmentForm';
import CreateCourseModal from '../components/CreateCourseModal';

// استيراد الخدمات
import { 
    getCurrentTeacherId,
    getTeacherStats
} from '../services/teacherService';
import { courseService } from '../services/courseService';
import { studentService } from '../services/studentService';

// دالة مساعدة لمعالجة التقييمات (لم تتغير)
const processAssessmentData = (assessments) => {
    if (!assessments || assessments.length === 0) {
        return { last_assessment_score: '---', last_assessment_date: null };
    }

    try {
        const latestAssessment = assessments.reduce((latest, current) => {
            if (!latest || new Date(current.created_at) > new Date(latest.created_at)) {
                return current;
            }
            return latest;
        }, null);

        if (!latestAssessment) {
            return { last_assessment_score: '---', last_assessment_date: null };
        }

        let totalScore = 0;
        let totalMaxScore = 0;

        if (latestAssessment.daily_assessment_results) {
            latestAssessment.daily_assessment_results.forEach(result => {
                if (result?.field_snapshot?.field_type === 'number') {
                    const score = Number(result.score_value) || 0;
                    const max = Number(result.field_snapshot.max_score) || 0;
                    
                    if (!isNaN(score) && !isNaN(max)) {
                        totalScore += score;
                        totalMaxScore += max;
                    }
                }
            });
        }

        const scoreDisplay = totalMaxScore > 0 
            ? `${totalScore} / ${totalMaxScore}` 
            : (totalScore > 0 ? `${totalScore}` : 'مُسجّل');
            
        return {
            last_assessment_score: scoreDisplay,
            last_assessment_date: latestAssessment.created_at
        };
    } catch (error) {
        console.error('Error processing assessment data:', error);
        return { last_assessment_score: '---', last_assessment_date: null };
    }
};

const TeacherDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('students-list');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [availableGradeLevels, setAvailableGradeLevels] = useState([]); // 💡 جديد
const [availableGroupTypes, setAvailableGroupTypes] = useState([]); // 💡 جديد
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [stats, setStats] = useState({ 
        totalStudents: 0, 
        averagePerformance: 0,
        weeklyAssessments: 0,
        weeklyClasses: 0
    });
    const [teacherId, setTeacherId] = useState(null);

    // دالة جلب البيانات المصححة والآمنة
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const currentTeacherId = await getCurrentTeacherId();
            
            if (!currentTeacherId) {
                console.error('لا يمكن تحديد هوية المدرس');
                return;
            }

            setTeacherId(currentTeacherId);

            // 1. جلب الكورسات أولاً (للتأكد من وجود معلم)
            setLoadingCourses(true);
            const teacherCourses = await courseService.getTeacherCourses();
            setCourses(teacherCourses);
            setLoadingCourses(false);

            if (teacherCourses.length === 0) {
                setStudents([]);
                setStats(prev => ({ ...prev, totalStudents: 0 }));
                setLoading(false);
                return;
            }

// 2. جلب الإحصائيات والطلاب وخيارات الفلاتر المضيقة
            const [statsData, studentsData, courseOptions] = await Promise.all([ // 💡 تمت إضافة courseOptions
                getTeacherStats(),
                studentService.getTeacherStudents(),
                courseService.getTeacherCourseOptions() // 💡 استدعاء الدالة الجديدة
            ]);
            
            // 3. معالجة البيانات وجلب التقييمات بشكل منفصل لضمان الاستقرار
            const studentPromises = (studentsData || []).map(async (student) => {
                // جلب التقييمات بشكل منفصل (لتجنب أخطاء الاستعلام المعقدة)
                // ✅ هذه الخطوة تعيد بيانات التقييمات إلى لوحة التحكم
                let last_assessment_score = '---';
                let last_assessment_date = null;

                try {
                    const assessments = await studentService.getStudentDailyAssessments(student.id);
                    // معالجة بيانات التقييم
                    const assessmentResult = processAssessmentData(assessments);
                    last_assessment_score = assessmentResult.last_assessment_score;
                    last_assessment_date = assessmentResult.last_assessment_date;
                } catch (e) {
                    console.error(`Failed to fetch assessments for student ${student.id}:`, e);
                }

                return {
                    ...student,
                    last_assessment_score: last_assessment_score, 
                    last_assessment_date: last_assessment_date,
                };
            });

            const processedStudents = await Promise.all(studentPromises);


            // 4. تحديث الإحصائيات والقائمة
            setStats(prevStats => ({
                ...prevStats,
                ...(statsData || {})
            }));

            setStudents(processedStudents);
            setAvailableGradeLevels(courseOptions.gradeLevels); 
            setAvailableGroupTypes(courseOptions.groupTypes);
            

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // معالجة الأخطاء بشكل أفضل
            alert(`حدث خطأ في تحميل البيانات: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    // useEffect يبقى كما هو
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && event.state.tab === 'daily-input') {
                setActiveTab(event.state.tab);
                setSelectedStudentId(event.state.studentId || null);
            } else {
                setActiveTab('students-list');
                setSelectedStudentId(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleAddStudent = () => {
        setIsAddModalOpen(true);
    };

    if (loading || loadingCourses) {
        return (
            <div className="loading-page">
                <div className="spinner"></div>
                <p>جاري تحميل لوحة التحكم...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <Sidebar 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            
            <div className="main-content">
                {courses.length === 0 ? (
                    <div className="no-courses-placeholder">
                        <h3>🚫 لا يمكن عرض لوحة التحكم والإحصائيات</h3>
                        <p>⚠️ يجب عليك إنشاء كورسات أولاً في صفحة إدارة الكورسات.</p>
                        <button 
                            className="btn-primary" 
                            onClick={() => setIsCreateCourseModalOpen(true)}
                        >
                            اذهب لإنشاء كورس جديد
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="dashboard-header">
                            <h1>لوحة تحكم المعلم</h1>
                            <p>مرحباً بك في نظام إدارة الفصل الدراسي</p>
                            
                            <div className="header-actions">
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleAddStudent}
                                >
                                    + إضافة طالب جديد
                                </button>
                            </div>
                        </div>

                        <div className="dashboard-content">
{activeTab === 'students-list' && (
                                <StudentListPanel 
                                    stats={stats} 
                                    students={students} 
                                    fetchDashboardData={fetchDashboardData}
                                    teacherId={teacherId}
                                    availableGradeLevels={availableGradeLevels} 
                                    availableGroupTypes={availableGroupTypes}
                                    setActiveTab={setActiveTab} 
                                    setSelectedStudentId={setSelectedStudentId} 
                                />
                            )}
                            
                            {activeTab === 'daily-input' && selectedStudentId && (
                                <DailyAssessmentForm
                                    studentId={selectedStudentId} 
                                    onAssessmentCompleted={() => {
                                        setActiveTab('students-list');
                                        fetchDashboardData();
                                    }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
            
            <AddStudentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onStudentAdded={fetchDashboardData}
            />
            {/* مودال إنشاء الكورس الجديد */}
            <CreateCourseModal
                isOpen={isCreateCourseModalOpen}
                onClose={() => setIsCreateCourseModalOpen(false)}
                // عند نجاح الإنشاء، يتم تحديث لوحة التحكم تلقائياً
                onSuccess={fetchDashboardData} 
            />
        </div>
    );
};

export default TeacherDashboard;