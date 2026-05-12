import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Auth
import ProtectedRoute from './components/ProtectedRoute'

// Toast
import { ToastProvider } from './components/Toast'

// Public pages
import Home       from './pages/Home'
import Login      from './pages/Login'

// Public assessment page
import Assessment from './pages/Assessment'

// Portals
import ConsultantPortal from './portals/ConsultantPortal'
import ClientPortal     from './portals/ClientPortal'

// ── APP ─────────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"      element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Consultant portal — consultants and superadmins */}
          <Route path="/app" element={
            <ProtectedRoute requiredRole={['consultant', 'superadmin']}>
              <ConsultantPortal />
            </ProtectedRoute>
          } />

          {/* Client portal — requires client role */}
          <Route path="/client" element={
            <ProtectedRoute requiredRole={['client', 'superadmin']}>
              <ClientPortal />
            </ProtectedRoute>
          } />

          {/* Public employee assessment — no auth required */}
          <Route path="/assess/:token" element={<Assessment />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
