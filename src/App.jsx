import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OrganisationScopeProvider } from './context/OrganisationScopeContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import RequireMfa from './routes/guards/RequireMfa'
import { TooltipProvider } from './components/ui/tooltip'
import Home            from './pages/Home'
import Login           from './pages/Login'
import Signup          from './pages/Signup'
import AdminRegister   from './pages/AdminRegister'
import Assessment      from './pages/Assessment'
import OpenAssessmentEntry from './pages/OpenAssessmentEntry'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import ChangeTemporaryPassword from './pages/ChangeTemporaryPassword'
import ConsultantPortal from './portals/ConsultantPortal'
import ClientPortal     from './portals/ClientPortal'
import HowToGuide      from './pages/HowToGuide'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
              <Route path="/"               element={<Home />} />
              <Route path="/login"          element={<Login />} />
              <Route path="/signup"         element={<Signup />} />
              <Route path="/admin-register" element={<AdminRegister />} />

              <Route path="/app" element={
                <ProtectedRoute requiredRole={['consultant', 'superadmin']}>
                  <RequireMfa>
                    <OrganisationScopeProvider>
                      <ConsultantPortal />
                    </OrganisationScopeProvider>
                  </RequireMfa>
                </ProtectedRoute>
              } />

              <Route path="/client" element={
                <ProtectedRoute requiredRole={['client', 'superadmin']}>
                  <ClientPortal />
                </ProtectedRoute>
              } />

              <Route path="/assess/:token"  element={<Assessment />} />
              <Route path="/assess/open/:openToken" element={<OpenAssessmentEntry />} />
              <Route path="/app/surveys/:surveyId/preview" element={
                <ProtectedRoute requiredRole={['superadmin']}>
                  <RequireMfa>
                    <Assessment previewMode />
                  </RequireMfa>
                </ProtectedRoute>
              } />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/change-temporary-password" element={<ChangeTemporaryPassword />} />
              <Route path="/how-to-guide" element={<HowToGuide />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
