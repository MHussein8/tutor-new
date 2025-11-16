// src/components/CreateCourseModal.jsx

import React, { useState, useEffect } from 'react';
// 💡 نفترض أنك تستخدم supabase مباشرة لجلب الخيارات كما فعلت في WeeklyPlanArchive
import { supabase } from '../services/supabase'; 
import { courseService } from '../services/courseService';
import '../styles/CreateCourseModal.css'; // افترض وجود ملف تنسيق CSS

const CreateCourseModal = ({ isOpen, onClose, onSuccess }) => {
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedGroupType, setSelectedGroupType] = useState('');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [groupTypes, setGroupTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // جلب خيارات المستويات وأنواع المجموعات
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [gradeRes, groupRes] = await Promise.all([
          supabase.from('grade_levels').select('id, name'),
          supabase.from('group_types').select('id, name'),
        ]);

        setGradeLevels(gradeRes.data || []);
        setGroupTypes(groupRes.data || []);

        // تحديد الخيار الافتراضي إذا وجد
        if (gradeRes.data?.length > 0) {
          setSelectedGrade(gradeRes.data[0].id);
        }
        if (groupRes.data?.length > 0) {
          setSelectedGroupType(groupRes.data[0].id);
        }

      } catch (err) {
        console.error("Error fetching course options:", err);
        setError("فشل في تحميل خيارات الكورس.");
      }
    };

    if (isOpen) {
      fetchOptions();
      setError(null);
      setCourseName('');
      setCourseDescription('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!courseName || !selectedGrade || !selectedGroupType) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      setLoading(false);
      return;
    }

    try {
      // 💡 هنا يتم استدعاء دالة الإنشاء من الخدمة
      await courseService.createCourse({
        name: courseName,
        description: courseDescription,
        grade_level_id: selectedGrade,
        group_type_id: selectedGroupType,
      });

      alert('✅ تم إنشاء الكورس بنجاح!');
      onSuccess(); // لتحديث قائمة الكورسات في الصفحة الرئيسية
      onClose();

    } catch (err) {
      console.error("Course creation error:", err);
      // التعامل مع رسائل الخطأ التي تأتي من خدمة الكورسات
      setError(err.message || 'حدث خطأ غير متوقع أثناء إنشاء الكورس.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ direction: 'rtl' }}>
      <div className="modal-container" style={{ width: '450px' }}>
        <div className="modal-header">
          <h2>+ إنشاء كورس جديد</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <p className="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          
          <div className="form-group">
            <label htmlFor="courseName">اسم الكورس:</label>
            <input
              id="courseName"
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="courseDescription">الوصف (اختياري):</label>
            <textarea
              id="courseDescription"
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gradeLevel">المستوى/المرحلة:</label>
            <select
              id="gradeLevel"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              required
            >
              <option value="" disabled>اختر مستوى</option>
              {gradeLevels.map(grade => (
                <option key={grade.id} value={grade.id}>{grade.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="groupType">نوع المجموعة:</label>
            <select
              id="groupType"
              value={selectedGroupType}
              onChange={(e) => setSelectedGroupType(Number(e.target.value))}
              required
            >
              <option value="" disabled>اختر نوع</option>
              {groupTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء كورس'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourseModal;