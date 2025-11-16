// LessonsManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import { courseService } from '../services/courseService';
import Sidebar from '../components/Sidebar';
import { lessonService } from '../services/lessonService';
import AddLessonModal from '../components/AddLessonModal';
import '../styles/LessonsManagement.css';
import '../styles/TeacherDashboard.css';

const LessonsManagementPage = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [courses, setCourses] = useState([]);
  const [availableEducationTypes, setAvailableEducationTypes] = useState([]); 
  const [availableGradeLevels, setAvailableGradeLevels] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedEducationType, setSelectedEducationType] = useState('all');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    fetchLessons();
    fetchCourses();
    fetchCourseOptions();
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [selectedCourse, selectedEducationType, selectedGradeLevel]);

const fetchCourses = async () => {
    setLoadingCourses(true); // ابدأ التحميل
    try {
      const coursesData = await courseService.getTeacherCourses();
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoadingCourses(false); // انتهى التحميل
    }
   };

const fetchCourseOptions = async () => {
    try {
      const courseOptions = await courseService.getTeacherCourseOptions();
      
      setAvailableEducationTypes(courseOptions.groupTypes || []);
      setAvailableGradeLevels(courseOptions.gradeLevels || []);
    } catch (error) {
      console.error('Error fetching course options for filters:', error);
    }
  };

  const fetchLessons = async () => {
    try {
      const currentTeacherId = await getCurrentTeacherId();
      if (!currentTeacherId) {
        console.error('لا يمكن تحديد هوية المدرس');
        return;
      }

      let query = supabase
        .from('lessons')
        .select(`
          id,
          title,
          content,
          lesson_date,
          start_time,
          end_time,
          education_type_id,
          grade_level_id,
          course_id,
          group_types (name),
          grade_levels (name),
          courses (name)
        `)
        .eq('teacher_id', currentTeacherId);

      if (selectedCourse) {
        query = query.eq('course_id', selectedCourse);
      }

      if (selectedEducationType !== 'all') {
        query = query.eq('education_type_id', selectedEducationType);
      }

      if (selectedGradeLevel !== 'all') {
        query = query.eq('grade_level_id', selectedGradeLevel);
      }

      query = query.order('lesson_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;

    try {
      // 1. جلب رابط الملف
      const { data: lesson } = await supabase
        .from('lessons')
        .select('assessment_file_url')
        .eq('id', lessonId)
        .single();

      // 2. استدعاء دالة الخدمة لحذف الملف والسجل
      // (دالة الخدمة بها المنطق الأمني)
      await lessonService.deleteLesson(lessonId, lesson?.assessment_file_url);

      alert('تم حذف الحصة والملف المرتبط بنجاح');
      fetchLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('حدث خطأ أثناء حذف الحصة: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredLessons = lessons.filter(lesson => 
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.content && lesson.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalLessons = lessons.length;

  const weeklyLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.lesson_date);
    const today = new Date();
    
    const dayOfWeek = today.getDay();
    
    const startOfWeek = new Date(today);
    const daysToStart = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    startOfWeek.setDate(today.getDate() - daysToStart);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return lessonDate >= startOfWeek && lessonDate <= endOfWeek;
  }).length;
  
  const todayLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.lesson_date);
    const today = new Date();
    return lessonDate.toDateString() === today.toDateString();
  }).length;

  if (loading || loadingCourses) {
    return (
      <div className="dashboard-layout">
        <Sidebar activeTab="classes" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري تحميل الحصص...</p>
          </div>
        </div>
      </div>
    );
  }

