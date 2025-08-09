import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Pagination, Alert,
  IconButton, Tooltip, TextField, Select, MenuItem,
  FormControl, SelectChangeEvent, InputAdornment, Skeleton,
  Chip, TableSortLabel, Fade, CircularProgress
} from '@mui/material';
import {
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  Calendar,
  RefreshCw,
  HelpCircle,
  Search,
  FilterX,
  Download,
  Eye
} from 'lucide-react';
import RevisionBackupModal from './RevisionBackupModal';
import RevisionBackupInfoSidebar from './RevisionBackupInfoSidebar';
import axiosInstance from '../utils/axios';
import { useAuth } from '../hooks/useAuth';
import { Revision as RevisionBase } from '../types/revision';
import { PermissionGuard } from './PermissionGuard';
import { Tooltip as MuiTooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RevisionBackupListProps {
  onBack: () => void;
}

type SortField = 'id' | 'fecha_revision' | 'username';
type SortOrder = 'asc' | 'desc';

// Encabezados mejorados con iconos y mejor organización
const dbHeaders = [
  { key: 'DB_USA_SITCA', label: 'USA SITCA', tooltip: 'Base de datos USA SITCA', category: 'USA' },
  { key: 'DB_HG_PGSQL_SAJE_ARM', label: 'HG SAJE', tooltip: 'Base de datos HG PostgreSQL SAJE ARM', category: 'HG' },
  { key: 'DB_BR_PGSQL_SANITCO', label: 'BR SANITCO', tooltip: 'Base de datos BR PostgreSQL SANITCO', category: 'BR-PGSQL' },
  { key: 'DB_BR_PGSQL_SAEPLUS_ARM', label: 'BR SAEPLUS', tooltip: 'Base de datos BR PostgreSQL SAEPLUS ARM', category: 'BR-PGSQL' },
  { key: 'DB_BR_PGSQL_NWADMIN_ARM', label: 'BR NWADMIN', tooltip: 'Base de datos BR PostgreSQL NWADMIN ARM', category: 'BR-PGSQL' },
  { key: 'DB_BR_MYSQL_VISITENTRY', label: 'VISITENTRY', tooltip: 'Base de datos BR MySQL VISITENTRY', category: 'BR-MYSQL' },
  { key: 'DB_BR_MYSQL_TASK', label: 'TASK', tooltip: 'Base de datos BR MySQL TASK', category: 'BR-MYSQL' },
  { key: 'DB_BR_MYSQL_RINGOW', label: 'RINGOW', tooltip: 'Base de datos BR MySQL RINGOW', category: 'BR-MYSQL' },
  { key: 'DB_BR_MYSQL_PAGINAS', label: 'PAGINAS', tooltip: 'Base de datos BR MySQL PAGINAS', category: 'BR-MYSQL' },
  { key: 'DB_BR_MYSQL_MOVILMOVE', label: 'MOVILMOVE', tooltip: 'Base de datos BR MySQL MOVILMOVE', category: 'BR-MYSQL' },
  { key: 'DB_BR_MYSQL_CORREOS', label: 'CORREOS', tooltip: 'Base de datos BR MySQL CORREOS', category: 'BR-MYSQL' },
  { key: 'DB_BR_MYSQL_CONTROLTURNOS', label: 'CONTROLTURNOS', tooltip: 'Base de datos BR MySQL CONTROLTURNOS', category: 'BR-MYSQL' },
];

interface Revision extends RevisionBase {
  username?: string;
}

const RevisionBackupList: React.FC<RevisionBackupListProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const theme = useTheme();

  // Estados principales
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Estados de paginación y filtros
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchDate, setSearchDate] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Estados de ordenamiento
  const [sortField, setSortField] = useState<SortField>('fecha_revision');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Función para obtener revisiones con debounce
  const fetchRevisiones = useCallback(async (pageNumber = 1, resetLoading = false) => {
    try {
      if (resetLoading) setIsLoading(true);

      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: limit.toString(),
        sortField,
        sortOrder,
        ...(searchDate && { fecha: searchDate }),
        ...(searchUser && { usuario: searchUser }),
      });

      const { data } = await axiosInstance.get(`/revisiones-backup?${params}`);
      setRevisiones(data.data ?? []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching revisiones:', error);
      setRevisiones([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [limit, searchDate, searchUser, sortField, sortOrder]);

  // Debounce para búsquedas
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRevisiones(1, true);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchRevisiones]);

  // Efecto para cambios de página
  useEffect(() => {
    if (page > 1) {
      fetchRevisiones(page);
    }
  }, [page, fetchRevisiones]);

  // Manejadores de eventos optimizados
  const handleDateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchDate(event.target.value);
  }, []);

  const handleUserSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchUser(event.target.value);
  }, []);

  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  }, []);

  const handleLimitChange = useCallback((event: SelectChangeEvent<number>) => {
    setLimit(event.target.value as number);
    setPage(1);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField, sortOrder]);

  const handleEdit = useCallback((revision: Revision) => {
    setSelectedRevision(revision);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedRevision(null);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar esta revisión?')) {
      setDeletingId(id);
      try {
        await axiosInstance.delete(`/revisiones-backup/${id}`);
        await fetchRevisiones(page);
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar la revisión');
      } finally {
        setDeletingId(null);
      }
    }
  }, [fetchRevisiones, page]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRevisiones(page);
    setIsRefreshing(false);
  }, [fetchRevisiones, page]);

  const handleClearFilters = useCallback(() => {
    setSearchDate('');
    setSearchUser('');
    setPage(1);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/revisiones-backup/export', {
        responseType: 'blob',
        params: {
          fecha: searchDate,
          usuario: searchUser,
          sortField,
          sortOrder
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revisiones-backup-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos');
    }
  }, [searchDate, searchUser, sortField, sortOrder]);

  // Función mejorada para renderizar checkmarks
  const renderCheckmark = useCallback((value: boolean) => {
    return (
      <Chip
        size="small"
        label={value ? 'OK' : 'NO'}
        color={value ? 'success' : 'error'}
        variant={value ? 'filled' : 'outlined'}
        sx={{
          minWidth: 50,
          fontWeight: 'bold',
          fontSize: '0.75rem'
        }}
      />
    );
  }, []);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    if (!revisiones.length) return null;

    const dbStats = dbHeaders.reduce((acc, header) => {
      const successCount = revisiones.filter(r => (r as any)[header.key]).length;
      acc[header.key] = {
        success: successCount,
        failure: revisiones.length - successCount,
        percentage: Math.round((successCount / revisiones.length) * 100)
      };
      return acc;
    }, {} as Record<string, { success: number; failure: number; percentage: number }>);

    return dbStats;
  }, [revisiones]);

  // Estilos optimizados
  const headerCellStyle = useMemo(() => ({
    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'primary.main',
    color: theme.palette.mode === 'dark' ? 'grey.100' : 'white',
    fontWeight: 'bold',
    borderColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.300',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  }), [theme.palette.mode]);

  const tableCellStyle = useMemo(() => ({
    borderColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
    py: 1.5,
  }), [theme.palette.mode]);

  // Estados de carga
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Debe iniciar sesión para acceder a este módulo
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header con estadísticas */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Listado de Revisiones de Backup
          </Typography>
          {!isLoading && pagination.total > 0 && (
            <Typography variant="body2" color="text.secondary">
              Total: {pagination.total} revisiones
            </Typography>
          )}
        </Box>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 border border-indigo-200 shadow-sm"
        >
          <HelpCircle className="w-5 h-5" />
          Ayuda
        </button>
      </Box>

      {/* Toolbar unificada en una sola línea */}
      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}
        elevation={0}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          flexWrap: 'nowrap',
          justifyContent: 'space-between'
        }}>
          {/* Grupo izquierdo - Filtros */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
            {/* Filtro por fecha */}
            <Box sx={{ minWidth: 180 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  display: 'block',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                  letterSpacing: 0.5
                }}
              >
                Filtrar por fecha
              </Typography>
              <TextField
                type="date"
                size="small"
                value={searchDate}
                onChange={handleDateChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Calendar size={16} color="#6366f1" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    borderRadius: 2,
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                    }
                  }
                }}
              />
            </Box>

            {/* Filtro por usuario */}
            <Box sx={{ minWidth: 200 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  display: 'block',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                  letterSpacing: 0.5
                }}
              >
                Buscar usuario
              </Typography>
              <TextField
                size="small"
                placeholder="Nombre de usuario..."
                value={searchUser}
                onChange={handleUserSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#6366f1" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    borderRadius: 2,
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                    }
                  }
                }}
              />
            </Box>

            {/* Botón limpiar filtros */}
            {(searchDate || searchUser) && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearFilters}
                startIcon={<FilterX size={16} />}
                sx={{
                  mt: 2,
                  height: 38,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'grey.300',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'grey.400',
                    backgroundColor: 'white'
                  }
                }}
              >
                Limpiar
              </Button>
            )}
          </Box>

          {/* Grupo central - Acciones principales */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '0 0 auto' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowLeft size={16} />}
              onClick={onBack}
              sx={{
                height: 38,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                px: 2.5,
                borderColor: 'grey.300',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'grey.400',
                  backgroundColor: 'white',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Volver
            </Button>

            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              onClick={handleExport}
              disabled={isLoading || revisiones.length === 0}
              sx={{
                height: 38,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                px: 2.5,
                borderColor: 'success.main',
                color: 'success.main',
                '&:hover': {
                  backgroundColor: 'success.50',
                  borderColor: 'success.main',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                },
                '&:disabled': {
                  borderColor: 'grey.300',
                  color: 'grey.400'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Exportar
            </Button>

            <Button
              variant="contained"
              startIcon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{
                height: 38,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)'
                },
                '&:disabled': {
                  background: 'grey.300',
                  boxShadow: 'none'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>

            <PermissionGuard permission="crear_revisiones_backup">
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={() => setShowModal(true)}
                sx={{
                  height: 38,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Nueva Revisión
              </Button>
            </PermissionGuard>
          </Box>

          {/* Grupo derecho - Control de registros */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backgroundColor: 'white',
            borderRadius: 2,
            px: 2,
            py: 1,
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            flex: '0 0 auto'
          }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: 'text.secondary',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap'
              }}
            >
              Mostrar:
            </Typography>
            <FormControl size="small">
              <Select
                value={limit}
                onChange={handleLimitChange}
                sx={{
                  minWidth: 60,
                  '& .MuiSelect-select': {
                    py: 0.5,
                    fontSize: '0.85rem',
                    fontWeight: 500
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  }
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: 'text.secondary',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap'
              }}
            >
              registros
            </Typography>
          </Box>

          {/* Indicadores de filtros activos (flotantes) */}
          {(searchDate || searchUser) && (
            <Box sx={{
              position: 'absolute',
              top: -8,
              left: 400,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              zIndex: 2
            }}>
              {searchDate && (
                <Chip
                  label={`${searchDate}`}
                  size="small"
                  onDelete={() => setSearchDate('')}
                  color="primary"
                  variant="filled"
                  sx={{
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    height: 24
                  }}
                />
              )}
              {searchUser && (
                <Chip
                  label={`${searchUser}`}
                  size="small"
                  onDelete={() => setSearchUser('')}
                  color="primary"
                  variant="filled"
                  sx={{
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    height: 24
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Tabla principal */}
      <TableContainer
        component={Paper}
        sx={{
          mb: 3,
          maxHeight: 600,
          borderRadius: 2
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'id'}
                  direction={sortField === 'id' ? sortOrder : 'asc'}
                  onClick={() => handleSort('id')}
                  sx={{ color: 'inherit' }}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'username'}
                  direction={sortField === 'username' ? sortOrder : 'asc'}
                  onClick={() => handleSort('username')}
                  sx={{ color: 'inherit' }}
                >
                  Usuario
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellStyle}>Observaciones</TableCell>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === 'fecha_revision'}
                  direction={sortField === 'fecha_revision' ? sortOrder : 'asc'}
                  onClick={() => handleSort('fecha_revision')}
                  sx={{ color: 'inherit' }}
                >
                  Fecha
                </TableSortLabel>
              </TableCell>
              {dbHeaders.map(h => (
                <TableCell key={h.key} sx={headerCellStyle} align="center">
                  <MuiTooltip title={h.tooltip} arrow>
                    <span style={{ fontSize: '0.75rem' }}>{h.label}</span>
                  </MuiTooltip>
                </TableCell>
              ))}
              <TableCell align="center" sx={headerCellStyle}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: limit }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: dbHeaders.length + 5 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex} sx={tableCellStyle}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : revisiones.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={dbHeaders.length + 5}
                  align="center"
                  sx={{ ...tableCellStyle, py: 4 }}
                >
                  <Typography color="text.secondary">
                    {searchDate || searchUser ? 'No se encontraron revisiones con los filtros aplicados' : 'No hay revisiones registradas'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              revisiones.map((r, index) => (
                <Fade in={true} timeout={300 + index * 50} key={r.id}>
                  <TableRow hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={tableCellStyle}>
                      <Typography variant="body2" fontWeight="bold">
                        #{r.id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableCellStyle}>
                      <Chip
                        label={r.username || r.usuario_id || 'N/A'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={tableCellStyle}>
                      <MuiTooltip title={r.observaciones || 'Sin observaciones'} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {r.observaciones || 'Sin observaciones'}
                        </Typography>
                      </MuiTooltip>
                    </TableCell>
                    <TableCell sx={tableCellStyle}>
                      <Typography variant="body2">
                        {new Date(r.fecha_revision).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Typography>
                    </TableCell>
                    {dbHeaders.map(h => (
                      <TableCell key={h.key} align="center" sx={tableCellStyle}>
                        {renderCheckmark((r as any)[h.key])}
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={tableCellStyle}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <PermissionGuard permission="ver_revisiones_backup">
                          <Tooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(r)}
                              color="info"
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                        </PermissionGuard>
                        <PermissionGuard permission="editar_revisiones_backup">
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(r)}
                              color="primary"
                            >
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                        </PermissionGuard>
                        <PermissionGuard permission="eliminar_revisiones_backup">
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(r.id)}
                              color="error"
                              disabled={deletingId === r.id}
                            >
                              {deletingId === r.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </PermissionGuard>
                      </Box>
                    </TableCell>
                  </TableRow>
                </Fade>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación mejorada */}
      {!isLoading && revisiones.length > 0 && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, pagination.total)} de {pagination.total} registros
          </Typography>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Modales */}
      <RevisionBackupInfoSidebar
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <RevisionBackupModal
        open={showModal}
        onClose={handleCloseModal}
        onSuccess={() => {
          fetchRevisiones(page);
          handleCloseModal();
        }}
        usuario_id={user.id}
        revisionToEdit={selectedRevision}
      />
    </Box>
  );
};

export default RevisionBackupList;