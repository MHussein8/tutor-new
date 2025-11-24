import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import Sidebar from '../components/Sidebar';
import AddStudentModal from '../components/AddStudentModal';
import AddParentModal from '../components/AddParentModal';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/courseService';
import '../styles/TeacherDashboard.css';
import '../styles/StudentsPage.css';

const StudentsPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroupType, setFilterGroupType] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [availableGradeLevels, setAvailableGradeLevels] = useState([]); 
  const [availableGroupTypes, setAvailableGroupTypes] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);

  // ✅ دالة حساب الأداء
  const calculateStudentPerformance = (dailyAssessments) => {
    if (!dailyAssessments || dailyAssessments.length === 0) {
      return 'لا يوجد';
    }

    let totalPercentage = 0;
    let validAssessmentsCount = 0;

    dailyAssessments.forEach(assessment => {
      if (assessment.daily_assessment_results && assessment.daily_assessment_results.length > 0) {
        let totalScore = 0;
        let totalMaxScore = 0;

        assessment.daily_assessment_results.forEach(result => {
          if (result.field_snapshot?.field_type === 'number') {
            const score = Number(result.score_value) || 0;
            const max = Number(result.field_snapshot.max_score) || 0;
            
            if (!isNaN(score) && !isNaN(max) && max > 0) {
              totalScore += score;
              totalMaxScore += max;
            }
          }
        });

        if (totalMaxScore > 0) {
          const percentage = (totalScore / totalMaxScore) * 100;
          totalPercentage += percentage;
          validAssessmentsCount++;
        }
      }
    });

    if (validAssessmentsCount === 0) return 'لا يوجد';
    
    const average = totalPercentage / validAssessmentsCount;
    return `${average.toFixed(1)}%`;
  };

  useEffect(() => {
    fetchCourseOptions();
    fetchCourses();
  }, []);

  const fetchCourseOptions = async () => {
    try {
      const courseOptions = await courseService.getTeacherCourseOptions();
      
      setAvailableGroupTypes(courseOptions.groupTypes || []);
      setAvailableGradeLevels(courseOptions.gradeLevels || []);
    } catch (error) {
      console.error('Error fetching course options for filters:', error);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const coursesData = await courseService.getTeacherCourses();
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
     } finally {
      setLoadingCourses(false);
    }
  };

  // ⭐️ تم دمج دالة fetchStudents داخل useEffect لتجنب تحذيرات الاعتمادات ⭐️
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        const currentTeacherId = await getCurrentTeacherId();
        if (!currentTeacherId) {
          console.error('لا يمكن تحديد هوية المدرس');
          return;
        }

        let studentsData;
        
        if (!selectedCourse || selectedCourse === '') {
          setStudents([]);
          setLoading(false);
          return;
        } else {
          const { data, error } = await supabase
            .from('course_enrollments')
            .select(`
              student_id,
              color_group,
              students!inner(
                *,
                grade_levels(*),
                group_types(*),
                daily_assessments(
                  *,
                  daily_assessment_results(score_value, field_snapshot)
                )
              )
            `)
            .eq('course_id', selectedCourse)
            .order('color_group');
          
          if (error) throw error;
          studentsData = (data || []).map(item => ({
            ...item.students,
            color_group: item.color_group
          }));
        }

        setStudents(studentsData);

      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedCourse]); // ✅ الاعتماد الوحيد هو selectedCourse

  const handleDeleteStudent = async (studentId) => {
    const confirmDelete = window.confirm("هل أنت متأكد من حذف هذا الطالب؟ سيتم حذف جميع تقييماته أيضًا.");
    if (!confirmDelete) return;

    try {
      // 1. حذف نتائج التقييمات
      const { error: resultsError } = await supabase
        .from('daily_assessment_results')
        .delete()
        .in('assessment_id', 
          supabase
            .from('daily_assessments')
            .select('id')
            .eq('student_id', studentId)
        );

      if (resultsError) throw resultsError;

      // 2. حذف التقييمات
      const { error: assessmentsError } = await supabase
        .from('daily_assessments')
        .delete()
        .eq('student_id', studentId);

      if (assessmentsError) throw assessmentsError;

      // 3. حذف الطالب
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (studentError) throw studentError;

      // تحديث قائمة الطلاب بعد الحذف
      setStudents(prevStudents => prevStudents.filter(student => student.id !== studentId));
      alert('تم حذف الطالب وجميع تقييماته بنجاح.');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('حدث خطأ أثناء حذف الطالب: ' + error.message);
    }
  };

  const handleStudentAdded = (newStudent) => {
    setStudents(prevStudents => [newStudent, ...prevStudents]);
  };

  const filteredStudents = students.filter(student => {
    const nameMatch = `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const groupTypeMatch = filterGroupType === '' || 
      student.group_types?.name === filterGroupType;
    
    const gradeLevelMatch = filterGradeLevel === '' || 
      student.grade_levels?.name === filterGradeLevel;
    
    return nameMatch && groupTypeMatch && gradeLevelMatch;
  });

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab="students" 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
        <div className="students-page-container">
          <div className="dashboard-header-with-btn">
            <h1>قائمة الطلاب</h1>
            <div className="actions-group">
              <button 
                className="btn btn-primary" 
                onClick={() => setIsAddParentModalOpen(true)}
              >
                <i className="fas fa-user-plus"></i> إضافة ولي أمر
              </button>
              <button 
                className="btn-add-student" 
                onClick={() => setIsModalOpen(true)}
              >
                + إضافة طالب جديد
              </button>
            </div>
          </div>
          
          <div className="filters-container">
            {/* حقل اختيار الكورس */}
            <div className="filter-group">
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="filter-select"
                disabled={loadingCourses}
              >
                <option value="">اختر الكورس</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* حقل اختيار نوع التعليم */}
            <div className="filter-group">
              <select 
                value={filterGroupType} 
                onChange={(e) => setFilterGroupType(e.target.value)}
                className="filter-select"
                disabled={!selectedCourse || availableGroupTypes.length === 0} 
              >
                <option value="">كل أنواع التعليم</option>
                {availableGroupTypes.map(group => (
                  <option key={group.id} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* حقل اختيار الصف الدراسي */}
            <div className="filter-group">
              <select 
                value={filterGradeLevel} 
                onChange={(e) => setFilterGradeLevel(e.target.value)}
                className="filter-select"
                disabled={!selectedCourse || availableGradeLevels.length === 0}
              >
                <option value="">كل الصفوف</option>
                {availableGradeLevels.map(grade => (
                  <option key={grade.id} value={grade.name}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* زر مسح الفلاتر */}
            <button 
              className="btn btn-clear-filters"
              onClick={() => {
                setSearchTerm('');
                setFilterGroupType('');
                setFilterGradeLevel('');
              }}
            >
              مسح الفلاتر
            </button>
          </div>
          
          {/* ⭐️ حاوية شريط البحث في سطر منفصل ومحاذاته لليمين ⭐️ */}
          <div className="search-bar-standalone">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="ابحث باسم الطالب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedCourse}
                />
                <span>🔍</span>
              </div>
          </div>

          <div className="students-list-section">
            {/* 1. حالة تحميل الكورسات */}
            {loadingCourses ? (
              <p className="loading-message">جاري تحميل الكورسات...</p>
            
            // 2. حالة عدم وجود كورسات
            ) : courses.length === 0 ? (
              <div className="empty-state-list no-courses-warning">
                <span className="empty-icon">🚫</span>
                <h3>لا يمكن عرض قائمة الطلاب</h3>
                <p>يجب عليك إنشاء كورس واحد على الأقل لكي تتمكن من عرض الطلاب المرتبطين به وإدارتهم.</p>
              </div>
            
            // 3. حالة عدم اختيار كورس
            ) : !selectedCourse ? (
              <div className="empty-state-list no-selection-hint">
                <span className="empty-icon">👆</span>
                <h3>يرجى اختيار كورس أولاً</h3>
                <p>اختر كورساً من القائمة المنسدلة أعلاه لعرض طلابه.</p>
              </div>
            
            // 4. حالة تحميل الطلاب
            ) : loading ? (
              <p className="loading-message">جاري تحميل بيانات الطلاب...</p>
            
            // 5. حالة عدم وجود طلاب
            ) : filteredStudents.length === 0 ? (
              <div className="empty-state-list">
                <span className="empty-icon">😔</span>
                <p>لا يوجد طلاب حاليًا في كورس **{courses.find(c => c.id === selectedCourse)?.name}**.</p>
                <p>يمكنك إضافة طالب للكورس باستخدام زر "إضافة طالب جديد".</p>
              </div>
            
            ) : (
              // 6. حالة عرض جدول الطلاب
              <div className="table-responsive">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>المستوى الدراسي</th>
                      <th>نوع التعليم</th>
                      <th>المتوسط</th>
                      <th>إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td>
                          {student.first_name} {student.last_name}
                          {student.color_group && (
                            <span style={{ 
                              marginRight: '8px', 
                              padding: '2px 6px', 
                              backgroundColor: '#f0f0f0', 
                              borderRadius: '4px', 
                              fontSize: '12px' 
                            }}>
                              {student.color_group}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="grade-pill">
                            {student.grade_levels?.name || 'غير محدد'}
                          </span>
                        </td>
                        <td>
                          <span className={`education-type-badge type-${student.group_types?.id}`}>
                            {student.group_types?.name || 'غير محدد'}
                          </span>
                        </td>
                        <td>
                          <span className="performance-score">
                            {calculateStudentPerformance(student.daily_assessments)}
                          </span>
                        </td>
                        <td>
                          <div className="student-actions">
                            <button 
                              className="action-btn-small" 
                              title="عرض ملف الطالب"
                              onClick={() => navigate(`/student-profile/${student.id}`)}
                            >
                              👁️
                            </button>
                            <button 
                              className="action-btn-small assess-now" 
                              title="سجل التقييمات"
                              onClick={() => navigate(`/student-assessments/${student.id}`)} 
                            >
                              📝
                            </button>
                            <button 
                              className="action-btn-small btn-delete" 
                              title="حذف"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
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
      </div>
      <AddStudentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onStudentAdded={handleStudentAdded}
      />
      <AddParentModal 
        isOpen={isAddParentModalOpen} 
        onClose={() => setIsAddParentModalOpen(false)}
      />
    </div>
  );
};

export default StudentsPage;