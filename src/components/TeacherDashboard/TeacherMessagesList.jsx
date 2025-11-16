import React, { useState } from 'react';
import '../../styles/TeacherMessages.css';

const TeacherMessagesList = ({ messages, onReplyClick, onMarkAsRead }) => {
  const [expandedMessage, setExpandedMessage] = useState(null);

  const toggleMessageExpand = (messageId) => {
    if (expandedMessage === messageId) {
      setExpandedMessage(null);
    } else {
      setExpandedMessage(messageId);
      // إذا لم تكن الرسالة مقروءة، قم بتحديثها كمقروءة
      const message = messages.find(msg => msg.id === messageId);
      if (message && !message.teacher_read) {
        onMarkAsRead(messageId);
      }
    }
  };

  // تصنيف الرسائل حسب حالة القراءة (غير المقروءة أولاً)
  const sortedMessages = [...messages].sort((a, b) => {
    if (a.teacher_read === b.teacher_read) {
      // إذا كانت حالة القراءة متماثلة، رتب حسب التاريخ (الأحدث أولاً)
      return new Date(b.created_at) - new Date(a.created_at);
    }
    // الرسائل غير المقروءة أولاً
    return a.teacher_read ? 1 : -1;
  });

  return (
    <div className="teacher-messages-list">
      <h2 className="messages-title">رسائل أولياء الأمور</h2>
      
      {sortedMessages.length === 0 ? (
        <div className="no-messages">
          <div className="no-messages-icon">📭</div>
          <p>لا توجد رسائل من أولياء الأمور</p>
        </div>
      ) : (
        <div className="messages-container">
          {sortedMessages.map((message) => (
            <div 
              key={message.id} 
              className={`message-card ${!message.teacher_read ? 'unread' : ''} ${expandedMessage === message.id ? 'expanded' : ''}`}
            >
              <div className="message-header" onClick={() => toggleMessageExpand(message.id)}>
                <div className="message-info">
                  <span className="message-topic">
                    {message.topic === 'general' && 'استفسار عام'}
                    {message.topic === 'academic' && 'استفسار أكاديمي'}
                    {message.topic === 'attendance' && 'استفسار عن الحضور'}
                    {message.topic === 'homework' && 'استفسار عن الواجبات'}
                    {message.topic === 'feedback' && 'تقديم ملاحظات'}
                    {message.topic === 'other' && 'أخرى'}
                  </span>
                  <span className="message-date">
                    {new Date(message.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <div className="message-student-info">
                  <span className="student-name">{message.students.first_name} {message.students.last_name}</span>
                  {message.is_anonymous ? (
                    <span className="anonymous-badge">رسالة مجهولة</span>
                  ) : (
                    <span className="parent-name">من: {message.parents.first_name} {message.parents.last_name}</span>
                  )}
                </div>
                {!message.teacher_read && <div className="unread-badge"></div>}
              </div>
              
              {expandedMessage === message.id && (
                <div className="message-content">
                  <p>{message.message_text}</p>
                  
                  <div className="message-actions">
                    <button 
                      className="reply-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplyClick(message);
                      }}
                    >
                      الرد على الرسالة
                    </button>
                  </div>
                  
                  {message.replies && message.replies.length > 0 && (
                    <div className="message-replies">
                      <h4>الردود السابقة:</h4>
                      {message.replies.map((reply, index) => (
                        <div key={index} className="reply-item">
                          <div className="reply-header">
                            <span className="reply-date">
                              {new Date(reply.created_at).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          <p className="reply-text">{reply.reply_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherMessagesList;