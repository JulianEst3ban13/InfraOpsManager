import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import { RotateCcw, Download, Pause, Play, Search, X } from 'lucide-react';
import config from '../../config/config';
import axiosInstance from '../../utils/axios';

const OpenVPNLogs: React.FC = () => {
  const [logs, setLogs] = useState<Array<{ timestamp: string; log: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Función para formatear el timestamp
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  // Función para cargar los logs iniciales
  const loadInitialLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get('/openvpn/logs/recent', {
        params: { lines: 500 },
        timeout: 10000 // 10 segundos de timeout
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Si no hay logs, inicializar con array vacío
      if (!response.data.logs || !Array.isArray(response.data.logs)) {
        setLogs([]);
        return;
      }

      setLogs(response.data.logs);
    } catch (error: any) {
      console.error('Error al cargar los logs:', error);
      let errorMessage = 'Error al cargar los logs';
      
      if (error.response?.data?.error) {
        errorMessage = `${error.response.data.error}${error.response.data.details ? ': ' + error.response.data.details : ''}`;
      } else if (error.response) {
        errorMessage = `Error del servidor: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor';
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar el streaming de logs
  const startLogStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Obtener el token del almacenamiento local
    const token = localStorage.getItem('token');
    // Para EventSource necesitamos la URL completa incluyendo el token como query param
    const eventSource = new EventSource(`${config.apiBaseUrl}:${config.apiPort}/api/openvpn/logs/stream?token=${token}`);
    
    eventSource.onmessage = (event) => {
      if (isPaused) return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('Error en stream:', data.error);
          setError(data.error);
          return;
        }

        setLogs(prevLogs => {
          const newLogs = [...prevLogs, data];
          // Mantener solo los últimos 1000 logs para evitar problemas de rendimiento
          return newLogs.slice(-1000);
        });

        if (autoScroll) {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Error en la conexión de logs:', error);
      setError('Error en la conexión de logs. Reintentando en 5 segundos...');
      eventSource.close();
      // Reintentar en 5 segundos
      setTimeout(startLogStream, 5000);
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    loadInitialLogs();
    startLogStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Filtrar logs según el término de búsqueda
  const filteredLogs = logs.filter(log => 
    log.log.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Descargar logs
  const downloadLogs = () => {
    const content = filteredLogs
      .map(log => `${showTimestamp ? formatTimestamp(log.timestamp) + ' - ' : ''}${log.log}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openvpn-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Logs de OpenVPN
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                startIcon={<RotateCcw />}
                onClick={loadInitialLogs}
                size="small"
                disabled={loading}
              >
                Recargar
              </Button>
              <Button
                startIcon={<Download />}
                onClick={downloadLogs}
                size="small"
                disabled={loading || logs.length === 0}
              >
                Descargar
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              placeholder="Buscar en logs..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search size={20} />,
                endAdornment: searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <X size={20} />
                  </IconButton>
                )
              }}
              sx={{ flexGrow: 1 }}
            />
            <Tooltip title={isPaused ? "Reanudar logs" : "Pausar logs"}>
              <IconButton onClick={() => setIsPaused(!isPaused)} color={isPaused ? "primary" : "default"}>
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-scroll"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  size="small"
                />
              }
              label="Mostrar timestamp"
            />
          </Stack>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={startLogStream}>
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                height: '500px',
                overflow: 'auto',
                bgcolor: 'grey.900',
                borderRadius: 1,
                p: 2,
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: 'grey.100'
              }}
            >
              {filteredLogs.map((log, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  {showTimestamp && (
                    <span style={{ color: '#888' }}>
                      {formatTimestamp(log.timestamp)} -{' '}
                    </span>
                  )}
                  <span style={{ color: log.log.includes('ERROR') ? '#ff6b6b' : 'inherit' }}>
                    {log.log}
                  </span>
                </Box>
              ))}
              <div ref={logsEndRef} />
            </Box>
          )}

          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            {filteredLogs.length} logs mostrados
            {searchTerm && ` (filtrado de ${logs.length} total)`}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OpenVPNLogs; 