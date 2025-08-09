import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import axios from 'axios';
import config from "../config/config";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor ingrese su correo electrónico');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post(`${config.apiBaseUrl}:${config.apiPort}/api/request-reset`, {
        email
      });
      
      setMessage(response.data.message);
      setSubmitted(true);
      
      // For demonstration purposes only - in a real app, you would not expose the reset token
      if (response.data.resetLink) {
        console.log('Reset link:', response.data.resetLink);
      }
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Error al solicitar restablecimiento de contraseña');
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Recuperar Contraseña</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ingrese su correo electrónico para recibir un enlace de restablecimiento
          </p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        {message && (
          <div className="p-3 text-sm text-green-500 bg-green-100 rounded-md">
            {message}
          </div>
        )}
        
        {!submitted ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600">
              Revise su correo electrónico para obtener instrucciones sobre cómo restablecer su contraseña.
            </p>
          </div>
        )}
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Volver a Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;