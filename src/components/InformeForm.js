import React, { useState, useEffect } from "react";
import axios from "axios";
import config from "../config/config";

const InformeForm = () => {
  const [databases, setDatabases] = useState([]);
  const [selectedDB, setSelectedDB] = useState("");
  const [emails, setEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Obtener bases de datos disponibles
  useEffect(() => {
    axios.get(`${config.apiBaseUrl}:${config.apiPort}/api/bases-de-datos`)
      .then(response => setDatabases(response.data))
      .catch(error => console.error("Error al obtener bases de datos:", error));
  }, []);

  // Función para enviar la solicitud al backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(`${config.apiBaseUrl}:${config.apiPort}/api/generar-informe`, {
        dbId: selectedDB,
        correos: emails.split(",").map(email => email.trim()), // Convertir en array
      });

      setMessage(response.data.mensaje);
    } catch (error) {
      setMessage("Error al generar el informe.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Generar Informe</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Seleccionar Base de Datos:
          <select value={selectedDB} onChange={(e) => setSelectedDB(e.target.value)} required>
            <option value="">Seleccione...</option>
            {databases.map(db => (
              <option key={db.id} value={db.id}>{db.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Correos Destinatarios (separados por coma):
          <input 
            type="text" 
            value={emails} 
            onChange={(e) => setEmails(e.target.value)} 
            required 
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Generando..." : "Generar Informe"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default InformeForm;
