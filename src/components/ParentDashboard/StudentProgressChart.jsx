import React from 'react';
// ❌ تم حذف الاستيراد: import { calculateMaxTotalScore } from '../../config/assessmentConfig';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import '../../styles/ParentDashboard.css';

// دالة مساعدة لتجميع الدرجات الديناميكية لتقييم يوم واحد (تم نسخها من ParentDashboard.jsx)
const aggregateDynamicAssessment = (assessment) => {
    let totalScore = 0;
    let totalMax = 0;
    
    // تأكد من أن لدينا نتائج مفصلة
    const results = assessment.daily_assessment_results || [];
    
    results.forEach(result => {
        const snapshot = result.field_snapshot;
        const score = Number(result.score_value);
        const maxScore = Number(snapshot.max_score);
        
        // نجمع الدرجات الرقمية التي لها قيمة قصوى > 0 فقط
        if (snapshot.field_type === 'number' && maxScore > 0) {
            totalScore += score;
            totalMax += maxScore;
        }
    });

    return { totalScore, totalMax };
};


const StudentProgressChart = ({ dailyAssessments }) => {
    if (!dailyAssessments || dailyAssessments.length === 0) {
        return (
            <div className="no-data-message">
                <p>لا توجد بيانات تقييمات يومية لعرضها</p>
            </div>
        );
    }

    // تحويل البيانات لتتناسب مع المخطط
    const chartData = dailyAssessments.slice(0, 7).map(assessment => {
        
        // ✅ استخدام الدالة الجديدة لتجميع الدرجات ديناميكياً
        const { totalScore, totalMax } = aggregateDynamicAssessment(assessment);
        
        // حساب النسبة المئوية
        const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

        return {
            // تنسيق التاريخ واليوم للعرض على محور X
            name: new Date(assessment.lesson_date).toLocaleDateString('ar-EG', {
                weekday: 'short',
                day: 'numeric'
            }),
            أداء: percentage
        };
    }).reverse(); // لعرض أحدث تقييم على اليمين

    return (
        <div className="progress-chart">
            <h3>أداء الطالب في آخر 7 حصص</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    {/* نطاق المحور Y ثابت من 0 إلى 100 لأنه يعرض نسبة مئوية */}
                    <YAxis domain={[0, 100]} /> 
                    <Tooltip 
                        formatter={(value) => [`${value}%`, 'الأداء']}
                        labelFormatter={(label) => `التاريخ: ${label}`}
                    />
                    <Bar 
                        dataKey="أداء" 
                        fill="#4f46e5" 
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StudentProgressChart;