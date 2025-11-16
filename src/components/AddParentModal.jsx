import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import '../styles/AddParentModal.css';
import '../styles/AddParentModal.css';

const AddParentModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    student_id: '',
    relationship: 'أب'
  });
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef();

  // جلب قائمة الطلاب المتاحين
  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('حدث خطأ في تحميل قائمة الطلاب');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen, fetchStudents]);

  // إغلاق النافذة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. أنشئ حساب ولي الأمر في جدول 'parents'
      const { data: parent, error } = await supabase
        .from('parents')
        .insert([{
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          password_hash: formData.password
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 2. ربط ولي الأمر الجديد بالطالب في جدول 'student_parents'
      const { error: linkError } = await supabase
        .from('student_parents')
        .insert([{
          parent_id: parent.id,
          student_id: formData.student_id,
          relationship: formData.relationship
        }]);

      if (linkError) throw linkError;

      alert('تم إنشاء حساب ولي الأمر بنجاح!');
      onClose(); // إغلاق النموذج بعد الإضافة الناجحة

      // إعادة تعيين النموذج
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        student_id: '',
        relationship: 'أب'
      });
      
    } catch (error) {
      alert('حدث خطأ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="add-parent-modal-overlay">
      <div className="add-parent-modal-content" ref={modalRef}>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>إضافة ولي أمر جديد</h2>
        
        <form onSubmit={handleSubmit} className="parent-form">
          <div className="form-row">
            <div className="form-group">
              <label>الاسم الأول *</label>
              <input 
                type="text" 
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                required 
                placeholder="أدخل الاسم الأول"
              />
            </div>
            <div className="form-group">
              <label>الاسم الأخير *</label>
              <input 
                type="text" 
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                required 
                placeholder="أدخل الاسم الأخير"
              />
            </div>
          </div>
          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
              placeholder="example@email.com"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>رقم الهاتف</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="01XXXXXXXX"
              />
            </div>
            <div className="form-group">
              <label>كلمة المرور *</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required 
                placeholder="كلمة المرور"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>الطالب *</label>
              <select
                value={formData.student_id}
                onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                required
              >
                <option value="">اختر الطالب</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} (رقم: {student.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>صلة القرابة *</label>
              <select 
                value={formData.relationship}
                onChange={(e) => setFormData({...formData, relationship: e.target.value})}
              >
                <option value="أب">أب</option>
                <option value="أم">أم</option>
                <option value="ولي أمر">ولي أمر</option>
                <option value="قريب">قريب</option>
              </select>
            </div>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'جاري الإنشاء...' : 'إنشاء حساب ولي الأمر'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddParentModal;