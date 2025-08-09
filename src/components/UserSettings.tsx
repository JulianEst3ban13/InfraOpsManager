import React, { useState, useRef, useEffect } from "react";
import { 
  Settings, 
  User, 
  Lock, 
  Shield, 
  Camera, 
  LogOut, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Eye,
  EyeOff,
  Check,
  X,
  Upload,
  Trash2,
  Save,
  Edit3
} from "lucide-react";
import axiosInstance from '../utils/axios';
import { useAuth } from '../context/AuthContext';

interface UserType {
  id: number;
  username: string;
  email: string;
  picture?: string;
  mfa_secret?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

interface UserSettingsProps {
  user: UserType;
  darkMode: boolean;
  onClose: () => void;
  logout: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, darkMode, onClose, logout }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuth();

  // Estados para las diferentes secciones
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  
  // Estados para el perfil
  const [profileData, setProfileData] = useState({
    email: user.email || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    address: user.address || ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Estados para la foto de perfil
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Estados para MFA
  const [mfaEnabled, setMfaEnabled] = useState(!!user.mfa_secret);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qr, setQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);

  // Validación de requisitos de contraseña
  const passwordRequirements = [
    {
      label: 'Mínimo 8 caracteres',
      test: (pw: string) => pw.length >= 8,
    },
    {
      label: 'Al menos una letra mayúscula',
      test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
      label: 'Al menos un número',
      test: (pw: string) => /[0-9]/.test(pw),
    },
    {
      label: 'Al menos un carácter especial',
      test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
    },
  ];
  const passwordChecks = passwordRequirements.map(req => req.test(passwordData.newPassword));
  const passwordValid = passwordChecks.every(Boolean);

  // Cerrar modal al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Animación de entrada
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Manejar cambio de foto
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!photoPreview) return;
    
