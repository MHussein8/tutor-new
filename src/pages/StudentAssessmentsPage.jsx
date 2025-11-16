// pages/StudentAssessmentsPage.jsx (الكود المعدل)

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
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

    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth > 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchStudentAssessments = async () => {
            setLoading(true);
            try {
                const currentTeacherId = await getCurrentTeacherId();
                if (!currentTeacherId) {
                    console.error('لا يمكن تحديد هوية المدرس');
                    return;
                }

                // 1. جلب بيانات الطالب والتأكد من أنه مسجل في كورس للمعلم (Course-Centric Check)
                const { data: studentDataArray, error: studentError } = await supabase
                    .from('students')
                    .select('first_name, last_name, course_enrollments!inner(course_id!inner(teacher_id))')
                    .eq('id', studentId)
                    .eq('course_enrollments.course_id.teacher_id', currentTeacherId); 
                    // ملاحظة: نستخدم eq() على الربط الداخلي للتحقق من الملكية

                if (studentError) throw studentError;
                
                // بما أن الـ Join قد يعيد صفوفاً متعددة إذا كان الطالب في أكثر من كورس، نأخذ الصف الأول
                const studentData = studentDataArray?.[0];
                
                if (!studentData) {
                    throw new Error('الطالب غير موجود أو غير مسجل في أي كورس خاص بك.');
                }
                
                // إزالة بيانات الربط الزائدة قبل تخزينها في الـ State
                const { course_enrollments, ...cleanStudentData } = studentData;
                setStudent(cleanStudentData);

                // 2. جلب الكورس الذي سنفلتر عليه التقييمات
                // (نستخدم الكورس الأول الذي تم ربطه كمرجع)
                const courseId = course_enrollments?.[0]?.course_id || null; 

                // 3. جلب التقييمات عبر الدالة الجديدة (المتطابقة مع النهج الجديد)
                const history = await getStudentAssessmentHistory(studentId, currentTeacherId, courseId);

                setAssessments(history);
            } catch (error) {
                console.error('Error fetching student assessments:', error.message);
                setAssessments([]);
                setStudent(null);
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchStudentAssessments();
        }
    }, [studentId]);

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
                        {loading ? (
                            <h1>جاري التحميل...</h1>
                        ) : student ? (
                            <>
                                <h1>سجل تقييمات الطالب: {student.first_name} {student.last_name}</h1>
                                <p>هنا تجد جميع التقييمات اليومية الخاصة بهذا الطالب.</p>
                            </>
                        ) : (
                            <h1>الطالب غير موجود أو غير مسموح بالوصول</h1>
                        )}
                    </div>
                    
                    {loading ? (
                        <p className="loading-message">جاري تحميل التقييمات...</p>
                    ) : assessments.length > 0 ? (
                        <div className="assessments-grid">
                            {assessments.map(assessment => {
                                // استخدام البيانات المحسوبة مباشرة
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
                                                التاريخ: {assessment.lessonDate
                                                    ? new Date(assessment.lessonDate).toLocaleDateString('ar-EG', { 
                                                          year: 'numeric', 
                                                          month: 'long', 
                                                          day: 'numeric' 
                                                      })
                                                    : 'غير محدد'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="no-data-message">لا توجد تقييمات مسجلة لهذا الطالب بعد.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAssessmentsPage;