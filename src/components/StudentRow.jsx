// components/StudentRow.jsx

import React from 'react';

// يتم تغليف المكون بـ React.memo لتحسين أداء الجدول
const StudentRow = React.memo(({
    student,
    formatDate,
    handleAssessStudent,
    handleViewReport
}) => {
    // افتراض وجود حقول جديدة (last_assessment_score/date) لجعل مؤشر "آخر نشاط" أكثر دقة.
    // إذا لم تتوفرا، يتم الرجوع إلى القيم الافتراضية أو updated_at.
    const lastAssessmentScore = student.last_assessment_score || '---';
    const lastAssessmentDate = student.last_assessment_date; 
    
// رسالة التاريخ
    // ✅ التصحيح: جعل رسالة التاريخ تعتمد على وجود النتيجة لتجنب الرسالة الثابتة عند فقدان التاريخ
    const isAssessmentAvailable = lastAssessmentScore !== '---';
    
    const dateMessage = (lastAssessmentDate && isAssessmentAvailable)
        ? `آخر تقييم: ${formatDate(lastAssessmentDate)}`
        : (isAssessmentAvailable 
            ? '' 
            : 'لم يتم التقييم بعد');  
    // حساب عمر الطالب
    const studentAge = student.birth_date 
        ? new Date().getFullYear() - new Date(student.birth_date).getFullYear()
        : null;

    return (
        // **********************************************
        // ملاحظة: تم حذف key من هنا ويجب أن يكون في المكون الأب
        // **********************************************
        <tr> 
            <td>
                <div className="student-profile">
                    <div className="student-avatar">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                    </div>
                    <div className="student-name">
                        <div className="name">
                            {student.first_name} {student.last_name}
                        </div>
                        {studentAge && (
                            <div className="student-meta">
                                {studentAge} سنة
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td>
                <span className="grade-pill">
                    {student.grade_levels?.name || `الصف ${student.grade_level_id}`}
                </span>
            </td>
            <td>
                <span className={`status ${student.group_types?.name === 'اونلاين' ? 'online' : 'offline'}`}>
                    {student.group_types?.name || 'غير محدد'}
                </span>
            </td>
            <td>
                <div className="last-assessment-info">
                    {/* استخدام النتيجة الجديدة */}
                    <span className="assessment-score">{lastAssessmentScore}</span>
                    <span className="assessment-date">
                        {dateMessage}
                    </span>
                </div>
            </td>
            <td>
                <div className="student-actions">
                    <button 
                        className="action-btn-small assess-now" 
                        title="تقييم الطالب" 
                        onClick={() => handleAssessStudent(student.id)}
                    >
                        📝 تقييم
                    </button>
                    <button 
                        className="action-btn-small" 
                        title="عرض التقرير اليومي"
                        onClick={() => handleViewReport(student.id)}
                    >
                        📊 تقرير
                    </button>
                </div>
            </td>
        </tr>
    );
});

export default StudentRow;