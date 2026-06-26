import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nxf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;
      localStorage.setItem('nxf_token', token);
      localStorage.setItem('nxf_user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.signup(data);
      const { token, user } = res.data;
      localStorage.setItem('nxf_token', token);
      localStorage.setItem('nxf_user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('nxf_token');
    localStorage.removeItem('nxf_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
