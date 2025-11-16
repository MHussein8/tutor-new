import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentsPage from './pages/StudentsPage';
import './styles/main.css';
import DailyAssessmentPage from './pages/DailyAssessmentPage';

function App() {
  return (
    <Router>
<Routes>
  <Route path="/" element={<TeacherDashboard />} />
  <Route path="/students" element={<StudentsPage />} />
  <Route path="/daily-assessment" element={<DailyAssessmentPage />} />
</Routes>
    </Router>
  );
}

export default App;