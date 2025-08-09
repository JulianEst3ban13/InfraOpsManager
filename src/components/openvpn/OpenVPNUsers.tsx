import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  CircularProgress,
  Typography,
  Paper,
  InputBase,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Select,
  SelectChangeEvent,
  MenuItem,
  InputLabel
} from '@mui/material';
import { Download, Trash2, Search, Plus, RefreshCw, X, Edit2, Eye, EyeOff } from 'lucide-react';
import config from '../../config/config';
import { PermissionGuard } from '../PermissionGuard';
import { PermissionDenied } from '../dashboard/states/PermissionDenied';
import axiosInstance from '../../utils/axios';

interface VPNUser {
  id: number;
  username: string;
  os_type: string;
  ip_address: string;
  created_at: string;
}

const OpenVPNUsers: React.FC = () => {
  // Estados para el modal y formulario
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [osType, setOsType] = useState('linux');
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // Estados para el listado
  const [users, setUsers] = useState<VPNUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<VPNUser[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [nameFilter, setNameFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setPermissionError(false);
    try {
      const response = await axiosInstance.get('/openvpn/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        setPermissionError(true);
      } else {
        setError('Error al cargar los usuarios de VPN.');
        console.error('Error fetching VPN users:', err);
      }
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [nameFilter, ipFilter, users]);

  const filterUsers = () => {
    let filtered = users;
    if (nameFilter) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    if (ipFilter) {
      filtered = filtered.filter(user => 
        user.ip_address.includes(ipFilter)
      );
    }
    setFilteredUsers(filtered);
  };

  const findNextAvailableIP = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}:${config.apiPort}/api/openvpn/next-ip`);
      const data = await response.json();
      setIpAddress(data.ip);
    } catch (error) {
      console.error('Error al obtener siguiente IP:', error);
    }
  };

  const handleOpenModal = () => {
    setOpenModal(true);
    findNextAvailableIP();
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setUsername('');
    setPassword('');
    setOsType('linux');
    setIpAddress('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${config.apiBaseUrl}:${config.apiPort}/api/openvpn/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          os_type: osType,
          ip_address: ipAddress
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      setSuccess('Usuario creado exitosamente');
      fetchUsers();
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadConfig = async (username: string, osType: string) => {
    try {
      const response = await fetch(
        `${config.apiBaseUrl}:${config.apiPort}/api/openvpn/config/${username}?os_type=${osType}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Error al descargar configuración');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = osType === 'windows' ? 'vpn-config.zip' : 'client.ovpn';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar configuración:', error);
    }
  };

  const handleEditPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${config.apiBaseUrl}:${config.apiPort}/api/openvpn/users/${selectedUser}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar contraseña');
      }

      setSuccess('Contraseña actualizada exitosamente');
      setTimeout(() => {
        handleCloseEditModal();
      }, 1500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (username: string) => {
    setSelectedUser(username);
    setNewPassword('');
    setEditModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedUser('');
    setNewPassword('');
    setError(null);
    setSuccess(null);
  };

  const deleteUser = async (username: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el usuario ${username}? Esta acción eliminará todos los archivos y configuraciones asociadas.`)) {
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}:${config.apiPort}/api/openvpn/users/${username}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }

      fetchUsers();
      setSuccess('Usuario eliminado exitosamente');
    } catch (error) {
      setError('Error al eliminar usuario');
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPageSelect = (event: SelectChangeEvent) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (permissionError) {
    return <PermissionDenied modules={['Administración de Usuarios VPN']} darkMode={false} />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const paginatedUsers = (filteredUsers || []).slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header con título y botones */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Usuarios VPN
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<RefreshCw />}
            onClick={fetchUsers}
            size="small"
            variant="contained"
            color="success"
          >
            Actualizar
          </Button>
          <PermissionGuard permission="crear_vpn_usuarios">
            <Button
              startIcon={<Plus />}
              onClick={handleOpenModal}
              variant="contained"
              color="primary"
            >
              Nueva Conexión
            </Button>
          </PermissionGuard>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 250 }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Filtrar por nombre..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          {nameFilter && (
            <IconButton size="small" onClick={() => setNameFilter('')}>
              <X size={16} />
            </IconButton>
          )}
        </Paper>

        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 250 }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Filtrar por IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
          />
          {ipFilter && (
            <IconButton size="small" onClick={() => setIpFilter('')}>
              <X size={16} />
            </IconButton>
          )}
        </Paper>

        <Button
          variant="outlined"
          onClick={() => {
            setNameFilter('');
            setIpFilter('');
          }}
        >
          Limpiar Filtros
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={rowsPerPage.toString()}
            onChange={handleChangeRowsPerPageSelect}
            displayEmpty
          >
            <MenuItem value={5}>5 por página</MenuItem>
            <MenuItem value={10}>10 por página</MenuItem>
            <MenuItem value={25}>25 por página</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabla de usuarios */}
      <Paper>
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: 'primary.main' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sistema Operativo</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>IP</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha Creación</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.os_type}</TableCell>
                    <TableCell>{user.ip_address}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <PermissionGuard permission="editar_vpn_usuarios">
                          <Tooltip title="Cambiar Contraseña">
                            <IconButton size="small" onClick={() => handleOpenEditModal(user.username)}>
                              <Edit2 />
                            </IconButton>
                          </Tooltip>
                        </PermissionGuard>
                        <PermissionGuard permission="descargar_config_vpn">
                          <Tooltip title="Descargar Configuración">
                            <IconButton size="small" onClick={() => downloadConfig(user.username, user.os_type)}>
                              <Download />
                            </IconButton>
                          </Tooltip>
                        </PermissionGuard>
                        <PermissionGuard permission="eliminar_vpn_usuarios">
                          <Tooltip title="Eliminar Usuario">
                            <IconButton size="small" color="error" onClick={() => deleteUser(user.username)}>
                              <Trash2 />
                            </IconButton>
                          </Tooltip>
                        </PermissionGuard>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          labelRowsPerPage="Mostrar:"
        />
      </Paper>

      {/* Modal para nuevo usuario */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Usuario VPN</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
              />

              <TextField
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  ),
                }}
              />

              <TextField
                label="Dirección IP"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                required
                fullWidth
                helperText="IP entre 10.10.10.2 y 10.10.10.254"
              />

              <FormControl>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sistema Operativo
                </Typography>
                <RadioGroup
                  row
                  value={osType}
                  onChange={(e) => setOsType(e.target.value)}
                >
                  <FormControlLabel
                    value="linux"
                    control={<Radio />}
                    label="Linux"
                  />
                  <FormControlLabel
                    value="windows"
                    control={<Radio />}
                    label="Windows"
                  />
                </RadioGroup>
              </FormControl>

              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success">
                  {success}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Crear Usuario'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal para editar contraseña */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleEditPassword}>
          <DialogTitle>Cambiar Contraseña para {selectedUser}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <TextField
              label="Nueva Contraseña"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff /> : <Eye />}
                  </IconButton>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditModal} color="secondary">Cancelar</Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Actualizar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default OpenVPNUsers; 