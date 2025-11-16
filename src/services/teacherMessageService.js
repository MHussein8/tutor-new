// teacherMessageService.js
import { supabase } from './supabase';

export const teacherMessageService = {
  // جلب جميع رسائل أولياء الأمور للمعلم
  getTeacherMessages: async (teacherId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          students:student_id (first_name, last_name),
          parents:parent_id (first_name, last_name)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching teacher messages:', error);
      throw error;
    }
  },

  // تحديث حالة قراءة الرسالة
  markMessageAsRead: async (messageId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ teacher_read: true })
        .eq('id', messageId)
        .select();

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  },

  // ✅ تم تعديل اسم الدالة هنا ليتطابق مع ما هو مستخدم في TeacherDashboard.jsx
  replyToMessage: async (messageData) => {
    try {
      const { data, error } = await supabase
        .from('messages') 
        .update({
          teacher_reply: messageData.replyText,
          reply_timestamp: new Date().toISOString()
        })
        .eq('id', messageData.parentMessageId)
        .select();

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error('Error sending parent message:', error);
      throw error;
    }
  },
};

export default teacherMessageService;