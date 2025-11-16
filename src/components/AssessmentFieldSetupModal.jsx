// src/components/AssessmentFieldSetupModal.jsx

import React from 'react';

// هذا المكون هو عبارة عن هيكل مبدئي لمودال بسيط
// يجب أن يتم إضافة منطق جلب وعرض وتعديل عناصر التقييم هنا لاحقاً

const AssessmentFieldSetupModal = ({ isOpen, onClose, onFieldsUpdated }) => {
    // إذا كان المودال مغلقاً، لا تعرض شيئاً
    if (!isOpen) return null;

    return (
        // الخلفية المعتمة للمودال
        <div 
            className="modal-backdrop" 
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}
            onClick={onClose} // إغلاق عند الضغط على الخلفية
        >
            {/* نافذة المودال نفسها */}
            <div 
                className="modal-content" 
                style={{
                    backgroundColor: 'white', padding: '30px', 
                    borderRadius: '10px', maxWidth: '600px', width: '90%',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()} // منع إغلاق النافذة بالضغط داخلها
            >
                <h3>إعداد عناصر التقييم</h3>
                <p>⚠️ هنا سيتم عرض قائمة بعناصر التقييم الخاصة بك (مثل "القراءة"، "الكتابة"، إلخ) لإضافة أو تعديل أو حذف العناصر.</p>
                <p>هذا مجرد هيكل، وسنكمل منطق الإدارة في الخطوة التالية.</p>
                
                <button 
                    onClick={onClose} 
                    style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
};

export default AssessmentFieldSetupModal;