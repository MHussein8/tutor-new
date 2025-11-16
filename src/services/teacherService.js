// teacherService.js
import { supabase } from './supabase';

/**
 * دالة مساعدة للحصول على teacherId الحالي من localStorage.
 */
export const getCurrentTeacherId = () => {
    const teacherId = localStorage.getItem('current_teacher_id');
    return teacherId ? parseInt(teacherId) : null;
};

// ----------------------------------------------------
// ✅ إضافة دالة مساعدة لجلب مُعرّفات كورسات المدرس
// ----------------------------------------------------
/**
 * دالة مساعدة: تسترجع جميع مُعرّفات (IDs) الكورسات التي يملكها المدرس الحالي.
 */
const getTeacherCourseIds = async (teacherId) => {
    const { data, error } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId);
    if (error) throw error;
    return data.map(course => course.id);
};

/**
 * تسترجع إحصائيات المدرس الحالي (عدد الطلاب، متوسط الأداء، الإحصائيات الأسبوعية).
 * (تم التعديل: الاعتماد على course_id بدلاً من teacher_id مباشر)
 */
export const getTeacherStats = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) return { totalStudents: 0, averagePerformance: 0, weeklyAssessments: 0, weeklyClasses: 0 };

    try {
        // 🚨 خطوة جديدة: جلب مُعرّفات كورسات المدرس أولاً
        const courseIds = await getTeacherCourseIds(teacherId);
        if (courseIds.length === 0) {
            return { totalStudents: 0, averagePerformance: 0, weeklyAssessments: 0, weeklyClasses: 0 };
        }

        // 1. عدد الطلاب (الطلاب المسجلين في كورسات المدرس)
        const { count: totalStudents, error: studentsError } = await supabase
            .from('students')
            .select('*, course_enrollments!inner(course_id)', { count: 'exact' })
            .in('course_enrollments.course_id', courseIds); // 💡 التصفية بالكورسات

        // 2. كل التقييمات (المرتبطة بكورسات المدرس)
        const { count: weeklyAssessments, error: assessmentsError } = await supabase
            .from('daily_assessments')
            .select('*', { count: 'exact' })
            .in('course_id', courseIds); // 💡 التصفية بالكورسات

        // 3. كل الحصص (المرتبطة بكورسات المدرس)
        const { count: weeklyClasses, error: lessonsError } = await supabase
            .from('lessons')
            .select('*', { count: 'exact' })
            .in('course_id', courseIds); // 💡 التصفية بالكورسات

        // 4. كل النتائج (المرتبطة بتقييم مرتبط بكورس المدرس)
        const { data: results, error: resultsError } = await supabase
            .from('daily_assessment_results')
            .select('score_value, field_snapshot, assessment_id!inner(course_id)')
            .in('assessment_id.course_id', courseIds); // 💡 التصفية بالكورسات

        // حساب الأداء (يبقى كما هو)
        let totalScores = 0;
        let totalItems = 0;

        results?.forEach(result => {
            const snapshot = result.field_snapshot;
            if (snapshot && snapshot.field_type === 'number') {
                const score = parseFloat(result.score_value);
                const maxScore = snapshot.max_score || 1;
                
                if (!isNaN(score) && score !== null) {
                    totalScores += score;
                    totalItems += maxScore;
                }
            }
        });

        const averagePerformance = totalItems > 0 ? (totalScores / totalItems) * 100 : 0;

        console.log('DEBUG stats:', {
            totalStudents,
            weeklyAssessments,
            weeklyClasses,
            averagePerformance,
            resultsCount: results?.length
        });

        return {
            totalStudents: totalStudents || 0,
            averagePerformance: Math.round(averagePerformance) || 0,
            weeklyAssessments: weeklyAssessments || 0,
            weeklyClasses: weeklyClasses || 0
        };

    } catch (error) {
        console.error("Error in getTeacherStats:", error);
        return {
            totalStudents: 0,
            averagePerformance: 0,
            weeklyAssessments: 0,
            weeklyClasses: 0
        };
    }
};

/**
 * تسترجع قائمة الطلاب المسجلين في كورسات المدرس الحالي فقط.
 * (تم التعديل: الاعتماد على course_enrollments)
 */
export const getStudents = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) return [];

    const courseIds = await getTeacherCourseIds(teacherId);
    if (courseIds.length === 0) return [];

    // 💡 جلب الطلاب من خلال جدول course_enrollments المربوط بكورسات المدرس
    const { data, error } = await supabase
        .from('students')
        .select(`*, course_enrollments!inner(course_id)`)
        .in('course_enrollments.course_id', courseIds)
        .order('first_name');

    if (error) throw error;
    
    // إزالة التكرارات الناتجة عن الـ join في حال كان الطالب مسجل في أكثر من كورس
    const uniqueStudents = {};
    data.forEach(student => {
        const { course_enrollments, ...cleanStudent } = student;
        uniqueStudents[cleanStudent.id] = cleanStudent;
    });
    return Object.values(uniqueStudents);
};

/**
 * تسترجع قائمة بالتقييمات اليومية المرتبطة بكورسات المدرس الحالي.
 * (تم التعديل: الاعتماد على course_id في daily_assessments)
 */
export const getDailyAssessments = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) return [];

    const courseIds = await getTeacherCourseIds(teacherId);
    if (courseIds.length === 0) return [];
    
    // 💡 التصفية تتم مباشرة على course_id في جدول daily_assessments
    const { data, error } = await supabase
        .from('daily_assessments')
        .select('*')
        .in('course_id', courseIds)
        .order('lesson_date', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * دالة مساعدة لجلب معرفات الطلاب التابعين لمدرس معين.
 * ❌ تم حذفها لأنها لم تعد تستخدم في النهج الجديد.
 */
// const getStudentIdsByTeacher = async (teacherId) => {
//     const { data, error } = await supabase
//         .from('students')
//         .select('id')
//         .eq('teacher_id', teacherId);
// 
//     if (error) throw error;
//     return data.map(student => student.id);
// };

/**
 * تسترجع تقرير أسبوعي مفصل للطالب بناءً على العناصر المخصصة للمعلم.
 * تعتمد الآن على جدول daily_assessment_results للحصول على البيانات الديناميكية.
 */
export const getCumulativePerformanceReport = async (studentId, startDate, endDate) => {
    const teacherId = getCurrentTeacherId();
    
    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    
    // 1. جلب رؤوس التقييمات (IDs) للطالب والمعلم خلال الفترة المحددة
    const { data: dailyAssessments, error: assessmentsError } = await supabase
        .from('daily_assessments')
        .select('id, lesson_date') // نحتاج الـ lesson_date لعرضها
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId) // ✅ يبقى للتأكد من ملكية المدرس للتقييم
        .gte('lesson_date', start)
        .lte('lesson_date', end)
        .order('lesson_date', { ascending: true });

    if (assessmentsError) throw assessmentsError;
    if (!dailyAssessments || dailyAssessments.length === 0) {
        return null;
    }
    
    const assessmentIds = dailyAssessments.map(a => a.id);

    // 2. جلب جميع النتائج التفصيلية لهذه التقييمات
    const { data: results, error: resultsError } = await supabase
        .from('daily_assessment_results')
        .select('assessment_id, score_value, field_snapshot')
        .in('assessment_id', assessmentIds);

    if (resultsError) throw resultsError;

    // 3. تجميع النتائج: تجميع الدرجات لكل عنصر تقييم (Field Name)
    const reportSummary = {};

    results.forEach(result => {
        const snapshot = result.field_snapshot;
        const score = parseFloat(result.score_value);

        // نحسب فقط النتائج الرقمية القابلة للتقييم الإجمالي
        if (snapshot && snapshot.field_type === 'number' && !isNaN(score) && score !== null) {
            const fieldName = snapshot.field_name;
            const maxScorePerItem = snapshot.max_score || 0;
            
            if (!reportSummary[fieldName]) {
                reportSummary[fieldName] = {
                    totalScoreAchieved: 0,
                    totalScorePossible: 0, // مجموع الدرجات القصوى الممكنة
                    assessmentCount: 0, // عدد مرات التقييم لهذا العنصر
                    details: [] // لتخزين التفاصيل (اختياري)
                };
            }
            // التجميع
            reportSummary[fieldName].totalScoreAchieved += score;
            reportSummary[fieldName].totalScorePossible += maxScorePerItem;
            reportSummary[fieldName].assessmentCount += 1;
        }
    });
    
    // 4. تحويل التجميع إلى تقرير نهائي (حساب النسبة المئوية)
    const finalReport = Object.keys(reportSummary).map(fieldName => {
        const summary = reportSummary[fieldName];
        const percentage = summary.totalScorePossible > 0
            ? (summary.totalScoreAchieved / summary.totalScorePossible) * 100
            : 0;

        return {
            fieldName: fieldName,
            totalAchieved: summary.totalScoreAchieved,
            totalPossible: summary.totalScorePossible,
            percentage: Math.round(percentage),
            assessmentCount: summary.assessmentCount,
        };
    }).filter(item => item.totalPossible > 0); // نتجاهل الحقول التي لم يتم تقييمها

    return finalReport;
};

export const logoutTeacher = () => {
    localStorage.removeItem('current_teacher_id');
};
/**
 * تسترجع جميع عناصر التقييم (Active/Inactive) الخاصة بالمعلم الحالي.
 */
export const getAssessmentFields = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error("Teacher not authenticated.");

    const { data, error } = await supabase
        .from('teacher_assessment_fields')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
};

/**
 * تُنشئ عنصر تقييم جديد في قاعدة البيانات للمعلم الحالي.
 * @param {object} fieldData - بيانات الحقل (field_name, field_type, max_score, select_options, order_index).
 */
export const createAssessmentField = async (fieldData) => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error("Teacher not authenticated.");

    const payload = {
        teacher_id: teacherId,
        ...fieldData
    };

    const { data, error } = await supabase
        .from('teacher_assessment_fields')
        .insert([payload])
        .select() // لاسترجاع السجل الجديد بالـ id
        .single();

    if (error) throw error;
    return data;
};

/**
 * تُحدث عنصر تقييم موجود (مثل الترتيب، الاسم، حالة التفعيل).
 * @param {number} fieldId - معرّف عنصر التقييم.
 * @param {object} updates - البيانات المراد تحديثها.
 */
export const updateAssessmentField = async (fieldId, updates) => {
    // لا نحتاج للتحقق من teacherId هنا لوجود RLS، لكن بما أن RLS معطلة سنعتمد على أن الواجهة سترسل الـ fieldId الصحيح.
    const { data, error } = await supabase
        .from('teacher_assessment_fields')
        .update(updates)
        .eq('id', fieldId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * تحذف عنصر تقييم بشكل دائم.
 * @param {number} fieldId - معرّف عنصر التقييم.
 */
export const deleteAssessmentField = async (fieldId) => {
    // ملاحظة: بما أن جدول daily_assessment_results مرتبط بـ teacher_assessment_fields بقيد ON DELETE RESTRICT،
    // فإن عملية الحذف ستفشل لو كان العنصر مستخدماً في تقييمات سابقة.
    const { error } = await supabase
        .from('teacher_assessment_fields')
        .delete()
        .eq('id', fieldId);

    if (error) throw error;
    return true;
};

/**
 * 🚨 تم التعديل لإزالة assessmentFileUrl
 */
export const submitDailyAssessment = async (
    lessonId,
    studentId,
    teacherNotes,
    results,
    courseId = null
) => {
    const teacherId = getCurrentTeacherId();
    
    // 1. جلب تاريخ الحصة من جدول الدروس (بدون تغيير)
    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('lesson_date')
        .eq('id', lessonId)
        .single();
    if (lessonError) throw lessonError;
    if (!lesson) throw new Error("Lesson not found");
    const lessonDate = lesson.lesson_date;

    // 2. محاولة إيجاد أو إنشاء رأس التقييم (daily_assessments)
    
    // أولاً: البحث عن رأس تقييم موجود
    const { data: existingAssessment, error: checkError } = await supabase
        .from('daily_assessments')
        .select('id')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .eq('teacher_id', teacherId)
        .single();
    
    // التعامل مع الأخطاء (نتجاهل خطأ عدم وجود سجل)
    if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing assessment:", checkError);
        throw checkError;
    }

    let assessmentId;

    if (existingAssessment) {
        assessmentId = existingAssessment.id;
        
        // 🆕 التعديل: إعداد حمولة التحديث (تم حذف assessment_file_url)
        const updatePayload = {
            teacher_notes: teacherNotes
        };
        // تم حذف الكود الخاص بتحديث assessment_file_url

        const { error: updateError } = await supabase
            .from('daily_assessments')
            .update(updatePayload) // استخدام الـ payload المحدث
            .eq('id', assessmentId);
            
        if (updateError) throw updateError;

    } else {
        // إنشاء رأس تقييم جديد مع إضافة course_id (تم حذف assessment_file_url)
        const assessmentData = {
            student_id: studentId,
            lesson_id: lessonId,
            lesson_date: lessonDate,
            teacher_notes: teacherNotes,
            teacher_id: teacherId,
            course_id: courseId,
            // ❌ تم حذف: assessment_file_url: assessmentFileUrl
        };


        const { data: newAssessment, error: insertError } = await supabase
            .from('daily_assessments')
            .insert([assessmentData])
            .select('id')
            .single();

        if (insertError) {
            console.error("Error inserting new assessment:", insertError);
            throw insertError;
        }
        assessmentId = newAssessment.id;
    }
    
    // 3. حذف جميع النتائج القديمة (لضمان النظافة قبل الإدخال)
    const { error: deleteError } = await supabase
        .from('daily_assessment_results')
        .delete()
        .eq('assessment_id', assessmentId);
    
    if (deleteError) {
        console.error("Error deleting old results:", deleteError);
        throw deleteError;
    }

    // 4. إعداد وإدخال النتائج الجديدة في جدول daily_assessment_results
    const resultsToInsert = results.map(r => ({
        assessment_id: assessmentId,
        field_id: r.field_id,
        score_value: r.score_value,
        field_snapshot: r.field_snapshot
    }));

    if (resultsToInsert.length > 0) {
        const { error: resultsInsertError } = await supabase
            .from('daily_assessment_results')
            .insert(resultsToInsert);
        
        if (resultsInsertError) {
            console.error("Error inserting new results:", resultsInsertError);
            throw resultsInsertError;
        }
    }

    return { assessmentId };
};

/**
 * دالة جلب نتائج تقييم طالب محدد في حصة محددة.
 * تسحب البيانات من الجدول الديناميكي الجديد: daily_assessment_results
 * @param {number} studentId
 * @param {number} lessonId
 * @returns {Array} مصفوفة النتائج
 */
export const getAssessmentResultsForStudentAndLesson = async (studentId, lessonId) => {
    try {
        const { data, error } = await supabase
            .from('daily_assessment_results')
            .select(`
                id,
                score_value,
                field_snapshot,
                assessment_id!inner(student_id, lesson_id, teacher_notes)
            `)
            // 💡 التصحيح: التصفية تتم عبر الربط (Join)
            .eq('assessment_id.student_id', studentId)
            .eq('assessment_id.lesson_id', lessonId);

        if (error) throw error;
        
        // إعادة تهيئة البيانات لإظهار الملاحظات مع النتائج
        // بما أن جميع النتائج تعود لنفس الـ assessment، فإن الملاحظات تكون موحدة
        const teacherNotes = data[0]?.assessment_id?.teacher_notes || '';
        
        const formattedResults = data.map(item => ({
            id: item.id,
            score_value: item.score_value,
            field_snapshot: item.field_snapshot,
            // لا نحتاج لـ assessment_id هنا لكننا سنضيفها لتكون مفيدة
            assessment_id: item.assessment_id.id,
        }));
        
        return {
            results: formattedResults,
            teacherNotes: teacherNotes
        };

    } catch (error) {
        console.error('Error fetching assessment results:', error);
        throw new Error('فشل في جلب نتائج التقييم اليومي.');
    }
};

export const getStudentAssessmentHistory = async (studentId, teacherId, courseId = null) => {
    let query = supabase
        .from('daily_assessments')
        .select(`
            id,
            teacher_notes,
            lessons ( title, lesson_date ),
            courses ( course_name ), // 🎉 تم إضافة حقل الكورس هنا
            daily_assessment_results ( score_value, field_snapshot )
        `)
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId);

    // إضافة فلتر الكورس إذا كان موجود
    if (courseId) {
        query = query.eq('course_id', courseId);
    }

    query = query.order('lesson_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    
    // إعادة هيكلة البيانات لتسهيل عرضها في الواجهة الأمامية
    return data.map(assessment => {
        let totalScore = 0;
        let totalMax = 0;
        
        // حساب المجموع وتجهيز النتائج المفصلة
        const results = assessment.daily_assessment_results.map(result => {
            const snapshot = result.field_snapshot;
            const numericScore = Number(result.score_value);
            
            if (snapshot.field_type === 'number') {
                totalScore += numericScore;
                totalMax += snapshot.max_score;
            }

            return {
                fieldName: snapshot.field_name,
                scoreValue: numericScore,
                maxScore: snapshot.max_score,
                fieldType: snapshot.field_type,
            };
        });

return {
            id: assessment.id,
            lessonTitle: assessment.lessons.title,
            courseName: assessment.courses.course_name, // 🎉 تم إضافة courseName هنا
            lessonDate: assessment.lessons.lesson_date,
            teacherNotes: assessment.teacher_notes,
            results,
            totalScore,
            totalMax,
        };
    });
};