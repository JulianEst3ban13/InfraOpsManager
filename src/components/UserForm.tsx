import { useState } from 'react';
import { Camera } from 'lucide-react';
import axiosInstance from '../utils/axios';

interface UserFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function UserForm({ onSubmit, onCancel, initialData }: UserFormProps) {
  const [formData, setFormData] = useState({
    username: initialData?.username ?? '',
    email: initialData?.email ?? '',
    password: initialData?.password ?? '',
    company: initialData?.company ?? '',
    profile: initialData?.profile ?? '',
    picture: initialData?.picture ?? '',
    state: initialData?.state ?? 'active',
    mfa_secret: initialData?.mfa_secret ?? ''
  });
  const [mfaEnabled, setMfaEnabled] = useState(!!initialData?.mfa_secret);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qr, setQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, picture: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActivateMfa = async () => {
    setLoadingMfa(true);
    setMfaError('');
    try {
      const res = await axiosInstance.post('/mfa/setup', { userId: initialData.id, username: formData.username });
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
      const res = await axiosInstance.post('/mfa/verify', { userId: initialData.id, token: mfaCode });
      if (res.data.success) {
        setMfaEnabled(true);
        setMfaSuccess(true);
        setShowMfaSetup(false);
        setFormData(prev => ({ ...prev, mfa_secret: mfaSecret }));
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
      await axiosInstance.post('/mfa/deactivate', { userId: initialData.id });
      setMfaEnabled(false);
      setFormData(prev => ({ ...prev, mfa_secret: '' }));
      setMfaSuccess(false);
    } catch (err) {
      setMfaError('Error desactivando MFA');
    } finally {
      setLoadingMfa(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {formData.picture ? (
              <img src={formData.picture} alt="User photo" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="absolute bottom-0 right-0 p-1 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600"
          >
            <Camera className="w-4 h-4" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">Usuario</label>
          <input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required={!initialData}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="company" className="block text-sm font-medium">Empresa</label>
          <input
            id="company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="profile" className="block text-sm font-medium">Perfil</label>
          <select
            id="profile"
            value={formData.profile}
            onChange={(e) => handleSelectChange('profile', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Seleccionar perfil</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuario</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="state" className="block text-sm font-medium">Estado</label>
          <select
            id="state"
            value={formData.state}
            onChange={(e) => handleSelectChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      {/* MFA Controls */}
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

      <div className="flex justify-end space-x-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          {initialData ? 'Actualizar' : 'Crear'} Usuario
        </button>
      </div>
    </form>
  );
} 