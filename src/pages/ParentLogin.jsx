// ParentLogin.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/ParentLogin.css';

const ParentLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate(); // إضافة useNavigate

  // التحقق من وجود بيانات مرسلة من صفحة التسجيل
  useEffect(() => {
    if (location.state?.preFilledEmail) {
      setEmail(location.state.preFilledEmail);
    }
    
    if (location.state?.registrationSuccess) {
      setSuccessMessage('تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور.');
    }
  }, [location.state]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password)
        .single();

      if (error) throw error;
      
      if (data) {
        localStorage.setItem('parentUser', JSON.stringify(data));
        onLogin(data);
        // التوجيه إلى dashboard ولي الأمر بعد تسجيل الدخول الناجح
        navigate('/parent');
      } else {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      setError('حدث خطأ أثناء تسجيل الدخول');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parent-login-container">
      <div className="login-form">
        <h2>تسجيل دخول ولي الأمر</h2>
        
        {successMessage && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {successMessage}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>
          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="أدخل كلمة المرور"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <div className="login-help">
          <p>إذا كنت تواجه مشكلة في تسجيل الدخول، يرجى التواصل مع المدرسة.</p>
        </div>
      </div>
    </div>
  );
};

export default ParentLogin;