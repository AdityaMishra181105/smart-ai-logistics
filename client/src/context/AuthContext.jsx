import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and check token validity on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          if (parsedUser && parsedUser._id && parsedUser.email) {
            setToken(storedToken);
            setUser(parsedUser);
            setIsAuthenticated(true);
            
            try {
              const res = await api.get('/auth/me');
              if (res.data && res.data.success) {
                const refreshedUser = res.data.data.user;
                localStorage.setItem('user', JSON.stringify(refreshedUser));
                setUser(refreshedUser);
              }
            } catch (err) {
              console.error('Session validation failed on mount:', err);
              if (err.response && err.response.status === 401) {
                logout();
              }
            }
          } else {
            logout();
          }
        }
      } catch (err) {
        console.error('Error parsing session state:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));
        
        setToken(receivedToken);
        setUser(receivedUser);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true, user: receivedUser };
      }
      setIsLoading(false);
      return { success: false, message: 'Unexpected server response format' };
    } catch (err) {
      setIsLoading(false);
      if (!err.response) {
        return { success: false, message: 'Unable to connect to the Smart Logistics service. Please check your connection and try again later.' };
      }
      const errMsg = err.response?.data?.message || 'Sign in failed';
      return { success: false, message: errMsg };
    }
  };

  const register = async (name, email, password, role = 'NGO') => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      if (res.data && res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));
        
        setToken(receivedToken);
        setUser(receivedUser);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true, user: receivedUser };
      }
      setIsLoading(false);
      return { success: false, message: 'Unexpected server response format' };
    } catch (err) {
      setIsLoading(false);
      if (!err.response) {
        return { success: false, message: 'Unable to connect to the Smart Logistics service. Please check your connection and try again later.' };
      }
      const errMsg = err.response?.data?.message || 'Registration request failed';
      return { success: false, message: errMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const updateUser = (updatedUserData) => {
    setUser((prevUser) => {
      const merged = { ...(prevUser || {}), ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
