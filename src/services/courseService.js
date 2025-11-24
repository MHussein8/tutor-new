// src/services/courseService.js (الكود النهائي والمصحح)
import { supabase } from './supabase';
import { getCurrentTeacherId } from './teacherService';
// 💡 استيراد الخدمات الإضافية لتطبيق الحذف المتسلسل
import { enrollmentService } from './enrollmentService'; 
import { lessonService } from './lessonService';
import { weeklyPlanService } from './weeklyPlanService'; // ✅ الاستيراد من الملف الجديد

export const courseService = {
  // جلب كل كورسات المعلم
getTeacherCourses: async () => {
    const teacherId = await getCurrentTeacherId(); 
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');
    
    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            grade_levels(name),
            group_types(name),
            course_enrollments!left(count) 
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
},

  // إنشاء كورس جديد
  createCourse: async (courseData) => {
    const teacherId = await getCurrentTeacherId(); 
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');
    
    const { data, error } = await supabase
      .from('courses')
      .insert([{
        teacher_id: teacherId,
        name: courseData.name,
        description: courseData.description,
        grade_level_id: courseData.grade_level_id,
        group_type_id: courseData.group_type_id,
        color_groups: courseData.color_groups || '["أحمر", "أخضر", "أزرق", "أصفر"]'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // تحديث كورس موجود
  updateCourse: async (courseId, updates) => {
    const teacherId = await getCurrentTeacherId(); 
    if (!teacherId) throw new Error('لم يتم تحديد المعلم'); 

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .eq('teacher_id', teacherId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // حذف كورس - منطق الحذف المتسلسل
  deleteCourse: async (courseId) => {
    const teacherId = await getCurrentTeacherId(); 
    if (!teacherId) throw new Error('لم يتم تحديد المعلم'); 

    // 1. التحقق من ملكية الكورس قبل البدء بالحذف المتسلسل
    const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', teacherId)
        .single();
    
    if (fetchError || !course) {
      throw new Error('الكورس غير موجود أو غير مصرح لك بحذفه.');
    }

    // التسلسل الصحيح للحذف المتسلسل:
    // 2. حذف الخطط الأسبوعية المرتبطة أولاً (يحل مشكلة weekly_plans_course_id_fkey)
    await weeklyPlanService.deleteWeeklyPlansForCourse(courseId); 

    // 3. حذف الدروس المرتبطة ثانياً (يحل مشكلة lessons_course_id_fkey)
    await lessonService.deleteLessonsForCourse(courseId); 

    // 4. حذف التسجيلات المرتبطة ثالثاً (يحل مشكلة course_enrollments_course_id_fkey)
    await enrollmentService.deleteEnrollmentsForCourse(courseId); 

    // 5. حذف الكورس نفسه
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('teacher_id', teacherId);
    
    if (deleteError) throw deleteError;
    return true;
  },
    
// جلب المراحل الدراسية وأنواع المجموعات الفريدة الخاصة بكورسات المعلم (لتضييق الفلاتر)
  getTeacherCourseOptions: async () => {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    // 1. جلب بيانات المراحل والأنواع المرتبطة بالكورسات فقط
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        grade_levels(id, name), 
        group_types(id, name)
      `)
      .eq('teacher_id', teacherId);

    if (error) throw error;
    
    if (!courses || courses.length === 0) {
      return { gradeLevels: [], groupTypes: [] };
    }

    // 2. استخراج القيم الفريدة (للتخلص من التكرار)
    const uniqueGradeLevels = {};
    const uniqueGroupTypes = {};

    courses.forEach(course => {
      // تجميع المراحل
      const grade = course.grade_levels;
      if (grade && !uniqueGradeLevels[grade.id]) {
        uniqueGradeLevels[grade.id] = { id: grade.id, name: grade.name };
      }

      // تجميع الأنواع
      const group = course.group_types;
      if (group && !uniqueGroupTypes[group.id]) {
        uniqueGroupTypes[group.id] = { id: group.id, name: group.name };
      }
    });

    // 3. تحويل الكائنات إلى مصفوفات نهائية
    const gradeLevelsArray = Object.values(uniqueGradeLevels);
    const groupTypesArray = Object.values(uniqueGroupTypes);

    return { 
      gradeLevels: gradeLevelsArray, 
      groupTypes: groupTypesArray 
    };
  },
getCourseOptions: async () => {
    // 1. جلب جميع المراحل الدراسية
    const { data: gradeLevels, error: gradeError } = await supabase
      .from('grade_levels')
      .select('id, name')
      .order('id', { ascending: true }); // نفترض ترتيب تصاعدي حسب ID
      
    if (gradeError) throw gradeError;

    // 2. جلب جميع أنواع المجموعات
    const { data: groupTypes, error: groupError } = await supabase
      .from('group_types')
      .select('id, name')
      .order('id', { ascending: true }); 

    if (groupError) throw groupError;

    return { 
      allGradeLevels: gradeLevels || [], 
      allGroupTypes: groupTypes || [] 
    };
  },
// جلب تفاصيل كورس واحد بناءً على ID
  getCourseDetails: async (courseId) => {
    const teacherId = await getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            grade_levels(name),
            group_types(name)
        `)
        .eq('id', courseId)
        .eq('teacher_id', teacherId)
        .single();
        
    if (error) throw error;
    return data;
  },
};