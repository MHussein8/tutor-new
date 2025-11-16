// DailyAssessmentReportPage.jsx (الكود المُعدَّل)
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import Sidebar from '../components/Sidebar';
import '../styles/TeacherDashboard.css';
import '../styles/DailyAssessmentReportPage.css';

const DailyAssessmentReportPage = () => {
    const [lessons, setLessons] = useState([]);
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const [dailyAssessments, setDailyAssessments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [stats, setStats] = useState({
        totalStudents: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0
    });

    const resetStats = useCallback(() => {
        setStats({
            totalStudents: 0,
            averageScore: 0,
            maxScore: 0,
            minScore: 0
        });
    }, []);

    const processAssessmentsAndCalculateStats = useCallback((rawAssessments) => {
        if (!rawAssessments || rawAssessments.length === 0) {
            resetStats();
            return [];
        }

        let overallTotalScore = 0;
        let overallTotalMaxScore = 0;
        const allStudentScores = [];

        const processedAssessments = rawAssessments.map(assessment => {
            let totalScore = 0;
            let totalMax = 0;

            const results = assessment.daily_assessment_results.map(result => {
                const snapshot = result.field_snapshot;
                const numericScore = Number(result.score_value);

                if (snapshot.field_type === 'number' && snapshot.max_score > 0) {
                    totalScore += numericScore;
                    totalMax += snapshot.max_score;
                }

                return {
                    fieldName: snapshot.field_name,
                    scoreValue: result.score_value,
                    maxScore: snapshot.max_score,
                    fieldType: snapshot.field_type,
                };
            });

            overallTotalScore += totalScore;
            overallTotalMaxScore += totalMax;
            allStudentScores.push(totalScore);

            return {
                ...assessment,
                totalScore,
                totalMax,
                results,
            };
        });

        const averagePercentage = overallTotalMaxScore > 0
            ? Math.round((overallTotalScore / overallTotalMaxScore) * 100)
            : 0;

        const minScore = allStudentScores.length > 0 ? Math.min(...allStudentScores) : 0;
        const maxScore = allStudentScores.length > 0 ? Math.max(...allStudentScores) : 0;

        setStats({
            totalStudents: processedAssessments.length,
            averageScore: averagePercentage,
            maxScore: maxScore,
            minScore: minScore
        });

        return processedAssessments;
    }, [resetStats]);
    
    // دالة جلب الحصص (تم الإبقاء عليها كما هي، وهي صحيحة في فلترة الكورسات)
    const fetchLessons = useCallback(async () => {
        try {
            const teacherId = await getCurrentTeacherId();
            if (!teacherId) return;

            let query = supabase
                .from('lessons')
                .select(`
                    id, 
                    title, 
                    lesson_date,
                    group_types (name),
                    grade_levels (name)
                `)
                .eq('teacher_id', teacherId);

            if (selectedCourseId) {
                query = query.eq('course_id', selectedCourseId);
            }

            query = query.order('lesson_date', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            setLessons(data || []);
            
            // إعادة تعيين selectedLessonId عند تغيير الكورس
            if (selectedLessonId && !data.find(l => l.id.toString() === selectedLessonId.toString())) {
                setSelectedLessonId('');
            } else if (selectedLessonId === '' && data.length > 0) {
                // إذا لم يكن هناك حصة مختارة، يمكن اختيار أول حصة بشكل افتراضي إذا أردت
                // setSelectedLessonId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching lessons:', error.message);
        }
    }, [selectedCourseId, selectedLessonId]);

    useEffect(() => {
        fetchLessons();
    }, [fetchLessons]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const teacherId = await getCurrentTeacherId();
                if (!teacherId) return;

                const { data, error } = await supabase
                    .from('courses')
                    .select('id, name')
                    .eq('teacher_id', teacherId);

                if (error) throw error;
                setCourses(data || []);
            } catch (error) {
                console.error('Error fetching courses:', error.message);
            }
        };

        fetchCourses();
    }, []);

    // دالة جلب التقييمات اليومية (تم إزالة الفلتر الزائد لـ course_id)
    const fetchDailyAssessments = useCallback(async () => {
        setLoading(true);
        try {
            const teacherId = await getCurrentTeacherId();
            if (!teacherId) return;

            const { data: rawData, error } = await supabase
                .from('daily_assessments')
                .select(`
                    id, teacher_id, lesson_id, teacher_notes, student_id,
                    students (id, first_name, last_name),
                    daily_assessment_results (score_value, field_snapshot)
                `)
                .eq('lesson_id', selectedLessonId)
                .eq('teacher_id', teacherId);
            
            // *** تم إزالة الشرط if (selectedCourseId) { query = query.eq('course_id', selectedCourseId); } ***
            // الاعتماد فقط على lesson_id الذي تم فلترته مسبقاً بناءً على الكورس المُختار

            if (error) throw error;
            
            const processedData = processAssessmentsAndCalculateStats(rawData || []);
            setDailyAssessments(processedData);
        } catch (error) {
            console.error('Error fetching daily assessments:', error.message);
            setDailyAssessments([]);
            resetStats();
        } finally {
            setLoading(false);
        }
    }, [selectedLessonId, processAssessmentsAndCalculateStats, resetStats]); // تم إزالة selectedCourseId من dependencies

    useEffect(() => {
        if (selectedLessonId) {
            fetchDailyAssessments();
        } else {
            setDailyAssessments([]);
            resetStats();
        }
    }, [selectedLessonId, fetchDailyAssessments, resetStats]);

    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth > 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const exportToPDF = useCallback(() => {
        alert('سيتم تنفيذ وظيفة التصدير إلى PDF في المستقبل');
    }, []);

    const getLessonDisplayText = (lesson) => {
        const date = new Date(lesson.lesson_date).toLocaleDateString('ar-EG', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const educationType = lesson.group_types?.name || 'غير محدد';
        const gradeLevel = lesson.grade_levels?.name || 'غير محدد';
        
        return `${date} - ${educationType} - ${gradeLevel}`;
    };

    const selectedLesson = lessons.find(lesson => lesson.id.toString() === selectedLessonId.toString());

    return (
        <div className="dashboard-layout">
            <Sidebar 
                activeTab="assessments" 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            
            <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
                <div className="daily-assessment-report-page-container improved-design">
                    <div className="page-header daily-assessment-header">
                        <div className="header-content">
                            <h1>تقييمات الحصص</h1>
                            <p>راجع أداء الطلاب في كل حصة بالتفصيل</p>
                        </div>
                        {selectedLessonId && dailyAssessments.length > 0 && (
                            <button className="export-btn" onClick={exportToPDF}>
                                📄 تصدير التقرير
                            </button>
                        )}
                    </div>
                    
                    <div className="controls-section improved-controls">
                        <div className="control-group">
                            <label htmlFor="course-select">اختر الكورس:</label>
                            <select 
                                id="course-select"
                                value={selectedCourseId} 
                                onChange={(e) => {
                                    setSelectedCourseId(e.target.value);
                                    setSelectedLessonId(''); // إعادة تعيين الحصة عند تغيير الكورس
                                }}
                                className="improved-select"
                            >
                                <option value="">-- كل الكورسات --</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="control-group">
                            <label htmlFor="lesson-select">اختر الحصة:</label>
                            <select 
                                id="lesson-select"
                                value={selectedLessonId} 
                                onChange={(e) => setSelectedLessonId(e.target.value)}
                                className="improved-select"
                            >
                                <option value="">-- اختر حصة --</option>
                                {lessons.map(lesson => (
                                    <option key={lesson.id} value={lesson.id}>
                                        {getLessonDisplayText(lesson)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedLesson && (
                        <div className="lesson-summary-info improved-summary">
                            <h2>تفاصيل الحصة</h2>
                            <div className="lesson-details-grid">
                                <div className="lesson-detail">
                                    <strong>التاريخ:</strong> 
                                    {new Date(selectedLesson.lesson_date).toLocaleDateString('ar-EG', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </div>
                                <div className="lesson-detail">
                                    <strong>نوع التعليم:</strong> 
                                    {selectedLesson.group_types?.name || 'غير محدد'}
                                </div>
                                <div className="lesson-detail">
                                    <strong>المرحلة الدراسية:</strong> 
                                    {selectedLesson.grade_levels?.name || 'غير محدد'}
                                </div>
                                {selectedLesson.title && (
                                    <div className="lesson-detail">
                                        <strong>عنوان الحصة:</strong> {selectedLesson.title}
                                    </div>
                                )}
                            </div>
                            
                            {dailyAssessments.length > 0 && (
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-icon">👥</div>
                                        <div className="stat-info">
                                            <div className="stat-value">{stats.totalStudents}</div>
                                            <div className="stat-label">عدد الطلاب المقيمين</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">📊</div>
                                        <div className="stat-info">
                                            <div className="stat-value">{stats.averageScore}%</div>
                                            <div className="stat-label">متوسط نسبة الأداء</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">⭐</div>
                                        <div className="stat-info">
                                            <div className="stat-value">{stats.maxScore}</div>
                                            <div className="stat-label">أعلى درجة للطالب</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">📉</div>
                                        <div className="stat-info">
                                            <div className="stat-value">{stats.minScore}</div>
                                            <div className="stat-label">أقل درجة للطالب</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p className="loading-message">جاري تحميل تقييمات الطلاب...</p>
                        </div>
                    ) : (
                        selectedLessonId && dailyAssessments.length > 0 ? (
                            <div className="assessments-grid improved-grid">
                                {dailyAssessments.map(assessment => {
                                    const { totalScore, totalMax } = assessment;
                                    
                                    const performancePercentage = totalMax > 0 
                                        ? (totalScore / totalMax) * 100 
                                        : 0;

                                    const performanceLevel = performancePercentage >= 80 ? 'excellent' : 
                                        performancePercentage >= 60 ? 'good' : 
                                        performancePercentage >= 40 ? 'average' : 'weak';

                                    return (
                                        <div className={`assessment-card improved-card ${performanceLevel}`} key={assessment.id}>
                                            <div className="card-header improved-card-header">
                                                <div className="student-info">
                                                    <div className="student-avatar">
                                                        {assessment.students?.first_name?.[0]}{assessment.students?.last_name?.[0]}
                                                    </div>
                                                    <span className="student-name">
                                                        {assessment.students?.first_name} {assessment.students?.last_name}
                                                    </span>
                                                </div>
                                                <span className={`total-score ${performanceLevel}`}>
                                                    {totalScore}/{totalMax}
                                                </span>
                                            </div>
                                            <div className="card-body improved-card-body">
                                                <div className="scores-grid improved-grid">
                                                    {assessment.results
                                                         .filter(result => result.scoreValue !== null && result.scoreValue !== undefined)
                                                         .map((result, index) => {
                                                             const score = result.scoreValue;
                                                             const maxScore = result.maxScore;
                                                             const percentage = result.fieldType === 'number' && maxScore > 0 ? (Number(score) / maxScore) * 100 : 0;
                                                             
                                                             const displayScore = result.fieldType === 'number' ? `${score}/${maxScore}` : score;

                                                             return (
                                                                 <div key={index} className="score-item improved">
                                                                     <span className="score-label">
                                                                         {result.fieldName}
                                                                     </span>
                                                                     {result.fieldType === 'number' && (
                                                                         <div className="score-bar-container">
                                                                             <div 
                                                                                 className="score-bar" 
                                                                                 style={{width: `${percentage}%`}}
                                                                             ></div>
                                                                         </div>
                                                                     )}
                                                                     <span className="score-value">
                                                                         {displayScore}
                                                                     </span>
                                                                 </div>
                                                             );
                                                         })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            selectedLessonId && !loading ? (
                                <div className="no-data-container">
                                    <div className="no-data-icon">📊</div>
                                    <p className="no-data-message">لا توجد تقييمات لهذه الحصة بعد.</p>
                                </div>
                            ) : (
                                <div className="no-data-container">
                                    <div className="no-data-icon">📋</div>
                                    <p className="no-data-message">يرجى اختيار كورس ثم حصة لعرض تقارير التقييم اليومي.</p>
                                </div>
                            )
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailyAssessmentReportPage;