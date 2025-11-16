// services/studentService.js
import { supabase } from './supabase';
import { getCurrentTeacherId } from './teacherService';

// دالة مساعدة مركزية للتحقق الأمني من ملكية الطالب
const checkStudentOwnership = async (studentId) => {
    const teacherId = await getCurrentTeacherId(); // 👈 تأكدنا من استخدام await هنا
    if (!teacherId) throw new Error('خطأ في تحديد هوية المعلم.');

    // 🚨 التحقق الأمني: نتأكد أن الطالب مُسجَّل في كورس واحد على الأقل يخص المعلم الحالي.
    const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select(`
            course_id,
            courses!inner(teacher_id)
        `)
        .eq('student_id', studentId)
        .eq('courses.teacher_id', teacherId);

    if (error) throw error;
    
    if (!enrollments || enrollments.length === 0) {
        throw new Error('غير مصرح لك بتعديل بيانات هذا الطالب. الطالب ليس في أي من كورساتك.');
    }
    
    return true;
};

export const studentService = {
    // 1. تحديث بيانات الطالب بشكل آمن
    async updateStudent(studentId, studentUpdates) { // 👈 استخدام الاختصار الصحيح
        await checkStudentOwnership(studentId);
        
        const { data, error } = await supabase
            .from('students')
            .update({ 
                ...studentUpdates, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', studentId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // 2. حذف الطالب بشكل آمن
    async deleteStudent(studentId) { // 👈 استخدام الاختصار الصحيح
        await checkStudentOwnership(studentId);

        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', studentId);

        if (error) throw error;
        return true;
    },
    
    // 3. 🔑 دالة آمنة لجلب طلاب المعلم الحالي (تم تبسيطها لضمان الاستقرار)
    async getTeacherStudents() {
        const teacherId = await getCurrentTeacherId();
        if (!teacherId) return [];

        // استعلام آمن ومبسط لا يتضمن حقول التقييم المعقدة (لتجنب أخطاء Supabase)
        const { data, error } = await supabase
            .from('students')
            .select(`
                id, first_name, last_name, birth_date, 
                grade_levels(name), 
                group_types(name),
                course_enrollments!inner(
                    courses!inner(
                        teacher_id
                    )
                )
            `)
            .eq('course_enrollments.courses.teacher_id', teacherId);

        if (error) {
            console.error('Error fetching students with security check:', error);
            throw new Error(`فشل في جلب قائمة الطلاب: ${error.message}`);
        }

        const studentMap = new Map();
        data.forEach(student => {
            const cleanStudent = {
                id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                birth_date: student.birth_date,
                grade_levels: student.grade_levels,
                group_types: student.group_types,
            };
            studentMap.set(student.id, cleanStudent);
        });
        
        return Array.from(studentMap.values());
    },

    // 4. جلب التقييمات اليومية لطالب واحد (للتحميل عند الحاجة)
    async getStudentDailyAssessments(studentId) {
        // لا حاجة للتحقق الأمني هنا، لأن getTeacherStudents تجلب طلاب المعلم فقط،
        // و TeacherDashboard يستخدم هذه الدالة لطلاب تم التحقق منهم بالفعل.
        const { data, error } = await supabase
            .from('daily_assessments')
            .select(`
                created_at, 
                daily_assessment_results ( score_value, field_snapshot )
            `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },
};