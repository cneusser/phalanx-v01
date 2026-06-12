import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Menu, X, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';

const C = {
  navy: '#1B3A5C', gold: '#C8A97E', bg: '#F5F3EF',
};

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const navLink = (to, label) => {
    const active = location.pathname === to;
    return (
      <Link to={to} onClick={() => setOpen(false)} style={{
        color: active ? C.gold : 'rgba(255,255,255,0.85)',
        textDecoration: 'none', fontWeight: active ? 600 : 400,
        fontSize: '0.9rem', letterSpacing: '0.01em',
        padding: '0.25rem 0',
        borderBottom: active ? `2px solid ${C.gold}` : '2px solid transparent',
        transition: 'all 0.2s',
      }}>
        {label}
      </Link>
    );
  };

  return (
    <nav style={{ background: C.navy, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div style={{ background: C.gold, borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color={C.navy} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>PHALANX</div>
            <div style={{ color: C.gold, fontSize: '0.65rem', letterSpacing: '0.12em', marginTop: -2 }}>M&A PLATTFORM</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="desktop-nav">
          {navLink('/projekte', 'Transaktionen')}
          {!user && navLink('/registrieren', 'Registrieren')}
          {user && !isAdmin && navLink('/dashboard', 'Mein Bereich')}
          {isAdmin && navLink('/admin', 'Admin')}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!user ? (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.9rem' }}>Anmelden</Link>
              <Link to="/registrieren" style={{
                background: C.gold, color: C.navy, padding: '0.45rem 1.1rem',
                borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
              }}>
                Registrieren
              </Link>
            </>
          ) : (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff',
              }}>
                <User size={15} />
                <span style={{ fontSize: '0.85rem' }}>{user.first_name}</span>
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%',
                  background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  minWidth: 200, overflow: 'hidden', zIndex: 200,
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: C.navy }}>{user.first_name} {user.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{user.email}</div>
                  </div>
                  <Link to="/dashboard" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', color: '#333', textDecoration: 'none', fontSize: '0.875rem' }}>
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                  <Link to="/profil" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', color: '#333', textDecoration: 'none', fontSize: '0.875rem' }}>
                    <Settings size={14} /> Mein Profil
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', color: '#333', textDecoration: 'none', fontSize: '0.875rem' }}>
                      <Shield size={14} /> Admin-Bereich
                    </Link>
                  )}
                  <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', color: '#e53e3e', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontSize: '0.875rem', borderTop: '1px solid #eee', marginTop: '0.25rem' }}>
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