return (
    <div className="dashboard-layout">
      <Sidebar activeTab="classes" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="main-content">
        {courses.length === 0 ? (
          <div className="no-courses-placeholder">
            <h3>🚫 لا يمكن إدارة الحصص</h3>
            <p>⚠️ يجب عليك إنشاء كورسات أولاً في صفحة إدارة الكورسات.</p>
            <p>لا يمكنك إضافة أو عرض الحصص بدون ربطها بكورس محدد.</p>
            <button 
              className="btn-primary" 
              onClick={() => window.location.href = '/teacher/courses'} 
            >
              اذهب لإنشاء كورس جديد
            </button>
          </div>
        ) : (
          <div className="lessons-page-container">
  {/* الهيدر */}
  <div className="lessons-management-header">
    <div className="header-main">
      <div className="header-content">
        <h1>إدارة الحصص</h1>
        <p>تنظيم ومتابعة جميع الحصص الدراسية</p>
      </div>
      <div className="header-actions">
        <button className="btn btn-add-lesson" onClick={() => setIsAddModalOpen(true)}>
          + إضافة حصة
        </button>
      </div>
    </div>
  </div>
  
  {/* إحصائيات الحصص */}
  <div className="dashboard-cards lessons-stats-grid">
    <div className="dashboard-card stat-total">
      <div className="card-content">
        <h3>إجمالي الحصص</h3>
        <span className="count">{totalLessons}</span>
      </div>
    </div>
    
    <div className="dashboard-card stat-weekly">
      <div className="card-content">
        <h3>الحصص هذا الأسبوع</h3>
        <span className="count">{weeklyLessons}</span>
      </div>
    </div>
    
    <div className="dashboard-card stat-today">
      <div className="card-content">
        <h3>الحصص اليوم</h3>
        <span className="count">{todayLessons}</span>
      </div>
    </div>
  </div>

  {/* الفلاتر - في مكانها الطبيعي */}
  <div className="filters-section">
<div className="filters-container">
  {/* مجموعة البحث منفصلة */}
  <div className="search-filter-group">
    <div className="search-box">
      <input
        type="text"
        placeholder="بحث عن حصة..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <span>🔍</span>
    </div>
  </div>

  {/* باقي الفلاتر */}
  <div className="filter-group">
    <select 
      value={selectedCourse} 
      onChange={(e) => setSelectedCourse(e.target.value)}
      className="filter-select"
    >
      <option value="">اختر الكورس</option>
      {courses.map(course => (
        <option key={course.id} value={course.id}>
          {course.name}
        </option>
      ))}
    </select>
  </div>

      <div className="filter-group">
        <select 
          value={selectedEducationType} 
          onChange={(e) => setSelectedEducationType(e.target.value)}
          className="filter-select"
        >
          <option value="all">كل أنواع التعليم</option>
          {availableEducationTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <select 
          value={selectedGradeLevel} 
          onChange={(e) => setSelectedGradeLevel(e.target.value)}
          className="filter-select"
        >
          <option value="all">كل المستويات</option>
          {availableGradeLevels.map(grade => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <button 
          className="btn btn-clear-filters"
          onClick={() => {
            setSelectedCourse('all');
            setSelectedEducationType('all');
            setSelectedGradeLevel('all');
            setSearchTerm('');
          }}
        >
          مسح الفلاتر
        </button>
      </div>
    </div>
  </div>

  {/* قائمة الحصص */}
  <div className="lessons-list-section">
    <div className="section-header">
      <h2>قائمة الحصص</h2>
      <span className="lesson-count-badge">{filteredLessons.length} حصة</span>
    </div>
    
    {filteredLessons.length === 0 ? (
      <div className="empty-state-lessons">
        <h3>لا توجد حصص مسجلة</h3>
        <p>ابدأ بإضافة أول حصة لك الآن.</p>
      </div>
    ) : (
      <div className="lessons-table-container">
        <table className="lessons-table">
          <thead>
            <tr>
              <th>عنوان الحصة</th>
              <th>المحتوى</th>
              <th>نوع التعليم</th>
              <th>الكورس</th>
              <th>المستوى</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredLessons.map(lesson => (
              <tr key={lesson.id}>
                <td data-label="عنوان الحصة">{lesson.title}</td>
                <td data-label="المحتوى">{lesson.content || 'لا يوجد'}</td>
                <td data-label="نوع التعليم">{lesson.group_types?.name || 'غير معروف'}</td>
                <td data-label="الكورس">{lesson.courses?.name || 'غير محدد'}</td>
                <td data-label="المستوى">{lesson.grade_levels?.name || 'غير معروف'}</td>
                <td data-label="التاريخ">{formatDate(lesson.lesson_date)}</td>
                <td data-label="الوقت">{`${lesson.start_time.slice(0, 5)} - ${lesson.end_time.slice(0, 5)}`}</td>
                <td data-label="الإجراءات">
                  <div className="lesson-actions">
                    <button className="action-btn-small" title="تعديل" onClick={() => {
                      setEditingLesson(lesson);
                      setIsAddModalOpen(true);
                    }}>
                      ✏️
                    </button>
                    <button className="action-btn-small btn-delete" title="حذف" onClick={() => handleDeleteLesson(lesson.id)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
)}
        <AddLessonModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingLesson(null);
          }}
          onLessonAdded={() => {
            fetchLessons();
            setEditingLesson(null);
          }}
          lesson={editingLesson}
        />
      </div>
    </div>
  );
};

export default LessonsManagementPage;