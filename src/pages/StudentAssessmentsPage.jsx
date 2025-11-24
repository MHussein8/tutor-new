// pages/StudentAssessmentsPage.jsx (الكود النهائي بعد التعديلات)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
// يجب التأكد من تعديل دالة getStudentAssessmentHistory في هذا الملف
import { getCurrentTeacherId, getStudentAssessmentHistory } from '../services/teacherService'; 
import Sidebar from '../components/Sidebar';
import '../styles/TeacherDashboard.css';
import '../styles/DailyAssessmentReportPage.css';

const StudentAssessmentsPage = () => {
    const { studentId } = useParams();
    const [student, setStudent] = useState(null);
    const [assessments, setAssessments] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
    
    // 🔑 حالات جديدة للتعامل مع نظام الكورسات
    const [availableCourses, setAvailableCourses] = useState([]); 
    const [selectedCourseId, setSelectedCourseId] = useState(null); 
    const [availableLessons, setAvailableLessons] = useState([]); 
    const [selectedLessonId, setSelectedLessonId] = useState(null); 
    const [teacherId, setTeacherId] = useState(null); 

    // معالج لتغيير حجم الشاشة (بدون تغيير)
    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth > 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 🔑 الدالة الرئيسية لجلب بيانات الطالب والكورسات
    useEffect(() => {
        const fetchStudentDataAndCourses = async () => {
            setLoading(true);
            try {
                const currentTeacherId = await getCurrentTeacherId();
                if (!currentTeacherId) {
                    console.error('لا يمكن تحديد هوية المدرس');
                    return;
                }
                setTeacherId(currentTeacherId);

                // 1. جلب بيانات الطالب وكافة كورساته مع المعلم الحالي
                const { data: studentCoursesData, error: coursesError } = await supabase
                    .from('students')
                    .select(`
                        id, first_name, last_name,
                        course_enrollments!inner(
                            courses!inner(
                                id, name, teacher_id
                            )
                        )
                    `)
                    .eq('id', studentId)
                    .eq('course_enrollments.courses.teacher_id', currentTeacherId);
                
                if (coursesError) throw coursesError;

                const studentData = studentCoursesData?.[0];

                if (!studentData) {
                    throw new Error('الطالب غير موجود أو غير مسجل في أي كورس خاص بك.');
                }
                
                // تنظيف وجلب قائمة الكورسات
                const coursesList = studentData.course_enrollments.map(e => e.courses);
                const { course_enrollments, ...cleanStudentData } = studentData;
                
                setStudent(cleanStudentData);
                setAvailableCourses(coursesList);

                // 2. تحديد الكورس الافتراضي (الأول في القائمة)
                const initialCourseId = coursesList.length > 0 ? coursesList[0].id : null;
                setSelectedCourseId(initialCourseId); 

            } catch (error) {
                console.error('Error fetching student data and courses:', error.message);
                setAssessments([]);
                setStudent(null);
            } finally {
                // إبقاء التحميل هنا False مؤقتًا، سيتم تحديثه في الـ useEffect الخاص بالتقييمات
            }
        };

        if (studentId) {
            fetchStudentDataAndCourses();
        }
    }, [studentId]);

    // 🔑 جلب الحصص عند تغيير الكورس
    useEffect(() => {
        const fetchLessons = async () => {
            if (!selectedCourseId || !teacherId) {
                setAvailableLessons([]);
                setSelectedLessonId(null);
                return;
            }
            
            try {
                // جلب الحصص المرتبطة بالكورس المحدد
                const { data, error } = await supabase
                    .from('lessons')
                    .select('id, title, lesson_date')
                    .eq('course_id', selectedCourseId)
                    .eq('teacher_id', teacherId) 
                    .order('lesson_date', { ascending: false });
                
                if (error) throw error;
                
                setAvailableLessons(data);
                // تعيين الحصة الافتراضية لأول حصة في القائمة
                setSelectedLessonId(data.length > 0 ? data[0].id : null);
            } catch (error) {
                console.error('Error fetching lessons:', error.message);
                setAvailableLessons([]);
                setSelectedLessonId(null);
            }
        };

        fetchLessons();
    }, [selectedCourseId, teacherId]);

    // 🔑 جلب وتحديث التقييمات عند تغيير الكورس (هذه هي النقطة الحاسمة للحل)
    useEffect(() => {
        const updateAssessments = async () => {
            if (!selectedCourseId || !teacherId) {
                setAssessments([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // 🚨 استخدام courseId في استدعاء الخدمة
                const history = await getStudentAssessmentHistory(studentId, teacherId, selectedCourseId);
                setAssessments(history);

            } catch (error) {
                console.error('Error fetching assessments history:', error.message);
                setAssessments([]);
            } finally {
                setLoading(false);
            }
        };
        
        // جلب البيانات فقط إذا كان studentId و teacherId و selectedCourseId متاحين
        if (studentId && teacherId) { 
            updateAssessments();
        }
    }, [studentId, teacherId, selectedCourseId]); // 🚨 التبعيات: يتم تشغيلها عند تغيير الكورس أو الطالب

    // دالة مساعدة لتنسيق التاريخ
    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'غير محدد';
        return new Date(dateString).toLocaleDateString('ar-EG', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }, []);

    return (
        <div className="dashboard-layout">
            <Sidebar 
                activeTab="students" 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            
            <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
                <div className="daily-assessment-report-page-container">
                    <div className="page-header">
                        {loading && !student ? (
                            <h1>جاري التحميل...</h1>
                        ) : student ? (
                            <>
                                <h1>سجل تقييمات الطالب: {student.first_name} {student.last_name}</h1>
                                <p>هنا تجد جميع التقييمات اليومية الخاصة بهذا الطالب **في الكورس المختار**.</p>
                            </>
                        ) : (
                            <h1>الطالب غير موجود أو غير مسموح بالوصول</h1>
                        )}
                    </div>
                    
                    {/* 🔑 فلاتر الكورسات والحصص */}
                    {student && !loading && availableCourses.length > 0 && (
                        <div className="filters-for-assessments">
                            {/* اختيار الكورس */}
                            <div className="filter-group">
                                <label>اختر الكورس لعرض سجل التقييمات:</label>
                                <select 
                                    value={selectedCourseId || ''}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                    className="filter-select"
                                >
                                    {availableCourses.map(course => (
                                        <option key={course.id} value={course.id}>{course.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* اختيار الحصة للتقييم الجديد (يمكن توسيعه لاحقاً لصفحة إدخال التقييم) */}
                            {selectedCourseId && (
                                <div className="filter-group">
                                    <label>اختر الحصة (لإدخال تقييم جديد):</label>
                                    <select 
                                        value={selectedLessonId || ''}
                                        onChange={(e) => setSelectedLessonId(e.target.value)}
                                        className="filter-select"
                                    >
                                        {availableLessons.length > 0 ? (
                                            availableLessons.map(lesson => (
                                                <option key={lesson.id} value={lesson.id}>
                                                    {lesson.title} ({formatDate(lesson.lesson_date)})
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>لا توجد حصص متاحة في هذا الكورس</option>
                                        )}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <p className="loading-message">جاري تحميل التقييمات...</p>
                    ) : (
                        // حالة عدم وجود كورسات
                        availableCourses.length === 0 ? (
                            <p className="no-data-message">الطالب غير مسجل في أي كورسات خاصة بك.</p>
                        ) : (
                            // عرض التقييمات
                            assessments.length > 0 ? (
                                <div className="assessments-grid">
                                    {assessments.map(assessment => {
                                        const { totalScore, totalMax } = assessment;
                                        
                                        return (
                                            <div className="assessment-card" key={assessment.id}>
                                                <div className="card-header">
                                                    <div className="assessment-title-group">
                                                        <h3 className="course-name-header">
                                                            الكورس: {assessment.courseName || 'غير محدد'}
                                                        </h3>
                                                        <span className="lesson-title-header">
                                                            الدرس: {assessment.lessonTitle || 'بدون عنوان'}
                                                        </span>
                                                    </div>
                                                    <span className="total-score-header">المجموع: {totalScore}/{totalMax}</span>
                                                </div>
                                                <div className="card-body">
                                                    {assessment.results.map((result, index) => {
                                                        const hasScore = result.scoreValue !== null && result.scoreValue !== undefined;
                                                        
                                                        if (hasScore) {
                                                            return (
                                                                <div key={index} className="score-item">
                                                                    <span className="score-label">
                                                                        {result.fieldName}:
                                                                    </span>
                                                                    <span className="score-value">
                                                                        {result.fieldType === 'number' 
                                                                            ? `${result.scoreValue}/${result.maxScore}` 
                                                                            : result.scoreValue}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>

                                                <div className="card-footer">
                                                    <p className="teacher-notes-display">
                                                        ملاحظات المعلم: {assessment.teacherNotes || 'لا توجد ملاحظات.'}
                                                    </p>
                                                    <span className="assessment-date">
                                                        التاريخ: {formatDate(assessment.lessonDate)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="no-data-message">
                                    لا توجد تقييمات مسجلة لهذا الطالب في كورس **{availableCourses.find(c => c.id === selectedCourseId)?.name}** بعد.
                                </p>
                            )
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAssessmentsPage;