// components/StudentListPanel.jsx (الكود النهائي المحسن)

import React, { useState, useCallback, useMemo } from 'react';
import '../styles/TeacherDashboard.css';
import StudentRow from './StudentRow'; // <--- الاستيراد الجديد لمكون الصف

// تعريف التبويبات المستخدمة في هذا المكون (تم تبسيطها)
const TABS = {
    DAILY_INPUT: 'daily-input',
    // ❌ تم إزالة DAILY_REPORT
};

const StudentListPanel = ({ 
    stats, 
    students, 
    fetchDashboardData, 
    setActiveTab, 
    setSelectedStudentId, 
    teacherId,
    availableGradeLevels, // 💡 جديد: خيارات المراحل المضيقة
    availableGroupTypes // 💡 جديد: خيارات الأنواع المضيقة
}) => {

// حالات الفلاتر المحلية
    const [filterGroupType, setFilterGroupType] = useState('');
    const [filterGradeLevel, setFilterGradeLevel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');



    // فلترة الطلاب (تستخدم useMemo لتحسين الأداء)
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const nameMatch = `${student.first_name} ${student.last_name}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            
            const groupTypeMatch = !filterGroupType || 
                student.group_types?.name === filterGroupType;
            
            const gradeLevelMatch = !filterGradeLevel || 
                student.grade_levels?.name === filterGradeLevel;
            
            return nameMatch && groupTypeMatch && gradeLevelMatch;
        });
    }, [students, searchTerm, filterGroupType, filterGradeLevel]);

    // مسح الفلاتر (بدون تغيير)
    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setFilterGroupType('');
        setFilterGradeLevel('');
    }, []);

    // معالجة النقر على زر التقييم - تم تحديثها لتحديد الطالب (بقي كما هو)
const handleAssessStudent = useCallback((studentId) => {
        setSelectedStudentId(studentId);
        setActiveTab(TABS.DAILY_INPUT); 

        // NOTE: إضافة إدخال لسجل المتصفح لدعم زر "الخلف" للتقييم
        const urlPath = `/teacher-dashboard?assessment=${studentId}`;
        window.history.pushState(
            { studentId: studentId, tab: TABS.DAILY_INPUT },
            '', 
            urlPath 
        );
    }, [setSelectedStudentId, setActiveTab]);

    // 🔑 معالجة النقر على زر التقرير - تم تحديثها للانتقال إلى مسار خارجي جديد
const handleViewReport = useCallback((studentId) => {
        // ❌ لم نعد بحاجة لـ setSelectedStudentId أو setActiveTab
        
        // 🔑 الانتقال إلى صفحة التقرير المنفصلة (مسار react-router-dom)
        const urlPath = `/dashboard/report/${studentId}`;
        
        // استخدام الانتقال المباشر للمتصفح
        window.location.href = urlPath;
        
        // إذا كنت تفضل استخدام history.pushState للانتقال دون إعادة تحميل، يجب استخدام navigate() من react-router-dom
        // ولكن بما أن هذا المكون لا يستقبل navigate، فإن window.location.href هو الحل الأكثر أماناً هنا.
    }, []); // ❌ تم إزالة التبعيات (setSelectedStudentId, setActiveTab)

    // تنسيق التاريخ - تم تحسينه لإضافة خيارات اللغة وتفاصيل التاريخ (بدون تغيير)
    const formatDate = useCallback((dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, []);

    return (
        <>
            {/* بطاقات الإحصائيات (لم تتغير) */}
            <div className="stats-section">
                <div className="stats-card-grid">
                    <div className="stats-card stat-students">
                        <span className="icon-text">👨‍🎓</span>
                        <div className="stat-info">
                            <div className="stat-value">{stats.totalStudents || 0}</div>
                            <div className="stat-label">عدد الطلاب</div>
                        </div>
                    </div>
                    
                    <div className="stats-card stat-performance">
                        <span className="icon-text">📊</span>
                        <div className="stat-info">
                            <div className="stat-value">{stats.averagePerformance || 0}%</div>
                            <div className="stat-label">متوسط الأداء</div>
                        </div>
                    </div>
                    
                    <div className="stats-card stat-assessments">
                        <span className="icon-text">⭐</span>
                        <div className="stat-info">
                            <div className="stat-value">{stats.weeklyAssessments || 0}</div>
                            <div className="stat-label">التقييمات الأسبوعية</div>
                        </div>
                    </div>
                    
                    <div className="stats-card stat-classes">
                        <span className="icon-text">📚</span>
                        <div className="stat-info">
                            <div className="stat-value">{stats.weeklyClasses || 0}</div>
                            <div className="stat-label">الحصص الأسبوعية</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* قسم قائمة الطلاب والفلاتر (لم يتغير) */}
            <div className="students-list-section">
                <div className="section-header">
                    <h2>قائمة الطلاب</h2>
                    <span className="students-count-badge">
                        {filteredStudents.length} من {stats.totalStudents || 0} طالب
                    </span>
                </div>
                
                {/* الفلاتر (لم تتغير) */}
                <div className="filters-container">
                    <div className="filter-group">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="ابحث باسم الطالب..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span>🔍</span>
                        </div>
                    </div>
                    
                    <div className="filter-group">
                      <select 
                            value={filterGroupType} 
                            onChange={(e) => setFilterGroupType(e.target.value)}
                            className="filter-select"
                            disabled={!availableGroupTypes.length} // 💡 جديد: تعطيل إذا كانت القائمة فارغة
                        >
                            <option value="">كل أنواع التعليم</option>
                            {availableGroupTypes.map(group => ( // 💡 تم التعديل لاستخدام الـ Props
                                <option key={group.id} value={group.name}>
                                    {group.name}
                                </option>
                            ))}
                        </select>                    </div>
                    
                    <div className="filter-group">
                      <select 
                            value={filterGradeLevel} 
                            onChange={(e) => setFilterGradeLevel(e.target.value)}
                            className="filter-select"
                            disabled={!availableGradeLevels.length} // 💡 جديد: تعطيل إذا كانت القائمة فارغة
                        >
                            <option value="">كل الصفوف</option>
                            {availableGradeLevels.map(grade => ( // 💡 تم التعديل لاستخدام الـ Props
                                <option key={grade.id} value={grade.name}>
                                    {grade.name}
                                </option>
                            ))}
                        </select>                    </div>
                    
                   <button 
                        className="btn btn-clear-filters"
                        onClick={clearFilters}
                        disabled={!availableGradeLevels.length && !availableGroupTypes.length} // 💡 تعطيل المسح إذا لم يكن هناك فلاتر متاحة
                    >
                        🗑️ مسح الفلاتر
                    </button>                </div>
                
                {/* حالة عدم وجود طلاب (لم تتغير) */}
                {filteredStudents.length === 0 ? (
                    <div className="empty-state-list">
                        <div className="empty-icon">👨‍🎓</div>
                        <h3>
                            {students.length === 0 ? 'لا يوجد طلاب مسجلين' : 'لا توجد نتائج'}
                        </h3>
                        <p>
                            {students.length === 0 
                                ? 'ابدأ بإضافة طلابك الأول' 
                                : 'جرب تغيير عوامل التصفية'
                            }
                        </p>
                    </div>
                ) : (
                    /* جدول الطلاب */
                    <div className="students-table-container">
                        <table className="students-table">
<thead>
    <tr>
        <th>الاسم</th>
        <th>الصف</th>
        <th>نوع التعليم</th>
        <th>آخر تقييم</th>
        <th>الإجراءات</th>
    </tr>
</thead>
                            <tbody>
                                {/* استخدام المكون المحسن StudentRow */}
                                {filteredStudents.map((student) => (
<StudentRow
                                        key={student.id} 
                                        student={student}
                                        formatDate={formatDate}
                                        handleAssessStudent={handleAssessStudent} // <--- التعديل
                                        handleViewReport={handleViewReport} // <--- التعديل
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default StudentListPanel;