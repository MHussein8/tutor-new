import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import '../styles/NewAssessmentModal.css';

const NewAssessmentModal = ({ isOpen, onClose, onAssessmentStart }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [loading, setLoading] = useState(false);

useEffect(() => {
  if (isOpen) {
    fetchStudents();
    // تعيين تاريخ بداية الأسبوع الحالي تلقائياً
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - 1); // السبت
    setWeekStartDate(startOfWeek.toISOString().split('T')[0]);
  }
}, [isOpen]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          grade_levels (name),
          group_types (name)
        `)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !weekStartDate) {
      alert('يرجى اختيار الطالب وتاريخ بداية الأسبوع');
      return;
    }

    setLoading(true);
    try {
      onAssessmentStart({
        student_id: selectedStudent,
        week_start_date: weekStartDate
      });
      onClose();
    } catch (error) {
      console.error('Error starting assessment:', error);
      alert('حدث خطأ أثناء بدء التقييم');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>بدء تقييم جديد</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="assessment-form">
          <div className="form-group">
            <label>اختيار الطالب *</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              required
            >
              <option value="">اختر الطالب</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} - 
                  {student.grade_levels?.name} - 
                  {student.group_types?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>أسبوع التقييم *</label>
            <input
              type="week"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              required
              className="week-input"
            />
            <small>سيتم تقييم الطالب لهذا الأسبوع</small>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-cancel">
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري البدء...' : 'بدء التقييم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAssessmentModal;
