import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
  LinearProgress,
  Snackbar
} from '@mui/material';
import { Save, RefreshCw, RotateCcw } from 'lucide-react';
import axios from 'axios';
import config from '../../config/config';
import CodeMirror from '@uiw/react-codemirror';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { PermissionGuard } from '../PermissionGuard';

// Create a custom axios instance with better defaults
const apiClient = axios.create({
  baseURL: `${config.apiBaseUrl}:${config.apiPort}/api`,
  timeout: 60000, // Increased timeout to 60 seconds
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para agregar el token JWT a todas las peticiones
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

const OpenVPNConfig: React.FC = () => {
  const [configContent, setConfigContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const MAX_RETRIES = 5; // Increased max retries
  const RETRY_DELAY = 3000; // 3 seconds between retries

  // Function to show a temporary message
  const showTemporaryMessage = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
  };
  
  // Handle closing the snackbar
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  const fetchConfig = useCallback(async (retry = 0) => {
    try {
      setLoading(true);
      setError(null);
      setConfigContent(''); // Clear content before loading
      
      // Show message about retry attempt if not the first try
      if (retry > 0) {
        showTemporaryMessage(`Reintentando (${retry}/${MAX_RETRIES})...`);
      }
      
      const response = await apiClient.get('/openvpn/config');
      
      if (response.data?.content) {
        // Trim any whitespace and verify content
        const content = response.data.content.trim();
        if (content) {
          setConfigContent(content);
          setRetryCount(0);
          if (retry > 0) {
            setSuccess('Configuración cargada exitosamente después de reintentos');
            setTimeout(() => setSuccess(null), 5000);
          }
        } else {
          throw new Error('El archivo de configuración está vacío');
        }
      } else {
        throw new Error('Respuesta vacía o incorrecta del servidor');
      }
    } catch (error: any) {
      console.error('Error al obtener la configuración:', error);
      
      // More detailed error handling
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        const errorMsg = 'Tiempo de espera agotado al leer el archivo de configuración';
        setError(errorMsg);
        
        if (retry < MAX_RETRIES) {
          setRetryCount(retry + 1);
          const backoffDelay = RETRY_DELAY * Math.pow(1.5, retry);
          showTemporaryMessage(`Reintentando en ${(backoffDelay / 1000).toFixed(1)} segundos...`);
          setTimeout(() => fetchConfig(retry + 1), backoffDelay);
          return;
        }
      }
      
      // Handle different error types
      if (error.response) {
        switch (error.response.status) {
          case 403:
            setError('Permiso denegado al leer el archivo. Verificando permisos del servidor...');
            // Try one more time after a short delay
            if (retry === 0) {
              setTimeout(() => fetchConfig(1), 2000);
              return;
            }
            break;
          case 404:
            setError('El archivo de configuración no existe en /etc/openvpn/server.conf');
            break;
          case 500:
            if (error.response.data?.details) {
              setError(`Error del servidor: ${error.response.data.details}`);
            } else {
              setError('Error interno del servidor al leer el archivo');
            }
            break;
          default:
            setError(`Error del servidor: ${error.response.status} - ${error.response.data?.error || 'Error desconocido'}`);
        }
      } else if (error.request) {
        setError('No se pudo conectar al servidor. Verifique que el servicio API esté en ejecución.');
      } else {
        setError(error.message || 'Error desconocido al cargar el archivo');
      }
      
      // If we've reached max retries or have a non-recoverable error
      if (retry >= MAX_RETRIES) {
        setError(`No se pudo cargar después de ${MAX_RETRIES} intentos. Por favor, contacte al administrador del sistema.`);
      }
    } finally {
      if (retry >= MAX_RETRIES || !error) {
        setLoading(false);
      }
    }
  }, [MAX_RETRIES, RETRY_DELAY]);

  useEffect(() => {
    // Initial fetch when component mounts
    fetchConfig();
    
    // Optional: Setup a cleanup function to cancel any pending requests
    return () => {
      // Cancel any pending requests if component unmounts
    };
  }, [fetchConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await apiClient.post('/openvpn/config', {
        content: configContent
      });
      
      setSuccess('Configuración guardada exitosamente');
      setTimeout(() => setSuccess(null), 5000); // Auto-clear after 5 seconds
    } catch (error: any) {
      console.error('Error al guardar la configuración:', error);
      
      // More specific error handling for save operations
      if (error.response?.status === 403) {
        setError('Permiso denegado al guardar. Verifique que el servidor tenga permisos de escritura.');
      } else if (error.response?.status === 500) {
        setError('Error interno del servidor al guardar el archivo. Revise los logs del servidor.');
      } else {
        setError('Error al guardar la configuración: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = async () => {
    try {
      setRestarting(true);
      setError(null);
      setSuccess(null);
      
      await apiClient.post('/openvpn/service/restart');
      
      setSuccess('Servicio OpenVPN reiniciado exitosamente');
      setTimeout(() => setSuccess(null), 5000); // Auto-clear after 5 seconds
    } catch (error: any) {
      console.error('Error al reiniciar OpenVPN:', error);
      
      // More specific error handling for service restart
      if (error.response?.status === 403) {
        setError('Permiso denegado al reiniciar el servicio. Verifique los permisos del servidor.');
      } else if (error.response?.status === 500) {
        setError('Error interno del servidor al reiniciar el servicio. El servicio podría no estar instalado correctamente.');
      } else if (error.code === 'ECONNABORTED') {
        setError('Tiempo de espera agotado al reiniciar el servicio. El reinicio podría estar en progreso.');
      } else {
        setError('Error al reiniciar el servicio: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setRestarting(false);
    }
  };

  const handleChange = useCallback((value: string) => {
    setConfigContent(value);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Configuración de OpenVPN
            </Typography>
            <Button
              startIcon={loading ? <CircularProgress size={20} /> : <RotateCcw />}
              onClick={() => fetchConfig()}
              size="small"
              disabled={loading}
              variant="outlined"
            >
              {loading ? `Cargando${retryCount > 0 ? ` (${retryCount}/${MAX_RETRIES})` : ''}` : 'Recargar'}
            </Button>
          </Box>

          {loading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress 
                variant={retryCount > 0 ? "determinate" : "indeterminate"} 
                value={retryCount > 0 ? (retryCount / MAX_RETRIES) * 100 : undefined}
              />
              {retryCount > 0 && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  Reintentando... ({retryCount}/{MAX_RETRIES})
                </Typography>
              )}
            </Box>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => fetchConfig()}
                  disabled={loading}
                >
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
            <CodeMirror
              value={configContent}
              height="500px"
              theme={dracula}
              onChange={handleChange}
              readOnly={loading}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                defaultKeymap: true,
                searchKeymap: true,
                historyKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
              }}
              style={{ filter: loading ? 'blur(2px)' : 'none', transition: 'filter 0.3s' }}
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <PermissionGuard permission="editar_vpn_config">
              <Button
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="controlar_servicio_vpn">
              <Button
                variant="outlined"
                color="secondary"
                startIcon={restarting ? <CircularProgress size={20} /> : <RefreshCw />}
                onClick={handleRestart}
                disabled={restarting}
              >
                {restarting ? 'Reiniciando...' : 'Reiniciar Servicio'}
              </Button>
            </PermissionGuard>
          </Stack>
        </CardContent>
      </Card>
      
      {/* Snackbar for temporary messages */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default OpenVPNConfig;