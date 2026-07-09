import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Home            from './pages/Home'
import Login           from './pages/Login'
import Signup          from './pages/Signup'
import AdminRegister   from './pages/AdminRegister'
import Assessment      from './pages/Assessment'
import OpenAssessmentEntry from './pages/OpenAssessmentEntry'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import ConsultantPortal from './portals/ConsultantPortal'
import ClientPortal     from './portals/ClientPortal'
import HowToGuide      from './pages/HowToGuide'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/"               element={<Home />} />
              <Route path="/login"          element={<Login />} />
              <Route path="/signup"         element={<Signup />} />
              <Route path="/admin-register" element={<AdminRegister />} />

              <Route path="/app" element={
                <ProtectedRoute requiredRole={['consultant', 'superadmin']}>
                  <ConsultantPortal />
                </ProtectedRoute>
              } />

              <Route path="/client" element={
                <ProtectedRoute requiredRole={['client', 'superadmin']}>
                  <ClientPortal />
                </ProtectedRoute>
              } />

              <Route path="/assess/:token"  element={<Assessment />} />
              <Route path="/assess/open/:openToken" element={<OpenAssessmentEntry />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/how-to-guide" element={<HowToGuide />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
