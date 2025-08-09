import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Checkbox, FormControlLabel, Typography, FormControl, Box, Tooltip, IconButton, Alert, Chip
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Save, X, XCircle, CheckCircle, BadgeCheck } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { Revision } from '../types/revision';

const INSTANCIAS = [
    "DB_BR_MYSQL_VISITENTRY",
    "DB_BR_PGSQL_SANITCO",
    "DB_BR_MYSQL_MOVILMOVE",
    "DB_BR_PGSQL_NWADMIN_ARM",
    "DB_BR_MYSQL_CONTROLTURNOS",
    "DB_BR_PGSQL_SAEPLUS_ARM",
    "DB_BR_MYSQL_TASK",
    "DB_BR_MYSQL_RINGOW",
    "DB_BR_MYSQL_PAGINAS",
    "DB_BR_MYSQL_CORREOS",
    "DB_USA_SITCA",
    "DB_HG_PGSQL_SAJE_ARM",
    "DB_BR_PGSQL_CLARO_OTROS",
    "DB_BR_PGSQL_LOGIMOV"
];

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    usuario_id: number;
    revisionToEdit?: Revision | null;
}

interface FormState {
    fecha_revision: string;
    observaciones: string;
    // Usamos index signature para manejar las instancias dinámicamente
    [key: string]: boolean | string;
}

const initialForm: FormState = {
    fecha_revision: new Date().toISOString().slice(0, 16),
    observaciones: '',
    ...INSTANCIAS.reduce((acc, instancia) => ({ ...acc, [instancia]: false }), {})
};

const RevisionBackupModal: React.FC<Props> = ({
    open,
    onClose,
    onSuccess,
    usuario_id,
    revisionToEdit
}) => {
    const [form, setForm] = useState<FormState>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (revisionToEdit) {
            const loadedForm: FormState = {
                fecha_revision: revisionToEdit.fecha_revision.slice(0, 16),
                observaciones: revisionToEdit.observaciones,
                ...INSTANCIAS.reduce((acc, instancia) => ({
                    ...acc,
                    [instancia]: Boolean((revisionToEdit as any)[instancia])
                }), {})
            };
            setForm(loadedForm);
        } else {
            setForm(initialForm);
        }
    }, [revisionToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as HTMLInputElement;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({
            ...prev,
            [field]: e.target.checked
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const payload: any = {
                usuario_id,
                fecha_revision: form.fecha_revision,
                observaciones: form.observaciones,
                instancia: 'GENERAL',
                ...INSTANCIAS.reduce((acc, instancia) => ({
                    ...acc,
                    [instancia]: form[instancia]
                }), {})
            };

            if (revisionToEdit) {
                await axiosInstance.put(`/revisiones-backup/${revisionToEdit.id}`, payload);
            } else {
                await axiosInstance.post('/revisiones-backup', payload);
            }
            onSuccess();
            onClose();
            setForm(initialForm);
        } catch (err: any) {
            console.error('Error al procesar revisión:', err);
            setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Error al procesar la revisión');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        const allChecked = INSTANCIAS.every(instancia => form[instancia]);
        const newValue = !allChecked;
        setForm(prev => ({
            ...prev,
            ...INSTANCIAS.reduce((acc, instancia) => ({
                ...acc,
                [instancia]: newValue
            }), {})
        }));
    };

    // Contar instancias seleccionadas
    const selectedCount = INSTANCIAS.filter(instancia => form[instancia]).length;
    const allChecked = INSTANCIAS.every(instancia => form[instancia]);
    const indeterminate = selectedCount > 0 && !allChecked;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            sx={{
                '& .MuiDialog-paper': {
                    width: '900px', // Aumentado para mejor espacio
                    maxWidth: 'none',
                    minWidth: '700px',
                    minHeight: '600px', // Aumentado para mejor proporción
                    resize: 'both',
                    overflow: 'hidden' // Cambiado para mejor control del scroll
                }
            }}
        >
            <DialogTitle sx={{
                pb: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f5f5f5', // Fondo sutil para el título
                pr: 2,
                pl: 3
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        backgroundColor: 'primary.main',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CheckCircle size={24} color="white" />
                    </Box>
                    <Typography variant="h6" component="div">
                        {revisionToEdit ? 'Editar' : 'Registrar'} Revisión de Backup
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    aria-label="cerrar"
                    disabled={loading}
                    sx={{
                        color: (theme) => theme.palette.grey[700],
                        backgroundColor: 'white',
                        '&:hover': {
                            backgroundColor: '#e0e0e0'
                        }
                    }}
                >
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 3, // Padding aumentado
                    pt: 2,
                    overflowY: 'auto', // Scroll solo en el contenido
                    maxHeight: 'calc(100vh - 200px)' // Limitar altura del contenido
                }}>
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2, borderRadius: 2 }}
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1
                    }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Selecciona las instancias revisadas:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label={`${selectedCount} de ${INSTANCIAS.length} seleccionadas`}
                                size="small"
                                color={selectedCount === INSTANCIAS.length ? "success" : "default"}
                                variant="outlined"
                            />
                            <Tooltip
                                title={allChecked ? "Deseleccionar todas" : "Seleccionar todas"}
                            >
                                <IconButton
                                    onClick={handleSelectAll}
                                    size="small"
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1
                                    }}
                                >
                                    {allChecked ? (
                                        <XCircle size={18} />
                                    ) : indeterminate ? (
                                        <BadgeCheck size={18} />
                                    ) : (
                                        <CheckCircle size={18} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <FormControl component="fieldset" margin="normal" fullWidth>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(1, 1fr)',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)' // Mantenido en 3 columnas
                            },
                            gap: 1.5, // Espaciado aumentado
                            maxHeight: '320px', // Altura ajustada
                            overflowY: 'auto',
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            borderRadius: 2, // Bordes más redondeados
                            p: 2,
                            backgroundColor: '#fafafa' // Fondo sutil para las instancias
                        }}>
                            {INSTANCIAS.map(value => (
                                <FormControlLabel
                                    key={value}
                                    control={
                                        <Checkbox
                                            checked={Boolean(form[value])}
                                            onChange={handleCheckboxChange(value)}
                                            disabled={loading}
                                            size="small" // Checkbox más pequeño
                                        />
                                    }
                                    label={
                                        <Tooltip title={value} placement="top">
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: form[value] ? 600 : 400,
                                                    color: form[value] ? 'primary.main' : 'text.secondary',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {value.replace('DB_', '').replace(/_/g, ' ')}
                                            </Typography>
                                        </Tooltip>
                                    }
                                    sx={{
                                        m: 0,
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: 1,
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            backgroundColor: form[value] ? 'rgba(33, 150, 243, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                                        },
                                        border: form[value] ? '1px solid' : '1px solid transparent',
                                        borderColor: form[value] ? 'primary.main' : 'transparent'
                                    }}
                                />
                            ))}
                        </Box>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <TextField
                            label="Fecha de revisión"
                            type="datetime-local"
                            name="fecha_revision"
                            value={form.fecha_revision}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                            required
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                        />
                    </Box>

                    <TextField
                        label="Observaciones"
                        name="observaciones"
                        value={form.observaciones}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={3}
                        disabled={loading}
                        placeholder="Agrega detalles relevantes de la revisión..."
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{
                    px: 3,
                    pb: 2.5,
                    pt: 2,
                    backgroundColor: '#f9f9f9', // Fondo sutil para las acciones
                    borderTop: '1px solid rgba(0, 0, 0, 0.12)'
                }}>
                    <Button
                        onClick={onClose}
                        color="inherit"
                        startIcon={<XCircle size={20} />}
                        variant="outlined"
                        disabled={loading}
                        sx={{ mr: 1 }}
                    >
                        Cancelar
                    </Button>
                    <LoadingButton
                        type="submit"
                        variant="contained"
                        color="primary"
                        loading={loading}
                        loadingPosition="start"
                        startIcon={<Save size={20} />}
                        disabled={selectedCount === 0}
                        sx={{
                            px: 4,
                            boxShadow: 2,
                            '&:hover': {
                                boxShadow: 4
                            }
                        }}
                    >
                        {loading ? 'Guardando...' : 'Guardar Revisión'}
                    </LoadingButton>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default RevisionBackupModal;