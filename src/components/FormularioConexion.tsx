import React, { useEffect, useState } from "react";
import { Save, XCircle, AlertTriangle } from "lucide-react";

interface FormularioConexionProps {
  formData: {
    nombre: string;
    usuario: string;
    contraseña: string;
    ip: string;
    basededatos: string;
    tipo_bd: string;
    puerto: string;
  };

  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => Promise<string | null>; // Devuelve un string de error si falla
  onCancel: () => void;
  editando: boolean;
  resetForm: () => void;
}

const FormularioConexion: React.FC<FormularioConexionProps> = ({ formData, onChange, onSubmit, onCancel, editando, resetForm }) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [errorConexion, setErrorConexion] = useState<string | null>(null); // Estado para el error de conexión

  useEffect(() => {
    if (!editando) {
      resetForm();
    }
  }, [editando]);

  useEffect(() => {
    validarFormulario();
  }, [formData]);

  const tiposBD = [
    { value: "mysql", label: "MySQL" },
    { value: "pgsql", label: "PostgreSQL" },
    { value: "sqlserver", label: "SQL Server" },
    { value: "mongodb", label: "MongoDB" },
  ];

  const puertoValido: Record<"mysql" | "pgsql" | "sqlserver" | "mongodb", string> = {
    mysql: "3306",
    pgsql: "5432",
    sqlserver: "1433",
    mongodb: "27017",
  };

  const validarFormulario = () => {
    let newErrors: { [key: string]: string } = {};
    const tipoBD = formData.tipo_bd.toLowerCase();

    if (!Object.keys(puertoValido).includes(tipoBD)) {
      newErrors.tipo_bd = "Debe ser 'MySQL', 'PostgreSQL', 'SQL Server' o 'MongoDB'.";
    }

    if (!/^\d+$/.test(formData.puerto) || Number(formData.puerto) < 1 || Number(formData.puerto) > 65535) {
      newErrors.puerto = "El puerto debe ser un número entre 1 y 65535.";
    } else if (tipoBD in puertoValido && formData.puerto !== puertoValido[tipoBD as keyof typeof puertoValido]) {
      newErrors.puerto = `El puerto debe ser ${puertoValido[tipoBD as keyof typeof puertoValido]} para ${tipoBD}.`;
    }

    setErrors(newErrors);
  };

  const handleTipoBDChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo_bd = e.target.value;
    onChange({
      target: { name: "tipo_bd", value: tipo_bd },
    } as React.ChangeEvent<HTMLInputElement>);

    onChange({
      target: { name: "puerto", value: puertoValido[tipo_bd as keyof typeof puertoValido] },
    } as React.ChangeEvent<HTMLInputElement>);
  };

   // 🚀 Manejar el envío y capturar errores de conexión
   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = await onSubmit(e); // Captura el error de conexión
    if (error) {
      setErrorConexion(error); // Mostrar modal de error
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md w-1/3 relative">
        <button onClick={onCancel} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
          <XCircle className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {editando ? "Editar Conexión" : "Agregar Nueva Conexión"}
        </h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="nombre" placeholder="Nombre" className="w-full p-2 mb-3 border rounded" value={formData.nombre} onChange={onChange} required />
          <input type="text" name="usuario" placeholder="Usuario" className="w-full p-2 mb-3 border rounded" value={formData.usuario} onChange={onChange} required />
          <input type="password" name="contraseña" placeholder="Contraseña" className="w-full p-2 mb-3 border rounded" value={formData.contraseña} onChange={onChange} required />
          <input type="text" name="ip" placeholder="IP" className="w-full p-2 mb-3 border rounded" value={formData.ip} onChange={onChange} required />
          <input type="text" name="basededatos" placeholder="Nombre base de datos" className="w-full p-2 mb-3 border rounded" value={formData.basededatos} onChange={onChange} required />

          {/* Selector de Tipo de Base de Datos */}
          <div className="mb-3">
            <select name="tipo_bd" className="w-full p-2 border rounded" value={formData.tipo_bd} onChange={handleTipoBDChange} required>
              <option value="">Seleccione el tipo de base de datos</option>
              {tiposBD.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
            {errors.tipo_bd && <p className="text-red-500 text-sm">{errors.tipo_bd}</p>}
          </div>

          {/* Campo de Puerto */}
          <div className="mb-3">
            <input type="text" name="puerto" placeholder="Puerto" className="w-full p-2 border rounded" value={formData.puerto} onChange={onChange} required />
            {errors.puerto && <p className="text-red-500 text-sm">{errors.puerto}</p>}
          </div>

          <button
            type="submit"
            className={`w-full py-2 rounded ${Object.keys(errors).length > 0 ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
            disabled={Object.keys(errors).length > 0}
          >
            <Save className="w-5 h-5 inline-block mr-2" />
            {editando ? "Guardar Cambios" : "Guardar Conexión"}
          </button>
        </form>
      </div>

      {/* 🔴 Modal de error de conexión */}
      {errorConexion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-md w-1/3 relative">
            <button onClick={() => setErrorConexion(null)} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <h2 className="text-xl font-bold">Error de Conexión</h2>
            </div>
            <p className="mt-4 text-gray-700">{errorConexion}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioConexion;
