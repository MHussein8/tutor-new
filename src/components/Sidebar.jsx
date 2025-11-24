import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/TeacherDashboard.css';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const sidebarRef = useRef(null);
  const bottomNavRef = useRef(null);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊', path: '/teacher-dashboard', priority: 'high' },
    { id: 'courses', label: 'إدارة الكورسات', icon: '📚', path: '/course-management', priority: 'high' },
    { id: 'students', label: 'الطلاب', icon: '👨‍🎓', path: '/students', priority: 'high' },
    { id: 'assessments', label: 'التقييمات', icon: '📝', path: '/assessments', priority: 'high' },
    { id: 'classes', label: 'الحصص', icon: '🏫', path: '/lessons-management', priority: 'low' },
    { id: 'reports', label: 'التقرير الاسبوعي', icon: '📋', path: '/weekly-report', priority: 'low' },
    { id: 'daily-assessment', label: 'تقييم يومي', icon: '✍️', path: '/daily-assessment', priority: 'low' },
    { id: 'weekly-plan', label: 'الخطة الأسبوعية', icon: '📅', path: '/weekly-plans', priority: 'low' },
    { id: 'messages', label: 'الرسائل', icon: '💬', path: '/messages', priority: 'low' },
  ];

  const mainItems = navItems.filter(item => item.priority === 'high');
  const moreItems = navItems.filter(item => item.priority === 'low');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleMoreMenu = () => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
  };

  // إغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      // إغلاق السايدبار عند الضغط خارجها
      if (isSidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !event.target.classList.contains('toggle-btn')) {
        setIsSidebarOpen(false);
      }
      
      // إغلاق قائمة المزيد عند الضغط خارجها
      if (isMoreMenuOpen && 
          bottomNavRef.current && 
          !bottomNavRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen, isMoreMenuOpen, setIsSidebarOpen]);

  // مراقبة حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // إغلاق السايدبار تلقائياً عند التبديل إلى الموبايل
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, setIsSidebarOpen]);

  // إغلاق قائمة المزيد عند تغيير المسار
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleNavClick = () => {
    if (isMobile) {
      setIsMoreMenuOpen(false);
    } else {
      window.innerWidth <= 1024 && setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/* السايدبار التقليدي للشاشات الكبيرة */}
      {!isMobile && (
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
                      onClick={handleNavClick}
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
      )}

      {/* Bottom Navigation للشاشات الصغيرة */}
      {isMobile && (
        <div className="bottom-nav" ref={bottomNavRef}>
          <div className="bottom-nav-content">
            {mainItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`bottom-nav-item ${isActivePath(item.path) ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </Link>
            ))}
            
            {/* زر المزيد مع القائمة المنسدلة */}
            <div className="bottom-nav-more">
              <button 
                className={`bottom-nav-item ${isMoreMenuOpen ? 'active' : ''}`}
                onClick={toggleMoreMenu}
              >
                <span className="bottom-nav-icon">⋯</span>
                <span className="bottom-nav-label">المزيد</span>
              </button>
              
              {isMoreMenuOpen && (
                <div className="more-menu">
                  {moreItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`more-menu-item ${isActivePath(item.path) ? 'active' : ''}`}
                      onClick={handleNavClick}
                    >
                      <span className="more-menu-icon">{item.icon}</span>
                      <span className="more-menu-label">{item.label}</span>
                    </Link>
                  ))}
                  
                  {/* زر تسجيل الخروج في قائمة المزيد */}
                  <button 
                    className="more-menu-item logout-mobile"
                    onClick={() => {
                      localStorage.removeItem('current_teacher_id');
                      window.location.href = '/teacher-login';
                    }}
                  >
                    <span className="more-menu-icon">🚪</span>
                    <span className="more-menu-label">تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;