import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import TeacherDashboard from './pages/TeacherDashboard';
import DailyAssessmentPage from './pages/DailyAssessmentPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import LessonsManagementPage from './pages/LessonsManagementPage';
import StudentsPage from './pages/StudentsPage';
import DailyAssessmentReportPage from './pages/DailyAssessmentReportPage';
import StudentAssessmentsPage from './pages/StudentAssessmentsPage';
import TeacherWeeklyPlans from './pages/TeacherWeeklyPlans';
import CourseManagementPage from './pages/CourseManagementPage';
import ParentDashboard from './pages/ParentDashboard';
import ParentLogin from './pages/ParentLogin';
import AddParentPage from './pages/AddParentPage';
import TeacherLogin from './pages/TeacherLogin';
import StudentDailyReport from './components/StudentDailyReport';
import CourseEnrollmentPage from './pages/CourseEnrollmentPage';
// 1. استيراد صفحة ملف الطالب الجديدة
import StudentProfile from './pages/StudentProfile';
import './App.css';

// Wrapper component للتقرير
// ملاحظة: هذا الـ Wrapper لم يعد ضرورياً بعد إنشاء StudentProfilePage الشاملة
const StudentDailyReportWrapper = () => {
   const { studentId } = useParams();
   const navigate = useNavigate();
   
   const handleClose = () => {
    // العودة إلى صفحة ملف الطالب عند إغلاق التقرير 
    // أو العودة إلى قائمة الطلاب إذا لم يكن هناك ID في المسار
    navigate('/students');
   };
   
   // تأكد من تمرير studentId على شكل رقم
   const id = studentId ? parseInt(studentId, 10) : null;

   return (
     <StudentDailyReport 
      studentId={id} // تمرير الـ ID المحول
      onClose={handleClose} 
      isStandalone={true} // للتأكد من عرض الشريط الجانبي في حالة المسار القديم
      />
    );
};

function App() {
  const [parentUser, setParentUser] = useState(null);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    // التحقق من وجود مستخدم مسجل مسبقاً (استبدل بـ Firestore لاحقاً إذا لزم الأمر)
    const savedUser = localStorage.getItem('parentUser');
    if (savedUser) {
     setParentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

   const handleParentLogin = (userData) => {
    setParentUser(userData);
    localStorage.setItem('parentUser', JSON.stringify(userData));
   };

   const handleParentLogout = () => {
   localStorage.removeItem('parentUser');
   setParentUser(null);
   };

   if (loading) {
   return <div className="loading">جاري التحميل...</div>;
   }

  return (
  <div className="App">
    <Routes>
        {/* هذا هو المسار الجديد للصفحة الرئيسية */}
        <Route path="/" element={<TeacherLogin />} />
        
        {/* مسارات المعلم (الواجهة الأساسية) */}
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/assessments" element={<DailyAssessmentReportPage />} /> 
        <Route path="/daily-assessment" element={<DailyAssessmentPage />} />
        <Route path="/weekly-report" element={<WeeklyReportPage />} />
        <Route path="/lessons-management" element={<LessonsManagementPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/weekly-plans" element={<TeacherWeeklyPlans />} />
        <Route path="/course-management" element={<CourseManagementPage />} />
        <Route path="/dashboard/course-enrollment/:courseId" element={<CourseEnrollmentPage />} />
        <Route path="/student-assessments/:studentId" element={<StudentAssessmentsPage />} />
        
        {/* 🔑 المسار الجديد لصفحة ملف الطالب الشاملة */}
        <Route path="/student-profile/:id" element={<StudentProfile />} />
        
        {/* المسار القديم للتقرير اليومي - تم الإبقاء عليه لضمان عدم تعطل الروابط القديمة */}
        <Route path="/dashboard/report/:studentId" element={<StudentDailyReportWrapper />} />
        
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/add-parent-student" element={<AddParentPage />} />
        

        {/* مسارات ولي الأمر */}
        <Route 
          path="/parent" 
          element={
           parentUser ? 
            <ParentDashboard parentUser={parentUser} parentId={parentUser.id} onLogout={handleParentLogout} /> : 
            <ParentLogin onLogin={handleParentLogin} />
          } 
         />
         
          {/* مسار منفصل لتسجيل أولياء الأمور الجدد */}
          <Route path="/parent-registration" element={<AddParentPage />} />
         
         {/* مسار تسجيل الدخول لأولياء الأمور مع إمكانية تمرير البيانات */}
         <Route 
          path="/parent-login" 
          element={<ParentLogin onLogin={handleParentLogin} />} 
          />
        </Routes>
     </div>
    );
}

export default App;
