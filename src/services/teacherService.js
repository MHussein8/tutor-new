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
// ✅ دالة مساعدة لجلب مُعرّفات كورسات المدرس
// ----------------------------------------------------
const getTeacherCourseIds = async (teacherId) => {
    const { data, error } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId);
    if (error) throw error;
    return data.map(course => course.id);
};

// دالة مساعدة لتحديد بداية الأسبوع (السبت) ونهايته (الجمعة)
const getWeekStartEnd = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // لحساب تاريخ السبت الماضي أو الحالي
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 6 ? 0 : dayOfWeek + 1)); 
    startOfWeek.setHours(0, 0, 0, 0);

    // نهاية الأسبوع هي يوم الجمعة في نهاية اليوم
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { 
        startOfWeek: startOfWeek.toISOString(), 
        endOfWeek: endOfWeek.toISOString() 
    };
};

/**
 * تسترجع إحصائيات المدرس الحالي (تراكمي للطلاب، أسبوعي للبقية).
 */
/**
 * تسترجع إحصائيات المدرس الحالي (تراكمي للطلاب، أسبوعي للبقية).
 */
export const getTeacherStats = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) return { totalStudents: 0, averagePerformance: 0, weeklyAssessments: 0, weeklyClasses: 0 };

    try {
        const { startOfWeek, endOfWeek } = getWeekStartEnd();
        const courseIds = await getTeacherCourseIds(teacherId);
        
        if (courseIds.length === 0) {
            return { totalStudents: 0, averagePerformance: 0, weeklyAssessments: 0, weeklyClasses: 0 };
        }

        // 1. ✅ عدد الطلاب (تراكمي / إجمالي)
        const { count: totalStudents, error: studentsError } = await supabase
            .from('students')
            .select('*, course_enrollments!inner(course_id)', { count: 'exact' })
            .in('course_enrollments.course_id', courseIds); 
        
        if (studentsError) console.error("Students Error:", studentsError);

        // 2. ✅ التقييمات الأسبوعية - استخدام lesson_date بدلاً من created_at
        const { count: weeklyAssessments, error: assessmentsError } = await supabase
            .from('daily_assessments')
            .select('*', { count: 'exact' })
            .in('course_id', courseIds)
            .gte('lesson_date', startOfWeek.split('T')[0]) // استخدام تاريخ الحصة
            .lte('lesson_date', endOfWeek.split('T')[0]);
        
        if (assessmentsError) console.error("Assessments Error:", assessmentsError);

        // 3. ✅ الحصص الأسبوعية - استخدام lesson_date بدلاً من created_at
        const { count: weeklyClasses, error: lessonsError } = await supabase
            .from('lessons')
            .select('*', { count: 'exact' })
            .in('course_id', courseIds)
            .gte('lesson_date', startOfWeek.split('T')[0]) // استخدام تاريخ الحصة
            .lte('lesson_date', endOfWeek.split('T')[0]);
            
        if (lessonsError) console.error("Lessons Error:", lessonsError);

        // 4. ✅ نتائج الأداء الأسبوعية - استخدام lesson_date من التقييمات
        const { data: results, error: resultsError } = await supabase
            .from('daily_assessment_results')
            .select(`
                score_value, 
                field_snapshot, 
                assessment_id!inner(course_id, lesson_date)
            `)
            .in('assessment_id.course_id', courseIds)
            .gte('assessment_id.lesson_date', startOfWeek.split('T')[0])
            .lte('assessment_id.lesson_date', endOfWeek.split('T')[0]);
            
        if (resultsError) console.error("Results Error:", resultsError);

        // 5. حساب متوسط الأداء
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

        // إضافة console.log للتشخيص
        console.log('🔍 إحصائيات الأسبوع:', {
            startOfWeek: startOfWeek.split('T')[0],
            endOfWeek: endOfWeek.split('T')[0],
            courseIds,
            weeklyAssessments,
            weeklyClasses,
            resultsCount: results?.length,
            averagePerformance
        });
        
        return {
            totalStudents: totalStudents || 0,
            averagePerformance: Math.round(averagePerformance) || 0,
            weeklyAssessments: weeklyAssessments || 0,
            weeklyClasses: weeklyClasses || 0
        };

    } catch (error) {
        console.error("Critical Error in getTeacherStats:", error);
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
 */
export const getStudents = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) return [];

    const courseIds = await getTeacherCourseIds(teacherId);
    if (courseIds.length === 0) return [];

    const { data, error } = await supabase
        .from('students')
        .select(`*, course_enrollments!inner(course_id)`)
        .in('course_enrollments.course_id', courseIds)
        .order('first_name');

    if (error) throw error;
    
    const uniqueStudents = {};
    data.forEach(student => {
        const { course_enrollments, ...cleanStudent } = student;
        uniqueStudents[cleanStudent.id] = cleanStudent;
    });
    return Object.values(uniqueStudents);
};

/**
 * تسترجع قائمة بالتقييمات اليومية المرتبطة بكورسات المدرس الحالي.
 */
export const getDailyAssessments = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) return [];

    const courseIds = await getTeacherCourseIds(teacherId);
    if (courseIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('daily_assessments')
        .select('*')
        .in('course_id', courseIds)
        .order('lesson_date', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * تسترجع تقرير أسبوعي مفصل للطالب بناءً على العناصر المخصصة للمعلم.
 */
export const getCumulativePerformanceReport = async (studentId, startDate, endDate) => {
    const teacherId = getCurrentTeacherId();
    
    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    
    const { data: dailyAssessments, error: assessmentsError } = await supabase
        .from('daily_assessments')
        .select('id, lesson_date')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
        .gte('lesson_date', start)
        .lte('lesson_date', end)
        .order('lesson_date', { ascending: true });

    if (assessmentsError) throw assessmentsError;
    if (!dailyAssessments || dailyAssessments.length === 0) {
        return null;
    }
    
    const assessmentIds = dailyAssessments.map(a => a.id);

    const { data: results, error: resultsError } = await supabase
        .from('daily_assessment_results')
        .select('assessment_id, score_value, field_snapshot')
        .in('assessment_id', assessmentIds);

    if (resultsError) throw resultsError;

    const reportSummary = {};

    results.forEach(result => {
        const snapshot = result.field_snapshot;
        const score = parseFloat(result.score_value);

        if (snapshot && snapshot.field_type === 'number' && !isNaN(score) && score !== null) {
            const fieldName = snapshot.field_name;
            const maxScorePerItem = snapshot.max_score || 0;
            
            if (!reportSummary[fieldName]) {
                reportSummary[fieldName] = {
                    totalScoreAchieved: 0,
                    totalScorePossible: 0,
                    assessmentCount: 0,
                    details: []
                };
            }
            reportSummary[fieldName].totalScoreAchieved += score;
            reportSummary[fieldName].totalScorePossible += maxScorePerItem;
            reportSummary[fieldName].assessmentCount += 1;
        }
    });
    
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
    }).filter(item => item.totalPossible > 0);

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
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * تُحدث عنصر تقييم موجود
 */
export const updateAssessmentField = async (fieldId, updates) => {
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
 */
export const deleteAssessmentField = async (fieldId) => {
    const { error } = await supabase
        .from('teacher_assessment_fields')
        .delete()
        .eq('id', fieldId);

    if (error) throw error;
    return true;
};

export const submitDailyAssessment = async (
    lessonId,
    studentId,
    teacherNotes,
    results,
    courseId = null
) => {
    const teacherId = getCurrentTeacherId();
    
    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('lesson_date')
        .eq('id', lessonId)
        .single();
    if (lessonError) throw lessonError;
    if (!lesson) throw new Error("Lesson not found");
    const lessonDate = lesson.lesson_date;

    const { data: existingAssessment, error: checkError } = await supabase
        .from('daily_assessments')
        .select('id')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .eq('teacher_id', teacherId)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing assessment:", checkError);
        throw checkError;
    }

    let assessmentId;

    if (existingAssessment) {
        assessmentId = existingAssessment.id;
        
        const updatePayload = {
            teacher_notes: teacherNotes
        };

        const { error: updateError } = await supabase
            .from('daily_assessments')
            .update(updatePayload)
            .eq('id', assessmentId);
            
        if (updateError) throw updateError;

    } else {
        const assessmentData = {
            student_id: studentId,
            lesson_id: lessonId,
            lesson_date: lessonDate,
            teacher_notes: teacherNotes,
            teacher_id: teacherId,
            course_id: courseId,
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
    
    const { error: deleteError } = await supabase
        .from('daily_assessment_results')
        .delete()
        .eq('assessment_id', assessmentId);
    
    if (deleteError) {
        console.error("Error deleting old results:", deleteError);
        throw deleteError;
    }

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
            .eq('assessment_id.student_id', studentId)
            .eq('assessment_id.lesson_id', lessonId);

        if (error) throw error;
        
        const teacherNotes = data[0]?.assessment_id?.teacher_notes || '';
        
        const formattedResults = data.map(item => ({
            id: item.id,
            score_value: item.score_value,
            field_snapshot: item.field_snapshot,
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
            courses ( id, name ),
            daily_assessment_results ( score_value, field_snapshot )
        `)
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId);

    // 🔑 هذا السطر هو مفتاح الحل الآن: يستخدم الـ courseId الممرر من الواجهة الأمامية
    if (courseId) {
        // تأكد من تحويل courseId إلى عدد صحيح عند التصفية
        query = query.eq('course_id', Number(courseId)); 
    }

    query = query.order('lesson_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    
    return data.map(assessment => {
        let totalScore = 0;
        let totalMax = 0;
        
        const results = assessment.daily_assessment_results.map(result => {
            const snapshot = result.field_snapshot;
            // تأكد من أن قيمة التقييم رقمية قبل حساب المجموع
            const numericScore = Number(result.score_value); 
            
            if (snapshot.field_type === 'number') {
                // يجب التأكد من أن القيمة ليست NaN قبل الإضافة
                if (!isNaN(numericScore)) { 
                    totalScore += numericScore;
                    totalMax += snapshot.max_score;
                }
            }

            return {
                fieldName: snapshot.field_name,
                scoreValue: result.score_value, // نتركها نصية كما هي للعرض
                maxScore: snapshot.max_score,
                fieldType: snapshot.field_type,
            };
        });

        return {
            id: assessment.id,
            lessonTitle: assessment.lessons?.title || 'غير محدد',
            // 🚨 نستخدم assessment.courses.name بدلاً من assessment.courses.course_name
            courseName: assessment.courses?.name || 'غير محدد', 
            lessonDate: assessment.lessons?.lesson_date,
            teacherNotes: assessment.teacher_notes,
            results,
            totalScore,
            totalMax,
        };
    });
};

/**
 * دالة جديدة: جلب بيانات المعلم الحالي
 */
export const getCurrentTeacher = async () => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .single();

    if (error) throw error;
    return data;
};