import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('phalanx_token');
    if (token) {
      api.get('/auth/me')
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('phalanx_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    // Sprint 13: Ist 2FA aktiv, kommt hier noch kein Token, sondern eine Challenge.
    if (data.twofa_required) return { twofa_required: true, challenge: data.challenge };
    localStorage.setItem('phalanx_token', data.token);
    setUser(data.user);
    return data.user;
  };

  // Zweiter Faktor: TOTP-Code oder Backup-Code
  const loginTwoFactor = async (challenge, code) => {
    const data = await api.post('/auth/login/2fa', { challenge, code });
    localStorage.setItem('phalanx_token', data.token);
    setUser(data.user);
    return data.user;
  };

  // register now returns the raw server response.
  // If data.pending === true, there is no token and the user is NOT logged in.
  // Register.jsx detects this and shows a "pending approval" message.
  const register = async (formData) => {
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

  return (
    <AuthContext.Provider value={{
      user, loading, login, loginTwoFactor, register, logout, isAdmin, isSeller,
      isImpersonating, startBirdview, endBirdview,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
