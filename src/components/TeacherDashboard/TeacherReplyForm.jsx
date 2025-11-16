import React, { useState } from 'react';
import '../../styles/TeacherMessages.css';

const TeacherReplyForm = ({ message, onSendReply, onCancel }) => {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!replyText.trim()) {
      setError('الرجاء كتابة نص الرد');
      return;
    }
    
    try {
      setIsSending(true);
      setError('');
      
      await onSendReply({
        parentMessageId: message.id,
        replyText: replyText.trim()
      });
      
      setReplyText('');
      onCancel(); // إغلاق النموذج بعد الإرسال
    } catch (err) {
      setError('حدث خطأ أثناء إرسال الرد. الرجاء المحاولة مرة أخرى.');
      console.error('Error sending reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="teacher-reply-form">
      <h3 className="reply-form-title">
        الرد على رسالة {message.is_anonymous ? 'مجهولة' : `من ${message.parent_name}`}
      </h3>
      
      <div className="original-message">
        <h4>الرسالة الأصلية:</h4>
        <p>{message.message_text}</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="replyText">نص الرد:</label>
          <textarea
            id="replyText"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="اكتب ردك هنا..."
            rows={5}
            disabled={isSending}
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
            disabled={isSending}
          >
            إلغاء
          </button>
          <button 
            type="submit" 
            className="send-button"
            disabled={isSending}
          >
            {isSending ? 'جاري الإرسال...' : 'إرسال الرد'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeacherReplyForm;