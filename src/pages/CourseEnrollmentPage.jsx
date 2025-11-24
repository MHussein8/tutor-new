// src/pages/CourseEnrollmentPage.jsx (تم تصحيح أسماء كلاسات الليآوت)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom'; 
import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';
import { studentService } from '../services/studentService';
import Sidebar from '../components/Sidebar'; 
import AddStudentToCourseModal from '../components/AddStudentModal'; 
import '../styles/CourseManagement.css'; 
import '../styles/StudentsPage.css'; 
import '../styles/TeacherDashboard.css'; // تأكد من استيراد ملف التنسيقات العامة

const CourseEnrollmentPage = () => {
    const { courseId } = useParams(); 
    
    const [course, setCourse] = useState(null);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
    
    // ---------------------------------------------
    // 1. جلب بيانات الكورس والطلاب المسجلين
    // ---------------------------------------------
    const fetchEnrollmentData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const courseDetails = await courseService.getCourseDetails(courseId); 
            setCourse(courseDetails);
            
            const enrolled = await enrollmentService.getCourseStudents(courseId);
            setEnrolledStudents(enrolled);

            const allStudents = await studentService.getTeacherStudents(); 
            
            const enrolledIds = new Set(enrolled.map(e => e.students.id));
            const available = allStudents.filter(student => !enrolledIds.has(student.id));
            setAvailableStudents(available);

        } catch (err) {
            // الآن، سيظهر أي خطأ جلب في هذه الرسالة على الشاشة
            setError('❌ فشل في جلب بيانات التسجيل: ' + (err.message || 'خطأ غير معروف'));
            console.error('Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        if (courseId) {
            fetchEnrollmentData();
        }
    }, [courseId, fetchEnrollmentData]);
    
    // ---------------------------------------------
    // 2. وظائف الإدارة (الإضافة/الحذف/التعديل)
    // ---------------------------------------------
    
    const handleEnrollStudent = async (studentId, colorGroup) => {
        try {
            await enrollmentService.enrollStudent(courseId, studentId, colorGroup);
            setIsAddModalOpen(false); 
            await fetchEnrollmentData(); 
        } catch (err) {
            alert('❌ فشل إضافة الطالب: ' + (err.message || 'خطأ'));
        }
    };

    const handleRemoveStudent = async (enrollmentId, studentName) => {
        if (!window.confirm(`هل أنت متأكد من إزالة الطالب "${studentName}" من كورس ${course?.name}؟`)) {
            return;
        }
        try {
            await enrollmentService.removeStudentFromCourse(enrollmentId);
            await fetchEnrollmentData(); 
        } catch (err) {
            alert('❌ فشل إزالة الطالب: ' + (err.message || 'خطأ'));
        }
    };
    
    const handleChangeColorGroup = async (enrollmentId, newGroup, studentName) => {
        try {
            await enrollmentService.updateEnrollmentGroup(enrollmentId, newGroup);
            setEnrolledStudents(prev => 
                prev.map(enrollment => 
                    enrollment.id === enrollmentId ? { ...enrollment, color_group: newGroup } : enrollment
                )
            );
        } catch (err) {
            alert('❌ فشل تغيير المجموعة: ' + (err.message || 'خطأ'));
        }
    };
    
    // ---------------------------------------------
    // 3. العرض (تم تصحيح الليآوت)
    // ---------------------------------------------

    // تعريف colorGroups في النطاق الخارجي
    const colorGroups = course?.color_groups ? 
        (Array.isArray(course.color_groups) ? course.color_groups : JSON.parse(course.color_groups)) 
        : ['أحمر', 'أخضر', 'أزرق', 'أصفر'];

    // الهيكل لظهور رسائل الخطأ والتحميل
    if (!courseId) {
        return (
            <div className="dashboard-layout">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="error-message main-content">لم يتم تحديد رقم الكورس (Course ID) في الرابط.</div>
            </div>
        );
    }
    
    if (loading) {
        return (
            <div className="dashboard-layout">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="loading-spinner main-content">جاري تحميل بيانات الكورس...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-layout">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="error-message main-content">{error}</div>
            </div>
        );
    }

    // 🔑 الـ Return النهائي للصفحة بعد جلب البيانات
    return (
        // ✅ استخدام الكلاس الصحيح: dashboard-layout
        <div className="dashboard-layout"> 
            {/* الكلاس 'open' يتم إضافته في مكون Sidebar نفسه بواسطة isSidebarOpen */}
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            
            {/* ✅ استخدام الكلاس الصحيح: main-content */}
            {/* تم إزالة الكلاس الشرطي 'full-width' لأنه غير مدعوم في ملف CSS الخاص بك على سطح المكتب */}
            <div className="main-content">
                <div className="students-page-container">
                    <div className="dashboard-header"> {/* استخدام dashboard-header لتنسيق العنوان */}
                        <div>
                            <h1> إدارة طلاب كورس: {course?.name}</h1>
                            <p>المرحلة: {course?.grade_levels?.name || 'غير محدد'} | النوع: {course?.group_types?.name || 'غير محدد'}</p>
                        </div>
                        
                        <button 
                            className="btn-primary" 
                            onClick={() => {
                                if (availableStudents.length === 0) {
                                    alert('لا يوجد طلاب متاحون لإضافتهم إلى هذا الكورس (جميع طلابك مسجلون بالفعل أو لم تقم بإضافة طلاب بعد).');
                                    return;
                                }
                                setIsAddModalOpen(true);
                            }}
                        >
                            + إضافة طالب جديد للكورس
                        </button>
                    </div>
                    
                    {/* قائمة الطلاب المسجلين */}
                    <div className="student-list-panel">
                        <h3>الطلاب المسجلون حالياً ({enrolledStudents.length})</h3>
                        
                        {enrolledStudents.length === 0 ? (
                            <p className="empty-state">لا يوجد طلاب مسجلون حالياً في هذا الكورس.</p>
                        ) : (
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>اسم الطالب</th>
                                        <th>المرحلة</th>
                                        <th>نوع التعليم</th>
                                        <th>مجموعة اللون</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrolledStudents.map(enrollment => (
                                        <tr key={enrollment.id}>
                                            <td>{enrollment.students?.first_name} {enrollment.students?.last_name}</td>
                                            <td>{enrollment.students?.grade_levels?.name || '-'}</td>
                                            <td>{enrollment.students?.group_types?.name || '-'}</td>
                                            <td>
                                                <select
                                                    value={enrollment.color_group}
                                                    onChange={(e) => handleChangeColorGroup(enrollment.id, e.target.value, enrollment.students?.first_name)}
                                                >
                                                    {colorGroups.map(group => (
                                                        <option key={group} value={group}>{group}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-danger-small"
                                                    onClick={() => handleRemoveStudent(enrollment.id, enrollment.students?.first_name)}
                                                >
                                                    إزالة
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                
                {/* مودال إضافة طالب */}
                <AddStudentToCourseModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    availableStudents={availableStudents} 
                    colorGroups={colorGroups} 
                    onAdd={(studentId, colorGroup) => handleEnrollStudent(studentId, colorGroup)} 
                    modalTitle={`إضافة طالب إلى كورس: ${course?.name}`}
                />
            </div>
        </div>
    );
};

export default CourseEnrollmentPage;