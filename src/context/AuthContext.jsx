import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loadingUser, setLoadingUser] = useState(false);

  // On token change, fetch user profile from backend
  useEffect(() => {
    if (token && !user) {
      setLoadingUser(true);
      api.get('/api/users/me')
        .then((data) => {
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        })
        .catch(() => {
          // token invalid, clear it
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoadingUser(false));
    }
    if (!token) {
      setUser(null);
      localStorage.removeItem('user');
    }
  }, [token]);

  const login = (newToken, userData = null) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    try {
      const data = await api.get('/api/users/me');
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loadingUser, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
