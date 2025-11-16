import React, { useState } from 'react';
import '../../styles/AssessmentForm.css';

const AssessmentForm = ({ students, selectedStudent, onSaveAssessment }) => {
  const [formData, setFormData] = useState({
    student_id: '',
    week_start_date: getCurrentWeek(),
    grammar_score: 0,
    vocabulary_score: 0,
    memorization_score: 0,
    writing_score: 0,
    homework_score: 0,
    quiz_score: 0,
    interaction_score: 0,
    attendance_score: 0,
    teacher_notes: ''
  });

  const [saving, setSaving] = useState(false);

function getCurrentWeek() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() - 1); // غير إلى -1 علشان السبت
  return startOfWeek.toISOString().split('T')[0];
}

  const calculateTotal = () => {
    const {
      grammar_score,
      vocabulary_score,
      memorization_score,
      writing_score,
      homework_score,
      interaction_score,
      attendance_score
    } = formData;

    return (
      parseInt(grammar_score) +
      parseInt(vocabulary_score) +
      parseInt(memorization_score) +
      parseInt(writing_score) +
      parseInt(homework_score) +
      parseInt(interaction_score) +
      parseInt(attendance_score)
    );
  };

  const getGrade = (total) => {
    if (total >= 90) return { text: 'ممتاز', class: 'excellent' };
    if (total >= 80) return { text: 'جيد جداً', class: 'very-good' };
    if (total >= 70) return { text: 'جيد', class: 'good' };
    if (total >= 60) return { text: 'مقبول', class: 'average' };
    return { text: 'ضعيف', class: 'weak' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const result = await onSaveAssessment(formData);
    
    if (result.success) {
      // Reset form
      setFormData({
        ...formData,
        grammar_score: 0,
        vocabulary_score: 0,
        memorization_score: 0,
        writing_score: 0,
        homework_score: 0,
        interaction_score: 0,
        attendance_score: 0,
        teacher_notes: ''
      });
    }

    setSaving(false);
  };

  const totalScore = calculateTotal();
  const gradeInfo = getGrade(totalScore);

  return (
    <form onSubmit={handleSubmit} className="assessment-form">
      <div className="form-grid">
        <div className="form-group">
          <label>اختيار الطالب *</label>
          <select
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            required
          >
            <option value="">اختر الطالب</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} - {student.grade_level_id || 'غير محدد'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>الأسبوع الدراسي *</label>
          <input
            type="date"
            value={formData.week_start_date}
            onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="scores-grid">
        {[
          { name: 'grammar_score', label: 'الجـرامر (15%)', max: 15 },
          { name: 'vocabulary_score', label: 'المفردات (15%)', max: 15 },
          { name: 'memorization_score', label: 'التسميع (15%)', max: 15 },
          { name: 'writing_score', label: 'الكتابة (15%)', max: 15 },
          { name: 'homework_score', label: 'الواجب (15%)', max: 15 },
          { name: 'quiz_score', label: 'الاختبارات القصيرة (10%)', max: 10 },
          { name: 'interaction_score', label: 'التفاعل (10%)', max: 10 },
          { name: 'attendance_score', label: 'الحضور (15%)', max: 15 }
        ].map(({ name, label, max }) => (
          <div key={name} className="score-input">
            <label>{label}</label>
            <input
              type="number"
              min="0"
              max={max}
              value={formData[name]}
              onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
              className="score-field"
            />
            <span className="score-range">0-{max}</span>
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>ملاحظات المعلم</label>
        <textarea
          value={formData.teacher_notes}
          onChange={(e) => setFormData({ ...formData, teacher_notes: e.target.value })}
          rows="3"
          placeholder="اكتب ملاحظاتك هنا..."
        />
      </div>

      <div className="results-section">
        <h3>نتيجة التقييم</h3>
        <div className="results-grid">
          <div className="result-item">
            <span>المجموع الكلي:</span>
            <strong>{totalScore}%</strong>
          </div>
          <div className="result-item">
            <span>التقدير:</span>
            <span className={`grade-badge ${gradeInfo.class}`}>
              {gradeInfo.text}
            </span>
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving} className="submit-btn">
        {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
      </button>
    </form>
  );
};

export default AssessmentForm;