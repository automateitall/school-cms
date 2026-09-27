import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import Notices from './pages/Notices'
import Admissions from './pages/Admissions'
import Attendance from './pages/Attendance'
import Marks from './pages/Marks'
import ReportCard from './pages/ReportCard'
import PrintReportCard from './pages/PrintReportCard'
import QuestionPaper from './pages/QuestionPaper'
import PrintQuestionPaper from './pages/PrintQuestionPaper'
import Settings from './pages/Settings'
import Subjects from './pages/Subjects'
import ExamTypes from './pages/ExamTypes'
import Gallery from './pages/Gallery'
import YearEnd from './pages/YearEnd'

function AppRoutes() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/marks" element={<Marks />} />
        <Route path="/report-card" element={<ReportCard />} />
        <Route path="/print/report-card/:studentId" element={<PrintReportCard />} />
        <Route path="/question-paper" element={<QuestionPaper />} />
        <Route path="/print/question-paper/:id" element={<PrintQuestionPaper />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/exam-types" element={<ExamTypes />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/year-end" element={<YearEnd />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
