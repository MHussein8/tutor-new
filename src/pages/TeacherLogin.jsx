import React, { useState } from 'react';
import { supabase } from '../services/supabase';
// قم باستيراد ملف التنسيق الجديد
import '../styles/TeacherLogin.css';

const TeacherLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', email)
      .single();

    if (teacher) {
      localStorage.setItem('current_teacher_id', teacher.id);
      window.location.href = '/teacher-dashboard';
    } else {
      alert('المدرس غير مسجل!');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2>تسجيل دخول المعلم</h2>
        <div className="form-group">
          <input 
            type="email" 
            placeholder="البريد الإلكتروني" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="login-input"
          />
        </div>
        <div className="form-group">
          <input 
            type="password" 
            placeholder="كلمة المرور" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="login-input"
          />
        </div>
        <button type="submit" className="login-btn">دخول</button>
      </form>
    </div>
  );
};
export default TeacherLogin;