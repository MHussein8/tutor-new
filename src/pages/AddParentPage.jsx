// AddParentPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import '../styles/AddParentPage.css';

const AddParentPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    parentPassword: '',
    confirmPassword: '',
    studentFirstName: '',
    studentLastName: '',
    studentBirthDate: '',
    educationType: '',
    gradeLevel: '',
    relationship: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [educationTypes, setEducationTypes] = useState([]); 
  const [gradeLevels, setGradeLevels] = useState([]); 
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const fetchOptions = async () => {
    try {
      // جلب أنواع التعليم من جدول group_types
      const { data: educationData, error: educationError } = await supabase
        .from('group_types')
        .select('id, name')
        .order('name');
      if (educationError) throw educationError;
      setEducationTypes(educationData || []);

      // جلب المستويات الدراسية من جدول grade_levels
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('name');
      if (gradeError) throw gradeError;
      setGradeLevels(gradeData || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      setMessage({ text: 'حدث خطأ في تحميل الخيارات', type: 'error' });
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    if (formData.parentPassword !== formData.confirmPassword) {
      setMessage({ text: 'كلمة المرور غير متطابقة', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      // 1. حفظ ولي الأمر في جدول parents
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .insert([{
          first_name: formData.parentFirstName,
          last_name: formData.parentLastName,
          email: formData.parentEmail,
          phone: formData.parentPhone,
          password_hash: formData.parentPassword
        }])
        .select()
        .single();
      if (parentError) throw parentError;

      // 2. حفظ الطالب في جدول students
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert([{
          first_name: formData.studentFirstName,
          last_name: formData.studentLastName,
          birth_date: formData.studentBirthDate || null,
          education_type_id: formData.educationType,
          grade_level_id: formData.gradeLevel
        }])
        .select()
        .single();
      if (studentError) throw studentError;

      // 3. ربط ولي الأمر بالطالب في جدول student_parents
      const { error: linkError } = await supabase
        .from('student_parents')
        .insert([{
          parent_id: parent.id,
          student_id: student.id,
          relationship: formData.relationship
        }]);
      if (linkError) throw linkError;

      setMessage({ text: 'تمت إضافة البيانات بنجاح! سيتم توجيهك إلى صفحة تسجيل الدخول خلال ثوانٍ.', type: 'success' });
      setRegisteredEmail(formData.parentEmail);
      setRegistrationSuccess(true);

      // إعادة تعيين النموذج بعد نجاح التسجيل
      setTimeout(() => {
        setFormData({
          parentFirstName: '', parentLastName: '', parentEmail: '', parentPhone: '',
          parentPassword: '', confirmPassword: '', studentFirstName: '',
          studentLastName: '', studentBirthDate: '', educationType: '',
          gradeLevel: '', relationship: ''
        });
        
        // توجيه إلى صفحة تسجيل الدخول بعد 3 ثوانٍ
        navigate('/parent-login', { 
          state: { 
            preFilledEmail: formData.parentEmail,
            registrationSuccess: true 
          } 
        });
      }, 3000);

    } catch (error) {
      setMessage({ text: `حدث خطأ: ${error.message}`, type: 'error' });
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  // إذا كان التسجيل ناجحاً، عرض رسالة التأكيد
  if (registrationSuccess) {
    return (
      <div className="add-parent-page">
        <div className="add-parent-container">
          <div className="registration-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>تم التسجيل بنجاح!</h2>
            <p>تم إنشاء حساب ولي الأمر بنجاح وسيتم توجيهك إلى صفحة تسجيل الدخول خلال ثوانٍ.</p>
            <p>بريدك الإلكتروني: <strong>{registeredEmail}</strong></p>
            <div className="redirect-countdown">
              <p>سيتم التوجيه خلال: <span id="countdown">3</span> ثوانٍ</p>
            </div>
            <button 
              className="go-to-login-btn"
              onClick={() => navigate('/parent-login', { state: { preFilledEmail: registeredEmail } })}
            >
              الذهاب إلى تسجيل الدخول الآن
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-parent-page">
      <div className="add-parent-container">
        <div className="add-parent-header">
          <h1>تسجيل ولي أمر جديد</h1>
          <p>املأ النموذج لإضافة حساب جديد والوصول إلى متابعة أداء الطالب</p>
        </div>
        <div className="add-parent-form-container">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>بيانات ولي الأمر</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>الاسم الأول *</label>
                  <input type="text" name="parentFirstName" value={formData.parentFirstName} onChange={handleChange} required placeholder="الاسم الأول" />
                </div>
                <div className="form-group">
                  <label>الاسم الأخير *</label>
                  <input type="text" name="parentLastName" value={formData.parentLastName} onChange={handleChange} required placeholder="الاسم الأخير" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>البريد الإلكتروني *</label>
                  <input type="email" name="parentEmail" value={formData.parentEmail} onChange={handleChange} required placeholder="example@email.com" />
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input type="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} placeholder="01XXXXXXXX" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>كلمة المرور *</label>
                  <input type="password" name="parentPassword" value={formData.parentPassword} onChange={handleChange} required placeholder="كلمة المرور" />
                </div>
                <div className="form-group">
                  <label>تأكيد كلمة المرور *</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="أعد كتابة كلمة المرور" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>بيانات الطالب</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>الاسم الأول للطالب *</label>
                  <input type="text" name="studentFirstName" value={formData.studentFirstName} onChange={handleChange} required placeholder="الاسم الأول للطالب" />
                </div>
                <div className="form-group">
                  <label>الاسم الأخير للطالب *</label>
                  <input type="text" name="studentLastName" value={formData.studentLastName} onChange={handleChange} required placeholder="الاسم الأخير للطالب" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>تاريخ الميلاد</label>
                  <input type="date" name="studentBirthDate" value={formData.studentBirthDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>نوع التعليم *</label>
                  <select name="educationType" value={formData.educationType} onChange={handleChange} required>
                    <option value="">اختر نوع التعليم</option>
                    {educationTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>المستوى الدراسي *</label>
                  <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required>
                    <option value="">اختر المستوى الدراسي</option>
                    {gradeLevels.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>صلة القرابة *</label>
                  <select name="relationship" value={formData.relationship} onChange={handleChange} required>
                    <option value="">اختر صلة القرابة</option>
                    <option value="أب">أب</option>
                    <option value="أم">أم</option>
                    <option value="ولي أمر">ولي أمر</option>
                    <option value="قريب">قريب</option>
                  </select>
                </div>
              </div>
              
              <div className="info-box">
                <h3><i className="fas fa-info-circle"></i> معلومات مهمة</h3>
                <p>بعد إدخال البيانات، سيتم توجيهك إلى صفحة تسجيل الدخول لاستخدام بريدك الإلكتروني وكلمة المرور للدخول إلى النظام.</p>
              </div>
            </div>
            
            <div className="btn-container">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i> إنشاء الحساب
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddParentPage;