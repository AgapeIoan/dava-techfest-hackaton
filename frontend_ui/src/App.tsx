import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import DuplicatesPage from './pages/Duplicates'
import MergePage from './pages/Merge'
import SecurityPolicyPage from './pages/SecurityPolicy'
import AdminPage from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/duplicates" replace />} />
        <Route path="/duplicates" element={<DuplicatesPage />} />
        <Route path="/security" element={<SecurityPolicyPage />} />

        {/* Protected Routes */}
        <Route path="/merge" element={<ProtectedRoute> <MergePage /> </ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute> <AdminPage /> </ProtectedRoute>} />

        {/* --- Catch-all Route --- */}
        {/* If no other route matches, redirect to the main page */}
        <Route path="*" element={<Navigate to="/duplicates" replace />} />
      </Routes>
    </Layout>
  )
}
