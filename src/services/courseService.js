// src/services/courseService.js
import { supabase } from './supabase';
import { getCurrentTeacherId } from './teacherService';

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
        group_types(name)
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
        // التأكد من أن color_groups يتم تمريرها كـ JSONb (نص مصفوفة)
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

  // حذف كورس
  deleteCourse: async (courseId) => {
    const teacherId = await getCurrentTeacherId(); 
    if (!teacherId) throw new Error('لم يتم تحديد المعلم'); 

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('teacher_id', teacherId);
    
    if (error) throw error;
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
  } // لا يوجد فاصلة هنا لأنها آخر دالة
};