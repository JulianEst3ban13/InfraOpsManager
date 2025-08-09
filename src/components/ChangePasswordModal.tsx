import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, Check } from 'lucide-react';
import axios from 'axios';
import config from "../config/config";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  username: string;
}

interface PasswordValidation {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userId,
  username
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  });

  useEffect(() => {
    validatePassword(password);
  }, [password, confirmPassword]);

  const validatePassword = (pass: string) => {
    setValidation({
      hasMinLength: pass.length >= 8,
      hasUpperCase: /[A-Z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
      passwordsMatch: pass === confirmPassword && pass !== ''
    });
  };

  const isPasswordValid = (): boolean => {
    return Object.values(validation).every(value => value === true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPasswordValid()) {
      setError('La contraseña no cumple con todos los requisitos');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = localStorage.getItem('username') || '';
      await axios.put(`${config.apiBaseUrl}:${config.apiPort}/api/users/${userId}/change-password`, 
        { password },
        { headers: { 'x-user-edit': loggedUser } }
      );
      setSuccess('Contraseña actualizada correctamente');
      setTimeout(() => {
        onClose();
        setPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (error) {
      setError('Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Cambiar Contraseña
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Cambiar contraseña para el usuario: <span className="font-semibold">{username}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">Requisitos de la contraseña:</p>
            <ul className="space-y-1">
              <li className={`flex items-center space-x-2 ${validation.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                <Check className={`h-4 w-4 mr-2 ${validation.hasMinLength ? 'text-green-600' : 'text-gray-500'}`} />
                Mínimo 8 caracteres
              </li>
              <li className={`flex items-center space-x-2 ${validation.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                <Check className={`h-4 w-4 mr-2 ${validation.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`} />
                Al menos una letra mayúscula
              </li>
              <li className={`flex items-center space-x-2 ${validation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                <Check className={`h-4 w-4 mr-2 ${validation.hasNumber ? 'text-green-600' : 'text-gray-500'}`} />
                Al menos un número
              </li>
              <li className={`flex items-center space-x-2 ${validation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                <Check className={`h-4 w-4 mr-2 ${validation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`} />
                Al menos un carácter especial
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </form>
      </div>
    </div>
  );
};