// DailyAssessmentPage.jsx
import React, { useState, useEffect } from 'react';
import DailyAssessmentForm from '../components/DailyAssessmentForm';
import { getCurrentTeacherId } from '../services/teacherService';
import { courseService } from '../services/courseService';
import Sidebar from '../components/Sidebar';
import AssessmentConfigModal from '../components/AssessmentConfigModal';
import { RiSettingsLine } from 'react-icons/ri'; 
import '../styles/TeacherDashboard.css';
import '../styles/DailyAssessmentPage.css';

const DailyAssessmentPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [formReloadKey, setFormReloadKey] = useState(0); 
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  useEffect(() => {
     const fetchCourses = async () => {
      try {
        // 🚨 ملاحظة: تم التأكد من أن getCurrentTeacherId يتم استخدامها مع await في ملف courseService.js
        // المشكلة هنا يجب أن تكون في أن دالة getTeacherCourses كانت مكسورة
        const teacherId = await getCurrentTeacherId();
        if (teacherId) {
          const teacherCourses = await courseService.getTeacherCourses();
          setCourses(teacherCourses);
          
          if (teacherCourses.length > 0) {
          setSelectedCourseId(teacherCourses[0].id);
        }
      }
      } catch (error) {
      console.error('Error fetching courses:', error);
      }
     };

     fetchCourses();
  }, []);

  const handleConfigChange = () => {
     // إعادة تحميل نموذج التقييم بعد تغيير الإعدادات
     setFormReloadKey(prevKey => prevKey + 1);
  };

  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
     // 🎯 تم التصحيح: يجب تحديث المفتاح لإعادة تحميل DailyAssessmentForm
     setFormReloadKey(prevKey => prevKey + 1); 
  };
  
  return (
     <div className="dashboard-layout">
       <Sidebar activeTab="daily-assessment" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
     
       <div className="main-content">
        {courses.length === 0 ? (
         <div className="no-courses-placeholder">
            <h3>🚫 لا يمكن إجراء تقييم يومي</h3>
            <p>⚠️ يجب عليك إنشاء كورسات أولاً في صفحة إدارة الكورسات.</p>
            <p>لا يوجد لديك أي كورسات حتى الآن لإجراء تقييم لطلابها.</p>
            <button 
              className="btn-primary" 
              onClick={() => window.location.href = '/teacher/courses'} 
             >
              اذهب لإنشاء كورس جديد
              </button>
             </div>
             ) : (
             <div className="daily-assessment-page-header">
             <div className="header-content">
             <div className="header-text">
              <h1>صفحة التقييم اليومي</h1>
              <p>قيم طلابك بعد الحصة مباشرة</p>
               </div>

               <div className="header-controls">
                <div className="course-filter">
                  <label>الكورس:</label>
                  <select 
                   value={selectedCourseId} 
                    onChange={handleCourseChange}
                    className="course-select"
                   >
                    <option value="">-- اختر الكورس --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                       {course.name} - {course.grade_levels?.name || 'غير محدد'}
                       </option>
                     ))}
                     </select>
                   </div>

                   <button 
                   onClick={() => setIsConfigModalOpen(true)} 
                   className="assessment-config-btn"
                   title="إعداد عناصر التقييم"
                 >
                   <RiSettingsLine /> إعداد العناصر
                   </button>
                 </div>
               </div>
             </div>
           )}
                  
         {courses.length > 0 && selectedCourseId ? (
         <DailyAssessmentForm 
           key={formReloadKey}
           getCurrentTeacherId={getCurrentTeacherId} 
            selectedCourseId={selectedCourseId}
         />
         ) : courses.length > 0 ? (
          <div className="no-course-selected">
          <h3>⚠️ يرجى اختيار كورس أولاً</h3>
          <p>اختر كورس من القائمة المنسدلة لعرض طلابه وإجراء التقييم</p>
        </div>
       ) : null}
      </div>

      <AssessmentConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigChange={handleConfigChange}
       />
     </div>
  );
};

export default DailyAssessmentPage;