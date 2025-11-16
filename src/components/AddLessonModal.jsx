// AddLessonModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService'; // 👈 ضروري لـ fetchInitialData
import { lessonService } from '../services/lessonService'; // 👈 تم إضافتها لمهام الأمان والحفظ والرفع
import '../styles/AddLessonModal.css';

const AddLessonModal = ({ isOpen, onClose, onLessonAdded, lesson }) => {
  const [gradeLevels, setGradeLevels] = useState([]);
  const [educationTypes, setEducationTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [hasCourses, setHasCourses] = useState(false);
  // 🚨 1. إضافة حالة جديدة لتخزين ملف التقييم 🚨
  const [assessmentFile, setAssessmentFile] = useState(null); 
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    lesson_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    education_type_id: '',
    grade_level_id: '',
    course_id: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (lesson) {
        setFormData({
          ...lesson,
          start_time: lesson.start_time ? lesson.start_time.slice(0, 5) : '',
          end_time: lesson.end_time ? lesson.end_time.slice(0, 5) : ''
        });
        // إذا كان يتم التعديل، قم بتصفير ملف الرفع ما لم يتم اختيار ملف جديد
        setAssessmentFile(null); 
      } else {
        setFormData({
          title: '',
          content: '',
          lesson_date: new Date().toISOString().slice(0, 10),
          start_time: '',
          end_time: '',
          education_type_id: '',
          grade_level_id: '',
          course_id: '' 
        });
        setAssessmentFile(null); 
      }
    }
  }, [isOpen, lesson]);

  const fetchInitialData = async () => {
    try {
      const { data: gradesData } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('name');
  
      const { data: typesData } = await supabase
        .from('group_types')
        .select('id, name')
        .order('name');
  
      setGradeLevels(gradesData || []);
      setEducationTypes(typesData || []);
      
      // جلب الكورسات - يتطلب getCurrentTeacherId
      const currentTeacherId = await getCurrentTeacherId();
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name')
        .eq('teacher_id', currentTeacherId);
      setCourses(coursesData || []);
      setHasCourses(coursesData && coursesData.length > 0);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  // دالة لمعالجة اختيار ملف التقييم
  const handleFileChange = (e) => {
      setAssessmentFile(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // تحويل بيانات النموذج لتناسب قاعدة البيانات (الخدمة ستقوم بالتحقق والأمان)
    const lessonData = {
      title: formData.title,
      content: formData.content,
      lesson_date: formData.lesson_date,
      start_time: formData.start_time + ':00',
      end_time: formData.end_time + ':00',
      education_type_id: formData.education_type_id,
      grade_level_id: formData.grade_level_id,
      course_id: formData.course_id,
    };

    try {
let successMessage = '';
      
      if (lesson) {
        // استخدام خدمة التحديث المؤمنة، وتمرير الملف المُختار
        await lessonService.updateLesson(lesson.id, lessonData, assessmentFile);
        successMessage = '✅ تم تحديث بيانات الحصة بنجاح.';
      } else {
        // استخدام خدمة الإنشاء المؤمنة، وتمرير الملف المُختار
        await lessonService.createLesson(lessonData, assessmentFile);
        successMessage = '🎉 تم إنشاء الحصة الجديدة بنجاح!';
      }
      
      // 🚨 الإضافة المطلوبة هنا (إشعار النجاح) 🚨
      alert(successMessage);
      
      onLessonAdded();
      onClose();

    } catch (error) {
      console.error('Error saving lesson:', error);
      // عرض رسالة الخطأ الواردة من الخدمة لتوضيح المشكلة الأمنية (إن وجدت)
      alert(`حدث خطأ: ${error.message}`); 
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <h2>{lesson ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>عنوان الحصة</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>وصف الحصة</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows="3"
            />
          </div>
          
          {/* 🚨 2. إضافة حقل رفع ملف التقييم 🚨 */}
          <div className="form-group">
            <label>ملف أسئلة التقييم (اختياري)</label>
            <input
              type="file"
              onChange={handleFileChange}
              // يمكنك إضافة خاصية 'accept' لتحديد أنواع الملفات المسموح بها (مثل .pdf, .docx)
              // accept=".pdf, .doc, .docx"
            />
             {/* عرض اسم الملف الحالي إذا كان يتم التعديل ولا يوجد ملف جديد */}
            {lesson && lesson.assessment_file_url && !assessmentFile && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: '#555' }}>
                    ملف موجود: اضغط "تحديث" لحفظ الملف الحالي أو اختر ملفاً جديداً.
                </p>
            )}
            {/* عرض اسم الملف الذي تم اختياره حديثاً */}
            {assessmentFile && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: '#007bff' }}>
                    تم اختيار: {assessmentFile.name}
                </p>
            )}
          </div>
          {/* 🚨 نهاية حقل رفع الملف 🚨 */}

          <div className="form-row">
            <div className="form-group">
              <label>تاريخ الحصة</label>
              <input
                type="date"
                value={formData.lesson_date}
                onChange={(e) => setFormData({...formData, lesson_date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>بداية الحصة</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>نهاية الحصة</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>المستوى الدراسي</label>
              <select
                value={formData.grade_level_id}
                onChange={(e) => setFormData({...formData, grade_level_id: e.target.value})}
              >
                <option value="">اختر المستوى</option>
                {gradeLevels.map(grade => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>نوع التعليم</label>
              <select
                value={formData.education_type_id}
                onChange={(e) => setFormData({...formData, education_type_id: e.target.value})}
              >
                <option value="">اختر النوع</option>
                {educationTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
  <label>الكورس</label>
  {!hasCourses && (
  <p style={{color: 'red', fontSize: '14px', marginTop: '5px'}}>
    ⚠️ أنشئ كورس أولاً علشان تضيف حصص
  </p>
)}
  <select
    value={formData.course_id}
    onChange={(e) => setFormData({...formData, course_id: e.target.value})}
    required
  >
    <option value="">اختر الكورس</option>
    {courses.map(course => (
      <option key={course.id} value={course.id}>
        {course.name}
      </option>
    ))}
  </select>
</div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !formData.course_id}>
              {loading ? 'جاري الحفظ...' : (lesson ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
};

export default AddLessonModal;