import React, { useState, useRef, useEffect } from "react";
import { LogOut, User, Sun, Moon, Phone, Video, MoreHorizontal, Mail, Briefcase, Menu, Settings } from "lucide-react";
import axiosInstance from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import UserSettings from './UserSettings';

interface UserType {
  id: number;
  username: string;
  email: string;
  picture?: string;
  mfa_secret?: string;
}

interface TopNavigationProps {
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  user: UserType;
  logout: () => void;
}

// User Profile Card Component
interface UserProfileCardProps {
  user: UserType;
  darkMode: boolean;
  onClose: () => void;
  logout: () => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, darkMode, onClose, logout }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();

  // Close the card when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Animation class when component mounts
  const [isVisible, setIsVisible] = useState<boolean>(false);
  
  useEffect(() => {
    // Small delay to trigger animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  const [mfaEnabled, setMfaEnabled] = useState(!!user.mfa_secret);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qr, setQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);

  const handleActivateMfa = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    setLoadingMfa(true);
    setMfaError('');
    try {
      const res = await axiosInstance.post('/mfa/setup', { userId: user.id, username: user.username });
      setQr(res.data.qr);
      setMfaSecret(res.data.secret);
      setShowMfaSetup(true);
    } catch (err) {
      setMfaError('Error generando QR');
    } finally {
      setLoadingMfa(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingMfa(true);
    setMfaError('');
    try {
      const res = await axiosInstance.post('/mfa/verify', { userId: user.id, token: mfaCode });
      if (res.data.success) {
        // Refrescar datos del usuario tras activar MFA
        const userRes = await axiosInstance.get(`/users/${user.id}`);
        setMfaEnabled(true);
        setMfaSuccess(true);
        setShowMfaSetup(false);
        // Actualizar el contexto si es posible
        if (userRes.data) {
          login(userRes.data, localStorage.getItem('token') || '');
        }
      } else {
        setMfaError('Código incorrecto');
      }
    } catch (err) {
      setMfaError('Código incorrecto');
    } finally {
      setLoadingMfa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        ref={cardRef} 
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-16 right-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} 
                   rounded-2xl shadow-2xl w-80 overflow-hidden transition-all duration-300 transform
                   ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
                   border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
        style={{
          boxShadow: darkMode 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2), 0 0 15px rgba(76, 29, 149, 0.1)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05), 0 0 15px rgba(79, 70, 229, 0.08)'
        }}
      >
        {/* Decorative top background with gradient */}
        <div 
          className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600 via-blue-600 to-red-500"
          style={{ 
            borderRadius: '14px 14px 50% 50% / 14px 14px 30px 30px',
            zIndex: 0 
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-6 left-6 w-3 h-3 rounded-full bg-white opacity-30"></div>
          <div className="absolute top-12 left-16 w-2 h-2 rounded-full bg-white opacity-20"></div>
          <div className="absolute top-8 right-10 w-4 h-4 rounded-full bg-white opacity-25"></div>
        </div>

        {/* Profile header */}
        <div className="text-center px-6 pt-14 pb-6 relative z-10">
          <div className="relative inline-block mb-4">
            {user.picture ? (
              <div className="rounded-full p-1.5 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 inline-block shadow-xl" 
                  style={{ boxShadow: '0 4px 20px rgba(123, 97, 255, 0.3)' }}>
                <img 
                  src={user.picture} 
                  alt={user.username} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800"
                />
              </div>
            ) : (
              <div className="rounded-full p-1.5 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 inline-block" 
                  style={{ boxShadow: '0 4px 20px rgba(123, 97, 255, 0.3)' }}>
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-inner">
                  <User className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-gray-800 shadow-md"></span>
          </div>
          <h3 className="text-xl font-bold">{user.username}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">@{user.username.toLowerCase().replace(/\s+/g, '_')}</p>
          
          <div className="flex items-center justify-center mt-3 text-sm">
            <Mail className="w-4 h-4 mr-1.5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
          </div>

          {/* MFA Section */}
          <div className="mt-4">
            {mfaEnabled ? (
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">MFA activado</span>
            ) : showMfaSetup ? (
              <div className="flex flex-col items-center space-y-2">
                <img src={qr} alt="QR MFA" className="w-32 h-32 border p-2 bg-white" />
                <span className="text-xs text-gray-500">Escanea el QR con tu app de autenticación</span>
                <form onSubmit={handleVerifyMfa} className="flex flex-col items-center space-y-2 w-full">
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-32 text-center border rounded-md py-1 px-2"
                    placeholder="Código de 6 dígitos"
                    autoFocus
                  />
                  <button type="submit" disabled={loadingMfa} className="px-4 py-1 bg-indigo-600 text-white rounded-md text-sm">
                    {loadingMfa ? 'Verificando...' : 'Verificar código'}
                  </button>
                </form>
                {mfaError && <span className="text-xs text-red-500">{mfaError}</span>}
              </div>
            ) : (
              <button
                onClick={handleActivateMfa}
                disabled={loadingMfa}
                className="mt-2 px-4 py-1 bg-indigo-600 text-white rounded-md text-sm shadow hover:bg-indigo-700"
              >
                {loadingMfa ? 'Generando QR...' : 'Activar MFA'}
              </button>
            )}
            {mfaSuccess && <span className="block text-xs text-green-600 mt-2">¡MFA activado correctamente!</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center space-x-5 p-4 relative">
          <button 
            className="p-3 rounded-full text-indigo-600 dark:text-indigo-400 transition-all duration-200 
                      transform hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:shadow-sm"
            style={{ 
              background: darkMode 
                ? 'linear-gradient(145deg, #2d374b, #232a3c)' 
                : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              boxShadow: darkMode 
                ? '5px 5px 10px #1e242f, -5px -5px 10px #323e58' 
                : '5px 5px 10px #e6e6e6, -5px -5px 10px #ffffff'
            }}
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            className="p-3 rounded-full text-indigo-600 dark:text-indigo-400 transition-all duration-200 
                      transform hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:shadow-sm"
            style={{ 
              background: darkMode 
                ? 'linear-gradient(145deg, #2d374b, #232a3c)' 
                : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              boxShadow: darkMode 
                ? '5px 5px 10px #1e242f, -5px -5px 10px #323e58' 
                : '5px 5px 10px #e6e6e6, -5px -5px 10px #ffffff'
            }}
          >
            <Video className="w-5 h-5" />
          </button>
          <button 
            className="p-3 rounded-full text-indigo-600 dark:text-indigo-400 transition-all duration-200 
                      transform hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:shadow-sm"
            style={{ 
              background: darkMode 
                ? 'linear-gradient(145deg, #2d374b, #232a3c)' 
                : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              boxShadow: darkMode 
                ? '5px 5px 10px #1e242f, -5px -5px 10px #323e58' 
                : '5px 5px 10px #e6e6e6, -5px -5px 10px #ffffff'
            }}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Company section */}
        <div className="px-5 py-4 mt-2 relative" style={{ 
          background: darkMode ? '#1f2937' : '#f9fafb',
          borderTop: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          borderBottom: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-11 h-11 rounded-full flex items-center justify-center mr-3"
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' 
                  }}>
                <span className="text-white font-bold text-sm">FG</span>
              </div>
              <div>
                <p className="font-medium">Finden Global LLC</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <Briefcase className="w-3 h-3 mr-1" />
                  <span>@finden_global</span>
                </div>
              </div>
            </div>
            <button className="p-1.5 rounded-full text-white transition-transform duration-200 transform hover:scale-105"
                    style={{ 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' 
                    }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Logout button */}
        <div className="p-5">
          <button
            onClick={logout}
            className="w-full py-3 text-white rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              transform: 'translateY(0)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 15px rgba(220, 38, 38, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

const TopNavigation: React.FC<TopNavigationProps> = ({
  toggleSidebar,
  darkMode,
  setDarkMode,
  user,
  logout
}) => {
  const [showProfileCard, setShowProfileCard] = useState<boolean>(false);
  const [showUserSettings, setShowUserSettings] = useState<boolean>(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleProfileCard = () => {
    setShowProfileCard(!showProfileCard);
  };

  const toggleUserSettings = () => {
    setShowUserSettings(!showUserSettings);
    setShowProfileCard(false); // Cerrar el profile card si está abierto
  };

  return (
    <>
      <nav className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm p-4 flex justify-between items-center flex-shrink-0 z-10`}>
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-full mr-4 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'} transition-colors duration-200`}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Gestor de Mantenimientos</div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-indigo-100 text-indigo-600'} transition-colors duration-300`}
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={toggleUserSettings}
            className={`p-2 rounded-full ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'} transition-colors duration-200`}
            aria-label="Configuración de usuario"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="flex items-center cursor-pointer relative" onClick={toggleProfileCard}>
            {user?.picture ? (
              <div className="rounded-full p-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 inline-block">
                <img 
                  src={user.picture} 
                  alt={user.username} 
                  className="w-8 h-8 rounded-full mr-2 object-cover border border-white dark:border-gray-800"
                />
              </div>
            ) : (
              <div className="rounded-full p-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 inline-block mr-2">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            )}
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{user?.username}</span>
          </div>
        </div>
      </nav>

      {/* Render the profile card when showProfileCard is true */}
      {showProfileCard && (
        <UserProfileCard 
          user={user} 
          darkMode={darkMode} 
          onClose={toggleProfileCard} 
          logout={logout}
        />
      )}

      {/* Render the user settings modal when showUserSettings is true */}
      {showUserSettings && (
        <UserSettings
          user={user}
          darkMode={darkMode}
          onClose={toggleUserSettings}
          logout={logout}
        />
      )}
    </>
  );
};

export default TopNavigation;