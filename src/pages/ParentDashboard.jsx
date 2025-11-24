/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { parentService } from '../services/parentService';
import parentMessageService from '../services/parentMessageService';
import ParentMessageForm from '../components/ParentDashboard/ParentMessageForm';
import AddStudentToParentModal from '../components/ParentDashboard/AddStudentToParentModal';
import '../styles/ParentDashboard.css';
import '../styles/ParentDashboardMessages.css';

// ===========================================
// دوال المساعدة (تم الاحتفاظ بها كما هي)
// ===========================================

const getScoreColor = (score, maxScore) => {
  if (maxScore === 0) return 'hsl(0, 0%, 50%)';
  const hue = (score / maxScore) * 120 * 1.1;
  return `hsl(${hue}, 70%, 45%)`;
};

const aggregateDynamicAssessment = (assessment) => {
  let totalScore = 0;
  let totalMax = 0;

  const results = assessment.daily_assessment_results || [];

  results.forEach(result => {
      const snapshot = result.field_snapshot;
      const score = Number(result.score_value); 
      const maxScore = Number(snapshot.max_score);
      
      if (snapshot.field_type === 'number' && maxScore > 0) {
          totalScore += score;
          totalMax += maxScore;
      }
  });
console.log('AGGREGATION CHECK:', { assessmentId: assessment.id, score: totalScore, max: totalMax });
  return { totalScore, totalMax };
};

const getCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay(); 
  const diff = (day - 6 + 7) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toLocaleDateString('en-CA');
};

const getWeekRange = (weekDate) => {
  const start = new Date(weekDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 5); 

  const formatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const startFormatted = start.toLocaleDateString('ar-EG', formatOptions);
  const endFormatted = end.toLocaleDateString('ar-EG', formatOptions);
  
  return `${startFormatted} - ${endFormatted}`;
};

const getDaysOfWeek = (weekDate) => {
  const start = new Date(weekDate);
  const days = [];
  const options = { weekday: 'long' }; 

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({
      dateString: date.toLocaleDateString('en-CA'),
      dayName: date.toLocaleDateString('ar-EG', options),
      fullDate: date.toLocaleDateString('ar-EG'),
    });
  }
  return days;
};

// ===========================================
// كود المكون الرئيسي (مع تحديث الهيكل)
// ===========================================

