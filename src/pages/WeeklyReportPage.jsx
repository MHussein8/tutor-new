// WeeklyReportPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
// ❌ تم حذف استيراد MAX_SCORES و calculateMaxTotalScore
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import Sidebar from '../components/Sidebar';
import '../styles/WeeklyReport.css';
import '../styles/TeacherDashboard.css';

const WeeklyReportPage = () => {
    // ❌ تم حذف SKILL_NAMES لأنه لن يستخدم الأعمدة القديمة
    
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    // سيتم تخزين التقرير كـ { fieldName: { totalScore: X, totalMax: Y } }
    const [report, setReport] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);

    // دالة مساعدة لحساب الأسبوع الحالي
    function getCurrentWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        const startOfWeek = new Date(today);
        // التعديل لضمان أن الأسبوع يبدأ دائماً يوم السبت (6)
        const daysToSaturday = (dayOfWeek === 6) ? 0 : (6 - dayOfWeek);
        startOfWeek.setDate(today.getDate() + daysToSaturday);
        startOfWeek.setHours(0, 0, 0, 0);
        
        return startOfWeek.toISOString().split('T')[0];
    }

    // دالة مساعدة لضبط تاريخ البداية إلى السبت
    const adjustToSaturday = (date) => {
        const adjustedDate = new Date(date);
        const dayOfWeek = adjustedDate.getDay();
        
        // إذا كان اليوم هو السبت (6)، لا تفعل شيئًا.
        if (dayOfWeek === 6) return adjustedDate; 
        
        // حساب عدد الأيام اللازمة للوصول إلى السبت التالي (أو الحالي إذا كان الأحد إلى الجمعة)
        // يتم استخدام 7 - dayOfWeek لـ الأحد=7 (يوم واحد)، الإثنين=6 (يومان)... السبت=1 (صفر يوم)
        const daysToAdd = (6 - dayOfWeek + 7) % 7;
        adjustedDate.setDate(adjustedDate.getDate() + daysToAdd);
        
        return adjustedDate;
    };

    useEffect(() => {
        fetchStudents();
    }, [selectedCourseId]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const teacherId = await getCurrentTeacherId();
                if (!teacherId) return;

                const { data, error } = await supabase
                    .from('courses')
                    .select('id, name')
                    .eq('teacher_id', teacherId);

                if (error) throw error;
                setCourses(data || []);
            } catch (error) {
                console.error('Error fetching courses:', error);
            }
        };

        fetchCourses();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth > 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchStudents = async () => {
        try {
            const currentTeacherId = await getCurrentTeacherId();
            if (!currentTeacherId) {
                console.error('لا يمكن تحديد هوية المدرس');
                return;
            }

            let query = supabase
                .from('students')
                .select('id, first_name, last_name')
                .eq('teacher_id', currentTeacherId);

if (selectedCourseId) {
    query = query.eq('course_id', selectedCourseId);
}

            query = query.order('first_name');

            const { data: studentsData, error } = await query;

            if (error) throw error;
            setStudents(studentsData || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };
    
    // ✅ دالة جديدة لحساب التقرير الأسبوعي بناءً على النتائج التفصيلية
    const processWeeklyAssessments = (dailyAssessments) => {
        const weeklyReportTotals = {};
        
        dailyAssessments.forEach(assessment => {
            // تحقق من وجود نتائج التقييم التفصيلية
            if (assessment.daily_assessment_results && Array.isArray(assessment.daily_assessment_results)) {
                
                assessment.daily_assessment_results.forEach(result => {
                    const snapshot = result.field_snapshot;
                    const fieldName = snapshot.field_name;
                    const scoreValue = Number(result.score_value);
                    const maxScore = snapshot.max_score;
                    
                    // نجمع الدرجات الرقمية فقط التي لها قيمة قصوى
                    if (snapshot.field_type === 'number' && maxScore > 0) {
                        if (!weeklyReportTotals[fieldName]) {
                            weeklyReportTotals[fieldName] = { totalScore: 0, totalMax: 0 };
                        }
                        
                        // نجمع الدرجات الفعلية والمجموع الأقصى الممكن للحقل الواحد
                        weeklyReportTotals[fieldName].totalScore += scoreValue;
                        weeklyReportTotals[fieldName].totalMax += maxScore;
                    } 
                    // يمكن إضافة منطق لجمع نتائج الحقول غير الرقمية هنا إذا لزم الأمر
                });
            }
        });
        
        return weeklyReportTotals;
    };

const generateReport = async () => {
        if (!selectedStudent || !selectedWeek) return;
        
        setLoading(true);
        try {
            const currentTeacherId = await getCurrentTeacherId();
            if (!currentTeacherId) {
                console.error('لا يمكن تحديد هوية المدرس');
                return;
            }

            // 1. تحديد تاريخ البداية (يوم السبت) وتاريخ النهاية (يوم الجمعة التالي)
            const startOfWeek = new Date(selectedWeek);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            // 2. ضمان أن التواريخ تُرسل إلى Supabase بصيغة ISO (yyyy-mm-dd) فقط لتجنب مشكلة التوقيت
            const startDateISO = startOfWeek.toISOString().split('T')[0];
            const endDateISO = endOfWeek.toISOString().split('T')[0];

            // ✅ الاستعلام باستخدام التواريخ بصيغة yyyy-mm-dd لتجنب مشكلة الـ Timezone
            let query = supabase
                .from('daily_assessments')
                .select(`
                    id, 
                    lesson_date, 
                    daily_assessment_results (score_value, field_snapshot)
                `)
                .eq('student_id', selectedStudent)
                .eq('teacher_id', currentTeacherId);

            if (selectedCourseId) {
                query = query.eq('course_id', selectedCourseId);
            }

            query = query
                .gte('lesson_date', startDateISO) 
                .lte('lesson_date', endDateISO)
                .order('lesson_date', { ascending: true });

            const { data: dailyAssessments, error } = await query;

            if (error) throw error;

            if (!dailyAssessments || dailyAssessments.length === 0) {
                setReport(null);
                return;
            }

            const finalReport = processWeeklyAssessments(dailyAssessments);

            setReport(Object.keys(finalReport).length > 0 ? finalReport : null);
        } catch (error) {
            console.error('Error generating report:', error);
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    // دوال مساعدة لحساب المجموع الكلي
    const calculateOverallTotals = (reportData) => {
        if (!reportData) return { totalScore: 0, totalMax: 0 };
        
        let totalScore = 0;
        let totalMax = 0;
        
        Object.values(reportData).forEach(item => {
            totalScore += item.totalScore;
            totalMax += item.totalMax;
        });
        
        return { totalScore, totalMax };
    };


    const getWeekDates = (startDate) => {
        const [year, month, day] = startDate.split('-').map(Number);
        // استخدام التوقيت المحلي لإنشاء التاريخ
        const start = new Date(year, month - 1, day); 
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        return {
            start: formatDate(start),
            end: formatDate(end)
        };
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleWeekChange = (dateString) => {
        const selectedDate = new Date(dateString);
        const saturdayDate = adjustToSaturday(selectedDate);
        setSelectedWeek(saturdayDate.toISOString().split('T')[0]);
    };

    const weekDates = selectedWeek ? getWeekDates(selectedWeek) : null;
    const { totalScore: overallTotalScore, totalMax: overallTotalMax } = calculateOverallTotals(report);
    const studentName = students.find(s => s.id.toString() === selectedStudent.toString());

    return (
        <div className="dashboard-layout">
            <Sidebar 
                activeTab="reports" 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            
            <div className={`main-content improved-layout ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
                <div className="weekly-report-page">
                    <div className="page-header weekly-report-header">
                        <h1>التقرير الأسبوعي لأداء الطلاب</h1>
                        <p>تابع أداء {studentName ? studentName.first_name + ' ' + studentName.last_name : 'الطالب'} من خلال تقارير أسبوعية مفصلة</p>
                    </div>
                    
                    <div className="report-controls-container improved-controls">
                        <div className="control-section improved-control-section">
                            <h3>إعدادات التقرير</h3>
                            
                            <div className="report-controls">
                                <div className="control-group">
                                    <label>اختر الكورس:</label>
                                    <select 
                                        value={selectedCourseId} 
                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                    >
                                        <option value="">كل الكورسات</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="control-group">
                                    <label>اختر الطالب:</label>
                                    <select 
                                        value={selectedStudent} 
                                        onChange={(e) => setSelectedStudent(Number(e.target.value))}
                                    >
                                        <option value="">اختر الطالب</option>
                                        {students.map(student => (
                                            <option key={student.id} value={student.id}>
                                                {student.first_name} {student.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="control-group">
                                    <label>اختر أسبوع التقرير (يوم السبت):</label>
                                    <input 
                                        type="date"
                                        value={selectedWeek}
                                        onChange={(e) => handleWeekChange(e.target.value)}
                                    />
                                </div>
                                
                                <button 
                                    onClick={generateReport} 
                                    disabled={!selectedStudent || !selectedWeek || loading}
                                    className="generate-btn improved-generate-btn"
                                >
                                    {loading ? 'جاري التحميل...' : 'عرض التقرير'}
                                </button>
                            </div>
                        </div>

                        {weekDates && (
                            <div className="week-info-section improved-week-info">
                                <h3>الفترة الزمنية</h3>
                                <div className="week-info">
                                    <span className="week-range">من {weekDates.start} إلى {weekDates.end}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {report && (
                        <div className="report-results improved-results">
                            <div className="report-header improved-report-header">
                                <h2>تقرير أداء الطالب</h2>
                                <div className="performance-summary improved-summary">
                                    <div className="summary-item total-score">
                                        <span>المجموع الكلي</span>
                                        <span className="score-value">
                                            {overallTotalScore}/{overallTotalMax}
                                        </span>
                                    </div>
                                    <div className="summary-item percentage-score">
                                        <span>النسبة المئوية</span>
                                        <span className="score-value">
                                            {overallTotalMax > 0 
                                                ? Math.round((overallTotalScore / overallTotalMax) * 100) 
                                                : 0
                                            }%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="report-grid">
                                {Object.keys(report).map((fieldName) => {
                                    const { totalScore, totalMax } = report[fieldName];
                                    const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
                                    
                                    return (
                                        <div key={fieldName} className="report-item improved-item">
                                            <span className="item-label">
                                                {fieldName} {/* استخدام اسم الحقل الديناميكي مباشرة */}
                                            </span>
                                            <div className="score-container">
                                                <span className="score">{totalScore} / {totalMax}</span>
                                                <div className="score-bar">
                                                    <div
                                                        className="score-progress"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* عرض رسالة عدم وجود بيانات */}
                    {!loading && selectedStudent && selectedWeek && !report && (
                        <div className="no-data-container">
                            <div className="no-data-icon">📅</div>
                            <p className="no-data-message">لا توجد تقييمات للطالب المختار في هذا الأسبوع.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklyReportPage;