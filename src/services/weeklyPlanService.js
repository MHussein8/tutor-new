// src/services/weeklyPlanService.js (ملف جديد)

import { supabase } from './supabase';
// تم إزالة استيراد getCurrentTeacherId لأنه غير مطلوب لهذه الدالة

export const weeklyPlanService = {
  
  /**
   * دالة حذف جميع الخطط الأسبوعية المرتبطة بكورس معين.
   * @param {number} courseId - ID الكورس المراد حذف خططه.
   * @returns {Promise<boolean>}
   */
  deleteWeeklyPlansForCourse: async (courseId) => {
    
    // الحل لقيد المفتاح الخارجي "weekly_plans_course_id_fkey"
    const { error } = await supabase
      .from('weekly_plans') 
      .delete()
      .eq('course_id', courseId);

    if (error) {
        console.error('Error deleting weekly plans:', error);
        throw error;
    }
    
    return true;
  },
  
  // أضف هنا دوال الخدمة الأخرى المتعلقة بالخطط الأسبوعية (مثل الإنشاء/الجلب/التعديل)
};