const ParentDashboard = ({ parentUser, onLogout, parentId }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentTeacherId, setStudentTeacherId] = useState(null);
  const [dailyAssessments, setDailyAssessments] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weeklyLessons, setWeeklyLessons] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [stats, setStats] = useState({
    performanceAverage: 0,
    completedLessons: 0,
    teacherNotes: 0,
    progressPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sentMessages, setSentMessages] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [messageSending, setMessageSending] = useState(false);
  const [mostImprovedSkill, setMostImprovedSkill] = useState(null); 
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const fetchSentMessages = useCallback(async () => {
    if (!parentId) {
      console.error('Parent ID is not available.');
      return;
    }
    try {
      const messages = await parentMessageService.getSentMessages(parentId);
      setSentMessages(messages);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    }
  }, [parentId]);
  
  const calculateProgress = async (studentId) => {
    try {
      console.log('calculateProgress - parentId:', parentId, 'studentId:', studentId);
      // ✅ التصحيح: تمرير parentId
      const lastTwoAssessments = await parentService.getLastTwoAssessments(studentId, parentId);
      if (lastTwoAssessments.length < 2) return 0;
  
      const [current, previous] = lastTwoAssessments;
      
      const currentAggregated = aggregateDynamicAssessment(current);
      const previousAggregated = aggregateDynamicAssessment(previous);
      
      const currentTotalScore = currentAggregated.totalScore;
      const previousTotalScore = previousAggregated.totalScore;
      const dynamicMaxScore = currentAggregated.totalMax; 
  
      if (dynamicMaxScore === 0) return 0; 
  
      const progress = ((currentTotalScore - previousTotalScore) / dynamicMaxScore) * 100;
      
      return Math.round(progress);
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  };

  const loadStudentData = useCallback(async (studentId) => {
    try {
      console.log('loadStudentData - parentId:', parentId, 'studentId:', studentId);
      
      const [dailyData] = await Promise.all([
        parentService.getDailyAssessments(studentId, parentId),
      ]);

      console.log('Daily data loaded:', dailyData);
      setDailyAssessments(dailyData || []);
      
      // ✅ التصحيح: تمرير parentId
      const improvedSkillData = await parentService.getMostImprovedSkill(studentId, parentId);
      setMostImprovedSkill(improvedSkillData);
    
        const overallTotals = (dailyData || []).reduce((acc, assessment) => {
          const { totalScore, totalMax } = aggregateDynamicAssessment(assessment);
          acc.totalScore += totalScore;
          acc.totalMax += totalMax;
          return acc;
        }, { totalScore: 0, totalMax: 0 });
    
        const totalScore = overallTotals.totalScore;
        const availableMaxScore = overallTotals.totalMax;
    console.log('FINAL OVERALL TOTALS:', { totalScore: totalScore, totalMax: availableMaxScore });
        const averagePerformance = availableMaxScore > 0
          ? Math.round((totalScore / availableMaxScore) * 100)
          : 0;
    console.log('FINAL AVERAGE PERFORMANCE %:', averagePerformance);
        const progressPercentage = await calculateProgress(studentId);
    
        const teacherNotesCount = (dailyData || []).filter(assessment =>
          assessment.teacher_notes && assessment.teacher_notes.trim() !== ''
        ).length;
    
        setStats({
          performanceAverage: averagePerformance,
          completedLessons: (dailyData || []).length,
          teacherNotes: teacherNotesCount,
          progressPercentage: progressPercentage || 0
        });
      } catch (error) {
        console.error('Error loading student data:', error);
      }
    }, [parentId]);
    
    useEffect(() => {
      const updateStudentTeacher = () => {
        if (selectedStudent && students.length > 0) {
          const currentStudent = students.find(student => 
            student.student_id === selectedStudent
          );
          
          const teacherId = currentStudent?.students?.teacher_id;
          setStudentTeacherId(teacherId || null);
        }
      };
    
      updateStudentTeacher();
    }, [selectedStudent, students]);
    
    
  const loadParentData = useCallback(async () => {
      try {
        setLoading(true);
        const studentLinks = await parentService.getStudentsByParent(parentId); 
        
        const studentData = studentLinks.map(link => {
          const studentInfo = link.students || {};
          const firstName = studentInfo.first_name || 'طالب';
          const lastName = studentInfo.last_name || '';
          
          return {
            ...link, 
            student_id: parseInt(link.student_id), 
            full_name: `${firstName} ${lastName}`.trim(), 
            students: studentInfo 
          };
        });

        console.log('FINAL DEBUG: Students Array:', studentLinks);
        console.log('FINAL DEBUG: Students Data after map:', studentData);
        setStudents(studentData); 

        if (studentData.length > 0) {
          const firstStudentId = studentData[0].student_id; 
          setSelectedStudent(firstStudentId);
          await loadStudentData(firstStudentId);
        } else {
          setSelectedStudent(null);
          setStats({});
        }
      } catch (error) {
        console.error('Error loading parent data:', error);
      } finally {
        setLoading(false);
      }
    }, [loadStudentData, parentId]);
    
  useEffect(() => {
      if (parentId) {
          loadParentData();
      }
  }, [loadParentData, parentId]);
  
        useEffect(() => {
        if (activeTab === 'messages') {
          fetchSentMessages();
        }
      }, [activeTab, fetchSentMessages]);
      
      const loadWeeklyLessons = async (studentId, weekDate) => {
        try {
          console.log('loadWeeklyLessons - parentId:', parentId, 'studentId:', studentId);
          // ✅ التصحيح: تمرير parentId
          const lessonsData = await parentService.getWeeklyLessons(studentId, weekDate, parentId);
          setWeeklyLessons(lessonsData || []);
        } catch (error) {
          console.error('Error loading weekly lessons:', error);
          setWeeklyLessons([]);
        }
      };

      useEffect(() => {
        if (selectedStudent) {
          loadWeeklyReport(selectedStudent, selectedWeek);
          loadWeeklyLessons(selectedStudent, selectedWeek);
        }
        
        if (selectedWeek) {
            const days = getDaysOfWeek(selectedWeek);
            if (days.length > 0) {
                setSelectedDay(days[0].dateString);
            }
        }
      }, [selectedStudent, selectedWeek]);
      
      // eslint-disable-next-line no-unused-vars
      const loadParentMessages = async (studentId) => {
        try {
          const messages = await parentMessageService.getParentMessages(studentId, parentId);
          setSentMessages(messages);
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      };
      
      const handleSendMessage = async (messageData) => {
        try {
          setMessageSending(true);
          const result = await parentMessageService.sendParentMessage(messageData);
          setSentMessages(prev => [result, ...prev]);
          return result;
        } catch (error) {
          console.error('Error sending message:', error);
          throw error;
        } finally {
          setMessageSending(false);
        }
      };
    
    const loadWeeklyReport = async (studentId, weekDate) => {
      try {
        console.log('loadWeeklyReport - parentId:', parentId, 'studentId:', studentId); 
         const [reportData, lessonsData] = await Promise.all([
          // ✅ التصحيح: تمرير parentId
          parentService.getWeeklyReportFromDaily(studentId, weekDate, parentId),
          // ✅ التصحيح: تمرير parentId
          parentService.getWeeklyLessons(studentId, weekDate, parentId)
         ]);
         setWeeklyLessons(lessonsData || []);
         
         if (reportData) {
          let totalScore = 0;
          let totalMax = 0;
          
          Object.keys(reportData).forEach(key => {
            if (typeof reportData[key] === 'object' && reportData[key] !== null && reportData[key].hasOwnProperty('totalScore')) {
              totalScore += reportData[key].totalScore;
              totalMax += reportData[key].totalMax;
            }
          });
          
          setWeeklyReport({
            ...reportData,
            overall_total_score: totalScore,
            overall_percentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
            overall_total_max: totalMax
          });
        } else {
          setWeeklyReport(null);
        }
      } catch (error) {
        console.error('Error loading weekly report:', error);
        setWeeklyReport(null);
      }
    };
    
      const handleStudentChange = async (studentId) => {
        setSelectedStudent(studentId);
        await loadStudentData(studentId);
        await loadWeeklyReport(studentId, selectedWeek);
      };
    
    const handlePreviousWeek = () => {
        const newWeek = new Date(selectedWeek);
        newWeek.setDate(newWeek.getDate() - 7);
        setSelectedWeek(newWeek.toISOString().split('T')[0]);
        setSelectedDay(null);
      };
    
    const handleNextWeek = () => {
        const newWeek = new Date(selectedWeek);
        newWeek.setDate(newWeek.getDate() + 7);
        setSelectedWeek(newWeek.toISOString().split('T')[0]);
        setSelectedDay(null); 
      };
    
      // eslint-disable-next-line no-unused-vars
    const handleDateChange = (e) => {
        const selectedDate = new Date(e.target.value);
        const day = selectedDate.getDay(); 
        const diff = (day - 6 + 7) % 7;
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        setSelectedWeek(startOfWeek.toLocaleDateString('en-CA'));
    };

    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>جاري تحميل بيانات الطالب...</p>
        </div>
      );
    }

    const assessmentsWithNotes = dailyAssessments.filter(assessment => assessment.teacher_notes && assessment.teacher_notes.trim() !== '');
    
  console.log('DEBUG: Selected ID:', selectedStudent, 'Type:', typeof selectedStudent);
  if (students.length > 0) {
    console.log('DEBUG: Array ID:', students[0].student_id, 'Type:', typeof students[0].student_id);
  }
  const currentStudent = students.find(s => s.student_id === parseInt(selectedStudent));    
    const studentFullName = currentStudent 
      ? currentStudent.full_name
      : 'الطالب';

    return (
      <div className="pd-layout">
        
<header className="pd-header">
      <div className="pd-header-content">
        {/* الجزء الأيسر - شعار المنصة والعناوين */}
        <div className="pd-title-group">
          <div className="pd-platform-branding">
            <div className="platform-logo">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="platform-info">
              <h1 className="platform-name">منصة التعليم التفاعلي</h1>
              <div className="pd-welcome-section">
                <span className="pd-subtitle">لوحة متابعة ولي الأمر</span>
                <div className="pd-user-info">
                  <div className="pd-avatar">
                    <svg className="avatar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6 21V19C6 16.7909 8.68629 15 12 15C15.3137 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="pd-user-details">
                    <span className="pd-user-name">مرحباً، {parentUser?.name}</span>
                    <span className="pd-current-student">
                      <svg className="student-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 20V18C4 15.7909 7.58172 14 12 14C16.4183 14 20 15.7909 20 18V20" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      {studentFullName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الجزء الأيمن - عناصر التحكم */}
        <div className="pd-controls-group">
          <div className="pd-student-selector">
            <div className="selector-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 17.8954 16.1046 17 15 17H9C7.89543 17 7 17.8954 7 19V21" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="selector-content">
              <label htmlFor="student-select">التبديل بين الأبناء</label>
              <select
                id="student-select"
                value={selectedStudent || ''}
                onChange={(e) => handleStudentChange(parseInt(e.target.value))}
                className="pd-dropdown"
              >
                <option value="" disabled>اختر طالبًا</option>
                {students.map(student => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pd-action-buttons">
            <button
              className="pd-action-btn primary"
              onClick={() => setIsAddStudentModalOpen(true)}
            >
              <div className="btn-content">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span>إضافة طالب</span>
              </div>
            </button>
            <button onClick={onLogout} className="pd-action-btn secondary">
              <div className="btn-content">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 16L21 12M21 12L17 8M21 12H7M12 17V19C12 20.1046 11.1046 21 10 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H10C11.1046 3 12 3.89543 12 5V7" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span>تسجيل الخروج</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* تأثير زجاجي إضافي */}
      <div className="pd-header-overlay"></div>
    </header>
    
        {/* 2. شريط التبويبات المتقدم (Advanced Tabs) */}
        <nav className="pd-tabs-nav">
          <button
            className={`pd-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>نظرة عامة</span>
          </button>
          <button
            className={`pd-tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessments')}
          >
            <i className="fas fa-clipboard-list"></i>
            <span>سجل التقييمات</span>
          </button>
          <button
            className={`pd-tab-btn ${activeTab === 'weekly-plan' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly-plan')}
          >
            <i className="fas fa-calendar-alt"></i>
            <span>الخطة الأسبوعية</span>
          </button>
          <button
            className={`pd-tab-btn ${activeTab === 'weekly-report' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly-report')}
          >
            <i className="fas fa-chart-bar"></i>
            <span>التقرير الأسبوعي</span>
          </button>
          <button
            className={`pd-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <i className="fas fa-comment-dots"></i>
            <span>ملاحظات المعلم</span>
          </button>
          <button
            className={`pd-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <i className="fas fa-envelope"></i>
            <span>رسائل للمعلم</span>
          </button>
        </nav>

        {/* 3. محتوى لوحة التحكم (Content Area) */}
        <main className="pd-main-content">
          
          {/* ===========================================
              1. تبويب النظرة العامة (OVERVIEW) 
              =========================================== */}
          {activeTab === 'overview' && (
            <div className="pd-tab-content overview-grid">
              
              {/* بطاقات الإحصائيات (Stats Grid) */}
              <div className="pd-stats-grid">
                
                {/* المعدل العام */}
                <div className="pd-stat-card primary">
                  <i className="fas fa-percent"></i>
                  <div className="stat-info">
                    <p className="stat-label">المعدل العام</p>
                    <h3 className="stat-value">{stats.performanceAverage}%</h3>
                  </div>
                </div>
                
                {/* نسبة التقدم */}
                <div className="pd-stat-card success">
                  <i className={`fas ${stats.progressPercentage >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                  <div className="stat-info">
                    <p className="stat-label">نسبة التقدم (عن السابق)</p>
                    <h3 className="stat-value">{stats.progressPercentage}%</h3>
                  </div>
                </div>

                {/* الملاحظات */}
                <div className="pd-stat-card warning">
                  <i className="fas fa-bell"></i>
                  <div className="stat-info">
                    <p className="stat-label">ملاحظات المعلم (نشطة)</p>
                    <h3 className="stat-value">{stats.teacherNotes}</h3>
                  </div>
                </div>

                {/* المهارة الأكثر تحسناً */}
                <div className="pd-stat-card info">
                  <i className="fas fa-star"></i>
                  <div className="stat-info">
                    <p className="stat-label">أفضل مهارة</p>
                    <h3 className="stat-value">{mostImprovedSkill?.fieldName || 'غير متوفر'}</h3>
                  </div>
                </div>
              </div>

              {/* الرسوم البيانية والملاحظات */}
              <div className="pd-dashboard-details">
                  
                <div className="pd-chart-card">
                    <div className="pd-card-header">
                        <h3>التحصيل الدراسي لآخر 7 تقييمات</h3>
                        <i className="fas fa-chart-line"></i>
                    </div>
                    <div className="chart-placeholder">
                         <p>عرض بياني لمتوسط درجات التقييمات اليومية.</p>
                         <div className="progress-graph-mock"></div>
                    </div>
                </div>

                <div className="pd-notes-card">
                    <div className="pd-card-header">
                        <h3>ملاحظات المعلم الحديثة</h3>
                        <i className="fas fa-sticky-note"></i>
                    </div>
                    <div className="pd-notes-list">
                      {assessmentsWithNotes.slice(0, 5).map(assessment => (
                        <div key={assessment.id} className="pd-note-preview">
                          <p className="note-text">{assessment.teacher_notes?.substring(0, 80)}...</p>
                          <span className="note-date">
                            {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      ))}
                      {assessmentsWithNotes.length === 0 && (
                        <p className="pd-no-data">لا توجد ملاحظات حالياً</p>
                      )}
                    </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ===========================================
              2. تبويب سجل التقييمات (ASSESSMENTS) 
              =========================================== */}
          {activeTab === 'assessments' && (
            <div className="pd-tab-content assessments-tab">
              <h2 className="tab-title">سجل التقييمات التفصيلي</h2>
              <p className="tab-description">شاهد التقييمات اليومية بالتفصيل لعناصر الأداء المختلفة.</p>

              <div className="pd-assessments-list">
                {dailyAssessments.length > 0 ? (
                  dailyAssessments.map(assessment => (
                    <div key={assessment.id} className="pd-assessment-card">
                      <div className="pd-assessment-header">
                        <h4>تقييم يوم {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}</h4>
                        <span className="pd-total-score-badge">
                          {(() => {
                            const { totalScore, totalMax } = aggregateDynamicAssessment(assessment);
                            return `${Math.round(totalScore)} / ${totalMax}`;
                          })()}
                        </span>
                      </div>
                      <div className="pd-scores-breakdown">
                        
                        {(assessment.daily_assessment_results || []).map(result => {
                          const snapshot = result.field_snapshot;
                          const score = Number(result.score_value);
                          const maxScore = Number(snapshot.max_score);
                          const fieldName = snapshot.field_name;
                          
                          if (snapshot.field_type === 'number' && maxScore > 0) {
                            const percentage = (score / maxScore) * 100;
                            return (
                              <div key={fieldName} className="pd-score-item">
                                <span className="pd-score-label">{fieldName}</span>
                                <div className="pd-score-bar-container">
                                  <div
                                    className="pd-score-progress"
                                    style={{width: `${percentage}%`, background: getScoreColor(score, maxScore)}}
                                  ></div>
                                  <span className="pd-score-value">{score}/{maxScore}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                      {assessment.teacher_notes && (
                        <div className="pd-assessment-notes">
                          <i className="fas fa-comment"></i>
                          <p><strong>ملاحظات:</strong> {assessment.teacher_notes}</p>
                        </div>
                      )}
{assessment.lessons && assessment.lessons.assessment_file_url && (
  <div className="pd-assessment-file">
    <a 
      href={assessment.lessons.assessment_file_url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="pd-btn-download"
    >
      <i className="fas fa-download"></i> عرض/تحميل ملف التقييم المرفق
    </a>
  </div>
)}
                    </div>
                  ))
                ) : (
                  <div className="pd-no-data-card">
                    <i className="fas fa-exclamation-circle"></i>
                    <p>لا توجد تقييمات يومية للطالب حالياً.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===========================================
              3. تبويب الخطة الأسبوعية (WEEKLY PLAN)
              =========================================== */}
          {activeTab === 'weekly-plan' && (
            <div className="pd-tab-content weekly-plan-tab">
              <h2 className="tab-title">الخطة الأسبوعية والواجبات</h2>
              <p className="tab-description">راجع محتوى الدروس والواجبات المنزلية المخططة لهذا الأسبوع.</p>

              {/* أدوات التنقل بين الأسابيع (Week Navigation) */}
              <div className="pd-week-controls">
                <button onClick={handlePreviousWeek} className="pd-nav-btn">
                  <i className="fas fa-chevron-right"></i>
                  <span>السابق</span>
                </button>
                <div className="pd-current-week-display">
                  {getWeekRange(selectedWeek)}
                </div>
                <button onClick={handleNextWeek} className="pd-nav-btn">
                  <span>التالي</span>
                  <i className="fas fa-chevron-left"></i>
                </button>
              </div>
              
              {/* فلترة الأيام (Day Filter) */}
              <div className="pd-days-filter">
                {getDaysOfWeek(selectedWeek).map((day) => {
                  const hasLesson = weeklyLessons.some(l => 
                    new Date(l.lesson_date).toLocaleDateString('en-CA') === day.dateString
                  );

                  if (!hasLesson) return null;

                  return (
                    <button
                      key={day.dateString}
                      className={`pd-day-filter-btn ${selectedDay === day.dateString ? 'active' : ''}`}
                      onClick={() => setSelectedDay(day.dateString)}
                    >
                      {day.dayName}
                      <span className="pd-day-date">{day.fullDate}</span>
                    </button>
                  );
                })}
              </div>

              {/* عرض محتوى اليوم المختار (Day Content) */}
              <div className="pd-day-content-view">
                {selectedDay ? (
                  (() => {
                    const lessonForSelectedDay = weeklyLessons.find(l => 
                      new Date(l.lesson_date).toLocaleDateString('en-CA') === selectedDay
                    );

                    if (lessonForSelectedDay) {
                      return (
                        <div className="pd-lesson-cards-container">
                          
                          {/* 1. بطاقة الدرس */}
                          <div className="pd-lesson-card lesson">
                              <i className="fas fa-book-open card-icon"></i>
                              <div className="card-body">
                                  <h3>الدرس: {lessonForSelectedDay.title || 'غير محدد'}</h3>
                                  <div dangerouslySetInnerHTML={{ __html: lessonForSelectedDay.content || 'لا يوجد وصف تفصيلي لهذا الدرس.' }} />
                              </div>
                          </div>
                          
                          {/* 2. بطاقة الواجب */}
                          <div className="pd-lesson-card homework">
                              <i className="fas fa-tasks card-icon"></i>
                              <div className="card-body">
                                  <h3>الواجب المنزلي</h3>
                                  <div dangerouslySetInnerHTML={{ __html: lessonForSelectedDay.homework || 'لا يوجد واجب لهذا اليوم.' }} />
                              </div>
                          </div>
                          
                          {/* 3. بطاقة التقييمات المخططة */}
                          <div className="pd-lesson-card evaluations">
                            <i className="fas fa-star card-icon"></i>
                            <div className="card-body">
                              <h3>عناصر التقييم المخطط لها</h3>
                              <ul className="pd-evaluation-list">
                                {lessonForSelectedDay.evaluations && Object.keys(lessonForSelectedDay.evaluations).length > 0 ? (
                                  Object.keys(lessonForSelectedDay.evaluations).map(key => {
                                    const evalItem = lessonForSelectedDay.evaluations[key];
                                    if (evalItem.active) {
                                      return (
                                        <li key={key}>
                                          <strong>{evalItem.field_name || 'عنصر تقييم'}:</strong>
                                          <span>{evalItem.details || 'لم يتم إضافة تفاصيل.'}</span>
                                        </li>
                                      );
                                    }
                                    return null;
                                  })
                                ) : (
                                  <li>لا توجد تقييمات مُخطط لها لهذا اليوم.</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="pd-no-data-card big">
                          <i className="fas fa-calendar-times"></i>
                          <p>لا توجد خطة دروس مُضافة لليوم المختار.</p>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div className="pd-no-data-card big">
                    <i className="fas fa-hand-point-up"></i>
                    <p>يرجى اختيار يوم من الأسبوع أعلاه لعرض تفاصيل الخطة.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===========================================
              4. تبويب التقرير الأسبوعي (WEEKLY REPORT)
              =========================================== */}
          {activeTab === 'weekly-report' && (
            <div className="pd-tab-content weekly-report-tab">
              <h2 className="tab-title">ملخص الأداء الأسبوعي</h2>
              <p className="tab-description">نظرة سريعة على أداء الطالب خلال الأسبوع المختار.</p>

              <div className="pd-week-controls">
                <button onClick={handlePreviousWeek} className="pd-nav-btn"><i className="fas fa-chevron-right"></i><span>السابق</span></button>
                <div className="pd-current-week-display">{getWeekRange(selectedWeek)}</div>
                <button onClick={handleNextWeek} className="pd-nav-btn"><span>التالي</span><i className="fas fa-chevron-left"></i></button>
              </div>
              
              {weeklyReport ? (
                <div className="pd-report-details">
                  <div className="pd-total-score-overview">
                    <h3>إجمالي أداء الأسبوع</h3>
                    <div className="pd-total-score-value">
                      {weeklyReport.overall_percentage}%
                    </div>
                    <p className="pd-total-score-subtitle">
                      {weeklyReport.overall_total_score} / {weeklyReport.overall_total_max} نقطة مُجمّعة
                    </p>
                  </div>

                  <div className="pd-detailed-scores-section">
                    <h3>التحصيل حسب عنصر التقييم</h3>
                    <div className="pd-scores-grid-detailed">
                      {Object.keys(weeklyReport).map((key) => {
                        if (typeof weeklyReport[key] !== 'object' || weeklyReport[key] === null || !weeklyReport[key].hasOwnProperty('totalScore')) {
                          return null;
                        }
                        
                        const { totalScore, totalMax } = weeklyReport[key];
                        const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
                        
                        return (
                          <div key={key} className="pd-score-item-detailed">
                            <span className="pd-score-label">{key}</span>
                            <div className="pd-score-container-detailed">
                              <div className="pd-score-bar-detailed">
                                <div
                                  className="pd-score-progress-detailed"
                                  style={{ 
                                    width: `${percentage}%`,
                                    background: getScoreColor(totalScore, totalMax) 
                                  }}
                                ></div>
                              </div>
                              <span className="pd-score-value-detailed">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {weeklyReport.teacher_notes && (
                    <div className="pd-teacher-notes-report">
                      <h3>ملاحظات المعلم الأسبوعية</h3>
                      <p>{weeklyReport.teacher_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pd-no-data-card big">
                  <i className="fas fa-chart-line"></i>
                  <p>لا يوجد تقرير أسبوعي لهذا الأسبوع المختار.</p>
                </div>
              )}
            </div>
          )}

          {/* ===========================================
              5. تبويب الملاحظات (NOTES)
              =========================================== */}
          {activeTab === 'notes' && (
            <div className="pd-tab-content notes-tab">
              <h2 className="tab-title">سجل ملاحظات المعلم</h2>
              <p className="tab-description">جميع الملاحظات التي دونها المعلم بخصوص أداء وسلوك الطالب.</p>

              <div className="pd-notes-archive-grid">
                {assessmentsWithNotes.length > 0 ? (
                  assessmentsWithNotes.map(assessment => (
                    <div key={assessment.id} className="pd-note-archive-card">
                      <div className="pd-note-header">
                        <i className="fas fa-comment-alt"></i>
                        <span className="pd-note-date">
                          {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <p className="pd-note-text">{assessment.teacher_notes}</p>
                      <span className="pd-note-type">تقييم يومي</span>
                    </div>
                  ))
                ) : (
                  <div className="pd-no-data-card big">
                    <i className="fas fa-clipboard-check"></i>
                    <p>لا توجد ملاحظات مدونة للمعلم حتى الآن.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===========================================
              6. تبويب الرسائل (MESSAGES)
              =========================================== */}
          {activeTab === 'messages' && (
            <div className="pd-tab-content messages-tab">
              <h2 className="tab-title">التواصل مع المعلم</h2>
              <p className="tab-description">أرسل استفساراتك أو ملاحظاتك للمعلم.</p>

              <div className="pd-messages-grid">
                  <div className="pd-message-form-area">
                      <ParentMessageForm 
                        onSendMessage={handleSendMessage} 
                        parentId={parentId} 
                        studentId={selectedStudent}
                        teacherId={studentTeacherId}
                      />
                  </div>
                  
                  <div className="pd-sent-messages-area">
                    <h3 className="messages-area-title">الرسائل المرسلة</h3>
                    <div className="pd-messages-list-scroll">
                      {sentMessages.length > 0 ? (
                        sentMessages.map((msg, index) => (
                          <div key={index} className="pd-message-item">
                            <div className="pd-message-header">
                              <span className="pd-message-topic">
                                {msg.topic === 'general' ? 'استفسار عام' : 'استفسار أكاديمي'}
                              </span>
                              <span className="pd-message-date">
                                {new Date(msg.payload?.timestamp || msg.created_at).toLocaleDateString('ar-EG')}
                              </span>
                            </div>
                            <p className="pd-message-text">{msg.message_text}</p>

                            {msg.teacher_reply && (
                              <div className="pd-teacher-reply">
                                <span className="reply-label">رد المعلم:</span>
                                <p>{msg.teacher_reply}</p>
                              </div>
                            )}
                            <div className="pd-message-footer">
                              <span className={`pd-status-badge ${msg.teacher_read ? 'read' : 'unread'}`}>
                                {msg.teacher_read ? 'تمت القراءة' : 'لم تتم القراءة'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="pd-no-data-messages">
                          <i className="fas fa-inbox"></i>
                          <p>لم تقم بإرسال أي رسائل بعد.</p>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          )}
        </main>

        {isAddStudentModalOpen && (
          <AddStudentToParentModal
            isOpen={isAddStudentModalOpen}
            onClose={() => setIsAddStudentModalOpen(false)}
            parentId={parentId}
            onStudentAdded={() => {
              loadParentData();
              setIsAddStudentModalOpen(false);
            }}
          />
        )}
      </div>
    );
  };

  export default ParentDashboard;