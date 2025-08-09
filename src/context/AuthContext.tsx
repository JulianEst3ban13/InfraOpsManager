import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axiosInstance from '../utils/axios';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        return false;
      }

      // Verificar el token con el backend
      const response = await axiosInstance.get('/verify-token');
      return response.data.valid;
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  };

  // Efecto para verificar la autenticación al cargar
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const lastActivity = localStorage.getItem('lastActivity');

        if (storedUser && storedToken && lastActivity) {
          const lastActivityTime = parseInt(lastActivity);
          const currentTime = Date.now();

          if (currentTime - lastActivityTime <= SESSION_TIMEOUT) {
            const isValid = await checkAuth();
            if (isValid) {
              setUser(JSON.parse(storedUser));
              setToken(storedToken);
              setIsAuthenticated(true);
              updateLastActivity();
            } else {
              logout();
            }
          } else {
            logout();
          }
        }
      } catch (error) {
        console.error('Error inicializando auth:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const updateLastActivity = () => {
    const currentTime = Date.now();
    localStorage.setItem('lastActivity', currentTime.toString());
  };

  // Efecto para monitorear la actividad del usuario
  useEffect(() => {
    const handleActivity = () => {
      if (isAuthenticated) {
        updateLastActivity();
      }
    };

    // Eventos para detectar actividad
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Verificar la sesión periódicamente
    const interval = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity);
        const currentTime = Date.now();
        if (currentTime - lastActivityTime > SESSION_TIMEOUT) {
          logout();
        }
      }
    }, 60000); // Verificar cada minuto

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    updateLastActivity();
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        await axiosInstance.post('/logout');
      }
    } catch (error) {
      // No es crítico si falla el logout en el backend
      console.error('Error al registrar logout en backend:', error);
    }
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  const value = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};