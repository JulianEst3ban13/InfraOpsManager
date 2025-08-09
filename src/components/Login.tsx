import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Shield, Sun, Moon } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { useAuth } from '../context/AuthContext';

// Import logo images
import whiteLogo from '../../assets/logo-white.png';
import coloredLogo from '../../assets/proxmox_logo.png';

// Subcomponente para el formulario de MFA
interface MfaFormProps {
  mfaCode: string[];
  mfaError: string;
  loading: boolean;
  handleMfaInput: (e: React.ChangeEvent<HTMLInputElement>, idx: number) => void;
  handleMfaKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => void;
  handleMfaPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  handleMfaSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  mfaInputs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  mfaInputIds: string[];
  darkMode: boolean;
}

const MfaForm: React.FC<MfaFormProps> = ({ mfaCode, mfaError, loading, handleMfaInput, handleMfaKeyDown, handleMfaPaste, handleMfaSubmit, mfaInputs, mfaInputIds, darkMode }) => (
  <form className="space-y-6" onSubmit={handleMfaSubmit}>
    <div className="flex justify-center space-x-2 my-4">
      {mfaCode.map((digit, idx) => (
        <input
          key={mfaInputIds[idx]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleMfaInput(e, idx)}
          onKeyDown={e => handleMfaKeyDown(e, idx)}
          onPaste={handleMfaPaste}
          ref={el => mfaInputs.current[idx] = el}
          className={`w-12 h-12 text-2xl text-center border rounded-md focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          autoFocus={idx === 0}
        />
      ))}
    </div>
    {mfaError && (
      <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 rounded-md">{mfaError}</div>
    )}
    <button
      type="submit"
      disabled={loading}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-200"
    >
      {loading ? 'Verificando...' : 'Verificar código'}
    </button>
  </form>
);

// Subcomponente para el formulario de login
interface LoginFormProps {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  error: string;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  darkMode: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ username, setUsername, password, setPassword, showPassword, togglePasswordVisibility, error, loading, handleSubmit, darkMode }) => (
  <form className="space-y-6" onSubmit={handleSubmit}>
    <div className="space-y-4">
      <div>
        <label htmlFor="username" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Usuario</label>
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
            className={`block w-full pl-10 pr-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder="Nombre de usuario"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Contraseña</label>
        <div className="relative mt-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`block w-full pl-10 pr-10 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder="Contraseña"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'} focus:outline-none`}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
    {error && (
      <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 rounded-md">{error}</div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="remember-me" className={`block ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Recordarme</label>
      </div>
      <div className="text-sm">
        <Link to="/forgot-password" className="font-medium text-indigo-500 hover:text-indigo-400">¿Olvidó su contraseña?</Link>
      </div>
    </div>
    <div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-200"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </div>
  </form>
);

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
  const [mfaError, setMfaError] = useState('');
  const mfaInputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const mfaInputIds = ['mfa-0', 'mfa-1', 'mfa-2', 'mfa-3', 'mfa-4', 'mfa-5'];

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
    if (!username || !password) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await axiosInstance.post('/login', { username, password });
      if (response.data.mfaRequired) {
        setMfaStep(true);
        setMfaUserId(response.data.userId);
        setError('');
        setMfaError('');
        setMfaCode(['', '', '', '', '', '']);
        setTimeout(() => mfaInputs.current[0]?.focus(), 100);
        return;
      }
      if (response.data.token) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        setError('Error en la respuesta del servidor');
      }
    } catch (err: any) {
      if (err.response?.data) {
        setError(err.response.data.error ?? 'Error al iniciar sesión');
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaInput = (e: React.ChangeEvent<HTMLInputElement>,idx: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const newCode = [...mfaCode];
    newCode[idx] = val[0];
    setMfaCode(newCode);
    if (val && idx < 5) {
      mfaInputs.current[idx + 1]?.focus();
    }
  };

  const handleMfaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>,idx: number) => {
    if (e.key === 'Backspace') {
      if (mfaCode[idx]) {
        const newCode = [...mfaCode];
        newCode[idx] = '';
        setMfaCode(newCode);
      } else if (idx > 0) {
        mfaInputs.current[idx - 1]?.focus();
      }
    }
  };

  const handleMfaPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setMfaCode(paste.split(''));
      setTimeout(() => mfaInputs.current[5]?.focus(), 100);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mfaCode.some((d) => !d)) {
      setMfaError('Por favor ingrese el código completo');
      return;
    }
    try {
      setLoading(true);
      setMfaError('');
      const code = mfaCode.join('');
      const response = await axiosInstance.post('/login/mfa', { userId: mfaUserId, token: code });
      if (response.data.token) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        setMfaError('Error en la respuesta del servidor');
      }
    } catch (err: any) {
      if (err.response?.data) {
        setMfaError(err.response.data.error ?? 'Código incorrecto');
      } else {
        setMfaError('Error al conectar con el servidor');
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
            <img
              src={darkMode ? whiteLogo : coloredLogo}
              alt="Logo"
              className="max-w-full max-h-24 object-contain"
            />
          </div>

          <div className="text-center">
            <h1 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mfaStep ? 'Two-Factor Authentication' : 'Iniciar Sesión'}</h1>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{mfaStep ? 'Ingrese el código de 6 dígitos de su app de autenticación' : 'Ingrese sus credenciales para acceder a su cuenta'}</p>
          </div>

          {!mfaStep ? (
            <LoginForm
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              togglePasswordVisibility={togglePasswordVisibility}
              error={error}
              loading={loading}
              handleSubmit={handleSubmit}
              darkMode={darkMode}
            />
          ) : (
            <MfaForm
              mfaCode={mfaCode}
              mfaError={mfaError}
              loading={loading}
              handleMfaInput={handleMfaInput}
              handleMfaKeyDown={handleMfaKeyDown}
              handleMfaPaste={handleMfaPaste}
              handleMfaSubmit={handleMfaSubmit}
              mfaInputs={mfaInputs}
              mfaInputIds={mfaInputIds}
              darkMode={darkMode}
            />
          )}

          <div className="text-center">
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              ¿No tiene una cuenta?{' '}
              <Link to="/register" className="font-medium text-indigo-500 hover:text-indigo-400">
                Regístrese
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
              <p className="text-xs mt-1 opacity-80">Recuerde cambiar su clave regularmente</p>
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

export default Login;