import React from 'react';
import '../../styles/ParentDashboard.css';

const ParentStatsGrid = ({ stats, colors, mostImprovedSkill, actualMaxScore }) => {

    const getSkillName = (skillKey) => {
        // نُبقي على قائمة مبسطة للترجمة إذا كانت المفاتيح القديمة لا تزال تأتي
        const skillNames = {
            grammar_score: 'القواعد',
            vocabulary_score: 'المفردات',
            writing_score: 'الكتابة',
            homework_score: 'الواجب',
            memorization_score: 'التسميع',
            interaction_score: 'التفاعل',
            attendance_score: 'الحضور',
            quiz_score: 'الاختبارات'
        };
        // إذا كان المفتاح موجوداً، نُعيد الترجمة، وإلا نُعيد المفتاح نفسه (الذي يفترض أنه الاسم العربي للحقل الديناميكي)
        return skillNames[skillKey] || skillKey;
    };

    // دالة لتحديد قيمة المهارة الأفضل تحسناً بشكل مرن للتعامل مع البنى المختلفة للـ Prop
    const improvedSkillDisplay = () => {
        if (!mostImprovedSkill) {
            return 'لا يوجد تحسن';
        }

        // حالة 1: التعامل مع البنية المؤقتة (name و progress) التي استخدمت في ParentDashboard.jsx
        const placeholderName = mostImprovedSkill.name;
        const placeholderProgress = mostImprovedSkill.progress;
        
        if (placeholderName && placeholderProgress !== undefined) {
             return `${placeholderName} +${placeholderProgress}`;
        }
        
        // حالة 2: التعامل مع البنية الأصلية (skill و improvement) عند إصلاح service
        const skillKey = mostImprovedSkill.skill;
        const improvementValue = mostImprovedSkill.improvement;

        if (skillKey) {
            // نستخدم getSkillName لترجمة المفتاح أو إرجاعه كما هو إذا كان ديناميكياً
            return `${getSkillName(skillKey)} +${improvementValue}`;
        }
        
        return 'لا يوجد تحسن';
    };


    return (
        <div className="parent-stats-grid">
            <div className="stat-card" style={{ backgroundColor: colors[0] }}>
                <div className="stat-icon performance">
                    <i className="fas fa-chart-line"></i>
                </div>
                <div className="stat-content">
                    <h3 style={{ color: '#FFFFFF' }}>متوسط الأداء</h3>
                    <p className="stat-value">{stats.performanceAverage}%</p>
                </div>
            </div>
            
            <div className="stat-card" style={{ backgroundColor: colors[1] }}>
                <div className="stat-icon progress">
                    <i className="fas fa-chart-line"></i>
                </div>
                <div className="stat-content">
                    <h3 style={{ color: '#40048fff' }}>نسبة التقدم</h3>
                    <p className="stat-value">{stats.progressPercentage}%</p>
                </div>
            </div>
            
            <div className="stat-card" style={{ backgroundColor: colors[2] }}>
                <div className="stat-icon lessons">
                    <i className="fas fa-book"></i>
                </div>
                <div className="stat-content">
                    <h3 style={{ color: '#8f3004ff' }}>الدروس المكتملة</h3>
                    <p className="stat-value">{stats.completedLessons}</p>
                </div>
            </div>
            
            <div className="stat-card" style={{ backgroundColor: colors[3] }}>
                <div className="stat-icon improvement">
                    <i className="fas fa-star"></i> {/* أيقونة جديدة */}
                </div>
                <div className="stat-content">
                    <h3 style={{ color: '#000000ff' }}>أكثر مهارة اتحسنت</h3>
                    <p className="stat-value">
                        {improvedSkillDisplay()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ParentStatsGrid;