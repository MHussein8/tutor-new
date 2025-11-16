// src/pages/CourseManagementPage.jsx (تم التعديل)

import React, { useState, useEffect } from 'react';
import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';
import Sidebar from '../components/Sidebar';
// 💡 استيراد المكون الجديد
import CreateCourseModal from '../components/CreateCourseModal'; 
import '../styles/TeacherDashboard.css'; 
import '../styles/CourseManagement.css'; 

const CourseManagementPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // 💡 هذه هي الحالة التي يتم التحكم بها في ظهور المودال
  const [showCreateModal, setShowCreateModal] = useState(false); 

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      // 💡 يتم تمرير `onSuccess` في المودال لاستدعاء هذه الدالة بعد إنشاء كورس جديد
      const coursesData = await courseService.getTeacherCourses();
      // تأكد من جلب بيانات الربط (مثل اسم المستوى والنوع)
      // قد تحتاج خدمة courseService.getTeacherCourses إلى جلبها باستخدام .select('*, grade_levels(name), group_types(name)')
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <div className="main-content">
        <div className="courses-management-container">
          {/* ... (الهيدر والأزرار كما هي) ... */}
          <div className="courses-header">
            <div className="header-main">
              <div className="header-content">
                <h1>إدارة الكورسات</h1>
                <p>إدارة الكورسات والطلاب المسجلين</p>
              </div>
              <div className="header-actions">
                <button 
                  className="btn-create-course"
                  // 💡 يتم تحديث الحالة هنا لفتح المودال
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
                <h3>{course.name}</h3>
                <p>{course.description}</p>
                
                <div className="course-meta">
                  {/* تأكد من أن الـ join يعمل في خدمة الكورسات */}
                  <span>المستوى: {course.grade_levels?.name || 'غير محدد'}</span>
                  <span>النوع: {course.group_types?.name || 'غير محدد'}</span>
                </div>

                {/* ... (بقية الأزرار) ... */}
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
      
      {/* ========================================== */}
      {/* 💡 إضافة المكون الناقص هنا في نهاية الـ return */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchCourses} // عند نجاح إنشاء الكورس، يتم إعادة جلب القائمة
      />
      {/* ========================================== */}
    </div>
  );
};

export default CourseManagementPage;