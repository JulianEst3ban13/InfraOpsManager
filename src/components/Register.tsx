import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Shield, Sun, Moon } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // Effect to check for saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle theme function
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !email || !password || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axiosInstance.post('/register', {
        username,
        email,
        password
      });
      
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Error al registrarse');
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} transition-colors duration-300`}>
      {/* Theme Toggle Button - Fixed Position */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-indigo-100 text-indigo-600'} transition-colors duration-300`}
          aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Main content with vertical and horizontal centering */}
      <div className="flex-grow flex items-center justify-center w-full">
        <div className={`w-full max-w-md p-8 space-y-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-lg mx-4 transition-colors duration-300`}>
          {/* Logo container with theme-aware logo display */}
          <div className="flex justify-center items-center w-full">
            {darkMode ? (
              <img 
                src='data:image/png;base64,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
' 
                alt='Logo blanco'
                className="max-w-full max-h-24 object-contain"
              />
            ) : (
              <img
                src='data:image/png;base64,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' 
                alt='Logo color'
                className="max-w-full max-h-24 object-contain"
              />
            )}
          </div>
          
          <div className="text-center">
            <h1 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Crear Cuenta</h1>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Regístrese para acceder a la plataforma
            </p>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 rounded-md">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Usuario
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <User className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2 border ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="Nombre de usuario"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Correo Electrónico
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2 border ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Contraseña
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-2 border ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="Contraseña"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'} focus:outline-none`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Confirmar Contraseña
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2 border ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="Confirmar contraseña"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-200"
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              ¿Ya tiene una cuenta?{' '}
              <Link to="/login" className="font-medium text-indigo-500 hover:text-indigo-400">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-indigo-700 to-indigo-900'} text-white py-6 mt-8 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="w-5 h-5" />
              <p className="text-sm">Seguridad garantizada</p>
            </div>
            
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold">Powered By Finden Global LLC</p>
              <p className="text-xs mt-1 opacity-80">Protegemos sus datos personales</p>
            </div>
            
            <div className="hidden md:block text-sm opacity-80">
              © {new Date().getFullYear()} Todos los derechos reservados
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Register;