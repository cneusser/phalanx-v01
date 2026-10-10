import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, istGastansicht, setzeGastansicht } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // In der Gastansicht wird bewusst nichts geladen: Wer prüfen will, was ein
  // Besucher sieht, darf nicht nebenher als angemeldet gelten.
  // Die Gastansicht ist eine Vorschau, kein Zustand, in dem man sich anmeldet.
  // Auf der Anmeldeseite und auf der SSO-Landeseite wird sie deshalb beendet,
  // bevor irgendetwas anderes passiert. Ohne das entstand eine
  // Endlosschleife: Token im Speicher, aber nicht mitgeschickt, also nicht
  // angemeldet, also zurueck zur Anmeldung (v0.450).
  useEffect(() => {
    const pfad = typeof window !== 'undefined' ? window.location.pathname : '';
    if (istGastansicht() && ['/login', '/sso'].includes(pfad)) setzeGastansicht(false);
  }, []);

  useEffect(() => {
    if (istGastansicht()) { setLoading(false); return; }
    const token = localStorage.getItem('phalanx_token');
    if (token) {
      api.get('/auth/me')
        .then(data => setUser(data.user))
        .catch(async () => {
          // v0.459: Scheitert das Token, war es womöglich ein Birdview-Token.
          // Dann liegt das eigene Admin-Token noch daneben, und es wäre
          // unsinnig, den Betrachter abzumelden, weil die fremde Ansicht nicht
          // funktioniert hat. Vorher landete man in diesem Fall auf der
          // Anmeldeseite und musste sich neu anmelden.
          localStorage.removeItem('phalanx_token');
          const eigenes = localStorage.getItem('phalanx_admin_token');
          if (!eigenes) return;
          localStorage.setItem('phalanx_token', eigenes);
          localStorage.removeItem('phalanx_admin_token');
          try { setUser((await api.get('/auth/me')).user); }
          catch (_) { localStorage.removeItem('phalanx_token'); }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, turnstile_token) => {
    setzeGastansicht(false);
    const data = await api.post('/auth/login', { email, password, turnstile_token });
    // Sprint 13: Ist 2FA aktiv, kommt hier noch kein Token, sondern eine Challenge.
    if (data.twofa_required) return { twofa_required: true, challenge: data.challenge };
    localStorage.setItem('phalanx_token', data.token);
    setUser(data.user);
    return data.user;
  };

  // Zweiter Faktor: TOTP-Code oder Backup-Code
  const loginTwoFactor = async (challenge, code) => {
    setzeGastansicht(false);
    const data = await api.post('/auth/login/2fa', { challenge, code });
    localStorage.setItem('phalanx_token', data.token);
    setUser(data.user);
    return data.user;
  };

  // register now returns the raw server response.
  // If data.pending === true, there is no token and the user is NOT logged in.
  // Register.jsx detects this and shows a "pending approval" message.
  const register = async (formData) => {
    setzeGastansicht(false);
    const data = await api.post('/auth/register', formData);
    if (data.token) {
      localStorage.setItem('phalanx_token', data.token);
      setUser(data.user);
    }
    return data; // includes pending: true when awaiting admin approval
  };

  const logout = () => {
    localStorage.removeItem('phalanx_token');
    localStorage.removeItem('phalanx_admin_token');
    setUser(null);
  };

  // ── Birdview: Ansicht als anderer Nutzer ──────────────────────────────────
  // Das eigene Admin-Token wird beiseitegelegt und beim Beenden wiederhergestellt.
  const startBirdview = async (userId) => {
    const data = await api.post(`/admin/impersonate/${userId}`, {});
    const adminToken = localStorage.getItem('phalanx_token');
    if (adminToken) localStorage.setItem('phalanx_admin_token', adminToken);
    localStorage.setItem('phalanx_token', data.token);
    // Vollständiger Neustart der App, damit wirklich JEDER geladene Zustand
    // aus der Perspektive des Zielnutzers kommt.
    window.location.href = '/dashboard';
  };

  const endBirdview = async () => {
    try { await api.post('/auth/impersonate/end', {}); } catch (_) { /* trotzdem zurück */ }
    const adminToken = localStorage.getItem('phalanx_admin_token');
    if (adminToken) {
      localStorage.setItem('phalanx_token', adminToken);
      localStorage.removeItem('phalanx_admin_token');
      window.location.href = '/admin';
    } else {
      // Kein Rückweg vorhanden → sauber abmelden
      logout();
      window.location.href = '/login';
    }
  };

  const isImpersonating = !!(user && user.impersonated_by);
  // Im Birdview ist die eigene Admin-Rolle NICHT die des Zielnutzers
  const isAdmin = user && !isImpersonating && ['super_admin', 'advisor'].includes(user.role);
  const isSeller = user && user.role === 'seller';
  // Nachfolge-Interessent: über Käufertyp oder gesetztes Nachfolge-Szenario erkannt.
  const isSuccessor = !!(user && (user.buyer_type === 'successor' || user.succession_type));

  return (
    <AuthContext.Provider value={{
      user, loading, login, loginTwoFactor, register, logout, isAdmin, isSeller, isSuccessor,
      isImpersonating, startBirdview, endBirdview,
      gastansicht: istGastansicht(),
      starteGastansicht: () => { setzeGastansicht(true); window.location.href = '/projekte'; },
      beendeGastansicht: () => { setzeGastansicht(false); window.location.href = '/projekte'; },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
