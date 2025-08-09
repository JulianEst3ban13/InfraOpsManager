import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface AwsExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File) => void;
}

const AwsExcelUploadModal: React.FC<AwsExcelUploadModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    setError(null);
    setSuccess(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!file) {
      setError("Por favor selecciona un archivo Excel.");
      return;
    }
    if (!file.name.endsWith(".xls") && !file.name.endsWith(".xlsx")) {
      setError("El archivo debe ser formato .xls o .xlsx");
      return;
    }
    setIsSubmitting(true);
    try {
      onSubmit(file);
      setSuccess("Archivo cargado correctamente.");
      setFile(null);
    } catch (err) {
      setError("Error al cargar el archivo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Cargar Archivo Excel de Costos AWS</h2>
        <form onSubmit={handleSubmit}>
          <div
            className={`border-2 ${dragActive ? 'border-indigo-600' : 'border-gray-300'} border-dashed rounded-lg flex flex-col items-center justify-center p-8 cursor-pointer transition-colors mb-4`}
            onClick={handleAreaClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{ minHeight: 100 }}
          >
            <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-gray-600">Cargar archivo Excel</span>
            <input
              type="file"
              accept=".xls,.xlsx"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {file && (
            <div className="mb-2 text-center text-sm text-gray-700">Archivo seleccionado: <span className="font-semibold">{file.name}</span></div>
          )}
          {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
          {success && <div className="mb-4 text-green-500 text-center">{success}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 w-full"
            >
              {isSubmitting ? "Cargando..." : "Cargar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AwsExcelUploadModal; 