import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import DuplicatesPage from './pages/Duplicates'
import MergePage from './pages/Merge'
import SecurityPolicyPage from './pages/SecurityPolicy'  // ⬅️ nou

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/duplicates" replace />} />
        <Route path="/duplicates" element={<DuplicatesPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/security" element={<SecurityPolicyPage />} /> {/* ⬅️ nou */}
        <Route path="*" element={<Navigate to="/duplicates" replace />} />
      </Routes>
    </Layout>
  )
}
