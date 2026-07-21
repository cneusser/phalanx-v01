import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider, useT } from './i18n';
import Navbar from './components/Navbar';
import CapitalMatchLogo from './components/CapitalMatchLogo';
import Landing from './pages/Landing';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ValuationCalculator from './pages/ValuationCalculator';
import DetailedValuation from './pages/DetailedValuation';
import ProjectSafe from './pages/ProjectSafe';
import ExposeEditor from './pages/ExposeEditor';
import ExposeView from './pages/ExposeView';
import Feedback from './pages/Feedback';
import SearchProfiles from './pages/SearchProfiles';
import Watchlist from './pages/Watchlist';
import Contact from './pages/Contact';
import VerifyEmail from './pages/VerifyEmail';
import InvitationAccept from './pages/InvitationAccept';
import Crm from './pages/Crm';
import ConsentInvite from './pages/ConsentInvite';
import BirdviewBanner from './components/BirdviewBanner';
import ErrorBoundary from './components/ErrorBoundary';
import ContactSelfService from './pages/ContactSelfService';
import Messages from './pages/Messages';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import SellerDashboard from './pages/SellerDashboard';
import Funnel from './pages/Funnel';
import SharedDocument from './pages/SharedDocument';
import Datenschutz from './pages/Datenschutz';
import Impressum from './pages/Impressum';
import Cookies from './pages/Cookies';
import AGB from './pages/AGB';
import CookieNotice from './components/CookieNotice';
import NotFound from './pages/NotFound';

const C = { navy: '#1A4D8A', steel: '#29ABE2', lightBg: '#EBF7FC' };

// Routes that have their own footer
const NO_FOOTER_PATHS = ['/'];

function ProtectedRoute({ children, adminOnly = false, sellerOk = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#878787' }}>Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !['super_admin', 'advisor'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Footer() {
  const location = useLocation();
  const t = useT();
  if (NO_FOOTER_PATHS.includes(location.pathname)) return null;

  return (
    <footer style={{ background: '#0B1F3D', color: 'rgba(255,255,255,0.55)', padding: '1.75rem 1.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <CapitalMatchLogo textSize={15} white={true} compact={true} />
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem' }}>
          <Link to="/impressum" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{t('footer.imprint', 'Impressum')}</Link>
          <Link to="/datenschutz" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{t('footer.privacy', 'Datenschutz')}</Link>
          <Link to="/agb" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{t('footer.terms', 'AGB')}</Link>
          <Link to="/cookies" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{t('footer.cookies', 'Cookies')}</Link>
          <a href="mailto:neusser@phalanx.de" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{t('footer.contact', 'Kontakt')}</a>
        </div>
        <div style={{ fontSize: '0.72rem' }}>© 2026 Phalanx GmbH</div>
      </div>
    </footer>
  );
}

function AppRoutes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <BirdviewBanner />
      <Navbar />
      <main style={{ flex: 1 }}>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/projekte" element={<Projects />} />
          <Route path="/projekte/:id" element={<ProjectDetail />} />
          <Route path="/unternehmenswert" element={<ValuationCalculator />} />
          <Route path="/bewertung" element={<ProtectedRoute><DetailedValuation /></ProtectedRoute>} />
          <Route path="/mandat/:id/safe" element={<ProtectedRoute><ProjectSafe /></ProtectedRoute>} />
          <Route path="/mandat/:id/expose" element={<ProtectedRoute><ExposeEditor /></ProtectedRoute>} />
          <Route path="/projekte/:id/expose" element={<ProtectedRoute><ExposeView /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/suchprofile" element={<ProtectedRoute><SearchProfiles /></ProtectedRoute>} />
          <Route path="/merkliste" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/nachrichten" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/registrieren" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/passwort-vergessen" element={<ForgotPassword />} />
          <Route path="/passwort-reset" element={<ResetPassword />} />
          <Route path="/email-bestaetigen" element={<VerifyEmail />} />
          <Route path="/einladung" element={<InvitationAccept />} />
          <Route path="/einwilligung" element={<ConsentInvite />} />
          <Route path="/profil-pflege" element={<ContactSelfService />} />
          <Route path="/unterlagen" element={<SharedDocument />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute adminOnly><Crm /></ProtectedRoute>} />
          <Route path="/funnel" element={<ProtectedRoute><Funnel /></ProtectedRoute>} />
          <Route path="/verkaeuferdashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/agb" element={<AGB />} />
          <Route path="/nutzungsbedingungen" element={<AGB />} />
          <Route path="/kontakt" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <CookieNotice />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
