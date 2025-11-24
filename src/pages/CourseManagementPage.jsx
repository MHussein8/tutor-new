// src/pages/CourseManagementPage.jsx (الكود النهائي والمعدل)

import React, { useState, useEffect } from 'react';
import { courseService } from '../services/courseService';
// ⚠️ تم حذف استيراد enrollmentService لأنه غير مستخدم بشكل مباشر هنا، لتجنب التحذير
import Sidebar from '../components/Sidebar';
// 💡 استيراد المكون الجديد
import CreateCourseModal from '../components/CreateCourseModal'; 
import EditCourseModal from '../components/EditCourseModal';
import '../styles/TeacherDashboard.css'; 
import '../styles/CourseManagement.css'; 

const CourseManagementPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // 💡 هذه هي الحالة التي يتم التحكم بها في ظهور المودال
  const [showCreateModal, setShowCreateModal] = useState(false); 
  const [showEditModal, setShowEditModal] = useState(false); 
  const [selectedCourse, setSelectedCourse] = useState(null);
  // ✅ إضافة حالة الخطأ الجديدة هنا
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null); // مسح أي خطأ سابق
    try {
      // 💡 يتم تمرير `onSuccess` في المودال لاستدعاء هذه الدالة بعد إنشاء كورس جديد
      const coursesData = await courseService.getTeacherCourses();
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      // ✅ تخزين رسالة الخطأ لعرضها على الشاشة
      setError('❌ فشل جلب الكورسات: ' + (error.message || 'خطأ غير معروف'));
      setCourses([]); // تفريغ القائمة لضمان عرض رسالة الخطأ
    } finally {
      setLoading(false);
    }
  };
  
  // ==========================================
  // 💡 وظائف الإدارة الجديدة (حذف وتعديل)
  // ==========================================

  // دالة معالجة حذف الكورس
  const handleDeleteCourse = async (courseId, courseName) => {
    // 1. طلب التأكيد من المستخدم قبل الحذف النهائي
    const isConfirmed = window.confirm(
      `هل أنت متأكد من حذف الكورس "${courseName}"؟ سيتم حذف جميع بيانات التسجيل المرتبطة به بشكل دائم.`
    );

    if (!isConfirmed) return;

    try {
      setLoading(true);
      // يجب أن تكون courseService.deleteCourse موجودة في ملف الخدمة وتم تطويرها
      await courseService.deleteCourse(courseId); 
      alert(`تم حذف الكورس "${courseName}" بنجاح.`);
      // إعادة جلب القائمة بعد الحذف
      fetchCourses(); 
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(`فشل حذف الكورس: ${error.message}`);
      setLoading(false);
    }
  };
  
// دالة معالجة التعديل (لفتح المودال وتمرير البيانات)
  const handleEditCourse = (course) => {
      setSelectedCourse(course); // تخزين الكورس بالكامل
      setShowEditModal(true);    // فتح مودال التعديل
  };


  if (loading) {
    return <div>جاري التحميل...</div>;
  }
  
  // ✅ حالة عرض الخطأ - إذا ظهرت هذه الرسالة، قم بنسخ محتواها وإرساله لي
  if (error) {
    return (
        <div className="dashboard-layout">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="main-content">
                <div className="error-message" style={{ margin: '50px', padding: '20px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <h2>عفواً، حدث خطأ أثناء جلب الكورسات</h2>
                    <p style={{ fontWeight: 'bold' }}>{error}</p>
                    <p>هذا الخطأ يعني فشل الاتصال بقاعدة البيانات أو مشكلة في سياسات الأمان (RLS).</p>
                    <button className="btn-create-course" onClick={fetchCourses} style={{ marginTop: '15px' }}>إعادة المحاولة</button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <div className="main-content">
        <div className="courses-management-container">
          
          <div className="courses-header">
            <div className="header-main">
              <div className="header-content">
                <h1>إدارة الكورسات</h1>
                <p>إدارة الكورسات والطلاب المسجلين</p>
              </div>
              <div className="header-actions">
                <button 
                  className="btn-create-course"
                  onClick={() => setShowCreateModal(true)}
                >
                  + إنشاء كورس جديد
                </button>
              </div>
            </div>
          </div>

          {/* شبكة الكورسات */}
          <div className="courses-grid">
            {courses.map(course => (
              <div key={course.id} className="course-card">
                
                <div className="card-top-content"> 
                    {/* تم تغليف المحتوى ليتوافق مع تنسيق CSS الجديد الذي يفصل الأزرار */}
                    <h3>{course.name}</h3>
                    <p className="course-description">{course.description}</p>
                    
                    <div className="course-meta">
                        <span>المستوى: {course.grade_levels?.name || 'غير محدد'}</span>
                        <span>النوع: {course.group_types?.name || 'غير محدد'}</span>
                        
                        {/* ✅ استخدام course.course_enrollments?.[0]?.count لعرض العداد */}
                        <span className="student-count">
                            الطلاب: {course.course_enrollments?.[0]?.count || 0}
                        </span>
                    </div>
                </div>
                
                {/* 💡 أزرار ووظائف الإدارة */}
                <div className="course-actions">
                  
                  {/* زر التعديل */}
                  <button
                    className="btn-action btn-edit-course"
                    onClick={() => handleEditCourse(course)}
                  >
                    تعديل
                  </button>
                  
                  {/* رابط إدارة الطلاب */}
                  <a 
                    href={`/dashboard/course-enrollment/${course.id}`} // يجب ربط هذا المسار في React Router
                    className="btn-action btn-enrollment" 
                  >
                      إدارة الطلاب
                  </a>
                  
                  {/* زر الحذف */}
                  <button
                    className="btn-action btn-delete-course"
                    onClick={() => handleDeleteCourse(course.id, course.name)}
                    disabled={loading}
                  >
                    حذف
                  </button>
                </div>
                {/* ========================================== */}
              </div>
            ))}
          </div>

          {/* حالة عدم وجود كورسات */}
          {courses.length === 0 && (
            <div className="empty-courses">
              <h3>لا توجد كورسات حالياً</h3>
              <p>ابدأ بإنشاء أول كورس لك الآن</p>
            </div>
          )}
        </div>
        
      </div>
      
      {/* المودال في نهاية الـ return */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchCourses} 
      />
      {/* مودال تعديل الكورس الجديد */}
      <EditCourseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        course={selectedCourse}   
        onSuccess={fetchCourses} 
      />
      
    </div>
  );
};

export default CourseManagementPage;