    setUploadingPhoto(true);
    try {
      // Convertir base64 a blob
      const response = await fetch(photoPreview);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('photo', blob, 'profile-photo.jpg');
      formData.append('userId', user.id.toString());

      const res = await axiosInstance.post('/users/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        // Actualizar el contexto con la nueva foto
        const updatedUser = { ...user, picture: res.data.photoUrl };
        login(updatedUser, localStorage.getItem('token') || '');
        setPhotoPreview(null);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Guardar cambios del perfil
  const saveProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await axiosInstance.put(`/users/${user.id}`, profileData);
      if (res.data.success) {
        setProfileSuccess(true);
        setIsEditingProfile(false);
        // Actualizar el contexto
        const updatedUser = { ...user, ...profileData };
        login(updatedUser, localStorage.getItem('token') || '');
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (error: any) {
      setProfileError(error.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  // Cambiar contraseña
  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    try {
      const res = await axiosInstance.post('/users/change-password', {
        userId: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (res.data.success) {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Activar MFA
  const handleActivateMfa = async () => {
    setLoadingMfa(true);
    setMfaError('');
    try {
      const res = await axiosInstance.post('/mfa/setup', { 
        userId: user.id, 
        username: user.username 
      });
      setQr(res.data.qr);
      setMfaSecret(res.data.secret);
      setShowMfaSetup(true);
    } catch (err) {
      setMfaError('Error generando QR');
    } finally {
      setLoadingMfa(false);
    }
  };

  // Verificar MFA
  const handleVerifyMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingMfa(true);
    setMfaError('');
    try {
      const res = await axiosInstance.post('/mfa/verify', { 
        userId: user.id, 
        token: mfaCode 
      });
      if (res.data.success) {
        const userRes = await axiosInstance.get(`/users/${user.id}`);
        setMfaEnabled(true);
        setMfaSuccess(true);
        setShowMfaSetup(false);
        if (userRes.data) {
          login(userRes.data, localStorage.getItem('token') || '');
        }
        setTimeout(() => setMfaSuccess(false), 3000);
      } else {
        setMfaError('Código incorrecto');
      }
    } catch (err) {
      setMfaError('Código incorrecto');
    } finally {
      setLoadingMfa(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'preferences', label: 'Preferencias', icon: Settings }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        ref={modalRef}
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 transform
                   ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                   ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
        style={{
          boxShadow: darkMode 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-indigo-100'}`}>
              <Settings className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Configuración de Usuario</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Gestiona tu cuenta y preferencias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className={`w-64 border-r ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="p-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${
                      activeTab === tab.id
                        ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`
                        : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-xl font-semibold">Información Personal</h3>
                    {!isEditingProfile && (
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Photo Section */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="relative">
                        <img
                          src={photoPreview || user.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTQ4IDI0QzQwLjI2ODQgMjQgMzQgMzAuMjY4NCAzNCAzOEMzNCA0NS43MzE2IDQwLjI2ODQgNTIgNDggNTJDNTUuNzMxNiA1MiA2MiA0NS43MzE2IDYyIDM4QzYyIDMwLjI2ODQgNTUuNzMxNiAyNCA0OCAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQ4IDU2QzM4LjA2IDU2IDI5LjIgNjIuNCAyNiA3MkgyNkMyOS4yIDYyLjQgMzguMDYgNTYgNDggNTZaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className={`absolute -bottom-2 -right-2 p-2 rounded-full shadow-lg transition-transform hover:scale-110 ${
                            darkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'
                          }`}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Foto de Perfil</h4>
                      <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Sube una nueva foto de perfil. Formatos soportados: JPG, PNG, GIF
                      </p>
                      {photoPreview && (
                        <div className="flex space-x-2">
                          <button
                            onClick={uploadPhoto}
                            disabled={uploadingPhoto}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {uploadingPhoto ? 'Subiendo...' : 'Guardar Foto'}
                          </button>
                          <button
                            onClick={() => setPhotoPreview(null)}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Username Section - Solo Lectura */}
                  <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-medium">Nombre de Usuario</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Solo Lectura</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        @{user.username}
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        (No se puede modificar)
                      </span>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        disabled={!isEditingProfile}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white disabled:bg-gray-700' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                        disabled={!isEditingProfile}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white disabled:bg-gray-700' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                        disabled={!isEditingProfile}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white disabled:bg-gray-700' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        disabled={!isEditingProfile}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white disabled:bg-gray-700' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Dirección
                      </label>
                      <textarea
                        value={profileData.address}
                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                        disabled={!isEditingProfile}
                        rows={3}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white disabled:bg-gray-700' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Profile Actions */}
                  {isEditingProfile && (
                    <div className="flex space-x-3">
                      <button
                        onClick={saveProfile}
                        disabled={profileLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        {profileLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Guardar Cambios</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileData({
                            email: user.email || '',
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            phone: user.phone || '',
                            address: user.address || ''
                          });
                        }}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Success/Error Messages */}
                  {profileSuccess && (
                    <div className="p-3 bg-green-100 text-green-700 rounded-lg flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Perfil actualizado correctamente</span>
                    </div>
                  )}
                  {profileError && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                      {profileError}
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Seguridad</h3>

                  {/* Change Password Section */}
                  <div className={`p-6 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <Lock className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-medium">Cambiar Contraseña</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña Actual</label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            className={`w-full px-3 py-2 pr-10 rounded-lg border transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nueva Contraseña</label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className={`w-full px-3 py-2 pr-10 rounded-lg border transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {/* Requisitos de la contraseña */}
                        <div className={`mt-2 p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-900/60 text-gray-200' : 'bg-gray-100 text-gray-700'}`}> 
                          <div className="font-semibold mb-1">Requisitos de la contraseña:</div>
                          <ul className="space-y-1">
                            {passwordRequirements.map((req, idx) => (
                              <li key={req.label} className="flex items-center">
                                {passwordChecks[idx] ? (
                                  <Check className="w-4 h-4 text-green-500 mr-1" />
                                ) : (
                                  <span className="inline-block w-4 h-4 mr-1 border border-gray-400 rounded-full"></span>
                                )}
                                <span className={passwordChecks[idx] ? 'text-green-600' : ''}>{req.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmar Nueva Contraseña</label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className={`w-full px-3 py-2 pr-10 rounded-lg border transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={changePassword}
                        disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || !passwordValid}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                      </button>

                      {passwordSuccess && (
                        <div className="p-3 bg-green-100 text-green-700 rounded-lg flex items-center space-x-2">
                          <Check className="w-4 h-4" />
                          <span>Contraseña cambiada correctamente</span>
                        </div>
                      )}
                      {passwordError && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                          {passwordError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MFA Section */}
                  <div className={`p-6 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-medium">Autenticación de Dos Factores (MFA)</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        mfaEnabled 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {mfaEnabled ? 'Activado' : 'Desactivado'}
                      </span>
                    </div>

                    {mfaEnabled ? (
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        La autenticación de dos factores está activada para tu cuenta.
                      </p>
                    ) : showMfaSetup ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <img src={qr} alt="QR MFA" className="w-48 h-48 mx-auto border p-4 bg-white rounded-lg" />
                          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Escanea este código QR con tu aplicación de autenticación
                          </p>
                        </div>
                        
                        <form onSubmit={handleVerifyMfa} className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Código de Verificación
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              value={mfaCode}
                              onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                              className={`w-full px-3 py-2 rounded-lg border text-center text-lg font-mono ${
                                darkMode 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="000000"
                              autoFocus
                            />
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              type="submit"
                              disabled={loadingMfa || mfaCode.length !== 6}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {loadingMfa ? 'Verificando...' : 'Verificar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowMfaSetup(false)}
                              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>

                        {mfaError && (
                          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                            {mfaError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Añade una capa extra de seguridad a tu cuenta activando la autenticación de dos factores.
                        </p>
                        <button
                          onClick={handleActivateMfa}
                          disabled={loadingMfa}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {loadingMfa ? 'Generando QR...' : 'Activar MFA'}
                        </button>
                      </div>
                    )}

                    {mfaSuccess && (
                      <div className="p-3 bg-green-100 text-green-700 rounded-lg flex items-center space-x-2 mt-4">
                        <Check className="w-4 h-4" />
                        <span>¡MFA activado correctamente!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Preferencias</h3>
                  
                  <div className={`p-6 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <h4 className="font-medium mb-4">Información de la Cuenta</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Fecha de Creación</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'No disponible'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Email Principal</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">ID de Usuario</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logout Section */}
                  <div className={`p-6 rounded-lg border ${darkMode ? 'border-red-700 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <LogOut className="w-5 h-5 text-red-600" />
                      <h4 className="font-medium text-red-600">Cerrar Sesión</h4>
                    </div>
                    
                    <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Al cerrar sesión, tendrás que volver a iniciar sesión para acceder a tu cuenta.
                    </p>
                    
                    <button
                      onClick={logout}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;