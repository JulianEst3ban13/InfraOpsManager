import React, { useState } from 'react';
import { FileInput } from 'lucide-react';

interface SqlUploadButtonProps {
  onQueryLoaded: (query: string) => void;
}

interface FileUploadStatus {
  loading: boolean;
  error: string | null;
  success: boolean;
  fileName: string | null;
  fileSize: string | null;
}

const SqlUploadButton: React.FC<SqlUploadButtonProps> = ({ onQueryLoaded }) => {
  const [fileUploadStatus, setFileUploadStatus] = useState<FileUploadStatus>({
    loading: false,
    error: null,
    success: false,
    fileName: null,
    fileSize: null
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño del archivo (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setFileUploadStatus({
        loading: false,
        error: 'El archivo es demasiado grande (máximo 5MB)',
        success: false,
        fileName: null,
        fileSize: null
      });
      return;
    }

    // Validar extensión del archivo
    const validExtensions = ['.sql', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      setFileUploadStatus({
        loading: false,
        error: 'Formato de archivo no válido. Solo se permiten .sql y .txt',
        success: false,
        fileName: null,
        fileSize: null
      });
      return;
    }

    setFileUploadStatus({
      loading: true,
      error: null,
      success: false,
      fileName: file.name,
      fileSize: formatFileSize(file.size)
    });

    try {
      const content = await readFileContent(file);
      
      // Validar contenido mínimo (al menos una palabra clave SQL)
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
      const hasSQLContent = sqlKeywords.some(keyword => 
        content.toUpperCase().includes(keyword)
      );
      
      if (!hasSQLContent) {
        setFileUploadStatus({
          loading: false,
          error: 'El archivo no parece contener consultas SQL válidas',
          success: false,
          fileName: null,
          fileSize: null
        });
        return;
      }

      onQueryLoaded(content);
      setFileUploadStatus({
        loading: false,
        error: null,
        success: true,
        fileName: file.name,
        fileSize: formatFileSize(file.size)
      });

      // Ocultar el mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setFileUploadStatus(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      console.error('Error reading file:', error);
      setFileUploadStatus({
        loading: false,
        error: 'Error al leer el archivo',
        success: false,
        fileName: null,
        fileSize: null
      });
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const input = document.getElementById('sql-upload-input') as HTMLInputElement;
    if (input) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative">
      <label
        htmlFor="sql-upload-input"
        className="flex items-center bg-gray-200 px-3 py-1 rounded cursor-pointer hover:bg-gray-300"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <FileInput size={16} className="mr-1" />
        Cargar SQL
        <input
          id="sql-upload-input"
          type="file"
          accept=".sql,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>

      {fileUploadStatus.loading && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-blue-100 text-blue-800 p-2 rounded shadow-lg z-50 text-sm">
          Cargando {fileUploadStatus.fileName}...
        </div>
      )}

      {fileUploadStatus.error && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-red-100 text-red-800 p-2 rounded shadow-lg z-50 text-sm">
          Error: {fileUploadStatus.error}
        </div>
      )}

      {fileUploadStatus.success && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-green-100 text-green-800 p-2 rounded shadow-lg z-50 text-sm">
          Archivo {fileUploadStatus.fileName} cargado correctamente ({fileUploadStatus.fileSize})
        </div>
      )}
    </div>
  );
};

export default SqlUploadButton; 