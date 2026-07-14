import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { User, LogOut, Settings, LayoutDashboard, Shield, Menu, X } from 'lucide-react';
import CapitalMatchLogo from './CapitalMatchLogo';
import useIsMobile from '../hooks/useIsMobile';

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
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
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
        {/* Logo: bei White-Label-Tenants: Logo/Name des Mandanten */}
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
        {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {navLink('/projekte', t('nav.marketplace', 'Marktplatz'))}
          {navLink('/unternehmenswert', t('nav.valuation', 'Unternehmenswert'))}
          {user && !isAdmin && navLink('/bewertung', t('nav.detailed_valuation', 'Bewertung'))}
          {user && !isAdmin && navLink('/nachrichten', t('nav.messages', 'Nachrichten'))}
          {user && !isAdmin && navLink('/feedback', t('nav.feedback', 'Feedback'))}
          {navLink('/kontakt', t('nav.contact', 'Kontakt'))}
          {!user && navLink('/registrieren', t('nav.register', 'Registrieren'))}
          {user && !isAdmin && navLink('/dashboard', t('nav.dashboard', 'Mein Bereich'))}
          {isAdmin && navLink('/crm', 'CRM')}
          {isAdmin && navLink('/admin', 'Admin')}
        </div>
        )}

        {/* Mobile: Hamburger */}
        {isMobile && (
          <button onClick={() => setOpen(o => !o)} aria-label="Menü" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* Auth area (Desktop) */}
        {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Sprachumschalter DE / EN */}
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, overflow: 'hidden' }}>
            {['de', 'en'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-label={l === 'de' ? 'Deutsch' : 'English'}
                style={{
                  background: lang === l ? 'rgba(255,255,255,0.9)' : 'transparent',
                  color: lang === l ? C.navy : 'rgba(255,255,255,0.8)',
                  border: 'none', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 800,
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {!user ? (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.80)', textDecoration: 'none', fontSize: '0.9rem' }}>
                {t('nav.login', 'Anmelden')}
              </Link>
              <Link to="/registrieren" style={{
                background: C.steel, color: '#fff',
                padding: '0.45rem 1.1rem', borderRadius: 6,
                fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
                letterSpacing: '0.02em',
              }}>
                {t('nav.register', 'Registrieren')}
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
                      {user.role === 'super_admin' ? t('role.super_admin', 'Administrator') : user.role === 'advisor' ? t('role.advisor', 'Berater') : t('role.buyer', 'Investor')}
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
                    <Settings size={14} color={C.navy} /> {t('nav.profile', 'Mein Profil')}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setDropdownOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.65rem 1rem', color: C.dark, textDecoration: 'none', fontSize: '0.875rem',
                    }}>
                      <Shield size={14} color={C.navy} /> {t('nav.admin_area', 'Admin-Bereich')}
                    </Link>
                  )}
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.65rem 1rem', color: '#e53e3e', background: 'none',
                    border: 'none', borderTop: '1px solid #eef2f7',
                    width: '100%', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.2rem',
                  }}>
                    <LogOut size={14} /> {t('nav.logout', 'Abmelden')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Mobile-Menü (aufklappbar) */}
      {isMobile && open && (
        <div style={{ background: branding ? branding.primary_color : C.navy, borderTop: '1px solid rgba(255,255,255,0.12)', padding: '0.5rem 1.25rem 1rem' }}>
          {[['/projekte', t('nav.marketplace', 'Marktplatz')], ['/unternehmenswert', t('nav.valuation', 'Unternehmenswert')],
            ...(user && !isAdmin ? [['/bewertung', t('nav.detailed_valuation', 'Bewertung')], ['/nachrichten', t('nav.messages', 'Nachrichten')], ['/feedback', t('nav.feedback', 'Feedback')]] : []),
            ['/kontakt', t('nav.contact', 'Kontakt')],
            ...(user && !isAdmin ? [['/dashboard', t('nav.dashboard', 'Mein Bereich')]] : []),
            ...(isAdmin ? [['/crm', 'CRM'], ['/admin', 'Admin']] : []),
          ].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} style={{ display: 'block', color: '#fff', textDecoration: 'none', padding: '0.7rem 0.25rem', fontSize: '0.95rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{label}</Link>
          ))}
          {/* Sprache im Mobilmenü */}
          <div style={{ display: 'flex', gap: 6, marginTop: '0.9rem', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('common.language', 'Sprache')}:</span>
            {['de', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                background: lang === l ? 'rgba(255,255,255,0.9)' : 'transparent',
                color: lang === l ? C.navy : 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6,
                padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
              }}>{l.toUpperCase()}</button>
            ))}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!user ? (
              <>
                <Link to="/login" onClick={() => setOpen(false)} style={{ color: '#fff', textDecoration: 'none', padding: '0.6rem 0.25rem', fontSize: '0.95rem' }}>{t('nav.login', 'Anmelden')}</Link>
                <Link to="/registrieren" onClick={() => setOpen(false)} style={{ background: C.steel, color: '#fff', padding: '0.7rem', borderRadius: 8, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>{t('nav.register', 'Registrieren')}</Link>
              </>
            ) : (
              <>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', padding: '0.3rem 0.25rem' }}>{[user.title, user.first_name, user.last_name].filter(Boolean).join(' ')} · {user.email}</div>
                <Link to="/profil" onClick={() => setOpen(false)} style={{ color: '#fff', textDecoration: 'none', padding: '0.6rem 0.25rem', fontSize: '0.95rem' }}>{t('nav.profile', 'Mein Profil')}</Link>
                <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}>{t('nav.logout', 'Abmelden')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
