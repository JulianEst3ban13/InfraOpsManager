import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../config/config";

interface Mantenimiento {
    id: number;
    titulo: string;
    estado: string;
    basededatos: string;
    fecha: string;
}

const DashboardMantenimiento = () => {
    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);

    const cargarMantenimientos = async () => {
        try {
            const response = await axios.get(`${config.apiBaseUrl}:${config.apiPort}/api/mantenimientos/estado`);
            setMantenimientos(response.data);
        } catch (error) {
            console.error("❌ Error al cargar mantenimientos:", error);
        }
    };

    useEffect(() => {
        cargarMantenimientos();
        const interval = setInterval(() => {
            cargarMantenimientos();
        }, 50000); // Refresca cada 5 segundos
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">📊 Estado de Mantenimientos</h2>
            <table className="w-full border">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border p-2">Título</th>
                        <th className="border p-2">Base de Datos</th>
                        <th className="border p-2">Fecha</th>
                        <th className="border p-2">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {mantenimientos.map((m) => (
                        <tr key={m.id} className="text-center">
                            <td className="border p-2">{m.titulo}</td>
                            <td className="border p-2">{m.basededatos}</td>
                            <td className="border p-2">{new Date(m.fecha).toLocaleString()}</td>
                            <td className={`border p-2 ${m.estado === "fallido" ? "text-red-500" : "text-green-500"}`}>
                                {m.estado.toUpperCase()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DashboardMantenimiento;
