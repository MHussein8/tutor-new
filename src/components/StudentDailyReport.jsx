// components/StudentDailyReport.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import '../styles/TeacherDashboard.css'; 

// يجب تثبيت هذه المكتبات لكي تعمل الرسوم البيانية: npm install react-chartjs-2 chart.js
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// تسجيل مكونات Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ----------------------------------------------------------------------
// دالة مساعدة لحساب النسبة المئوية - الإصدار المعدل
const calculateTotalScore = (assessment) => {
    console.log('🔍 جاري فحص التقييم:', assessment);
    
    if (!assessment) {
        console.log('❌ التقييم غير موجود');
        return 0;
    }
    
    if (!assessment.daily_assessment_results || assessment.daily_assessment_results.length === 0) {
        console.log('❌ لا توجد نتائج تقييم');
        return 0;
    }
    
    console.log('📊 عدد النتائج:', assessment.daily_assessment_results.length);
    
    let totalScore = 0;
    let totalMaxScore = 0;
    
    assessment.daily_assessment_results.forEach((result, index) => {
        console.log(`➡️ النتيجة ${index + 1}:`, {
            score_value: result.score_value,
            field_type: result.field_snapshot?.field_type,
            max_score: result.field_snapshot?.max_score
        });
        
        if (result.field_snapshot?.field_type === 'number') {
            const score = Number(result.score_value) || 0;
            const max = Number(result.field_snapshot.max_score) || 0;
            
            totalScore += score;
            totalMaxScore += max;
            
            console.log(`✅ أضيف: ${score} / ${max}`);
        }
    });
    
    console.log(`📈 الإجمالي: ${totalScore} / ${totalMaxScore}`);
    
    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    console.log(`🎯 النسبة النهائية: ${percentage}%`);
    
    return percentage;
};
// ----------------------------------------------------------------------
const StudentDailyReport = ({ studentId, onClose, isStandalone = false }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [message, setMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // دالة الإغلاق المعدلة لدعم كلا الوضعين
    const handleClose = () => {
        if (isStandalone) {
            navigate('/teacher-dashboard');
        } else {
            onClose();
        }
    };

    const fetchReportData = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setMessage('');

        try {
            // جلب بيانات الطالب وجميع تقييماته التاريخية
            const { data, error } = await supabase
                .from('students')
                .select(`
                    id, first_name, last_name, 
                    grade_levels(name), group_types(name),
                    daily_assessments (
                        id, created_at, teacher_notes, 
                        // 🚨 التعديل هنا: إضافة assessment_file_url 🚨
                        lessons (title, lesson_date, assessment_file_url),
                        courses (course_name),
                        daily_assessment_results ( score_value, field_snapshot )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) {
                setMessage('⚠️ لم يتم العثور على بيانات لهذا الطالب.');
                setLoading(false);
                return;
            }

            setStudent(data);

            // فرز التقييمات زمنياً
            const sortedAssessments = (data.daily_assessments || [])
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            setAssessments(sortedAssessments);
            
            if (sortedAssessments.length === 0) {
                setMessage('ℹ️ لم يتم تسجيل أي تقييمات لهذا الطالب بعد.');
            }

        } catch (error) {
            console.error('Error fetching student report:', error);
            setMessage('❌ خطأ في تحميل التقرير: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReportData(studentId);
    }, [studentId, fetchReportData]);

    // ------------------ بيانات الرسم البياني (استخدام useMemo) ------------------
    const chartData = useMemo(() => {
        const labels = assessments.map(a => 
            a.lessons?.lesson_date 
            ? new Date(a.lessons.lesson_date).toLocaleDateString('ar-EG')
            : 'تاريخ غير محدد' 
        );
        
        // تأكد من أن البيانات أرقام صالحة
        const dataPoints = assessments.map(a => {
            const score = calculateTotalScore(a);
            return isFinite(score) ? score : 0;
        });

        // 🎨 ألوان عصرية ومتدرجة
        const primaryColor = '#6366f1'; // أزرق بنفسجي عصري
        const pointColor = '#8b5cf6'; // لون النقاط
        
        // تأثير التدرج اللوني تحت الخط
        const gradient = document.createElement('canvas').getContext('2d');
        const linearGradient = gradient.createLinearGradient(0, 0, 0, 400);
        linearGradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        linearGradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');

        return {
            labels,
            datasets: [
                {
                    label: 'تطور الأداء (%)',
                    data: dataPoints,
                    borderColor: primaryColor,
                    backgroundColor: linearGradient,
                    
                    // 🎨 إعدادات متقدمة للمظهر
                    tension: 0.4, // منحنى سلس وأنيق
                    fill: true, // تعبئة المنطقة تحت المنحنى
                    borderWidth: 4, // خط أكثر سماكة
                    
                    // 🎨 تحسين النقاط
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointBackgroundColor: pointColor,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: pointColor,
                    pointHoverBorderWidth: 3,
                    
                    // 🎨 تأثير الظل
                    shadowOffsetX: 2,
                    shadowOffsetY: 4,
                    shadowBlur: 12,
                    shadowColor: 'rgba(99, 102, 241, 0.3)',
                },
            ],
        };
    }, [assessments]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: { 
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: {
                        size: 14,
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        weight: '600'
                    },
                    color: '#374151'
                }
            },
            title: {
                display: true,
                text: '📈 تطور الأداء الأكاديمي',
                font: {
                    size: 20,
                    family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    weight: '700'
                },
                padding: {
                    top: 10,
                    bottom: 30
                },
                color: '#1f2937'
            },
            tooltip: {
                rtl: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                titleFont: {
                    size: 14,
                    weight: '600',
                    family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                },
                bodyFont: {
                    size: 13,
                    family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                },
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        return `النسبة: ${context.parsed.y}%`;
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(229, 231, 235, 0.8)',
                    drawBorder: false,
                },
                ticks: {
                    stepSize: 20,
                    font: {
                        size: 12,
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    },
                    color: '#6b7280'
                },
                title: {
                    display: true,
                    text: 'النسبة المئوية (%)',
                    font: {
                        size: 14,
                        weight: '600',
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    },
                    color: '#374151',
                    padding: { top: 0, bottom: 10 }
                }
            },
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    font: {
                        size: 12,
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    },
                    color: '#6b7280',
                    maxRotation: 45,
                    minRotation: 45
                },
                title: {
                    display: true,
                    text: 'تاريخ الحصة',
                    font: {
                        size: 14,
                        weight: '600',
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    },
                    color: '#374151',
                    padding: { top: 10, bottom: 0 }
                }
            }
        },
        elements: {
            line: {
                cubicInterpolationMode: 'monotone'
            }
        }
    };
    // -------------------------------------------------------------

    if (loading) {
        return (
            <div className="loading-page">
                <div className="spinner"></div>
                <p>جاري تحميل تقرير الطالب...</p>
            </div>
        );
    }

    // إذا كان هناك خطأ أو لم يتم العثور على بيانات
    if (message && !student) {
        return (
            <div className="dashboard-layout">
                <Sidebar 
                    isSidebarOpen={isSidebarOpen} 
                    setIsSidebarOpen={setIsSidebarOpen} 
                />
                
                <div className="main-content">
                    <div className="report-container">
                        <div className="report-header">
                            <button onClick={handleClose} className="btn btn-secondary">
                                ← العودة إلى لوحة التحكم
                            </button>
                            <h2>التقرير</h2>
                        </div>
                        <div className="empty-state-message">
                            {message}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // هذا الجزء من الكود يعرض بيانات التقرير
    const reportTitle = `التقرير اليومي المفصّل للطالب: ${student.first_name} ${student.last_name}`;

    return (
        <div className="dashboard-layout">
            <Sidebar 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            
            <div className="main-content">
                <div className="report-container">
                    <div className="report-header">
                        <button onClick={handleClose} className="btn btn-secondary">
                            ← العودة إلى لوحة التحكم
                        </button>
                        <h1>{reportTitle}</h1>
                        <p>
                            الصف: <strong>{student.grade_levels?.name || 'غير محدد'}</strong> | 
                            النوع: <strong>{student.group_types?.name || 'غير محدد'}</strong>
                        </p>
                    </div>
                    
                    <div className="report-charts-section">
                        <h2>📊 تطور الأداء</h2>
                        {assessments.length > 1 ? (
                            <div className="chart-wrapper"> 
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <p className="no-chart-data">يتطلب تقييمين على الأقل لرسم التطور البياني. ({message})</p>
                        )}
                    </div>

                    <div className="report-details-section">
                        <h2>📑 سجل التقييمات المفصل</h2>
                        <div className="assessments-table-container">
                            <table className="assessments-table">
                                <thead>
                                    <tr>
                                        <th>تاريخ الحصة</th>
                                        <th>الكورس</th>
                                        <th>عنوان الحصة</th>
                                    {/* 🚨 2. إضافة عمود لملف التقييم 🚨 */}
                                    <th>ملف التقييم</th>
                                        <th>النسبة المئوية</th>
                                        <th>ملاحظات المعلم</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.slice().reverse().map((assessment) => ( // عرض الأحدث أولاً
                                        <tr key={assessment.id}>
                                            <td>
                                            {/* عرض تاريخ الحصة، وتجنب 1/1/1970 */}
                                            {assessment.lessons.lesson_date 
                                                ? new Date(assessment.lessons.lesson_date).toLocaleDateString('ar-EG')
                                                : 'لا يوجد تاريخ'}
                                            </td>
                                            <td>{assessment.courses.course_name || 'غير محدد'}</td>
                                            <td>{assessment.lessons.title}</td>
                                        {/* 🚨 3. إضافة خلية لزر التنزيل 🚨 */}
                                        <td>
                                            {assessment.lessons.assessment_file_url ? (
                                                <a 
                                                    href={assessment.lessons.assessment_file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="btn btn-download-small"
                                                    style={{ 
                                                        fontSize: '12px', 
                                                        padding: '5px 10px',
                                                        backgroundColor: '#10b981', // لون أخضر جيد للتنزيل
                                                        color: '#fff',
                                                        borderRadius: '4px',
                                                        textDecoration: 'none',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    ⬇️ تنزيل
                                                </a>
                                            ) : (
                                                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                    غير متاح
                                                </span>
                                            )}
                                        </td>
                                        {/* 🚨 نهاية خلية زر التنزيل 🚨 */}
                                            <td>
                                                <span className="score-percent">
                                                    {calculateTotalScore(assessment)}%
                                                </span>
                                            </td>
                                            <td>{assessment.teacher_notes || 'لا توجد ملاحظات'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDailyReport;