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
// 🚨 دالة جديدة: لرفع ملف التقييم إلى Supabase Storage 
// =========================================================================
const uploadAssessmentFile = async (file, courseId) => {
    if (!file) return null;

    console.log('بدء رفع الملف:', file.name);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${fileName}`; // مسار بسيط جداً
    
    console.log('المسار النهائي:', filePath);

    try {
        const { data, error } = await supabase.storage
            .from('assessment_files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('خطأ في رفع الملف:', error);
            throw new Error('حدث خطأ أثناء رفع ملف التقييم: ' + error.message);
        }

        console.log('تم رفع الملف بنجاح:', data);

        const { data: publicUrlData } = supabase.storage
            .from('assessment_files')
            .getPublicUrl(filePath);

        console.log('الرابط العام:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('خطأ كامل في العملية:', error);
        throw error;
    }
};
// =========================================================================

// =========================================================================
// 🚨 دالة جديدة: لحذف الملف من Supabase Storage 🚨
// =========================================================================
const deleteAssessmentFile = async (filePath) => {
    if (!filePath) return true;

    // نفترض أن اسم البكت هو 'assessment_files' كما في دالة الرفع
    const bucketName = 'assessment_files';
    
    // استخلاص المسار الفعلي للملف من الرابط العام المخزن في قاعدة البيانات
    const pathSegment = `/${bucketName}/`;
    const startIndex = filePath.indexOf(pathSegment);
    
    if (startIndex === -1) {
        console.error('فشل في تحليل مسار الملف للحذف');
        return false;
    }
    
    // المسار الفعلي للملف داخل البكت يبدأ بعد 'assessment_files/'
    const filePathSegment = filePath.substring(startIndex + pathSegment.length);

    console.log('بدء حذف الملف من المسار:', filePathSegment);

    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePathSegment]);

        if (error && error.statusCode !== 404) {
            console.error('خطأ في حذف الملف من البكت:', error);
        } else if (error && error.statusCode === 404) {
            console.warn('الملف غير موجود في البكت (404).');
        } else {
            console.log('تم حذف الملف بنجاح من البكت:', filePathSegment);
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
    // 🚨 إضافة دالة الرفع الجديدة إلى الكود لكي تكون مُتاحة للاستدعاء 🚨
    // ---------------------------------------------------------------------
    uploadAssessmentFile,
    
  // 1. إنشاء حصة جديدة
  createLesson: async (lessonData, assessmentFile) => {
    // 🚨 التحقق الأمني: تأمين إنشاء الحصة بربطها بكورس مملوك
    const teacherId = await checkCourseOwnership(lessonData.course_id); 
    
    // 🚨 الخطوة الجديدة: رفع الملف والحصول على الرابط
    let fileUrl = null;
    if (assessmentFile) {
        fileUrl = await uploadAssessmentFile(assessmentFile, lessonData.course_id);
    }

    const payload = { 
        ...lessonData, 
        teacher_id: teacherId, 
        assessment_file_url: fileUrl // 🚨 إضافة رابط الملف إلى بيانات الحصة 🚨
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
  updateLesson: async (lessonId, updates, assessmentFile) => { // 🚨 تم إضافة assessmentFile كمعامل 🚨
    // 🚨 التحقق الأمني: تأمين التعديل بضمان ملكية الحصة
    await checkLessonOwnership(lessonId);
    
    // 🚨 التحقق الأمني الإضافي: إذا كان هناك تغيير في الكورس، يجب التأكد من ملكية الكورس الجديد
    if (updates.course_id) {
      await checkCourseOwnership(updates.course_id);
    }

    // 🚨 الخطوة الجديدة: رفع ملف جديد إذا تم تمريره في التحديث
    if (assessmentFile) {
        const fileUrl = await uploadAssessmentFile(assessmentFile, updates.course_id);
        updates.assessment_file_url = fileUrl; // تحديث الرابط الجديد
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
  deleteLesson: async (lessonId, fileUrl) => { // 🚨 تم إضافة fileUrl كمعامل جديد 🚨
    // 🚨 التحقق الأمني: تأمين الحذف بضمان ملكية الحصة
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
    // 🚨 التحقق الأمني: تأمين الجلب بضمان ملكية الحصة
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
      .eq('teacher_id', teacherId) // لضمان أمان إضافي
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