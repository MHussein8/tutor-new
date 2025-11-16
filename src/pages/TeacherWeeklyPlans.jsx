// src/pages/TeacherWeeklyPlans.jsx

import React, { useState, useEffect } from 'react';
import WeeklyPlanInput from '../components/WeeklyPlanInput';
import WeeklyPlanArchive from '../components/WeeklyPlanArchive';
import Sidebar from '../components/Sidebar';
// 🎯 تم استيراد الدوال من Services بدلاً من محاولة جلبها يدوياً
import { getCurrentTeacherId } from '../services/teacherService'; 
import { courseService } from '../services/courseService'; 
// لم نعد نحتاج لـ supabase هنا لأننا نستخدم الخدمات

const TeacherWeeklyPlans = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [teacherId, setTeacherId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      try {
        // 1. جلب معرف المعلم باستخدام الدالة الجاهزة
        const id = await getCurrentTeacherId();
        
        if (id) {
          setTeacherId(id);
          
          // 2. جلب الكورسات باستخدام خدمة الكورسات (Course Service)
          const teacherCourses = await courseService.getTeacherCourses();
          
          // 3. تحديث حالة الكورسات واختيار الكورس الأول افتراضياً
          setCourses(teacherCourses.map(c => ({ id: c.id, name: c.name })));
          
          if (teacherCourses.length > 0) {
            setSelectedCourse(teacherCourses[0].id);
          }
        } else {
            console.warn("Teacher ID not found. User might not be logged in or linked to a teacher profile.");
        }
      } catch (error) {
        console.error("Error during page initialization:", error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []); 

  const goToArchiveTab = () => {
    setActiveTab('archive');
  };
  
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        direction: 'rtl'
      }}>
        <div>جاري تحميل بيانات الخطط الأسبوعية...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        // يمكنك هنا إضافة activeTab="weekly-plans" إذا كان لديك شريط جانبي يدعم ذلك
      />
      
      <div className="main-content" style={{ direction: 'rtl' }}>
        {/* شريط التنقل */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          marginBottom: '20px', 
          padding: '20px', 
          background: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <button 
            onClick={() => handleTabChange('input')} 
            style={{ 
              padding: '12px 24px', 
              background: activeTab === 'input' ? '#667eea' : '#f5f5f5', 
              color: activeTab === 'input' ? 'white' : 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1em',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            📝 إدخال خطة جديدة
          </button>
          <button 
            onClick={() => handleTabChange('archive')} 
            style={{ 
              padding: '12px 24px', 
              background: activeTab === 'archive' ? '#00b894' : '#f5f5f5', 
              color: activeTab === 'archive' ? 'white' : 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1em',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            🗃️ الأرشيف والمراجعة
          </button>
        </div>

        {/* محتوى التبويبات */}
        <div style={{ padding: '0 20px' }}>
            {/* عرض رسالة إذا لم يكن هناك كورسات */}
            {courses.length === 0 && !loading && teacherId && (
                 <div className="no-courses-placeholder">
                    <h3>⚠️ لا يمكن إنشاء خطة أسبوعية</h3>
                    <p>يجب عليك إنشاء كورسات أولاً في صفحة إدارة الكورسات.</p>
                </div>
            )}
            
            {activeTab === 'input' && courses.length > 0 && (
            <WeeklyPlanInput 
              teacherId={teacherId} 
              courses={courses} // 🎯 تمرير الكورسات إلى الكومبوننت الفرعي
              onGoToArchive={goToArchiveTab}
              selectedCourse={selectedCourse}
              onCourseChange={setSelectedCourse}
            />
            )} 
            {activeTab === 'archive' && courses.length > 0 && (
            <WeeklyPlanArchive 
              teacherId={teacherId} 
              courses={courses} // 🎯 تمرير الكورسات إلى الكومبوننت الفرعي
              selectedCourse={selectedCourse}
              onCourseChange={setSelectedCourse}
            />
            )}
        </div>
      </div>
    </div>
  );
};

export default TeacherWeeklyPlans;