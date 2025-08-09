import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Dashboard from "./components/Dashboard";
import ConexionBD from "./components/ConexionBD";
import ToolQuery from "./components/ToolQuery";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import config from "./config/config";
import { Toaster, toast } from "react-hot-toast";
import { CheckCircle2, ArrowRight } from "lucide-react";

function AppContent() {
  const navigate = useNavigate();
  
  const goToMantenimientos = useCallback(() => {
    navigate('/dashboard/mantenimientos');
  }, [navigate]);

  useEffect(() => {
    // Configurar la URL de WebSockets según el entorno
    const socketUrl = `${config.apiBaseUrl}:${config.wsPort}`;
    console.log('🔌 Iniciando conexión WebSocket:', {
      url: socketUrl,
      time: new Date().toISOString()
    });
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true
    });

    socket.on('connect', () => {
      console.log("✅ WebSocket conectado:", {
        id: socket.id,
        time: new Date().toISOString()
      });
    });

    socket.on('connect_error', (error) => {
      console.error("❌ Error de conexión WebSocket:", {
        error: error.message,
        time: new Date().toISOString()
      });
    });

    socket.on('disconnect', (reason) => {
      console.log("❌ WebSocket desconectado:", {
        reason,
        wasConnected: socket.connected,
        time: new Date().toISOString()
      });
    });

    socket.on("mantenimiento-completado", (data: { job_id: string }) => {
      console.log("✅ Mantenimiento completado:", {
        ...data,
        time: new Date().toISOString()
      });
      
      // Notificación avanzada con botón para ir a mantenimientos
      toast.success(
        (t) => (
          <div className="w-full">
            <div className="flex items-center">
              <CheckCircle2 className="text-green-600 mr-2" size={24} />
              <div className="flex-1">
                <div className="font-bold">Mantenimiento completado</div>
                <div className="text-sm">ID: {data.job_id}</div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button 
                onClick={() => {
                  toast.dismiss(t.id);
                  goToMantenimientos();
                }}
                className="flex items-center text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Ver mantenimientos
                <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        ),
        {
          duration: 10000,
          style: {
            background: '#f0fff4',
            color: '#276749',
            border: '1px solid #9ae6b4',
            padding: '16px',
            width: '350px',
          },
          icon: null,
        }
      );
    });

    return () => {
      console.log("🔌 Cerrando conexión WebSocket...");
      socket.disconnect();
    };
  }, [goToMantenimientos]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{
        duration: 5000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          style: {
            background: 'green',
            color: 'white',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: 'red',
            color: 'white',
          },
        },
      }} />
      <Routes>
        {/* Ruta raíz - Redirige a /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Rutas protegidas */}
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/conexion-bd" 
          element={
            <ProtectedRoute>
              <ConexionBD onBack={() => window.location.href = '/dashboard'} />
            </ProtectedRoute>
          } 
        />

        {/* Ruta para manejar URLs no encontradas */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <Router>
          <AppContent />
        </Router>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;
