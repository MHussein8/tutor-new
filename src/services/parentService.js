// src/services/parentService.js
import { supabase } from './supabase';

// ----------------------------------------------------------------------
// دوال مساعدة للأمان (Security Helpers)
// ----------------------------------------------------------------------

// التحقق من أن الطالب تابع لولي الأمر الحالي عبر جدول student_parents
const checkStudentOwnership = async (studentId, parentId) => {
    // نتحقق من parentId هنا، بدلاً من getCurrentAuthUserId
    if (!parentId) {
        throw new Error('لم يتم تحديد ولي الأمر. يرجاء تسجيل الدخول.');
    }

    if (!studentId) {
        throw new Error('لم يتم تحديد الطالب.');
    }

    const { count, error } = await supabase
        .from('student_parents')
        .select('id', { count: 'exact' })
        .eq('parent_id', parentId)
        .eq('student_id', studentId)
        .limit(1);

    if (error) throw error;
     
    if (count === 0) {
        console.error(`ACCESS DENIED: Parent ${parentId} tried to access Student ${studentId}`);
        throw new Error('غير مصرح لك بمشاهدة بيانات هذا الطالب.');
    }
};

// ----------------------------------------------------------------------
// خدمات ولي الأمر
// ----------------------------------------------------------------------

export const parentService = {
  // ✅ دالة جلب الطلاب
  getStudentsByParent: async (parentId) => {
    if (!parentId) {
        return [];
    }
     
    try {
        const { data, error } = await supabase
          .from('student_parents')
          .select(`
            student_id,
            relationship,
            students (
              id,
              first_name,
              last_name,
              birth_date,
              grade_levels (name)
            )
          `)
          .eq('parent_id', parentId);
         
        if (error) {
            console.error('Error fetching students:', error);
            throw error;
        }
        
        console.log('Students data from DB:', data);
        return data || [];
    } catch (error) {
        console.error('Error in getStudentsByParent:', error);
        return [];
    }
  },

  // ✅ باقي الدوال تم تعديلها لاستخدام parentId مباشرة
  getDailyAssessments: async (studentId, parentId, limit = 10) => {
    try {
        // التحقق الأمني باستخدام parentId الممرر مباشرة
        await checkStudentOwnership(studentId, parentId); 

        const { data, error } = await supabase
          .from('daily_assessments')
          .select(`
            *,
            lessons (
              title,
              assessment_file_url 
            ),
            daily_assessment_results (score_value, field_snapshot) 
          `)
          .eq('student_id', studentId)
          .order('lesson_date', { ascending: false })
          .limit(limit);
          
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getDailyAssessments:', error);
        return [];
    }
  },


  getStudentNotes: async (studentId, parentId, limit = 5) => {
    try {
        await checkStudentOwnership(studentId, parentId);

        const { data, error } = await supabase
          .from('student_notes')
          .select('*')
          .eq('student_id', studentId)
          .order('lesson_date', { ascending: false })
          .limit(limit);
         
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getStudentNotes:', error);
        return [];
    }
  },

  getLastTwoAssessments: async (studentId, parentId) => {
    try {
        await checkStudentOwnership(studentId, parentId); 

        const { data, error } = await supabase
          .from('daily_assessments')
          .select(`
            *,
            daily_assessment_results (score_value, field_snapshot)
          `)
          .eq('student_id', studentId)
          .order('lesson_date', { ascending: false })
          .limit(2);
         
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getLastTwoAssessments:', error);
        return [];
    }
  },

  getWeeklyReportFromDaily: async (studentId, weekStartDate, parentId) => {
    try {
      await checkStudentOwnership(studentId, parentId); 

      const startOfWeek = new Date(weekStartDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startDateISO = startOfWeek.toISOString().split('T')[0];
      const endDateISO = endOfWeek.toISOString().split('T')[0];

      const { data: dailyAssessments, error } = await supabase
        .from('daily_assessments')
        .select(`
          teacher_notes,
          daily_assessment_results (score_value, field_snapshot)
        `)
        .eq('student_id', studentId)
        .gte('lesson_date', startDateISO)
        .lte('lesson_date', endDateISO)
        .order('lesson_date', { ascending: true });

      if (error) throw error;

      if (!dailyAssessments || dailyAssessments.length === 0) {
        return null;
      }

      const weeklyReportTotals = {};
      const allNotes = [];

      dailyAssessments.forEach(assessment => {
        if (assessment.teacher_notes) {
          allNotes.push(assessment.teacher_notes);
        }

        const results = assessment.daily_assessment_results || [];

        results.forEach(result => {
          const snapshot = result.field_snapshot;
          const score = Number(result.score_value); 
          const maxScore = Number(snapshot.max_score);
          const fieldName = snapshot.field_name;

          if (snapshot.field_type === 'number' && maxScore > 0) {
            if (!weeklyReportTotals[fieldName]) {
              weeklyReportTotals[fieldName] = { totalScore: 0, totalMax: 0 };
            }
             
            weeklyReportTotals[fieldName].totalScore += score;
            weeklyReportTotals[fieldName].totalMax += maxScore;
          }
        });
      });

      const finalReport = { ...weeklyReportTotals };

      if (allNotes.length > 0) {
        finalReport.teacher_notes = allNotes;
      }

      return Object.keys(weeklyReportTotals).length > 0 ? finalReport : null;

    } catch (error) {
      console.error('Error generating weekly report:', error);
      return null;
    }
  },

  getMostImprovedSkill: async (studentId, parentId) => {
    try {
      await checkStudentOwnership(studentId, parentId); 

      const lastTwoAssessments = await parentService.getLastTwoAssessments(studentId, parentId);
      if (lastTwoAssessments.length < 2) {
        return null;
      }

      const [current, previous] = lastTwoAssessments;
      const currentResults = current.daily_assessment_results || [];
      const previousResults = previous.daily_assessment_results || [];

      const fieldImprovements = {};

      currentResults.forEach(result => {
        const snapshot = result.field_snapshot;
        const score = Number(result.score_value);
        const fieldName = snapshot.field_name;

        if (snapshot.field_type === 'number') {
          if (!fieldImprovements[fieldName]) {
            fieldImprovements[fieldName] = { current: 0, previous: 0, count: 0 };
          }
          fieldImprovements[fieldName].current += score;
          fieldImprovements[fieldName].count += 1;
        }
      });

      previousResults.forEach(result => {
        const snapshot = result.field_snapshot;
        const score = Number(result.score_value);
        const fieldName = snapshot.field_name;

        if (snapshot.field_type === 'number') {
          if (!fieldImprovements[fieldName]) {
            fieldImprovements[fieldName] = { current: 0, previous: 0, count: 0 };
          }
          fieldImprovements[fieldName].previous += score;
        }
      });

      let mostImproved = null;
      let maxImprovement = -Infinity;

      Object.keys(fieldImprovements).forEach(fieldName => {
        const { current, previous, count } = fieldImprovements[fieldName];
         
        if (count > 0 && previous > 0) {
          const currentAvg = current / count;
          const previousAvg = previous / count;
           
          const improvement = ((currentAvg - previousAvg) / previousAvg) * 100;

          if (improvement > maxImprovement) {
            maxImprovement = improvement;
            mostImproved = {
              fieldName,
              improvement: Math.round(improvement),
              currentScore: Math.round(currentAvg),
              previousScore: Math.round(previousAvg)
            };
          }
        }
      });

      return mostImproved;
    } catch (error) {
      console.error('Error calculating most improved skill:', error);
      return null;
    }
  },

  getWeeklyLessons: async (studentId, weekStartDate, parentId) => {
    try {
      await checkStudentOwnership(studentId, parentId);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          grade_levels(*),
          group_types(*)
        `)
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        console.warn(`Student with ID ${studentId} not found or error occurred:`, studentError);
        return [];
      }
       
      const formattedWeekStartDate = new Date(weekStartDate).toISOString().split('T')[0];

      // ✅ التصحيح: استخدام select عادي بدلاً من maybeSingle
      const { data: weeklyPlan, error: weeklyPlanError } = await supabase 
        .from('weekly_plans')
        .select('plan_data')
        .eq('group_type_id', student.group_types.id)
        .eq('grade_level_id', student.grade_levels.id)
        .eq('week_start_date', formattedWeekStartDate);

      if (weeklyPlanError) throw weeklyPlanError;

      // ✅ التصحيح: التحقق من طول المصفوفة بدلاً من القيمة null
      if (!weeklyPlan || weeklyPlan.length === 0) {
          console.warn(`No weekly plan found for Grade ${student.grade_levels.id} starting ${formattedWeekStartDate}`);
          return [];
      }

      // ✅ استخدام أول صف فقط (يمكن تعديل هذا حسب احتياجاتك)
      const planData = weeklyPlan[0].plan_data;

      const lessons = [];
      const startDate = new Date(formattedWeekStartDate);
      const weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
       
      weekDays.forEach((dayName, index) => {
        const dayData = planData[dayName];
        if (dayData && dayData.lesson && dayData.lesson.trim() !== '') {
          const lessonDate = new Date(startDate);
          lessonDate.setDate(startDate.getDate() + index);
           
          lessons.push({
            id: `plan-${dayName}-${formattedWeekStartDate}`,
            title: dayData.lesson,
            content: dayData.lesson,
            homework: dayData.homework,
            lesson_date: lessonDate.toISOString().split('T')[0],
            day_name: dayName,
            notes: dayData.notes,
            evaluations: dayData.evaluations || {},
            formatted_evaluations: dayData.evaluations ? Object.keys(dayData.evaluations)
              .filter(key => dayData.evaluations[key].active)
              .map(key => ({
                id: key,
                name: dayData.evaluations[key].field_name || key,
                details: dayData.evaluations[key].details,
                type: dayData.evaluations[key].field_type
              })) : []
          });
        }
      });

      return lessons;

    } catch (error) {
      console.error('Error fetching weekly lessons:', error);
      return [];
    }
  },
   
  getAssessmentStats: async (studentId, parentId, days = 7) => {
    try {
      await checkStudentOwnership(studentId, parentId); 
       
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateISO = startDate.toISOString().split('T')[0];

      const { data: assessments, error } = await supabase
        .from('daily_assessments')
        .select(`
          daily_assessment_results (score_value, field_snapshot)
        `)
        .eq('student_id', studentId)
        .gte('lesson_date', startDateISO)
        .order('lesson_date', { ascending: false });

      if (error) throw error;

      const stats = {
        totalAssessments: assessments?.length || 0,
        fieldsAssessed: new Set(),
        averageScore: 0,
        fieldBreakdown: {}
      };

      let totalScore = 0;
      let totalMax = 0;

      assessments?.forEach(assessment => {
        const results = assessment.daily_assessment_results || [];
         
        results.forEach(result => {
          const snapshot = result.field_snapshot;
          const score = Number(result.score_value);
          const maxScore = Number(snapshot.max_score);
          const fieldName = snapshot.field_name;

          if (snapshot.field_type === 'number' && maxScore > 0) {
            stats.fieldsAssessed.add(fieldName);
             
            if (!stats.fieldBreakdown[fieldName]) {
              stats.fieldBreakdown[fieldName] = { totalScore: 0, totalMax: 0, count: 0 };
            }
             
            stats.fieldBreakdown[fieldName].totalScore += score;
            stats.fieldBreakdown[fieldName].totalMax += maxScore;
            stats.fieldBreakdown[fieldName].count += 1;

            totalScore += score;
            totalMax += maxScore;
          }
        });
      });

      stats.fieldsAssessed = Array.from(stats.fieldsAssessed);
      stats.averageScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting assessment stats:', error);
      return null;
    }
  }
};

export const getParentProfileId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // لا يوجد مستخدم مسجل دخول

  // ابحث عن الـ ID الرقمي لولي الأمر (الـ Profile ID) باستخدام الـ ID الطويل (الـ Auth ID)
  // ⚠️ ملاحظة: يجب أن تكون متأكداً من اسم عمود الربط في جدول parents
  const { data, error } = await supabase
    .from('parents')
    .select('id')
    .eq('auth_uuid', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching parent profile ID:', error);
    return null;
  }
  // نعود بالـ ID الرقمي القصير (مثل 11)
  return data ? data.id : null; 
};