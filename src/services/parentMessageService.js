// parentMessageService.js
import { supabase } from './supabase';

export const parentMessageService = {
  // إرسال رسالة من ولي الأمر إلى المعلم
  sendParentMessage: async (messageData) => {
    try {
      // إدخال الرسالة مباشرة إلى Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert({
          student_id: messageData.student_id,
          parent_id: messageData.parent_id,
          teacher_id: messageData.teacher_id,
          message_text: messageData.message_text,
          topic: messageData.topic,
          is_anonymous: messageData.is_anonymous,
          teacher_read: false // لم يقرأ المعلم بعد
        })
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

  // جلب الرسائل المرسلة من ولي الأمر
  getParentMessages: async (studentId, parentId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', studentId)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching parent messages:', error);
      throw error;
    }
  },

  // جلب الرسائل الموجهة للمعلم (وضع المعلم)
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

  // تحديث حالة القراءة للمعلم
  markAsRead: async (messageId) => {
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
  }
};

export default parentMessageService;