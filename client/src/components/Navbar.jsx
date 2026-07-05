import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Settings, LayoutDashboard, Shield } from 'lucide-react';
import CapitalMatchLogo from './CapitalMatchLogo';

// CapitalMatch brand palette – exported for use across the platform
export const C = {
  navy:    '#1A4D8A',   // Primary deep blue (CapitalMatch "Match" color)
  steel:   '#29ABE2',   // Accent sky blue (CapitalMatch "Capital" color)
  lightBg: '#EBF7FC',   // Light blue tint background
  xLight:  '#F3F8FC',   // Extra light section background
  gray:    '#878787',   // Muted text
  dark:    '#30302E',   // Dark text
  white:   '#FFFFFF',
};

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sprint 5: Branding je Tenant (Farben/Name über Subdomain aufgelöst)
  const [branding, setBranding] = useState(null);
  useEffect(() => {
    fetch('/api/tenant/branding')
      .then(r => r.json())
      .then(d => { if (d.success && d.data.slug !== 'phalanx') setBranding(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => { setOpen(false); setDropdownOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const navLink = (to, label) => {
    const active = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link to={to} onClick={() => setOpen(false)} style={{
        color: active ? C.steel : 'rgba(255,255,255,0.80)',
        textDecoration: 'none',
        fontWeight: active ? 600 : 400,
        fontSize: '0.9rem',
        letterSpacing: '0.01em',
        padding: '0.25rem 0',
        borderBottom: active ? `2px solid ${C.steel}` : '2px solid transparent',
        transition: 'all 0.2s',
      }}>
        {label}
      </Link>
    );
  };

  return (
    <nav style={{
      background: branding ? branding.primary_color : C.navy,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 16px rgba(26,77,138,0.22)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
      }}>
        {/* Logo — bei White-Label-Tenants: Logo/Name des Mandanten */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {branding ? (
            <>
              {branding.logo_url && <img src={branding.logo_url} alt="" style={{ height: 32, width: 'auto' }} />}
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                {branding.display_name}
              </span>
            </>
          ) : (
            <CapitalMatchLogo textSize={19} white={true} compact={true} />
          )}
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {navLink('/projekte', 'Marktplatz')}
          {navLink('/unternehmenswert', 'Unternehmenswert')}
          {user && !isAdmin && navLink('/bewertung', 'Bewertung')}
          {!user && navLink('/registrieren', 'Registrieren')}
          {user && !isAdmin && navLink('/dashboard', 'Mein Bereich')}
          {isAdmin && navLink('/admin', 'Admin')}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!user ? (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.80)', textDecoration: 'none', fontSize: '0.9rem' }}>
                Anmelden
              </Link>
              <Link to="/registrieren" style={{
                background: C.steel, color: '#fff',
                padding: '0.45rem 1.1rem', borderRadius: 6,
                fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
                letterSpacing: '0.02em',
              }}>
                Registrieren
              </Link>
            </>
          ) : (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                style={{
                  background: 'rgba(41,171,226,0.15)',
                  border: `1px solid rgba(41,171,226,0.35)`,
                  borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff',
                }}
              >
                <User size={15} />
                <span style={{ fontSize: '0.85rem' }}>{[user.title, user.first_name, user.last_name].filter(Boolean).join(' ')}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▾</span>
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%',
                  background: '#fff', borderRadius: 10,
                  boxShadow: '0 8px 32px rgba(26,77,138,0.14)',
                  minWidth: 210, overflow: 'hidden', zIndex: 200,
                }}>
                  <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #eef2f7', background: C.xLight }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.navy }}>{[user.salutation, user.title, user.first_name, user.last_name].filter(Boolean).join(' ')}</div>
                    <div style={{ fontSize: '0.75rem', color: C.gray }}>{user.email}</div>
                    <div style={{
                      display: 'inline-block', marginTop: '0.3rem',
                      background: C.lightBg, color: C.navy,
                      fontSize: '0.7rem', fontWeight: 600,
                      padding: '0.1rem 0.5rem', borderRadius: 20,
                    }}>
                      {user.role === 'super_admin' ? 'Administrator' : user.role === 'advisor' ? 'Berater' : 'Investor'}
                    </div>
                  </div>
                  {(user.role !== 'super_admin' && user.role !== 'advisor') && (
                    <Link to="/dashboard" onClick={() => setDropdownOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.65rem 1rem', color: C.dark, textDecoration: 'none', fontSize: '0.875rem',
                    }}>
                      <LayoutDashboard size={14} color={C.navy} /> Dashboard
                    </Link>
                  )}
                  <Link to="/profil" onClick={() => setDropdownOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.65rem 1rem', color: C.dark, textDecoration: 'none', fontSize: '0.875rem',
                  }}>
                    <Settings size={14} color={C.navy} /> Mein Profil
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setDropdownOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.65rem 1rem', color: C.dark, textDecoration: 'none', fontSize: '0.875rem',
                    }}>
                      <Shield size={14} color={C.navy} /> Admin-Bereich
                    </Link>
                  )}
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.65rem 1rem', color: '#e53e3e', background: 'none',
                    border: 'none', borderTop: '1px solid #eef2f7',
                    width: '100%', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.2rem',
                  }}>
                    <LogOut size={14} /> Abmelden
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
