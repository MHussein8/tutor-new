/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Sidebar from '../components/Sidebar';
import '../styles/StudentProfile.css';
import EditStudentModal from '../components/EditStudentModal';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [parent, setParent] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // جلب بيانات الطالب الأساسية
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          grade_levels (*),
          group_types (*)
        `)
        .eq('id', id)
        .single();

      if (studentError) throw studentError;

      // جلب بيانات ولي الأمر
      const { data: parentData, error: parentError } = await supabase
        .from('student_parents')
        .select(`
          relationship,
          parents (*)
        `)
        .eq('student_id', id)
        .single();

      if (parentError && parentError.code !== 'PGRST116') {
        console.error('Error fetching parent:', parentError);
      }

      // جلب التقييمات
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('daily_assessments')
        .select(`
          *,
          daily_assessment_results (*)
        `)
        .eq('student_id', id)
        .order('lesson_date', { ascending: false });

      if (assessmentsError) throw assessmentsError;

      setStudent(studentData);
      setParent(parentData);
      setAssessments(assessmentsData || []);

      // جلب الكورسات المسجل فيها الطالب
      const { data: coursesData, error: coursesError } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          color_group,
          courses!inner (
            id,
            name,
            description
          )
        `)
        .eq('student_id', id);

      if (coursesError && coursesError.code !== 'PGRST116') {
        console.error('Error fetching courses:', coursesError);
      }

      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = (assessment) => {
    if (!assessment.daily_assessment_results || assessment.daily_assessment_results.length === 0) {
      return 0;
    }
    
    const totalScore = assessment.daily_assessment_results.reduce((sum, result) => {
      return sum + (parseFloat(result.score_value) || 0);
    }, 0);

    const maxPossibleScore = assessment.daily_assessment_results.reduce((sum, result) => {
      return sum + (result.field_snapshot?.max_score || 0);
    }, 0);

    return maxPossibleScore > 0 ? ((totalScore / maxPossibleScore) * 100).toFixed(1) : 0;
  };

  const getPerformanceLevel = (score) => {
    if (score >= 90) return { text: 'ممتاز', class: 'excellent' };
    if (score >= 80) return { text: 'جيد جداً', class: 'very-good' };
    if (score >= 70) return { text: 'جيد', class: 'good' };
    if (score >= 60) return { text: 'مقبول', class: 'average' };
    return { text: 'ضعيف', class: 'weak' };
  };

  const handleDeleteStudent = async () => {
    const confirmDelete = window.confirm("هل أنت متأكد من حذف هذا الطالب؟ سيتم حذف جميع تقييماته أيضًا.");
    if (!confirmDelete) return;

    try {
      // حذف التقييمات أولاً
      const { error: assessmentsError } = await supabase
        .from('daily_assessments')
        .delete()
        .eq('student_id', id);

      if (assessmentsError) throw assessmentsError;

      // حذف علاقة ولي الأمر
      const { error: parentRelationError } = await supabase
        .from('student_parents')
        .delete()
        .eq('student_id', id);

      if (parentRelationError) throw parentRelationError;

      // حذف الطالب
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (studentError) throw studentError;

      alert('تم حذف الطالب بنجاح');
      navigate('/students');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('حدث خطأ أثناء حذف الطالب');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar 
          activeTab="students" 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
        />
        <div className="main-content">
          <div className="loading-container">
            <p>جاري تحميل بيانات الطالب...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="dashboard-layout">
        <Sidebar 
          activeTab="students" 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
        />
        <div className="main-content">
          <div className="error-container">
            <p>الطالب غير موجود</p>
            <button onClick={() => navigate('/students')} className="btn btn-primary">
              العودة لقائمة الطلاب
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestAssessment = assessments[0];
  const latestScore = latestAssessment ? calculateTotalScore(latestAssessment) : 0;
  const performanceLevel = getPerformanceLevel(latestScore);

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab="students" 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
        <div className="student-profile-container">
          {/* الهيدر */}
          <div className="profile-header">
            <button 
              className="btn-back"
              onClick={() => navigate('/students')}
            >
              ← رجوع
            </button>
            <h1>ملف الطالب: {student.first_name} {student.last_name}</h1>
            <div className="header-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setIsEditModalOpen(true)}
              >
                ✏️ تعديل
              </button>
            </div>
          </div>

          {/* البطاقة الرئيسية */}
          <div className="profile-main-card">
            <div className="student-basic-info">
              <div className="student-avatar">
                <div className="avatar-placeholder">
                  {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                </div>
              </div>
              
              <div className="student-details">
                <h2>{student.first_name} {student.last_name}</h2>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">المستوى الدراسي:</span>
                    <span className="value">{student.grade_levels?.name || 'غير محدد'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">نوع التعليم:</span>
                    <span className="value">{student.group_types?.name || 'غير محدد'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">تاريخ الميلاد:</span>
                    <span className="value">{student.birth_date || 'غير محدد'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">تاريخ التسجيل:</span>
                    <span className="value">{new Date(student.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="quick-stats">
              <div className="stat-card">
                <div className="stat-value">{assessments.length}</div>
                <div className="stat-label">عدد التقييمات</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{latestScore}%</div>
                <div className="stat-label">آخر تقييم</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value performance-${performanceLevel.class}`}>
                  {performanceLevel.text}
                </div>
                <div className="stat-label">مستوى الأداء</div>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="action-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/student-assessments/${student.id}`)}
            >
              📝 سجل تقييم جديد
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/edit-student/${student.id}`)}
            >
              ✏️ تعديل بيانات الطالب
            </button>
            <button 
              className="btn btn-warning"
              onClick={() => {/* سيتم تنفيذها لاحقاً */}}
            >
              📧 إرسال تقرير لولي الأمر
            </button>
            <button 
              className="btn btn-danger"
              onClick={handleDeleteStudent}
            >
              🗑️ حذف الطالب
            </button>
          </div>

          <div className="profile-sections">
            {/* قسم الكورسات */}
            <div className="profile-section">
              <h3>الكورسات المسجل فيها</h3>
              {courses.length > 0 ? (
                <div className="courses-list">
                  {courses.map((enrollment) => (
                    <div key={enrollment.course_id} className="course-item">
                      <div className="course-name">{enrollment.courses.name}</div>
                      <div className="course-group">
                        <span className="color-group-badge" style={{ 
                          backgroundColor: enrollment.color_group === 'أحمر' ? '#ff6b6b' :
                                           enrollment.color_group === 'أخضر' ? '#51cf66' :
                                           enrollment.color_group === 'أزرق' ? '#339af0' :
                                           enrollment.color_group === 'أصفر' ? '#ffd43b' : '#adb5bd',
                          color: enrollment.color_group === 'أصفر' ? '#000' : '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {enrollment.color_group || 'بدون مجموعة'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <p>الطالب غير مسجل في أي كورس</p>
                </div>
              )}
            </div>
            {/* قسم ولي الأمر */}
            <div className="profile-section">
              <h3>معلومات ولي الأمر</h3>
              {parent ? (
                <div className="parent-info">
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>الاسم:</strong> {parent.parents.first_name} {parent.parents.last_name}
                    </div>
                    <div className="info-item">
                      <strong>رقم الهاتف:</strong> {parent.parents.phone}
                    </div>
                    <div className="info-item">
                      <strong>البريد الإلكتروني:</strong> {parent.parents.email}
                    </div>
                    <div className="info-item">
                      <strong>العلاقة:</strong> {parent.relationship}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data">
                  <p>لا يوجد بيانات لولي الأمر</p>
                </div>
              )}
            </div>

            {/* قسم آخر التقييمات */}
            <div className="profile-section">
              <h3>آخر التقييمات</h3>
              {assessments.length > 0 ? (
                <div className="assessments-list">
                  {assessments.slice(0, 5).map((assessment) => {
                    const totalScore = calculateTotalScore(assessment);
                    const assessmentPerformance = getPerformanceLevel(totalScore);
                    
                    return (
                      <div key={assessment.id} className="assessment-item">
                        <div className="assessment-date">
                          {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="assessment-score">
                          <span className={`score-badge ${assessmentPerformance.class}`}>
                            {totalScore}%
                          </span>
                        </div>
                        <div className="assessment-performance">
                          {assessmentPerformance.text}
                        </div>
                        <button 
                          className="btn-view-details"
                          onClick={() => navigate(`/assessment-details/${assessment.id}`)}
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-data">
                  <p>لا توجد تقييمات مسجلة</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate(`/student-assessments/${student.id}`)}
                  >
                    سجل أول تقييم
                  </button>
                </div>
              )}
            </div>

            {/* قسم تفاصيل التقييمات */}
            <div className="profile-section">
              <h3>تفاصيل المجالات التقييمية</h3>
              {latestAssessment ? (
                <div className="assessment-details">
                  {latestAssessment.daily_assessment_results.map((result) => (
                    <div key={result.id} className="assessment-field">
                      <div className="field-name">{result.field_snapshot?.field_name}</div>
                      <div className="field-score">
                        {result.score_value} / {result.field_snapshot?.max_score}
                      </div>
                      <div className="field-percentage">
                        {((result.score_value / result.field_snapshot?.max_score) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <p>لا توجد تفاصيل تقييم متاحة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <EditStudentModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={student}
        onStudentUpdated={fetchStudentData}
      />
    </div>
  );
};

export default StudentProfile;