import React from 'react';
import './StatsGrid.css';

const StatsGrid = ({ studentsCount, averagePerformance, weeklyAssessments, weeklyClasses }) => {
  const stats = [
    {
      title: 'عدد الطلاب',
      value: studentsCount,
      icon: '👨‍🎓',
      color: '#667eea',
      description: 'إجمالي الطلاب المسجلين'
    },
    {
      title: 'متوسط الأداء',
      value: `${averagePerformance}%`,
      icon: '📊',
      color: '#5fd083',
      description: 'متوسط أداء الطلاب'
    },
    {
      title: 'تقييم هذا الأسبوع',
      value: weeklyAssessments,
      icon: '✅',
      color: '#ff9966',
      description: 'عدد التقييمات المسجلة'
    },
    {
      title: 'حصص هذا الأسبوع',
      value: weeklyClasses,
      icon: '📅',
      color: '#ff6b6b',
      description: 'عدد الحصص المقررة'
    }
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className="stat-icon" style={{ background: stat.color }}>
            <span>{stat.icon}</span>
          </div>
          <div className="stat-content">
            <h3>{stat.value}</h3>
            <p className="stat-title">{stat.title}</p>
            <p className="stat-description">{stat.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;