import React, { useState } from 'react';
import '../../styles/ParentMessageForm.css';

const ParentMessageForm = ({ onSendMessage, parentId, studentId, teacherId }) => {
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [topic, setTopic] = useState('general');
  const [isSending, setIsSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // قائمة الرموز التعبيرية الشائعة
  const emojis = ['😊', '👍', '🙏', '❤️', '👏', '🎉', '🤔', '😢', '😡', '🙂', '😀', '🌟', '📚', '✅', '❓'];

  // قائمة المواضيع
  const topics = [
    { id: 'general', label: 'استفسار عام' },
    { id: 'academic', label: 'استفسار أكاديمي' },
    { id: 'attendance', label: 'استفسار عن الحضور' },
    { id: 'homework', label: 'استفسار عن الواجبات' },
    { id: 'feedback', label: 'تقديم ملاحظات' },
    { id: 'other', label: 'أخرى' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setStatusMessage({ type: 'error', text: 'الرجاء كتابة رسالة قبل الإرسال' });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const messageData = {
        parent_id: parentId,
        student_id: studentId,
        teacher_id: teacherId,
        message_text: message,
        is_anonymous: isAnonymous,
        topic: topic,
        extension: 'text',
        event: 'parent_message',
        private: true,
        payload: {
          sent_by: isAnonymous ? 'anonymous_parent' : 'parent',
          timestamp: new Date().toISOString()
        }
      };

      await onSendMessage(messageData);
      
      // إعادة تعيين النموذج
      setMessage('');
      setIsAnonymous(false);
      setTopic('general');
      setStatusMessage({ type: 'success', text: 'تم إرسال رسالتك بنجاح!' });
    } catch (error) {
      console.error('Error sending message:', error);
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء إرسال الرسالة. الرجاء المحاولة مرة أخرى.' });
    } finally {
      setIsSending(false);
    }
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="parent-message-form-container">
      <div className="message-form-header">
        <div className="message-form-title">
          <i className="message-icon">✉️</i>
          <h3>إرسال رسالة للمعلم</h3>
        </div>
        <p className="message-form-subtitle">يمكنك إرسال استفسار أو ملاحظة للمعلم بخصوص الطالب</p>
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <div className="form-group topic-selector">
          <label htmlFor="topic">موضوع الرسالة:</label>
          <select 
            id="topic" 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
            className="topic-dropdown"
          >
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group message-input-container">
          <label htmlFor="message">نص الرسالة:</label>
          <div className="message-textarea-wrapper">
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              rows={5}
              className="message-textarea"
            />
            <div className="message-controls">
              <button 
                type="button" 
                className="emoji-button"
                onClick={() => setShowEmoji(!showEmoji)}
              >
                😊
              </button>
              {showEmoji && (
                <div className="emoji-picker">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      className="emoji-item"
                      onClick={() => addEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-group anonymous-option">
          <label className="anonymous-label">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={() => setIsAnonymous(!isAnonymous)}
              className="anonymous-checkbox"
            />
            <span className="checkbox-text">إخفاء هويتي (لن يظهر اسمك للمعلم)</span>
          </label>
          {isAnonymous && (
            <div className="anonymous-info">
              <i className="info-icon">ℹ️</i>
              <p>عند اختيار إخفاء الهوية، لن يتمكن المعلم من معرفة هويتك عند قراءة الرسالة.</p>
            </div>
          )}
        </div>

        {statusMessage.text && (
          <div className={`status-message ${statusMessage.type}`}>
            {statusMessage.type === 'success' ? '✓ ' : '⚠ '}
            {statusMessage.text}
          </div>
        )}

        <div className="form-actions">
          <button 
            type="submit" 
            className="send-button" 
            disabled={isSending}
          >
            {isSending ? (
              <>
                <span className="loading-spinner"></span>
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <i className="send-icon">📤</i>
                <span>إرسال الرسالة</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ParentMessageForm;