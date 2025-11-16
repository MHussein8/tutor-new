import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { 
    getCurrentTeacherId, 
    getAssessmentFields,
    submitDailyAssessment 
} from '../services/teacherService';
import '../styles/TeacherDashboard.css';

// ----------------------------------------------------
// NOTE: استقبال studentId و onAssessmentCompleted و selectedCourseId كـ props
// ----------------------------------------------------
const DailyAssessmentForm = ({ studentId, onAssessmentCompleted, selectedCourseId }) => {
    // ------------------ حالات المكون ------------------
    const [assessmentFields, setAssessmentFields] = useState([]); 
    const [lessons, setLessons] = useState([]);
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const [students, setStudents] = useState([]);
    const [localSelectedStudentId, setLocalSelectedStudentId] = useState(''); 
    const [targetStudent, setTargetStudent] = useState(null); 
    const [scores, setScores] = useState({}); 
    const [teacherNotes, setTeacherNotes] = useState('');
    
    // حالات الـ UI
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [studentsLoading, setStudentsLoading] = useState(false);
    
    // ------------------ دوال الجلب (useCallback) ------------------

    const fetchAssessmentFields = useCallback(async () => {
        try {
            const fields = await getAssessmentFields(); 
            const activeFields = fields
                .filter(f => f.is_active)
                .sort((a, b) => a.order_index - b.order_index);
            setAssessmentFields(activeFields);
            
            const initialScores = {};
            activeFields.forEach(field => { initialScores[field.id] = ''; });
            setScores(initialScores);
        } catch (error) {
            console.error('Error fetching assessment fields:', error);
            setMessage('خطأ في تحميل عناصر التقييم');
        }
    }, []); 

    const fetchStudentsForLesson = useCallback(async (lessonId) => {
        if (!lessonId || targetStudent) return;
        
        setStudentsLoading(true);
        setMessage('');
        
        try {
            const lesson = lessons.find(l => l.id === parseInt(lessonId));
            if (!lesson) {
                setMessage('⚠️ تفاصيل الحصة غير موجودة');
                return;
            }

            const teacherId = await getCurrentTeacherId(); 
            if (!teacherId) {
                setMessage('⚠️ لم يتم تحديد هوية المعلم');
                return;
            }

            let query = supabase
                .from('students')
                .select(`
                    id, first_name, last_name,
                    course_enrollments!inner(course_id)
                `)
                .eq('course_enrollments.course_id', selectedCourseId)
                .eq('grade_level_id', lesson.grade_level_id);
            
            if (lesson.education_type_id) {
                query = query.eq('education_type_id', lesson.education_type_id);
            }
            
            const { data, error } = await query.order('first_name');
            
            if (error) throw error;
            setStudents(data || []);
            
            if (!data || data.length === 0) {
                setMessage('ℹ️ لا يوجد طلاب مسجلين في هذا المستوى في الكورس المحدد');
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            setMessage('❌ خطأ في تحميل الطلاب: ' + error.message);
        } finally {
            setStudentsLoading(false);
        }
    }, [lessons, targetStudent, selectedCourseId]); 

    const fetchTargetStudent = useCallback(async (id, courseId) => {
        setTargetStudent(null);
        if (!id || !courseId) return; 
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, first_name, last_name, grade_level_id, education_type_id, grade_levels(name), group_types(name), course_enrollments!inner(course_id)')
                .eq('course_enrollments.course_id', courseId)
                .eq('id', id)
                .single();

            if (error) throw error;
            setTargetStudent(data);
        } catch (error) {
            console.error('Error fetching target student:', error);
            setTargetStudent(null);
            setMessage('❌ خطأ في جلب بيانات الطالب أو أنه غير مسجل في الكورس المُختار.');
        }
    }, []); 

    useEffect(() => {
        if (studentId && selectedCourseId) { 
            fetchTargetStudent(studentId, selectedCourseId);
        } else {
            setTargetStudent(null);
        }
    }, [studentId, fetchTargetStudent, selectedCourseId]);
    
    // ------------------ التحميل الأولي (useEffect) ------------------

    useEffect(() => {
        const fetchLessons = async () => {
            try {
                const teacherId = await getCurrentTeacherId();
                let query = supabase
                    .from('lessons')
                    .select('*, grade_levels(name), group_types(name)')
                    .eq('teacher_id', teacherId)
                    .order('lesson_date', { ascending: false });
                
                if (selectedCourseId) {
                    query = query.eq('course_id', selectedCourseId);
                }
                
                if (targetStudent) {
                    query = query.eq('grade_level_id', targetStudent.grade_level_id);
                    if (targetStudent.education_type_id) {
                        query = query.eq('education_type_id', targetStudent.education_type_id);
                    }
                }
                
                const { data, error } = await query;
                
                if (error) throw error;
                setLessons(data || []);
                
                if (targetStudent && (!data || data.length === 0)) {
                    setMessage(`⚠️ لا توجد حصص مُدرجة لهذا الطالب (${targetStudent.grade_levels?.name}، ${targetStudent.group_types?.name || 'غير محدد'}).`);
                }
                
            } catch (error) {
                console.error('Error fetching lessons:', error);
                setMessage('خطأ في تحميل الحصص');
            }
        };

        if (selectedCourseId || targetStudent) {
            fetchLessons();
        }
        fetchAssessmentFields(); 
        
    }, [fetchAssessmentFields, targetStudent, selectedCourseId]); 

    // ------------------ دوال إدارة المدخلات ------------------

    const handleLessonChange = (e) => {
        const lessonId = e.target.value;
        setSelectedLessonId(lessonId);
        setLocalSelectedStudentId('');
        setScores({});
        setTeacherNotes('');
        // تم إزالة: setAssessmentFile(null);
        
        if (lessonId && !targetStudent) { 
            fetchStudentsForLesson(lessonId); 
        } else {
            setStudents([]);
        }
    };

    const handleStudentChange = (e) => {
        setLocalSelectedStudentId(e.target.value);
    };

    const handleScoreChange = (fieldId, fieldType, maxScore, value) => {
           if (fieldType === 'number') {
             const numValue = value ? Number(value) : '';
             if (numValue === '' || (numValue >= 0 && numValue <= maxScore)) {
                 setScores(prev => ({
                     ...prev,
                     [fieldId]: numValue
                 }));
             }
         } else {
             setScores(prev => ({
                 ...prev,
                 [fieldId]: value
             }));
         }
    };
    
    // ------------------ دوال الحسابات الديناميكية ------------------

    const calculateTotalScore = () => {
        return assessmentFields
            .filter(f => f.field_type === 'number')
            .reduce((sum, field) => {
                const score = scores[field.id] ? Number(scores[field.id]) : 0;
                return sum + score;
            }, 0);
    };

    const calculateMaxTotalScore = () => {
        return assessmentFields
            .filter(f => f.field_type === 'number')
            .reduce((sum, field) => sum + (field.max_score || 0), 0);
    };

    const calculatePercentage = () => {
        const total = calculateTotalScore();
        const maxTotal = calculateMaxTotalScore();
        return maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    };
    
    // ------------------ دالة الإرسال ------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const studentToSubmitId = studentId || localSelectedStudentId;
        
        if (!selectedLessonId || !studentToSubmitId) {
            setMessage('يرجى اختيار حصة وطالب');
            return;
        }
        
        if (!selectedCourseId) {
            setMessage('⚠️ يرجى اختيار كورس أولاً لإتمام عملية التقييم.');
            return;
        }

const hasDetailedResults = assessmentFields.some(field => {
    const score = scores[field.id];
    return score !== '' && score !== null && score !== undefined;
});

if (!hasDetailedResults) { 
    setMessage('⚠️ يرجى إدخال درجة/قيمة في أحد حقول التقييم المفصلة، وإلا لن يظهر التقييم في تقرير ولي الأمر.');
    return;
}

        setLoading(true);
        setMessage('');
        // تم إزالة: let assessmentFileUrl = null;
        // تم إزالة منطق رفع الملف
        
        try {
            
            // 1. تجميع نتائج التقييم
            const resultsToSubmit = assessmentFields
                .map(field => {
                    const scoreValue = scores[field.id];
                    if (scoreValue === undefined || scoreValue === null || scoreValue === '') return null;
                    
                    return {
                        field_id: field.id,
                        score_value: scoreValue.toString(),
                        field_snapshot: { 
                            field_name: field.field_name,
                            field_type: field.field_type,
                            max_score: field.max_score || null,
                            select_options: field.select_options || null,
                        }
                    };
                })
                .filter(r => r !== null);

            // 2. إرسال البيانات (تم إزالة assessmentFileUrl كمعامل خامس)
            await submitDailyAssessment(
                parseInt(selectedLessonId),
                parseInt(studentToSubmitId), 
                teacherNotes,
                resultsToSubmit,
                selectedCourseId ? parseInt(selectedCourseId) : null 
            );

            setMessage('✅ تم حفظ التقييم بنجاح!');
            setLocalSelectedStudentId(''); 

            const resetScores = {};
            assessmentFields.forEach(field => { resetScores[field.id] = ''; });
            setScores(resetScores);
            setTeacherNotes('');
            // تم إزالة: setAssessmentFile(null);

            if (onAssessmentCompleted) { 
                onAssessmentCompleted();
            }
            
        } catch (error) {
            console.error('Error saving assessment:', error);
            setMessage('❌ خطأ في حفظ التقييم: ' + (error.message || 'فشل غير معروف'));
        } finally {
            setLoading(false);
            // تم إزالة: setFileUploading(false);
        }
    };
    
    // ------------------ الواجهة (Render) ------------------

return (
    <form onSubmit={handleSubmit} className="daily-assessment-form">
        
        {/* ----------------------------------------------------------------------
            NOTE: عرض بيانات الطالب ومعلومات التصفية
        ---------------------------------------------------------------------- */}
        {studentId && (
            <div className="form-group student-info-prefilled">
                <label>الطالب المُقيَّم:</label>
                {targetStudent ? (
                    <p className="student-name-display">
                        **{targetStudent.first_name} {targetStudent.last_name}**
                        <br/>
                        <small>
                            (الصف: {targetStudent.grade_levels?.name || 'غير محدد'} | 
                            النوع: {targetStudent.group_types?.name || 'غير محدد'})
                        </small>
                    </p>
                ) : (
                    <p>جاري تحميل بيانات الطالب أو الطالب غير مسجل في هذا الكورس.</p>
                )}
            </div>
        )}

        {/* ----------------------------------------------------------------------
            NOTE: رسالة تنبيه إذا لم يتم اختيار كورس
        ---------------------------------------------------------------------- */}
        {!selectedCourseId && (
            <div className="message warning">
                ⚠️ يرجى اختيار كورس من الأعلى لرؤية الحصص والطلاب
            </div>
        )}

        <div className="form-group">
            <label>اختر الحصة:</label>
                <select 
                    value={selectedLessonId} 
                    onChange={handleLessonChange}
                    required
                    disabled={!selectedCourseId || loading}
                >
                    <option value="">-- اختر الحصة --</option>
                    {lessons.map(lesson => (
                        <option key={lesson.id} value={lesson.id}>
                            {lesson.title} - {new Date(lesson.lesson_date).toLocaleDateString('ar-EG')} - 
                            مستوى: {lesson.grade_levels?.name || 'غير محدد'}
                        </option>
                    ))}
                </select>
            </div>

        {/* ----------------------------------------------------------------------
            NOTE: عرض قائمة اختيار الطالب فقط إذا لم يكن الطالب محدداً من الـ props
        ---------------------------------------------------------------------- */}
        {selectedLessonId && !studentId && (
            <div className="form-group">
                <label>اختر الطالب:</label>
                {studentsLoading ? (
                    <p>⏳ جاري تحميل الطلاب...</p>
                ) : students.length > 0 ? (
                    <select 
                        value={localSelectedStudentId} 
                        onChange={handleStudentChange}
                        required
                        disabled={loading}
                    >
                        <option value="">-- اختر الطالب --</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.first_name} {student.last_name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="no-students">
                        <p>ℹ️ لا يوجد طلاب مسجلين في هذا المستوى لهذه الحصة</p>
                    </div>
                )}
            </div>
        )}
        
        {/* ----------------------------------------------------------------------
            NOTE: عرض حقول التقييم إذا كان أحد المُعرّفين متاحاً
        ---------------------------------------------------------------------- */}
        {((studentId && targetStudent) || localSelectedStudentId) && selectedLessonId && (
            <>
                <h3>إدخال الدرجات والتقييم:</h3>
                <div className="scores-input-group">
                    {assessmentFields.map(field => (
                        <div key={field.id} className="score-input-item">
                            <label>
                                {field.field_name}
                                {field.field_type === 'number' && ` (أقصى: ${field.max_score || 0})`}
                            </label>
                            
                            {field.field_type === 'number' && (
                                <input 
                                    type="number" 
                                    min="0" 
                                    max={field.max_score || 100}
                                    value={scores[field.id] ?? ''}
                                    onChange={(e) => handleScoreChange(field.id, field.field_type, field.max_score, e.target.value)}
                                    placeholder="الدرجة"
                                />
                            )}
                            
                            {field.field_type === 'text' && (
                                <textarea 
                                    rows="2"
                                    value={scores[field.id] ?? ''}
                                    onChange={(e) => handleScoreChange(field.id, field.field_type, null, e.target.value)}
                                    placeholder="ملاحظات نصية"
                                />
                            )}
                            
                            {field.field_type === 'select' && field.select_options && (
                                <select
                                    value={scores[field.id] ?? ''}
                                    onChange={(e) => handleScoreChange(field.id, field.field_type, null, e.target.value)}
                                    required
                                >
                                    <option value="">-- اختر --</option>
                                    {field.select_options.map((option, index) => (
                                        <option key={index} value={option}>{option}</option>
                                    ))}
                                </select>
                            )}
                            
                            {field.field_type === 'boolean' && (
                                <select
                                    value={scores[field.id] ?? ''}
                                    onChange={(e) => handleScoreChange(field.id, field.field_type, null, e.target.value)}
                                >
                                    <option value="">-- اختر --</option>
                                    <option value="true">نعم/مكتمل</option>
                                    <option value="false">لا/غير مكتمل</option>
                                </select>
                            )}
                        </div>
                    ))}
                </div>

                {/* عرض المجموع الكلي للحقول الرقمية فقط */}
                {assessmentFields.some(f => f.field_type === 'number') && (
                    <div className="total-score">
                        <label>
                            الدرجة الإجمالية: {calculateTotalScore()}/{calculateMaxTotalScore()} 
                            ({calculatePercentage()}%)
                        </label>
                    </div>
                )}

                <div className="form-group">
                    <label>ملاحظات المعلم (عامة):</label>
                    <textarea 
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        placeholder="ملاحظات عامة حول الطالب في الحصة"
                        rows="3"
                        disabled={loading}
                    />
                </div>
                
                {/* تم إزالة مجموعة حقل رفع ملف التقييم بالكامل */}

                <button 
                    type="submit" 
                    disabled={loading || !selectedCourseId}
                    className="submit-btn"
                >
                    {loading ? 'جاري الحفظ...' : '💾 حفظ التقييم'}
                </button>
            </>
        )}
        
        {/* عرض رسائل الحالة */}
        {(message) && (
            <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') || message.includes('⏳') ? 'warning' : 'error'}`}>
                {message}
            </div>
        )}
    </form>
);
};

export default DailyAssessmentForm;