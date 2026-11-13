import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import Layout from './components/Layout'
import SignIn from './pages/SignIn'
import Home from './pages/Home'
import ClientLookup from './pages/ClientLookup'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="clients" element={<ClientLookup />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="records" element={<Records />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
