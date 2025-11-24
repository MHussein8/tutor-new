import React, { useState, useEffect, useCallback } from 'react';
import '../styles/TeacherDashboard.css';

// استيراد المكونات
import StudentListPanel from '../components/StudentListPanel';
import Sidebar from '../components/Sidebar';
import DailyAssessmentForm from '../components/DailyAssessmentForm';
import CreateCourseModal from '../components/CreateCourseModal';

// استيراد الخدمات
import { 
    getCurrentTeacherId,
    getTeacherStats,
    getCurrentTeacher
} from '../services/teacherService';
import { courseService } from '../services/courseService';
import { studentService } from '../services/studentService';
import { enrollmentService } from '../services/enrollmentService';

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
    const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('students-list');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [studentCourses, setStudentCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [availableGradeLevels, setAvailableGradeLevels] = useState([]);
    const [availableGroupTypes, setAvailableGroupTypes] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [stats, setStats] = useState({ 
        totalStudents: 0, 
        averagePerformance: 0,
        weeklyAssessments: 0,
        weeklyClasses: 0
    });
    const [teacherId, setTeacherId] = useState(null);
    const [currentTeacher, setCurrentTeacher] = useState(null);

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

            // جلب بيانات المعلم الكاملة
            const teacherData = await getCurrentTeacher();
            setCurrentTeacher(teacherData);

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
            const [statsData, studentsData, courseOptions] = await Promise.all([
                getTeacherStats(),
                studentService.getTeacherStudents(),
                courseService.getTeacherCourseOptions()
            ]);
            
            // 3. معالجة البيانات وجلب التقييمات بشكل منفصل لضمان الاستقرار
            const studentPromises = (studentsData || []).map(async (student) => {
                let last_assessment_score = '---';
                let last_assessment_date = null;

                try {
                    const assessments = await studentService.getStudentDailyAssessments(student.id);
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
            alert(`حدث خطأ في تحميل البيانات: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    // جلب كورسات الطالب عند اختيار طالب للتقييم
    useEffect(() => {
        const fetchStudentCourses = async () => {
            if (selectedStudentId) {
                try {
                    console.log('🔍 جاري جلب كورسات الطالب:', selectedStudentId);
                    const courses = await enrollmentService.getStudentCourses(selectedStudentId);
                    console.log('📚 الكورسات التي تم جلبها:', courses);
                    setStudentCourses(courses);
                    if (courses.length > 0) {
                        setSelectedCourseId(courses[0].id);
                        console.log('✅ تم تعيين الكورس الافتراضي:', courses[0].id);
                    } else {
                        setSelectedCourseId('');
                        console.log('⚠️ الطالب غير مسجل في أي كورس');
                    }
                } catch (error) {
                    console.error('❌ Error fetching student courses:', error);
                    setStudentCourses([]);
                    setSelectedCourseId('');
                }
            }
        };
        fetchStudentCourses();
    }, [selectedStudentId]);

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
    <div className="welcome-section">
        <div className="welcome-text">
            <h1>مرحباً بك، {currentTeacher?.first_name} {currentTeacher?.last_name} 👋</h1>
            <p>نظام إدارة الفصل الدراسي - {currentTeacher?.subject || 'المادة'}</p>
        </div>
        <div className="header-stats">
            <span className="stat-item">📅 {new Date().toLocaleDateString('ar-EG')}</span>
            <span className="stat-item">📚 {courses.length} كورس</span>
            <span className="stat-item">👨‍🎓 {stats.totalStudents} طالب</span>
        </div>
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
                                <div className="student-assessment-section">
                                    {studentCourses.length > 0 && (
                                        <div className="course-filter-section" style={{ 
                                            marginBottom: '20px', 
                                            padding: '20px', 
                                            backgroundColor: '#e8f5e8', 
                                            borderRadius: '10px',
                                            border: '2px solid #28a745',
                                            boxShadow: '0 4px 12px rgba(40, 167, 69, 0.2)'
                                        }}>
                                            {studentCourses.length > 1 ? (
                                                <>
                                                    <label style={{ 
                                                        display: 'block', 
                                                        marginBottom: '12px', 
                                                        fontWeight: 'bold', 
                                                        fontSize: '18px',
                                                        color: '#155724'
                                                    }}>
                                                        🎯 اختر الكورس للتقييم:
                                                    </label>
                                                    <select 
                                                        value={selectedCourseId} 
                                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                                        style={{ 
                                                            padding: '12px 16px', 
                                                            borderRadius: '8px', 
                                                            border: '2px solid #28a745', 
                                                            width: '100%', 
                                                            maxWidth: '400px',
                                                            fontSize: '16px',
                                                            backgroundColor: 'white',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {studentCourses.map(course => (
                                                            <option key={course.id} value={course.id}>
                                                                {course.name} - {course.grade_levels?.name || 'غير محدد'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p style={{ marginTop: '12px', fontSize: '14px', color: '#155724', fontStyle: 'italic' }}>
                                                        📚 الطالب مسجل في {studentCourses.length} كورس
                                                    </p>
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    <p style={{ 
                                                        margin: 0, 
                                                        fontWeight: 'bold', 
                                                        fontSize: '18px',
                                                        color: '#155724'
                                                    }}>
                                                        📚 الكورس: <span style={{color: '#007bff'}}>{studentCourses[0].name}</span> - {studentCourses[0].grade_levels?.name || 'غير محدد'}
                                                    </p>
                                                    <p style={{ 
                                                        marginTop: '8px', 
                                                        fontSize: '14px', 
                                                        color: '#28a745',
                                                        fontWeight: '500'
                                                    }}>
                                                        ✓ الطالب مسجل في كورس واحد
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {studentCourses.length === 0 && (
                                        <div className="no-courses-warning" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                                            <p>⚠️ الطالب غير مسجل في أي كورس. الرجاء إضافته إلى كورس أولاً.</p>
                                        </div>
                                    )}
                                    
                                    <DailyAssessmentForm
                                        studentId={selectedStudentId} 
                                        selectedCourseId={selectedCourseId}
                                        onAssessmentCompleted={() => {
                                            setActiveTab('students-list');
                                            fetchDashboardData();
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            
            <CreateCourseModal
                isOpen={isCreateCourseModalOpen}
                onClose={() => setIsCreateCourseModalOpen(false)}
                onSuccess={fetchDashboardData} 
            />
        </div>
    );
};

export default TeacherDashboard;