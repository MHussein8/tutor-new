// StudentCumulativeReport.jsx
import React, { useState, useEffect, useCallback } from 'react';
// ❌ تم حذف استيراد الدالة الديناميكية لحساب المجموع الأقصى و MAX_SCORES
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import Sidebar from '../components/Sidebar';
import '../styles/Reports.css'; // أو أنشئ ملف CSS منفصل
import '../styles/TeacherDashboard.css';

// دالة مساعدة لتجميع الدرجات الديناميكية على مدى فترة زمنية
const processCumulativeAssessments = (dailyAssessments) => {
    const cumulativeTotals = {};
    let overallTotalScore = 0;
    let overallTotalMax = 0;
    
    dailyAssessments.forEach(assessment => {
        const results = assessment.daily_assessment_results || [];
        
        results.forEach(result => {
            const snapshot = result.field_snapshot;
            const score = Number(result.score_value);
            const maxScore = Number(snapshot.max_score);
            const fieldName = snapshot.field_name;

            // نجمع الدرجات الرقمية التي لها قيمة قصوى فقط
            if (snapshot.field_type === 'number' && maxScore > 0) {
                if (!cumulativeTotals[fieldName]) {
                    cumulativeTotals[fieldName] = { totalScore: 0, totalMax: 0 };
                }
                
                // نجمع الدرجات الفعلية والمجموع الأقصى الممكن للحقل الواحد
                cumulativeTotals[fieldName].totalScore += score;
                cumulativeTotals[fieldName].totalMax += maxScore;
                
                overallTotalScore += score;
                overallTotalMax += maxScore;
            }
        });
    });
    
    return { 
        report: cumulativeTotals, 
        overallTotalScore, 
        overallTotalMax 
    };
};

const StudentCumulativeReportPage = () => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);

    useEffect(() => {
        fetchStudents();
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

            const { data: studentsData, error } = await supabase
                .from('students')
                .select('id, first_name, last_name')
                .eq('teacher_id', currentTeacherId)
                .order('first_name');

            if (error) throw error;
            setStudents(studentsData || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const generateReport = async () => {
        if (!selectedStudent || !startDate || !endDate) return;
        
        setLoading(true);
        setReportData(null);
        try {
            const currentTeacherId = await getCurrentTeacherId();
            if (!currentTeacherId) {
                console.error('لا يمكن تحديد هوية المدرس');
                return;
            }

            // ضمان جلب النتائج التفصيلية
            const { data: dailyAssessments, error } = await supabase
                .from('daily_assessments')
                .select(`
                    id, 
                    lesson_date, 
                    daily_assessment_results (score_value, field_snapshot)
                `)
                .eq('student_id', selectedStudent)
                .eq('teacher_id', currentTeacherId)
                // استخدام صيغة YYYY-MM-DD لتجنب مشاكل التوقيت
                .gte('lesson_date', startDate) 
                .lte('lesson_date', endDate)
                .order('lesson_date', { ascending: true });

            if (error) throw error;

            if (!dailyAssessments || dailyAssessments.length === 0) {
                setReportData(null);
                return;
            }

            // معالجة التقييمات وتجميعها ديناميكياً
            const { report, overallTotalScore, overallTotalMax } = processCumulativeAssessments(dailyAssessments);

            if (Object.keys(report).length > 0) {
                setReportData({
                    reportDetails: report,
                    totalScore: overallTotalScore,
                    totalMax: overallTotalMax,
                    percentage: overallTotalMax > 0 ? Math.round((overallTotalScore / overallTotalMax) * 100) : 0,
                    assessmentsCount: dailyAssessments.length,
                });
            } else {
                setReportData(null);
            }

        } catch (error) {
            console.error('Error generating cumulative report:', error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };
    
    // دالة مساعدة لتحديد لون شريط التقدم (كما في ملفات ولي الأمر)
    const getScoreColor = (score, maxScore) => {
        if (maxScore === 0) return 'hsl(0, 0%, 50%)';
        const hue = (score / maxScore) * 120;
        return `hsl(${hue}, 70%, 50%)`;
    };
    
    const selectedStudentName = students.find(s => s.id.toString() === selectedStudent.toString())
        ? `${students.find(s => s.id.toString() === selectedStudent.toString()).first_name} ${students.find(s => s.id.toString() === selectedStudent.toString()).last_name}`
        : 'الطالب';


    return (
        <div className="dashboard-layout">
            <Sidebar 
                activeTab="reports" 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            
            <div className={`main-content improved-layout ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
                <div className="weekly-report-page"> {/* يمكن تغيير اسم الكلاس ليصبح "cumulative-report-page" */}
                    <div className="page-header cumulative-report-header">
                        <h1>التقرير التراكمي لأداء الطالب</h1>
                        <p>ملخص شامل لأداء {selectedStudentName} خلال فترة زمنية محددة</p>
                    </div>
                    
                    <div className="report-controls-container improved-controls">
                        <div className="control-section improved-control-section">
                            <h3>إعدادات التقرير</h3>
                            
                            <div className="report-controls">
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
                                    <label>تاريخ البداية:</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="control-group">
                                    <label>تاريخ النهاية:</label>
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                
                                <button 
                                    onClick={generateReport} 
                                    disabled={!selectedStudent || !startDate || !endDate || loading}
                                    className="generate-btn improved-generate-btn"
                                >
                                    {loading ? 'جاري التحميل...' : 'عرض التقرير التراكمي'}
                                </button>
                            </div>
                        </div>
                        
                        {startDate && endDate && (
                            <div className="week-info-section improved-week-info">
                                <h3>الفترة الزمنية</h3>
                                <div className="week-info">
                                    <span className="week-range">
                                        من {new Date(startDate).toLocaleDateString('ar-EG')} إلى {new Date(endDate).toLocaleDateString('ar-EG')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {reportData && (
                        <div className="report-results improved-results">
                            <div className="report-header improved-report-header">
                                <h2>ملخص الأداء التراكمي</h2>
                                <div className="performance-summary improved-summary">
                                    <div className="summary-item total-score">
                                        <span>المجموع الكلي</span>
                                        <span className="score-value">
                                            {reportData.totalScore}/{reportData.totalMax}
                                        </span>
                                    </div>
                                    <div className="summary-item percentage-score">
                                        <span>النسبة المئوية</span>
                                        <span className="score-value">
                                            {reportData.percentage}%
                                        </span>
                                    </div>
                                    <div className="summary-item lessons-count">
                                        <span>عدد الحصص المقيمة</span>
                                        <span className="score-value">
                                            {reportData.assessmentsCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="report-grid">
                                {Object.keys(reportData.reportDetails).map((fieldName) => {
                                    const { totalScore, totalMax } = reportData.reportDetails[fieldName];
                                    const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
                                    
                                    return (
                                        <div key={fieldName} className="report-item improved-item">
                                            <span className="item-label">
                                                {fieldName} {/* اسم المهارة ديناميكيًا */}
                                            </span>
                                            <div className="score-container">
                                                <span className="score">
                                                    {totalScore} / {totalMax}
                                                </span>
                                                <div className="score-bar">
                                                    <div
                                                        className="score-progress"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            background: getScoreColor(totalScore, totalMax)
                                                        }}
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
                    {!loading && selectedStudent && startDate && endDate && !reportData && (
                        <div className="no-data-container">
                            <div className="no-data-icon">📅</div>
                            <p className="no-data-message">
                                لا توجد تقييمات للطالب المختار بين {new Date(startDate).toLocaleDateString('ar-EG')} و {new Date(endDate).toLocaleDateString('ar-EG')}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentCumulativeReportPage;