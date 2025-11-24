// src/services/lessonService.js (الكود الكامل والمعدل)
import { supabase } from './supabase';
import { getCurrentTeacherId } from './teacherService';

// دالة مساعدة للتحقق من ملكية المعلم للكورس
const checkCourseOwnership = async (courseId) => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    const { data: course, error } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', courseId)
        .single();
        
    if (error || !course || course.teacher_id !== teacherId) {
        throw new Error('الكورس غير موجود أو غير مصرح لك بإضافة حصص إليه.');
    }
    return teacherId;
};

// دالة مساعدة للتحقق من ملكية المعلم للحصة
const checkLessonOwnership = async (lessonId) => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    const { data: lesson, error } = await supabase
        .from('lessons')
        .select('teacher_id')
        .eq('id', lessonId)
        .single();

    if (error || !lesson || lesson.teacher_id !== teacherId) {
        throw new Error('غير مصرح لك بالوصول إلى هذه الحصة أو تعديلها.');
    }
    return teacherId;
};

// =========================================================================
// 🚨 دالة مساعدة: لرفع ملف التقييم إلى Supabase Storage 
// =========================================================================
const uploadAssessmentFile = async (file, courseId) => {
    if (!file) return null;

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${fileName}`; 
    
    try {
        const { error } = await supabase.storage
            .from('assessment_files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new Error('حدث خطأ أثناء رفع ملف التقييم: ' + error.message);
        }

        const { data: publicUrlData } = supabase.storage
            .from('assessment_files')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('خطأ كامل في عملية الرفع:', error);
        throw error;
    }
};
// =========================================================================

// =========================================================================
// 🚨 دالة مساعدة: لحذف الملف من Supabase Storage 🚨
// =========================================================================
const deleteAssessmentFile = async (filePath) => {
    if (!filePath) return true;

    const bucketName = 'assessment_files';
    const pathSegment = `/${bucketName}/`;
    const startIndex = filePath.indexOf(pathSegment);
    
    if (startIndex === -1) {
        console.error('فشل في تحليل مسار الملف للحذف');
        return false;
    }
    
    const filePathSegment = filePath.substring(startIndex + pathSegment.length);

    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePathSegment]);

        if (error && error.statusCode !== 404) {
            console.error('خطأ في حذف الملف من البكت:', error);
        }
        return true;
    } catch (error) {
        console.error('خطأ كامل أثناء محاولة حذف الملف:', error);
        return false;
    }
};
// =========================================================================

export const lessonService = {
    // ---------------------------------------------------------------------
    // 💡 الدالة الجديدة: حذف جميع الدروس المرتبطة بكورس معين مع حذف الملفات
    // ---------------------------------------------------------------------
    deleteLessonsForCourse: async (courseId) => {
        // 1. جلب جميع مسارات الملفات أولاً
        const { data: lessons, error: fetchError } = await supabase
            .from('lessons')
            .select('assessment_file_url') 
            .eq('course_id', courseId);
        
        if (fetchError) throw fetchError;

        // 2. حذف الملفات المرتبطة من التخزين (concurrently)
        if (lessons && lessons.length > 0) {
            const filePathsToDelete = lessons
                .map(lesson => lesson.assessment_file_url)
                .filter(url => url); 
                
            const deletionPromises = filePathsToDelete.map(filePath => deleteAssessmentFile(filePath));
            await Promise.all(deletionPromises);
        }
        
        // 3. حذف سجلات الدروس من قاعدة البيانات
        const { error: deleteError } = await supabase
            .from('lessons') 
            .delete()
            .eq('course_id', courseId);

        if (deleteError) throw deleteError;
        return true;
    },

    uploadAssessmentFile,
    
    // 1. إنشاء حصة جديدة
    createLesson: async (lessonData, assessmentFile) => {
        const teacherId = await checkCourseOwnership(lessonData.course_id); 
        
        let fileUrl = null;
        if (assessmentFile) {
            fileUrl = await uploadAssessmentFile(assessmentFile, lessonData.course_id);
        }

        const payload = { 
            ...lessonData, 
            teacher_id: teacherId, 
            assessment_file_url: fileUrl 
        };

        const { data, error } = await supabase
            .from('lessons')
            .insert([payload])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // 2. تحديث حصة موجودة
    updateLesson: async (lessonId, updates, assessmentFile) => { 
        await checkLessonOwnership(lessonId);
        
        if (updates.course_id) {
            await checkCourseOwnership(updates.course_id);
        }

        if (assessmentFile) {
            const fileUrl = await uploadAssessmentFile(assessmentFile, updates.course_id);
            updates.assessment_file_url = fileUrl; 
        }
        
        const { data, error } = await supabase
            .from('lessons')
            .update(updates)
            .eq('id', lessonId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // 3. حذف حصة
    deleteLesson: async (lessonId, fileUrl) => { 
        await checkLessonOwnership(lessonId);

        // 🚨 الخطوة 1: حذف الملف المرتبط من Supabase Storage
        await deleteAssessmentFile(fileUrl);
        
        // 🚨 الخطوة 2: حذف السجل من قاعدة البيانات
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId);
        
        if (error) throw error;
        return true;
    },

    // 4. جلب حصة معينة
    getLessonById: async (lessonId) => {
        const teacherId = await checkLessonOwnership(lessonId);

        const { data, error } = await supabase
            .from('lessons')
            .select(`
                *,
                grade_levels(name),
                group_types(name),
                courses(name)
            `)
            .eq('id', lessonId)
            .eq('teacher_id', teacherId) 
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // 5. جلب كل حصص المعلم
    getTeacherLessons: async () => {
        const teacherId = getCurrentTeacherId();
        if (!teacherId) throw new Error('لم يتم تحديد المعلم');

        const { data, error } = await supabase
            .from('lessons')
            .select(`
                *,
                courses(name),
                grade_levels(name),
                group_types(name)
            `)
            .eq('teacher_id', teacherId)
            .order('lesson_date', { ascending: false });

        if (error) throw error;
        return data;
    }
};