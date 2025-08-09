import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import SidebarNavigation from "./SidebarNavigation";
import MainContent from "./MainContent";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vistaActual, setVistaActual] = useState("inicio");
  const [darkMode, setDarkMode] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <SidebarNavigation 
       isCollapsed={isSidebarCollapsed}
       vistaActual={vistaActual}
       setVistaActual={setVistaActual}
       showChat={showChat}
       setShowChat={setShowChat}
      />
      
      <MainContent 
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setSidebarCollapsed(!isSidebarCollapsed)}
        vistaActual={vistaActual}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        logout={logout}
        setVistaActual={setVistaActual}
      />
    </div>
  );
};

export default Dashboard;