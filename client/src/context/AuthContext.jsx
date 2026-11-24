import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setAuthToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const data = await apiRequest('/api/auth/me');
      if (data?.token) {
        setAuthToken(data.token);
      }
      setUser(data?.user || null);
    } catch {
      setAuthToken('');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAuthToken(data.token);
    setUser(data.user);
    // Fetch full user with skills
    try {
      const me = await apiRequest('/api/auth/me');
      if (me?.user) setUser(me.user);
      return me?.user || data.user;
    } catch {
      return data.user;
    }
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: payload,
    });
    setAuthToken(data.token);
    const hydratedUser = { ...data.user, skills: data.user?.skills || [] };
    setUser(hydratedUser);
    return hydratedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local state regardless
    }
    setAuthToken('');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest('/api/auth/me');
      if (data?.token) setAuthToken(data.token);
      if (data?.user) setUser(data.user);
      return data?.user || null;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
