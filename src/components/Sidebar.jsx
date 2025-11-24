import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/TeacherDashboard.css';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const sidebarRef = useRef(null);
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊', path: '/teacher-dashboard' },
    { id: 'courses', label: 'إدارة الكورسات', icon: '📚', path: '/course-management' },
    { id: 'students', label: 'الطلاب', icon: '👨‍🎓', path: '/students' },
    { id: 'assessments', label: 'التقييمات', icon: '📝', path: '/assessments' },
    { id: 'classes', label: 'الحصص', icon: '🏫', path: '/lessons-management' },
    { id: 'reports', label: 'التقرير الاسبوعي', icon: '📋', path: '/weekly-report' },
    { id: 'daily-assessment', label: 'تقييم يومي', icon: '✍️', path: '/daily-assessment' },
    { id: 'weekly-plan', label: 'الخطة الأسبوعية', icon: '📅', path: '/weekly-plans' },
    { id: 'messages', label: 'الرسائل', icon: '💬', path: '/messages' },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // إغلاق السايدبار عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !event.target.classList.contains('toggle-btn')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} ref={sidebarRef}>
      <div className="sidebar-content">
<div className="sidebar-logo">
  <img src="/sana.gif" alt="Sana Logo" className="logo-image" />
</div>        
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li 
                key={item.id} 
                className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
              >
                <Link 
                  to={item.path} 
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '18px' }}
                  onClick={() => window.innerWidth <= 1024 && setIsSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* زر تسجيل الخروج */}
        <div className="sidebar-footer">
          <button 
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('current_teacher_id');
              window.location.href = '/teacher-login';
            }}
          >
            <span className="nav-icon">🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
      
      <button onClick={toggleSidebar} className="toggle-btn">
        {isSidebarOpen ? '◀' : '▶'}
      </button>
    </div>
  );
};

export default Sidebar;