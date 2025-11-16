import { supabase } from './supabase';
import { getCurrentTeacherId } from './teacherService'; // تأكد من وجود هذا الاستيراد

// دالة مساعدة لضمان ملكية الكورس للتكرار في الدوال
const checkCourseOwnership = async (courseId) => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    // جلب معلم الكورس من قاعدة البيانات
    const { data: course, error } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', courseId)
        .single();
        
    if (error || !course) throw new Error('الكورس غير موجود أو لا تملكه');
    
    // التحقق من أن معلم الكورس هو المعلم الحالي
    if (course.teacher_id !== teacherId) {
        throw new Error('غير مصرح لك بإجراء عملية على هذا الكورس.');
    }
    return teacherId;
};

// دالة مساعدة لضمان ملكية التسجيل
const checkEnrollmentOwnership = async (enrollmentId) => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    // جلب الكورس المرتبط بالتسجيل والتحقق من ملكية المعلم للكورس
    const { data: enrollment, error } = await supabase
        .from('course_enrollments')
        .select(`
            courses(teacher_id)
        `)
        .eq('id', enrollmentId)
        .single();
        
    if (error || !enrollment || !enrollment.courses) throw new Error('التسجيل غير موجود أو غير مرتبط بكورس مملوك');
    
    // التحقق من أن معلم الكورس هو المعلم الحالي
    if (enrollment.courses.teacher_id !== teacherId) {
        throw new Error('غير مصرح لك بإجراء عملية على هذا التسجيل.');
    }
    return teacherId;
};


export const enrollmentService = {
  
  // إضافة طالب لكورس - ✅ تم إضافة التحقق من الملكية
  enrollStudent: async (courseId, studentId, colorGroup = 'افتراضي') => {
    // 1. التحقق من ملكية المعلم للكورس قبل إضافة الطالب
    await checkCourseOwnership(courseId);
    
    // 2. إذا كان الكورس مملوكاً، قم بالتسجيل
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert([{
        course_id: courseId,
        student_id: studentId,
        color_group: colorGroup
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // جلب طلاب كورس معين - ✅ تم إضافة التحقق من الملكية
  getCourseStudents: async (courseId) => {
    // 1. التحقق من ملكية المعلم للكورس قبل عرض الطلاب
    await checkCourseOwnership(courseId);

    // 2. إذا كان الكورس مملوكاً، قم بعرض الطلاب
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        color_group,
        students (
          id,
          first_name,
          last_name,
          birth_date,
          grade_levels(name),
          group_types(name)
        )
      `)
      .eq('course_id', courseId)
      .order('color_group');
    
    if (error) throw error;
    return data;
  },

  // نقل طالب بين كورسات - ✅ تم إضافة التحقق من الملكية على التسجيل والكورس الجديد
  transferStudent: async (enrollmentId, newCourseId, newColorGroup) => {
    // 1. التحقق من ملكية المعلم للتسجيل الحالي
    await checkEnrollmentOwnership(enrollmentId);
    
    // 2. التحقق من ملكية المعلم للكورس الجديد
    await checkCourseOwnership(newCourseId);
    
    // 3. إذا كان كل شيء مملوكاً، قم بالتحديث
    const { data, error } = await supabase
      .from('course_enrollments')
      .update({
        course_id: newCourseId,
        color_group: newColorGroup
      })
      .eq('id', enrollmentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // حذف طالب من كورس - ✅ تم إضافة التحقق من الملكية
  removeStudentFromCourse: async (enrollmentId) => {
    // 1. التحقق من ملكية المعلم للتسجيل الحالي
    await checkEnrollmentOwnership(enrollmentId);
    
    // 2. إذا كان كل شيء مملوكاً، قم بالحذف
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('id', enrollmentId);
    
    if (error) throw error;
    return true;
  },

  // جلب كل الكورسات اللي الطالب مسجل فيها - ⚠️ يجب ربطها بالمعلم
  getStudentCourses: async (studentId) => {
    const teacherId = getCurrentTeacherId();
    if (!teacherId) throw new Error('لم يتم تحديد المعلم');

    // 1. جلب التسجيلات التي تربط الطالب بكورسات المعلم الحالي
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        color_group,
        courses!inner ( 
          id,
          name,
          description,
          grade_levels(name),
          group_types(name),
          teacher_id
        )
      `)
      .eq('student_id', studentId)
      .eq('courses.teacher_id', teacherId); // ✅ التصحيح: ربط الكورسات بمعلم الطالب
    
    if (error) throw error;
    
    // 2. تصفية البيانات لإظهار معلومات الكورسات فقط
    return data.map(enrollment => ({
        id: enrollment.id,
        color_group: enrollment.color_group,
        ...enrollment.courses
    }));
  }
};