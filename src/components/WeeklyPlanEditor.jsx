import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
/* eslint-disable */

const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = الأحد ... 6 = السبت

  // السبت = 6 (في هذا المنطق) → نحسب الفرق ونرجع لبداية الأسبوع
  const diff = (day - 6 + 7) % 7;

  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);

  // التاريخ بالتوقيت المحلي (YYYY-MM-DD)
  return d.toLocaleDateString('en-CA');
};


// 💡 تم تغيير اسم المكون ليكون أكثر وضوحاً: هو محرر خطة أسبوعية للمعلم
const WeeklyPlanEditor = ({ teacherId, selectedCourse }) => {


    const [planData, setPlanData] = useState({});
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return getWeekStartDate(today);
});
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');
    const [groupTypes, setGroupTypes] = useState([]);
    const [gradeLevels, setGradeLevels] = useState([]);
    const [selectedGroupType, setSelectedGroupType] = useState('');
    const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
    // 💡 لحفظ اليوم النشط في العرض (غير موجود في الكود الأصلي، لكن يُفضل إضافته)
    const [activeDay, setActiveDay] = useState(WEEK_DAYS[0]); 

    const handleInputChange = (day, field, value) => {
        setPlanData(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    };

    const initializeEmptyPlan = () => {
        const emptyPlan = {};
        WEEK_DAYS.forEach(day => {
            emptyPlan[day] = { lesson: '', homework: '', notes: '' };
        });
        return emptyPlan;
    };
    
    const handleWeekNavigation = (direction) => {
        const current = new Date(currentWeekStart);
        if (direction === 'next') {
            current.setDate(current.getDate() + 7);
        } else if (direction === 'prev') {
            current.setDate(current.getDate() - 7);
        }
        setCurrentWeekStart(getWeekStartDate(current));
    };

// 🎯 التعديل الرئيسي 1: إضافة course_id للتحقق والحفظ
const handleSavePlan = async () => {
    if (!supabase) {
        setSaveStatus('خطأ: عميل Supabase غير متاح.');
        return;
    }

    if (!selectedGroupType || !selectedGradeLevel || !selectedCourse || !teacherId) {
        setSaveStatus('⚠️ يرجى اختيار نوع التعلم والمرحلة والكورس والتأكد من هوية المعلم أولاً');
        return;
    }

    setLoading(true);
    setSaveStatus('جاري الحفظ...');
    
    try {
        const planToSave = {
            group_type_id: Number(selectedGroupType),
            grade_level_id: Number(selectedGradeLevel),
            // 💡 المعرفات تأتي من props
            teacher_id: Number(teacherId), 
            course_id: Number(selectedCourse),
            week_start_date: currentWeekStart,
            plan_data: planData,
            status: 'Draft',
        };

        // أولاً نحذف الخطة القديمة لنفس المجموعة والمرحلة والاسبوع و **الكورس**
        const { error: deleteError } = await supabase
            .from('weekly_plans')
            .delete()
            .eq('group_type_id', Number(selectedGroupType))
            .eq('grade_level_id', Number(selectedGradeLevel))
            .eq('course_id', Number(selectedCourse)) // 🎯 إضافة الكورس
            .eq('week_start_date', currentWeekStart);

        if (deleteError) {
             console.error("Delete Error:", deleteError);
        }

        // ثم نضيف الخطة الجديدة
        const { error: insertError } = await supabase
            .from('weekly_plans')
            .insert(planToSave)
            .select();

        if (insertError) {
            console.error('Supabase error:', insertError);
            setSaveStatus(`حدث خطأ أثناء الحفظ: ${insertError.message}`);
        } else {
            setSaveStatus('✅ تم حفظ الخطة بنجاح!');
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        setSaveStatus('❌ حدث خطأ غير متوقع أثناء الحفظ.');
    } finally {
        setLoading(false);
    }
};

// 💡 أبقينا على جلب الخيارات هنا لتجنب الحاجة لتمريرها كـ props من المكون الأب
useEffect(() => {
    const fetchOptions = async () => {
        // نجيب أنواع التعلم
        const { data: groupTypesData } = await supabase
            .from('group_types')
            .select('*');
        setGroupTypes(groupTypesData || []);

        // نجيب المراحل الدراسية  
        const { data: gradeLevelsData } = await supabase
            .from('grade_levels')
            .select('*');
        setGradeLevels(gradeLevelsData || []);
    };
    fetchOptions();
}, []);

// 🎯 التعديل الرئيسي 2: تضمين teacherId و selectedCourse لجلب الخطة
useEffect(() => {
    const fetchPlan = async (weekStartDate) => {
        if (!supabase || !selectedGroupType || !selectedGradeLevel || !teacherId || !selectedCourse) {
            setPlanData(initializeEmptyPlan());
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('weekly_plans')
                .select('plan_data')
                .eq('group_type_id', Number(selectedGroupType))
                .eq('grade_level_id', Number(selectedGradeLevel))
                // 🎯 استخدام teacherId و course_id من الـ props
                .eq('teacher_id', Number(teacherId)) 
                .eq('course_id', Number(selectedCourse))
                .eq('week_start_date', weekStartDate)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching plan:', error);
                setPlanData(initializeEmptyPlan());
            } else if (data) {
                setPlanData(data.plan_data);
            } else {
                setPlanData(initializeEmptyPlan());
            }
        } catch (error) {
            console.error('Error in fetchPlan:', error);
            setPlanData(initializeEmptyPlan());
        } finally {
            setLoading(false);
        }
    };

    // 💡 الآن يعتمد على كل من teacherId و selectedCourse والفلترين الآخرين
    if (teacherId && selectedCourse && selectedGroupType && selectedGradeLevel) {
        fetchPlan(currentWeekStart);
    } else {
        setPlanData(initializeEmptyPlan());
        setLoading(false);
    }
}, [teacherId, selectedCourse, currentWeekStart, selectedGroupType, selectedGradeLevel]);


// --------------------------------------------------------------------------------
// باقي الـ JSX (واجهة المستخدم)
// --------------------------------------------------------------------------------
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#374151' }}>
                <div style={{ border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '48px', height: '48px', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
                <p>يتم تحميل بيانات الخطة...</p>
            </div>
        );
    }
    
    return (
        <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh', direction: 'rtl' }}>
<h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center', color: '#1f2937' }}>الخطة الأسبوعية - تعديل وإرسال</h3>

{/* تاريخ الأسبوع الحالي في سطر مستقل */}
<div style={{ textAlign: 'center', marginBottom: '20px' }}>
    <span style={{ fontSize: '18px', fontWeight: '500', color: '#4b5563' }}>الأسبوع الحالي: {currentWeekStart}</span>
</div>

{/* الفلاتر وأزرار التنقل في سطر واحد */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'nowrap' }}>
    <button 
        onClick={() => handleWeekNavigation('prev')}
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            fontWeight: '600', 
            padding: '8px 16px', 
            borderRadius: '9999px', 
            border: 'none', 
            cursor: 'pointer', 
            transition: 'all 0.3s', 
            whiteSpace: 'nowrap',
            width: '150px'
        }}
    >
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span>الأسبوع السابق</span>
    </button>
    
    {/* الفلاتر في المنتصف */}
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
            <label style={{ fontWeight: '600', marginRight: '10px' }}>نوع التعلم: </label>
            <select 
                value={selectedGroupType} 
                onChange={(e) => setSelectedGroupType(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
                <option value="">اختر نوع التعلم</option>
                {groupTypes.map(type => (
                    <option key={type.id} value={type.id}>
                        {type.name}
                    </option>
                ))}
            </select>
        </div>
        
        <div>
            <label style={{ fontWeight: '600', marginRight: '10px' }}>المرحلة: </label>
            <select 
                value={selectedGradeLevel} 
                onChange={(e) => setSelectedGradeLevel(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
                <option value="">اختر المرحلة</option>
                {gradeLevels.map(level => (
                    <option key={level.id} value={level.id}>
                        {level.name}
                    </option>
                ))}
            </select>
        </div>

        {/* 💡 هذا الكورس تم اختياره في المكون الأب ولا يجب أن يتم تغييره هنا */}
        <div style={{ border: '1px dashed #3b82f6', padding: '8px', borderRadius: '6px' }}>
            <label style={{ fontWeight: '600', marginRight: '10px', color: '#3b82f6' }}>الكورس (محدد): </label>
            <span style={{ fontWeight: 'bold' }}>{selectedCourse || 'لم يختر'}</span>
        </div>
    </div>
    
    <button 
        onClick={() => handleWeekNavigation('next')}
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            fontWeight: '600', 
            padding: '8px 16px', 
            borderRadius: '9999px', 
            border: 'none', 
            cursor: 'pointer', 
            transition: 'all 0.3s', 
            whiteSpace: 'nowrap',
            width: '150px'
        }}
    >
        <span>الأسبوع التالي</span>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
    </button>
</div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f3f4f6' }}>
                            <tr>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>اليوم</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>الدرس</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>الواجب</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody style={{ backgroundColor: 'white' }}>
                            {WEEK_DAYS.map(day => (
                                <tr key={day} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#374151' }}>{day}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <textarea
                                            value={planData[day]?.lesson || ''}
                                            onChange={(e) => handleInputChange(day, 'lesson', e.target.value)}
                                            placeholder="اسم الدرس أو المحتوى..."
                                            style={{ width: '100%', height: '96px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                                        />
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <textarea
                                            value={planData[day]?.homework || ''}
                                            onChange={(e) => handleInputChange(day, 'homework', e.target.value)}
                                            placeholder="تفاصيل الواجب والموعد..."
                                            style={{ width: '100%', height: '96px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                                        />
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <textarea
                                            value={planData[day]?.notes || ''}
                                            onChange={(e) => handleInputChange(day, 'notes', e.target.value)}
                                            placeholder="ملاحظات حول أداء الطالب..."
                                            style={{ width: '100%', height: '96px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button 
                    style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', padding: '12px 24px', borderRadius: '9999px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'all 0.3s' }}
                    onClick={handleSavePlan}
                    disabled={loading || !selectedCourse || !teacherId}
                >
                    {loading ? 'جاري الحفظ...' : 'حفظ وإرسال الخطة لولي الأمر'}
                </button>
                {saveStatus && <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '500' }}>{saveStatus}</p>}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default WeeklyPlanEditor;