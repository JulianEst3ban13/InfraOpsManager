import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { X, Save, UserPlus, Upload, Image as ImageIcon, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import config from '../config/config';

interface User {
  id: number;
  username: string;
  email: string;
  company: string;
  profile: string;
  state: string;
  picture: string;
  mfa_secret?: string;
}

interface Profile {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  selectedUser?: User;
  darkMode?: boolean;
}

interface PasswordValidation {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  profile?: string;
}

interface FormData {
  username: string;
  email: string;
  password?: string;
  company: string;
  profile: string;
  picture?: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  onUserUpdated,
  selectedUser,
  darkMode = false
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    company: '',
    profile: '',
    picture: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const [mfaEnabled, setMfaEnabled] = useState(!!selectedUser?.mfa_secret);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qr, setQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      fetchCompanies();
      if (selectedUser) {
        setFormData({
          username: selectedUser.username,
          email: selectedUser.email,
          password: '',
          company: selectedUser.company,
          profile: selectedUser.profile,
          picture: selectedUser.picture
        });
        setPreviewImage(selectedUser.picture);
        setIsPasswordTouched(false);
        setMfaEnabled(!!selectedUser.mfa_secret);
      } else {
        resetForm();
        setIsPasswordTouched(true);
      }
    }
  }, [isOpen, selectedUser]);

  const optimizeImage = async (base64String: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Aumentar la compresión para reducir más el tamaño
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) { // 5MB
        setError('La imagen es demasiado grande. Por favor, seleccione una imagen menor a 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const optimizedImage = await optimizeImage(base64String);
          setFormData(prev => ({ ...prev, picture: optimizedImage }));
          setPreviewImage(optimizedImage);
          setError(null);
        } catch (error) {
          setError('Error al procesar la imagen');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePassword = (password: string): boolean => {
    if (!password) return true; // Si no hay contraseña en edición, es válido

    const validation = {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  };

  const fetchProfiles = async () => {
    try {
      const response = await axiosInstance.get('/roles');
      setProfiles(response.data);
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
      setError('Error al cargar perfiles');
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axiosInstance.get('/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error al cargar compañías:', error);
      setError('Error al cargar compañías');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      setIsPasswordTouched(true);
      validatePassword(value);
    }

    setFormErrors(prev => ({ ...prev, [name]: undefined }));

    if (name === 'email' && value) {
      if (!validateEmail(value)) {
        setFormErrors(prev => ({ 
          ...prev, 
          email: 'Por favor, ingrese un correo electrónico válido' 
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!formData.username.trim()) {
      errors.username = 'El nombre de usuario es obligatorio';
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'El correo electrónico es obligatorio';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Por favor, ingrese un correo electrónico válido';
      isValid = false;
    }

    // Validar contraseña solo si se está creando un usuario o si se ha ingresado una nueva contraseña
    if (!selectedUser || formData.password) {
      if (!selectedUser && !formData.password) {
        errors.password = 'La contraseña es obligatoria para nuevos usuarios';
        isValid = false;
      } else if (formData.password && !validatePassword(formData.password)) {
        errors.password = 'La contraseña no cumple con los requisitos de seguridad';
        isValid = false;
      }
    }

    if (!formData.profile) {
      errors.profile = 'El perfil es obligatorio';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Crear un objeto con solo los campos necesarios
      const dataToSend: Partial<FormData> = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        company: formData.company,
        profile: formData.profile
      };

      // Manejo especial para la imagen
      if (selectedUser) {
        // Si estamos editando, mantener la imagen existente si no se ha seleccionado una nueva
        dataToSend.picture = formData.picture || selectedUser.picture;
      } else {
        // Si es un nuevo usuario, enviar la imagen si existe
        if (formData.picture) {
          dataToSend.picture = formData.picture;
        }
      }

      // Solo incluir la contraseña si se ha modificado y no está vacía
      if (formData.password && formData.password.trim() !== '') {
        dataToSend.password = formData.password;
      }

      const loggedUser = localStorage.getItem('username') || '';
      
      if (selectedUser) {
        const response = await axiosInstance.put(
          `/users/${selectedUser.id}`, 
          dataToSend,
          {
            headers: { 
              'x-user-edit': loggedUser
            }
          }
        );

        if (response.status === 200) {
          setSuccess('Usuario actualizado correctamente');
          onUserUpdated();
          setTimeout(() => onClose(), 1500);
        }
      } else {
        // Para nuevo usuario, asegurarse de que la contraseña esté presente
        if (!dataToSend.password) {
          setError('La contraseña es obligatoria para nuevos usuarios');
          return;
        }

        const response = await axiosInstance.post(
          '/register', 
          dataToSend
        );

        if (response.status === 201 || response.status === 200) {
          setSuccess('Usuario creado correctamente');
          onUserUpdated();
          setTimeout(() => onClose(), 1500);
        }
      }
    } catch (error: any) {
      console.error('Error details:', error);
      
      let errorMessage = 'Error al guardar usuario';
      
      if (error.response) {
        // El servidor respondió con un estado de error
        const serverError = error.response.data?.message || error.response.data?.sqlMessage;
        errorMessage = serverError || `Error del servidor: ${error.response.status}`;
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        errorMessage = 'No se pudo conectar con el servidor';
      } else {
        // Error al configurar la petición
        errorMessage = error.message || 'Error al procesar la solicitud';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      company: '',
      profile: '',
      picture: ''
    });
    setPreviewImage(null);
  };

  const handleActivateMfa = async () => {
    setLoadingMfa(true);
    setMfaError('');
    try {
      const res = await axiosInstance.post('/mfa/setup', { userId: selectedUser?.id, username: formData.username });
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
      const res = await axiosInstance.post('/mfa/verify', { userId: selectedUser?.id, token: mfaCode });
      if (res.data.success) {
        setMfaEnabled(true);
        setMfaSuccess(true);
        setShowMfaSetup(false);
      } else {
        setMfaError('Código incorrecto');
      }
    } catch (err) {
      setMfaError('Código incorrecto');
    } finally {
      setLoadingMfa(false);
    }
  };

  const handleDeactivateMfa = async () => {
    setLoadingMfa(true);
    setMfaError('');
    try {
      await axiosInstance.post('/mfa/deactivate', { userId: selectedUser?.id });
      setMfaEnabled(false);
      setMfaSuccess(false);
    } catch (err) {
      setMfaError('Error desactivando MFA');
    } finally {
      setLoadingMfa(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className={`${
              darkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            } p-2 rounded-full transition-colors duration-200`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Columna izquierda */}
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`block w-full px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    formErrors.username 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'focus:border-blue-500'
                  } ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
                {formErrors.username && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {formErrors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'focus:border-blue-500'
                  } ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Contraseña {!selectedUser && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => setIsPasswordTouched(true)}
                    className={`block w-full px-4 py-2 pr-10 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 ${
                      formErrors.password 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'focus:border-blue-500'
                    } ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required={!selectedUser}
                    placeholder={selectedUser ? "Dejar en blanco para mantener la actual" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {formErrors.password}
                  </p>
                )}
                
                {(isPasswordTouched || !selectedUser) && (
                  <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Requisitos de la contraseña:
                    </p>
                    <ul className="space-y-2">
                      <li className={`flex items-center text-sm ${
                        passwordValidation.hasMinLength 
                          ? 'text-green-500' 
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Check className={`h-4 w-4 mr-2 ${passwordValidation.hasMinLength ? 'opacity-100' : 'opacity-40'}`} />
                        Mínimo 8 caracteres
                      </li>
                      <li className={`flex items-center text-sm ${
                        passwordValidation.hasUpperCase 
                          ? 'text-green-500' 
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Check className={`h-4 w-4 mr-2 ${passwordValidation.hasUpperCase ? 'opacity-100' : 'opacity-40'}`} />
                        Al menos una letra mayúscula
                      </li>
                      <li className={`flex items-center text-sm ${
                        passwordValidation.hasNumber 
                          ? 'text-green-500' 
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Check className={`h-4 w-4 mr-2 ${passwordValidation.hasNumber ? 'opacity-100' : 'opacity-40'}`} />
                        Al menos un número
                      </li>
                      <li className={`flex items-center text-sm ${
                        passwordValidation.hasSpecialChar 
                          ? 'text-green-500' 
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Check className={`h-4 w-4 mr-2 ${passwordValidation.hasSpecialChar ? 'opacity-100' : 'opacity-40'}`} />
                        Al menos un carácter especial
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha */}
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Compañía
                </label>
                <div className="relative">
                  <select
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Seleccionar compañía</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Perfil <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="profile"
                    value={formData.profile}
                    onChange={e => setFormData({ ...formData, profile: e.target.value })}
                    className={`block w-full px-4 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 ${
                      formErrors.profile 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'focus:border-blue-500'
                    } appearance-none ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  >
                    <option value="">Seleccionar perfil</option>
                    {profiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {formErrors.profile && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {formErrors.profile}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Foto de perfil
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="h-24 w-24 rounded-full object-cover border-2 border-blue-500"
                      />
                    ) : (
                      <div className={`h-24 w-24 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center border-2 border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <ImageIcon className={`h-8 w-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className={`flex items-center justify-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium cursor-pointer transition-colors duration-200 ${
                      darkMode
                        ? 'border-gray-600 text-gray-200 bg-gray-700 hover:bg-gray-600'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}>
                      <Upload className="h-4 w-4 mr-2" />
                      Cargar imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MFA Controls */}
          {selectedUser && (
            <div className="mt-4">
              {mfaEnabled ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">MFA activado</span>
                  <button
                    type="button"
                    onClick={handleDeactivateMfa}
                    disabled={loadingMfa}
                    className="px-3 py-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600"
                  >
                    {loadingMfa ? 'Desactivando...' : 'Desactivar MFA'}
                  </button>
                </div>
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
                  type="button"
                  onClick={handleActivateMfa}
                  disabled={loadingMfa}
                  className="px-4 py-1 bg-indigo-600 text-white rounded-md text-sm shadow hover:bg-indigo-700"
                >
                  {loadingMfa ? 'Generando QR...' : 'Activar MFA'}
                </button>
              )}
              {mfaSuccess && <span className="block text-xs text-green-600 mt-2">¡MFA activado correctamente!</span>}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || (!selectedUser && !Object.values(passwordValidation).every(Boolean))}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : selectedUser ? (
                <Save className="h-5 w-5 mr-2" />
              ) : (
                <UserPlus className="h-5 w-5 mr-2" />
              )}
              {selectedUser ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagementModal; 