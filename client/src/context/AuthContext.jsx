import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api('/auth/session');
      setUser(data.user);
      setCartCount(data.user?.cart_count || 0);
      return data.user;
    } catch {
      setUser(null);
      setCartCount(0);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setCartCount(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        cartCount,
        setCartCount,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
