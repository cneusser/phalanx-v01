import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Datenschutz from './pages/Datenschutz';
import Impressum from './pages/Impressum';
import NotFound from './pages/NotFound';
import PhalanxLogo from './components/PhalanxLogo';

const C = { navy: '#14314F', steel: '#A5C8E4', lightBg: '#EDF4FA' };

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#878787' }}>Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !['super_admin', 'advisor'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Footer() {
  return (
    <footer style={{ background: '#0d1f2f', color: 'rgba(255,255,255,0.55)', padding: '2rem 1.5rem', marginTop: '4rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <PhalanxLogo size={28} showText={true} textSize={16} white={true} />
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
          <Link to="/impressum" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Impressum</Link>
          <Link to="/datenschutz" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Datenschutz</Link>
          <a href="mailto:info@phalanx.de" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Kontakt</a>
        </div>
        <div style={{ fontSize: '0.75rem' }}>© 2025 Phalanx GmbH</div>
      </div>
    </footer>
  );
}

function AppRoutes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/projekte" element={<Projects />} />
          <Route path="/projekte/:id" element={<ProjectDetail />} />
          <Route path="/registrieren" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
