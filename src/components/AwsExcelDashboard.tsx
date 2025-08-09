import React, { useState } from "react";
import AwsExcelUploadModal from "./AwsExcelUploadModal";

const tabs = [
  { label: "Resumen", value: "resumen" },
  { label: "Tendencias", value: "tendencias" },
  { label: "Servicios", value: "servicios" },
  { label: "Análisis IA", value: "analisis" }
];

const AwsExcelDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("resumen");
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Excel AWS</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Cargar Archivo Excel
        </button>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded ${activeTab === tab.value ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Contenido del tab activo */}
      <div className="bg-white rounded-lg shadow p-4 min-h-[300px]">
        {activeTab === "resumen" && (
          <div className="text-gray-700">(Aquí irá el resumen de los datos del Excel)</div>
        )}
        {activeTab === "tendencias" && (
          <div className="text-gray-700">(Aquí irán las gráficas de tendencias)</div>
        )}
        {activeTab === "servicios" && (
          <div className="text-gray-700">(Aquí irán los servicios y sus costos)</div>
        )}
        {activeTab === "analisis" && (
          <div className="text-gray-700">(Aquí irá el análisis con IA)</div>
        )}
      </div>
      <AwsExcelUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={(file) => {
          // Aquí puedes manejar el archivo Excel cargado
          setShowUploadModal(false);
        }}
      />
    </div>
  );
};

export default AwsExcelDashboard; 