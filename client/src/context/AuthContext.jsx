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
    localStorage.setItem('phalanx_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const data = await api.post('/auth/register', formData);
    localStorage.setItem('phalanx_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('phalanx_token');
    setUser(null);
  };

  const isAdmin = user && ['super_admin', 'advisor'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
