import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import '../styles/EditStudentModal.css';
import { studentService } from '../services/studentService';

const EditStudentModal = ({ isOpen, onClose, student, onStudentUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    grade_level_id: '',
    education_type_id: ''
  });
  
  const [gradeLevels, setGradeLevels] = useState([]);
  const [groupTypes, setGroupTypes] = useState([]);

  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        birth_date: student.birth_date || '',
        grade_level_id: student.grade_level_id || '',
        education_type_id: student.education_type_id || ''
      });
    }
  }, [student, isOpen]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [gradeLevelsRes, groupTypesRes] = await Promise.all([
        supabase.from('grade_levels').select('*').order('name'),
        supabase.from('group_types').select('*').order('name')
      ]);

      setGradeLevels(gradeLevelsRes.data || []);
      setGroupTypes(groupTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student) return;
    
    setLoading(true);

    // تجميع البيانات للتحديث
    const updates = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      birth_date: formData.birth_date || null,
      grade_level_id: formData.grade_level_id,
      education_type_id: formData.education_type_id,
    };

    try {
      // 👈 استخدام الخدمة المؤمنة بدلاً من Supabase مباشرة
      await studentService.updateStudent(student.id, updates); 

      alert('تم تحديث بيانات الطالب بنجاح');
      onStudentUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
      // عرض رسالة الخطأ الواردة من الخدمة لتوضيح مشكلة الأمان (إن وجدت)
      alert(`حدث خطأ أثناء تحديث البيانات: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>تعديل بيانات الطالب</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>الاسم الأول *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>اسم العائلة *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>تاريخ الميلاد</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>المستوى الدراسي *</label>
              <select
                name="grade_level_id"
                value={formData.grade_level_id}
                onChange={handleChange}
                required
              >
                <option value="">اختر المستوى</option>
                {gradeLevels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>نوع التعليم *</label>
              <select
                name="education_type_id"
                value={formData.education_type_id}
                onChange={handleChange}
                required
              >
                <option value="">اختر نوع التعليم</option>
                {groupTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;