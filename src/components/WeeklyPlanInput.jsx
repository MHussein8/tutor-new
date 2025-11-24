// src/components/WeeklyPlanInput.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase'; 
import { getAssessmentFields } from '../services/teacherService'; // نستخدم دالة جلب الحقول فقط

// --------------------------------------------------------------------------------
// البيانات الثابتة وتوليد الأيام (بدون تغيير)
// --------------------------------------------------------------------------------
const generateWeekDays = (startDate) => {
    const days = [];
    // التأكد من أن التوقيت هو منتصف الليل لتجنب مشاكل المناطق الزمنية
    const start = new Date(startDate + 'T00:00:00'); 
    
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    
    for (let i = 0; i < 6; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);

        const yyyy = day.getFullYear();
        const mm = String(day.getMonth() + 1).padStart(2, '0');
        const dd = String(day.getDate()).padStart(2, '0');
        
        days.push({
            id: dayNames[i], 
            name: dayNames[i], 
            date: `${yyyy}-${mm}-${dd}`
        });
    }
    return days;
};


// أنواع الحقول المتاحة (بدون تغيير)
const FIELD_TYPES = [
  { value: 'number', label: 'درجة رقمية' },
  { value: 'text', label: 'ملاحظة نصية' },
  { value: 'select', label: 'اختيار من قائمة' },
  { value: 'boolean', label: 'نعم/لا' },
];

// ==============================================================================
// Component: EditorToolbar (مبسط) (بدون تغيير)
// ==============================================================================
const EditorToolbar = ({ editorRef }) => {
  const [savedSelection, setSavedSelection] = useState(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (editorRef.current && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      setSavedSelection(selection.getRangeAt(0));
    } else {
      setSavedSelection(null); 
    }
  };

  const formatText = (command, value = null) => {
    const editor = editorRef.current;
    
    if (editor) {
        editor.focus();
    }
    
    const selection = window.getSelection();
    if (editor && savedSelection) {
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    } 
    
    try {
        if (command === 'foreColor') {
            document.execCommand('styleWithCSS', false, true); 
            document.execCommand(command, false, value);
            document.execCommand('styleWithCSS', false, false); 
        } else {
            document.execCommand(command, false, value);
        }
    } catch (e) {
      console.error("Formatting error:", e);
    }
  };

  return (
    <div 
      style={{
        background: '#f0f4f7',
        padding: '10px',
        borderRadius: '8px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: '10px',
        border: '1px solid #e0e0e0'
      }}
      onMouseDown={(e) => {
        if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
          e.preventDefault();
          saveSelection(); 
        }
      }}
    >
      <button 
        onClick={() => formatText('bold')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
      ><b>B</b></button>
      <button 
        onClick={() => formatText('italic')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', fontStyle: 'italic' }}
      ><i>I</i></button>
      <button 
        onClick={() => formatText('underline')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', textDecoration: 'underline' }}
      ><u>U</u></button>
      
      {/* أزرار المحاذاة */}
      <button 
        onClick={() => formatText('justifyLeft')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >⬅️</button>
      <button 
        onClick={() => formatText('justifyCenter')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >⏺️</button>
      <button 
        onClick={() => formatText('justifyRight')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >➡️</button>
      
      <button 
        onClick={() => formatText('insertUnorderedList')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >• List</button>
      
      {/* القائمة المنسدلة للألوان */}
      <select 
        onChange={(e) => formatText('foreColor', e.target.value)}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
        defaultValue=""
        onMouseUp={saveSelection} 
        onFocus={saveSelection}
      >
        <option value="" disabled>لون النص</option>
        <option value="#e17055">أحمر</option>
        <option value="#74b9ff">أزرق</option>
        <option value="#00b894">أخضر</option>
        <option value="#2d3436">أسود</option>
      </select>
    </div>
  );
};

// ==============================================================================
// Component: WeeklyPlanInput (المكون الرئيسي)
// ==============================================================================
const WeeklyPlanInput = ({ teacherId, selectedCourse, onCourseChange, courses: propCourses }) => {
    const [activeDay, setActiveDay] = useState('السبت');
    const [planData, setPlanData] = useState({});
    const [groupTypes, setGroupTypes] = useState([]);
    const [gradeLevels, setGradeLevels] = useState([]);
    // 💡 التعديل 1: أصبح مصدر الكورسات هو الـ props
    const courses = propCourses; 
    
    const [selectedGroupType, setSelectedGroupType] = useState('');
    const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
    const [saveStatus, setSaveStatus] = useState('جاري التحقق من حالة تسجيل الدخول...');
    const [loading, setLoading] = useState(false);
    // 💡 التعديل 2: تم حذف setTeacherId لأنه يأتي من الـ props
    
    const [weekDays, setWeekDays] = useState([]); 
    const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0]);
    
    const lessonEditorRef = useRef(null);
    const homeworkEditorRef = useRef(null);
    const notesEditorRef = useRef(null);

    // الحقول الجديدة للنظام الديناميكي
    const [assessmentFields, setAssessmentFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);

    // -----------------------------------------------------------
    // دالة جلب الخطة الموجودة (بدون تغيير)
    // -----------------------------------------------------------
const fetchExistingPlan = useCallback(async (group, grade, teacher, course) => {
    if (!group || !grade || !teacher || !course) return;

    try {
        const weekStartDate = selectedWeek;

const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('group_type_id', group)
    .eq('grade_level_id', grade)
    .eq('teacher_id', teacher)
    .eq('course_id', course)
    .eq('week_start_date', weekStartDate)
    .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Error fetching existing plan:", error);
            setSaveStatus('📝 ابدأ بكتابة الخطة الجديدة');
        } else if (data) {
            setPlanData(data.plan_data || {});
            setSaveStatus('✅ تم تحميل الخطة السابقة بنجاح.');
        } else {
            setPlanData({}); 
            setSaveStatus('📝 ابدأ بكتابة الخطة الجديدة');
        }
    } catch (error) {
        console.error("Unexpected error fetching plan:", error);
        setPlanData({}); 
        setSaveStatus('📝 ابدأ بكتابة الخطة الجديدة');
    }
}, [selectedWeek]);
    
    // -----------------------------------------------------------
    // دالة جلب الخيارات (بدون تغيير)
    // -----------------------------------------------------------
    const fetchOptions = useCallback(async () => {
      try {
        const { data: groupTypesData } = await supabase.from('group_types').select();
        const { data: gradeLevelsData } = await supabase.from('grade_levels').select();
        setGroupTypes(groupTypesData || []);
        setGradeLevels(gradeLevelsData || []);
      } catch (error) {
        console.error("Error fetching options:", error);
        setSaveStatus('❌ فشل جلب الخيارات (أنواع المجموعات والمراحل).');
      }
    }, []);

    // 💡 التعديل 3: تم حذف دالة fetchTeacherId بالكامل
    // 💡 التعديل 4: تم حذف دالة fetchCourses بالكامل

    // -----------------------------------------------------------
    // دالة جلب عناصر التقييم الديناميكية (تعتمد على teacherId القادم من props)
    // -----------------------------------------------------------
    const fetchAssessmentFields = useCallback(async () => {
      if (!teacherId) return;
      
      setLoadingFields(true);
      try {
        const fields = await getAssessmentFields();
        // نفلتر فقط الحقول النشطة
        const activeFields = fields.filter(field => field.is_active);
        setAssessmentFields(activeFields);
      } catch (error) {
        console.error('Failed to fetch assessment fields:', error);
        setSaveStatus('⚠️ فشل في تحميل عناصر التقييم');
      } finally {
        setLoadingFields(false);
      }
    }, [teacherId]);

    // -----------------------------------------------------------
    // 💡 التعديل 5: تبسيط الـ useEffect الأولي
    // -----------------------------------------------------------
    useEffect(() => {
        const dynamicDays = generateWeekDays(selectedWeek);
        setWeekDays(dynamicDays);
        if (dynamicDays.length > 0) {
            setActiveDay(dynamicDays[0].name);
        }
        
        fetchOptions();
        
        // جلب عناصر التقييم الديناميكية (الآن يعتمد على teacherId القادم من props)
        if (teacherId) {
          fetchAssessmentFields();
          setSaveStatus('✅ تم تحديد هوية المعلم من الصفحة الرئيسية.');
        } else {
            setSaveStatus('⚠️ يرجى التأكد من تسجيل الدخول والمراحل.');
        }
        
    }, [selectedWeek, fetchOptions, teacherId, fetchAssessmentFields]);
    
    // -----------------------------------------------------------
    // useEffect لتحميل الخطة عندما تكون الفلاتر والمعلم جاهزة (بدون تغيير)
    // -----------------------------------------------------------
useEffect(() => {
    // 💡 يجب أن نستخدم teacherId و selectedCourse القادمين من props
    if (selectedGroupType && selectedGradeLevel && teacherId && selectedCourse) {
        fetchExistingPlan(selectedGroupType, selectedGradeLevel, teacherId, selectedCourse);
    }
}, [selectedGroupType, selectedGradeLevel, teacherId, selectedCourse, fetchExistingPlan]);

    // -----------------------------------------------------------
    // الدالة الجديدة: تحديث الحقل فوراً (بدون تغيير)
    // -----------------------------------------------------------
    const updatePlanField = useCallback((dayName, field, value) => {
        setPlanData(prevPlanData => {
            return {
                ...prevPlanData,
                [dayName]: {
                    ...prevPlanData[dayName],
                    [field]: value
                }
            };
        });
    }, []);

    // -----------------------------------------------------------
    // الدالة الجديدة: مزامنة محتوى الـ Ref إلى الحالة (بدون تغيير)
    // -----------------------------------------------------------
    const syncRefContentToState = useCallback(() => {
        const day = weekDays.find(d => d.name === activeDay);
        if (!day) return;

        const lessonContent = lessonEditorRef.current?.innerHTML || '';
        const homeworkContent = homeworkEditorRef.current?.innerHTML || '';
        const notesContent = notesEditorRef.current?.innerHTML || '';
        
        setPlanData(prevPlanData => {
            const currentDayData = prevPlanData[day.name] || {};
            
            const isLessonDirty = lessonContent !== (currentDayData.lesson || '');
            const isHomeworkDirty = homeworkContent !== (currentDayData.homework || '');
            const isNotesDirty = notesContent !== (currentDayData.notes || '');

            if (!isLessonDirty && !isHomeworkDirty && !isNotesDirty) {
                return prevPlanData;
            }
            
            return {
                ...prevPlanData,
                [day.name]: {
                    ...currentDayData,
                    lesson: isLessonDirty ? lessonContent : currentDayData.lesson,
                    homework: isHomeworkDirty ? homeworkContent : currentDayData.homework,
                    notes: isNotesDirty ? notesContent : currentDayData.notes,
                }
            };
        });
    }, [activeDay, weekDays]);

    // -----------------------------------------------------------
    // useEffect الجديدة: مزامنة الـ Ref عند تغيير اليوم النشط (بدون تغيير)
    // -----------------------------------------------------------
    useEffect(() => {
        const dayContent = planData[activeDay];
        
        if (lessonEditorRef.current) {
            const lessonHtml = dayContent?.lesson || '';
            if (lessonEditorRef.current.innerHTML !== lessonHtml) {
                lessonEditorRef.current.innerHTML = lessonHtml;
            }
        }
        if (homeworkEditorRef.current) {
            const homeworkHtml = dayContent?.homework || '';
            if (homeworkEditorRef.current.innerHTML !== homeworkHtml) {
                homeworkEditorRef.current.innerHTML = homeworkHtml;
            }
        }
        if (notesEditorRef.current) {
            const notesHtml = dayContent?.notes || '';
            if (notesEditorRef.current.innerHTML !== notesHtml) {
                notesEditorRef.current.innerHTML = notesHtml;
            }
        }
    }, [activeDay, planData]);

    const handleEvaluationChange = (fieldId, checked, details) => {
      const field = assessmentFields.find(f => f.id === fieldId);
      const newPlanData = {
          ...planData,
          [activeDay]: {
              ...planData[activeDay],
              evaluations: {
                  ...planData[activeDay]?.evaluations,
                  [fieldId]: {
                      active: checked,
                      details: details,
                      field_name: field?.field_name || '',
                      field_type: field?.field_type || ''
                  }
              }
          }
      };
      setPlanData(newPlanData);
    };

    // -----------------------------------------------------------
    // دالة حفظ الخطة (تم تنظيف التحقق)
    // -----------------------------------------------------------
const saveWeekPlan = async () => {
    syncRefContentToState();
    
    // 💡 التحقق الآن يعتمد فقط على الفلاتر والـ teacherId القادمين من props
    if (!selectedGroupType) {
        setSaveStatus('❌ يرجى اختيار نوع التعلم أولاً');
        return;
    }

    if (!selectedGradeLevel) {
        setSaveStatus('❌ يرجى اختيار المرحلة الدراسية أولاً');
        return;
    }

    if (!selectedCourse) {
        setSaveStatus('❌ يرجى اختيار الكورس أولاً');
        return;
    }

    if (!teacherId) {
        setSaveStatus('⚠️ لا يمكن الحفظ. لم يتم تحديد هوية المعلم.');
        return;
    }

    setLoading(true);
    setSaveStatus('جاري الحفظ...');
    
    try {
        const weekStartDate = weekDays[0]?.date || new Date().toISOString().split('T')[0];

        const planToSave = {
            group_type_id: Number(selectedGroupType),
            grade_level_id: Number(selectedGradeLevel),
            teacher_id: teacherId, // يأتي من الـ props
            course_id: Number(selectedCourse), // يأتي من الـ props
            week_start_date: weekStartDate, 
            plan_data: planData,
            status: 'Published',
        };

        // 1. حذف الخطة القديمة لنفس المعلم والأسبوع
        const { error: deleteError } = await supabase
            .from('weekly_plans')
            .delete()
            .eq('group_type_id', selectedGroupType)
            .eq('grade_level_id', selectedGradeLevel)
            .eq('teacher_id', teacherId) 
            .eq('week_start_date', planToSave.week_start_date)
            .eq('course_id', planToSave.course_id);

        if (deleteError) {
            console.error("Delete Error:", deleteError);
        }

        // 2. إدخال الخطة الجديدة
        const { error: insertError } = await supabase.from('weekly_plans').insert(planToSave);
        
        if (insertError) throw insertError;
        setSaveStatus('✅ تم حفظ الخطة بنجاح!');
    } catch (error) {
        console.error("Error during save:", error);
        setSaveStatus(`❌ حدث خطأ أثناء الحفظ. السبب: ${error.message || 'خطأ غير محدد'}`);
    } finally {
        setLoading(false);
    }
};

    // -----------------------------------------------------------
    // الـ JSX (بدون تغيير كبير)
    // -----------------------------------------------------------
    return (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh', direction: 'rtl', fontFamily: 'Inter, sans-serif' }}>
            
            {/* الفلاتر */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}>
                <div>
                    <label style={{ fontWeight: '600', marginLeft: '10px' }}>نوع التعلم: </label>
                    <select 
                        value={selectedGroupType} 
                        onChange={(e) => setSelectedGroupType(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                        <option value="">اختر نوع التعلم</option>
                        {groupTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label style={{ fontWeight: '600', marginLeft: '10px' }}>المرحلة: </label>
                    <select 
                        value={selectedGradeLevel} 
                        onChange={(e) => setSelectedGradeLevel(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                        <option value="">اختر المرحلة</option>
                        {gradeLevels.map(level => (
                            <option key={level.id} value={level.id}>{level.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                  <label style={{ fontWeight: '600', marginLeft: '10px' }}>الكورس: </label>
{/* 💡 التعديل 6: عرض رسالة إذا لم يكن هناك كورسات */}
{courses.length === 0 && teacherId && (
  <p style={{color: 'red', fontSize: '14px', marginTop: '5px'}}>
    ⚠️ أنشئ كورس أولاً علشان تنشئ خطط أسبوعية
  </p>
)}
<select 
  value={selectedCourse} 
  onChange={(e) => onCourseChange(e.target.value)}
  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
  required
>
  <option value="">اختر الكورس</option>
  {courses.map(course => (
    <option key={course.id} value={course.id}>
      {course.name}
    </option>
  ))}
</select>
                </div>
            </div>
{/* محدد الأسبوع */}
<div style={{
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center'
}}>
    <div>
        <label style={{ fontWeight: '600', marginLeft: '10px' }}>اختر أسبوع: </label>
        <input 
            type="date" 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ 
                padding: '8px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '16px'
            }}
        />
    </div>
    
    {/* أزرار التنقل بين الأسابيع */}
    <div style={{ display: 'flex', gap: '10px' }}>
        <button 
            onClick={() => {
                const prevWeek = new Date(selectedWeek);
                prevWeek.setDate(prevWeek.getDate() - 7);
                setSelectedWeek(prevWeek.toISOString().split('T')[0]);
            }}
        >
            ⬅️ الأسبوع السابق
        </button>
        
        <button 
            onClick={() => {
                const nextWeek = new Date(selectedWeek);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedWeek(nextWeek.toISOString().split('T')[0]);
            }}
        >
            الأسبوع التالي ➡️
        </button>
        
        <button 
            onClick={() => setSelectedWeek(new Date().toISOString().split('T')[0])}
        >
            هذا الأسبوع
        </button>
    </div>
</div>            

{/* تبويبات الأيام */}
            <div 
                className="weekly-plan-tabs"
                style={{
                    display: 'flex',
                    background: '#2d3436',
                    padding: '0 25px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    borderRadius: '10px',
                    marginBottom: '20px',
                }}
            >
                {weekDays.map(day => (
                    <div
                        key={day.name}
                        onClick={() => {
                            if (activeDay !== day.name) {
                                syncRefContentToState();
                                setActiveDay(day.name);
                            }
                        }}
                        style={{
                            padding: '18px 30px',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: activeDay === day.name ? '4px solid #fd79a8' : '4px solid transparent',
                            background: activeDay === day.name ? '#e17055' : 'transparent',
                            transition: 'all 0.3s ease',
                            fontWeight: '600',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        {day.name}
                        <div style={{ fontSize: '0.9em', opacity: '0.8' }}>{day.date}</div>
                    </div>
                ))}
            </div>

            {/* محتوى اليوم النشط */}
            <div style={{ display: 'grid', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* قسم الدرس */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #74b9ff'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>📖</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>الدرس</h3>
                    </div>
                    
                    {/* شريط الأدوات الخاص بالدرس */}
                    <EditorToolbar editorRef={lessonEditorRef} />
                    
                    <div
                        ref={lessonEditorRef} 
                        contentEditable
                        className="content-editor"
                        onBlur={(e) => updatePlanField(activeDay, 'lesson', e.target.innerHTML)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px',
                            border: '2px solid #bdc3c7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}
                    />
                </div>

                {/* قسم الواجب */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #55efc4'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>✏️</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>الواجب</h3>
                    </div>
                    
                    {/* شريط الأدوات الخاص بالواجب */}
                    <EditorToolbar editorRef={homeworkEditorRef} />

                    <div
                        ref={homeworkEditorRef} 
                        contentEditable
                        className="content-editor"
                        onBlur={(e) => updatePlanField(activeDay, 'homework', e.target.innerHTML)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px',
                            border: '2px solid #bdc3c7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}
                    />
                </div>

                {/* قسم التقييمات (تم التحديث للنظام الديناميكي) */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #fdcb6e'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>⭐</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>التقييمات المخطط لها</h3>
                    </div>

                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ color: '#2d3436', marginBottom: '15px', paddingBottom: '8px', borderBottom: '2px solid #00b894' }}>🔄 التقييمات الأساسية</h4>
                            
                            <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px',
                            background: 'rgba(0, 184, 148, 0.05)',
                            borderRadius: '10px',
                            marginBottom: '10px',
                            borderRight: '3px solid #00b894'
                            }}>
                            <input type="checkbox" checked disabled style={{ marginTop: '3px' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3436', marginBottom: '8px' }}>✅ الحضور</div>
                                <textarea 
                                value="حضور الحصة كاملة"
                                readOnly
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    background: '#f8f9fa'
                                }}
                                />
                            </div>
                            </div>

                            <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px',
                            background: 'rgba(0, 184, 148, 0.05)',
                            borderRadius: '10px',
                            marginBottom: '10px',
                            borderRight: '3px solid #00b894'
                            }}>
                            <input type="checkbox" checked disabled style={{ marginTop: '3px' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3436', marginBottom: '8px' }}>💬 التفاعل والمشاركة</div>
                                <textarea 
                                value="المشاركة في الأنشطة الصفية والمناقشات"
                                readOnly
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    background: '#f8f9fa'
                                }}
                                />
                            </div>
                            </div>
                        </div>

                        {/* التقييمات الديناميكية */}
                        <div>
                            <h4 style={{ color: '#2d3436', marginBottom: '15px', paddingBottom: '8px', borderBottom: '2px solid #74b9ff' }}>
                              📊 عناصر التقييم الديناميكية
                              {loadingFields && <small style={{ marginRight: '10px', color: '#666' }}>(جاري التحميل...)</small>}
                            </h4>
                            
                            {assessmentFields.length === 0 ? (
                              <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                background: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px dashed #ddd'
                              }}>
                                <p style={{ color: '#666', margin: 0 }}>
                                  {loadingFields ? 'جاري تحميل عناصر التقييم...' : 'لا توجد عناصر تقييم مخصصة. قم بإعداد عناصر التقييم أولاً.'}
                                </p>
                              </div>
                            ) : (
                              assessmentFields.map(field => (
                                <div key={field.id} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '15px',
                                  padding: '15px',
                                  background: 'rgba(116, 185, 255, 0.05)',
                                  borderRadius: '10px',
                                  marginBottom: '10px',
                                  borderRight: '3px solid #74b9ff'
                                }}>
                                  <input 
                                    type="checkbox" 
                                    checked={planData[activeDay]?.evaluations?.[field.id]?.active || false}
                                    onChange={(e) => handleEvaluationChange(field.id, e.target.checked, planData[activeDay]?.evaluations?.[field.id]?.details || '')}
                                    style={{ marginTop: '3px' }} 
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', color: '#2d3436', marginBottom: '8px' }}>
                                      {field.field_name}
                                      <small style={{ marginRight: '10px', color: '#666' }}>
                                        ({FIELD_TYPES.find(t => t.value === field.field_type)?.label})
                                        {field.field_type === 'number' && field.max_score && (
                                          <span style={{ marginRight: '5px' }}> - أقصى: {field.max_score}</span>
                                        )}
                                      </small>
                                    </div>
                                    <textarea 
                                      value={planData[activeDay]?.evaluations?.[field.id]?.details || ''}
                                      onChange={(e) => handleEvaluationChange(field.id, planData[activeDay]?.evaluations?.[field.id]?.active || false, e.target.value)}
                                      placeholder={`تفاصيل تقييم ${field.field_name}...`}
                                      disabled={!planData[activeDay]?.evaluations?.[field.id]?.active}
                                      style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        minHeight: '60px',
                                        background: planData[activeDay]?.evaluations?.[field.id]?.active ? 'white' : '#f8f9fa'
                                      }}
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                        </div>
                </div>


                {/* قسم الملاحظات */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #fd79a8'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>📝</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>ملاحظات المعلم</h3>
                    </div>
                    
                    {/* شريط الأدوات الخاص بالملاحظات */}
                    <EditorToolbar editorRef={notesEditorRef} />

                    <div
                        ref={notesEditorRef} 
                        contentEditable
                        className="content-editor"
                        onBlur={(e) => updatePlanField(activeDay, 'notes', e.target.innerHTML)}
                        style={{
                            width: '100%',
                            minHeight: '150px',
                            padding: '20px',
                            border: '2px solid #bdc3c7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}
                    />
                </div>
            </div>

            {/* حالة الحفظ وزر الحفظ */}
            <div style={{ 
                textAlign: 'center', 
                marginTop: '40px',
                padding: '30px',
                background: 'white',
                borderRadius: '15px',
                boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)'
            }}>
                <p style={{
                    color: saveStatus.startsWith('❌') || saveStatus.startsWith('⚠️') ? '#e17055' : '#74b9ff',
                    fontWeight: 'bold', 
                    marginBottom: '15px',
                    minHeight: '24px'
                }}>
                    {saveStatus}
                </p>
                <button 
                    onClick={() => !selectedCourse ? setSaveStatus('❌ يرجى اختيار الكورس أولاً') : saveWeekPlan()}
                    disabled={loading}
                    style={{
                        padding: '15px 40px',
                        background: loading ? '#ccc' : 'linear-gradient(135deg, #00b894, #00a085)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.2em',
                        fontWeight: '600',
                        cursor: loading || !teacherId ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? 'جاري الحفظ...' : '💾 حفظ الخطة الأسبوعية'}
                </button>
            </div>
        </div>
    );
};

export default WeeklyPlanInput;