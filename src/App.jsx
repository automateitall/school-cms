import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Notices from './pages/Notices'
import Admissions from './pages/Admissions'
import Attendance from './pages/Attendance'
import Marks from './pages/Marks'
import ReportCard from './pages/ReportCard'
import QuestionPaper from './pages/QuestionPaper'
import Settings from './pages/Settings'
import Subjects from './pages/Subjects'
import ExamTypes from './pages/ExamTypes'

function App() {
  const token = localStorage.getItem('token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/students" element={token ? <Students /> : <Navigate to="/login" />} />
        <Route path="/notices" element={token ? <Notices /> : <Navigate to="/login" />} />
        <Route path="/admissions" element={token ? <Admissions /> : <Navigate to="/login" />} />
        <Route path="/attendance" element={token ? <Attendance /> : <Navigate to="/login" />} />
        <Route path="/marks" element={token ? <Marks /> : <Navigate to="/login" />} />
        <Route path="/report-card" element={token ? <ReportCard /> : <Navigate to="/login" />} />
        <Route path="/question-paper" element={token ? <QuestionPaper /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" />} />
        <Route path="/subjects" element={token ? <Subjects /> : <Navigate to="/login" />} />
        <Route path="/exam-types" element={token ? <ExamTypes /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App