import React from "react";
import TopNavigation from "./TopNavigation";
import ContentArea from "./ContentArea";

interface MainContentProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  vistaActual: string;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  user: any;
  logout: () => void;
  setVistaActual: (vista: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({
  isSidebarCollapsed,
  toggleSidebar,
  vistaActual,
  darkMode,
  setDarkMode,
  user,
  logout,
  setVistaActual
}) => {
  // Función para manejar el retroceso
  const handleBack = () => {
    setVistaActual("inicio");
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-0' : 'ml-64'}`}>
      <TopNavigation 
        toggleSidebar={toggleSidebar}
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        user={user} 
        logout={logout} 
      />
      
      <ContentArea 
        vistaActual={vistaActual} 
        darkMode={darkMode}
        onBack={handleBack}
        setVistaActual={setVistaActual}
      />
    </div>
  );
};

export default MainContent;