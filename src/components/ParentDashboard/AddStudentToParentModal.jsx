import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { getCurrentTeacherId } from '../../services/teacherService';
import '../../styles/AddStudentToParentModal.css';

const AddStudentToParentModal = ({ isOpen, onClose, parentId, onStudentAdded }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    education_type_id: '',
    grade_level_id: '',
    relationship: 'أب'
  });
  const [loading, setLoading] = useState(false);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [educationTypes, setEducationTypes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        first_name: '',
        last_name: '',
        birth_date: '',
        education_type_id: '',
        grade_level_id: '',
        relationship: 'أب'
      });
      setError('');
      setSuccess('');
      fetchDependencies();
    }
  }, [isOpen]);

  const fetchDependencies = async () => {
    try {
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('name');
      if (gradeError) throw gradeError;
      setGradeLevels(gradeData || []);

      const { data: eduData, error: eduError } = await supabase
        .from('group_types')
        .select('id, name')
        .order('name');
      if (eduError) throw eduError;
      setEducationTypes(eduData || []);
    } catch (err) {
      console.error('Error fetching dependencies:', err.message);
      setError('فشل تحميل البيانات الأساسية.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.first_name || !formData.last_name || !formData.education_type_id || !formData.grade_level_id) {
        setError('يرجى ملء جميع الحقول الإجبارية');
        setLoading(false);
        return;
      }
      
      // 1. إضافة الطالب الجديد
            // 💥 إضافة الكود لجلب teacher_id والتحقق منه
      const teacherId = await getCurrentTeacherId();

      if (teacherId === null) {
          throw new Error('Teacher ID not found. Please log in as a teacher to complete this action.');
      }
      // 💥 نهاية إضافة الكود
      
      // 1. إضافة الطالب الجديد
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert([{
          first_name: formData.first_name,
          last_name: formData.last_name,
          birth_date: formData.birth_date || null,
          education_type_id: formData.education_type_id,
          grade_level_id: formData.grade_level_id,
          teacher_id: teacherId
        }])
        .select()
        .single();

      if (studentError) throw studentError;

      // 2. ربط الطالب بولي الأمر
      const { error: linkError } = await supabase
        .from('student_parents')
        .insert([{
          parent_id: parentId,
          student_id: student.id,
          relationship: formData.relationship
        }]);

      if (linkError) throw linkError;

      setSuccess('تم إضافة الطالب وربطه بحسابك بنجاح!');
      
      if (onStudentAdded) {
        onStudentAdded();
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error adding student:', err.message);
      setError(`خطأ في الإضافة: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>إضافة طالب جديد لحسابك</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="student-form">
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <div className="form-row">
            <div className="form-group">
              <label>الاسم الأول *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="الاسم الأول"
              />
            </div>
            <div className="form-group">
              <label>الاسم الأخير *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="الاسم الأخير"
              />
            </div>
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

          <div className="form-row">
            <div className="form-group">
              <label>نوع التعليم *</label>
              <select
                name="education_type_id"
                value={formData.education_type_id}
                onChange={handleChange}
                required
              >
                <option value="">اختر النوع</option>
                {educationTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
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
                {gradeLevels.map((level) => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>صلة القرابة *</label>
            <select
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
              required
            >
              <option value="أب">أب</option>
              <option value="أم">أم</option>
              <option value="ولي أمر">ولي أمر</option>
              <option value="قريب">قريب</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentToParentModal;