import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axios";
import { XCircleIcon } from "@heroicons/react/20/solid";
import { toast } from "react-hot-toast";

interface DBConfig {
    id: number;
    nombre: string;
    usuario: string;
    contraseña: string;
    ip: string;
    puerto: number;
    basededatos: string;
    tipo_bd: string;
}

interface CrearMantenimientoProps {
    onCancel: () => void;
    onGuardado: () => void;
}

const CrearMantenimiento: React.FC<CrearMantenimientoProps> = ({ onCancel, onGuardado }) => {
    const [dbs, setDbs] = useState<DBConfig[]>([]);
    const [formData, setFormData] = useState(() => {
        const now = new Date();
        return {
            dbSeleccionada: "",
            titulo: "",
            descripcion: "",
            fecha: now.toISOString().slice(0, 10),
            hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            backup: false,
        };
    });
    const [configuracionDB, setConfiguracionDB] = useState<DBConfig | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        axiosInstance.get("/conexiones")
            .then((res) => setDbs(res.data))
            .catch(() => console.error("❌ Error al cargar bases de datos"));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === "checkbox") {
            setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
        } else if (name === "hora") {
            // Asegurarse de que la hora tenga el formato correcto HH:mm
            setFormData({ ...formData, hora: value });
        } else if (name === "fecha") {
            // Asegurarse de que la fecha tenga el formato correcto YYYY-MM-DD
            setFormData({ ...formData, fecha: value });
        } else if (name === "dbSeleccionada") {
            setFormData({ ...formData, [name]: value });
            const dbConfig = dbs.find(db => db.nombre === value);
            setConfiguracionDB(dbConfig || null);
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!configuracionDB) return alert("⚠️ Debes seleccionar una base de datos válida.");
        
        setIsSubmitting(true);

        try {
            toast.promise(
                axiosInstance.post("/mantenimientos", {
                    titulo: formData.titulo,
                    descripcion: formData.descripcion,
                    fecha: `${formData.fecha} ${formData.hora}`,
                    estado: "pendiente",
                    basededatos: configuracionDB.basededatos,
                    usuario_id: 1,
                    backup: formData.backup,
                    dbConfig: configuracionDB
                }),
                {
                    loading: 'Creando mantenimiento...',
                    success: (res) => {
                        onCancel();
                        onGuardado();
                        return 'Mantenimiento creado con éxito';
                    },
                    error: (err) => {
                        if (err && err.response && err.response.data) {
                            return `Error: ${err.response.data.error || 'al crear el mantenimiento'}`;
                        }
                        return 'Error al crear el mantenimiento';
                    }
                }
            );
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'response' in error) {
                // @ts-ignore
                console.error("❌ Error al guardar mantenimiento:", error.response.data);
            } else {
                console.error("❌ Error al guardar mantenimiento:", error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onCancel}>
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-red-600">
                    <XCircleIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Crear Mantenimiento</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-medium">Base de Datos</label>
                        <select name="dbSeleccionada" value={formData.dbSeleccionada} onChange={handleChange} required className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300">
                            <option value="">Seleccione una Base de Datos</option>
                            {dbs.map(db => <option key={db.id} value={db.nombre}>{db.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium">Título</label>
                        <input type="text" name="titulo" placeholder="Título" value={formData.titulo} onChange={handleChange} required className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300" />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium">Descripción</label>
                        <textarea name="descripcion" placeholder="Descripción" value={formData.descripcion} onChange={handleChange} required className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300"></textarea>
                    </div>
                    
                    <div>
                        <label className="block text-gray-700 font-medium">Fecha</label>
                        <input 
                            type="date" 
                            name="fecha" 
                            value={formData.fecha} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300" 
                        />
                        <p className="text-sm text-gray-500 mt-1">Fecha en la que se realizará el mantenimiento</p>
                    </div>
                    
                    <div>
                        <label className="block text-gray-700 font-medium">Hora</label>
                        <input 
                            type="time" 
                            name="hora" 
                            value={formData.hora} 
                            onChange={handleChange} 
                            required 
                            className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300" 
                        />
                        <p className="text-sm text-gray-500 mt-1">Hora en la que se realizará el mantenimiento</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" name="backup" checked={formData.backup} onChange={handleChange} className="h-5 w-5 text-blue-600" />
                        <label className="text-gray-700 font-medium">Hacer Backup</label>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="w-full bg-gray-500 text-white py-3 rounded-md font-medium hover:bg-gray-600 transition mt-2"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CrearMantenimiento;
