import React from "react";
import ToolQuery from "./ToolQuery";
import ConexionBD from "./ConexionBD";
import ListarMantenimiento from "./ListarMantenimientos";
import EstadoMantenimientos from "./EstadoMantenimientos";
import ReportList from "./ReportList";
import MetricsDashboard from "./MetricsDashboard";
import UserList from "./UserList";
import RevisionBackupList from "./RevisionBackupList";
import OpenVPNDashboard from "./openvpn/OpenVPNDashboard";
import OpenVPNConfig from "./openvpn/OpenVPNConfig";
import OpenVPNLogs from "./openvpn/OpenVPNLogs";
import OpenVPNUsers from "./openvpn/OpenVPNUsers";
import RoleManagement from "./RoleManagement";
import PermissionManagement from "./PermissionManagement";
import AwsCostDashboard from "./AwsCostDashboard";
import AwsExcelDashboard from "./AwsExcelDashboard";
import AwsApmDashboard from "./AwsApmDashboard";
import SessionLogList from "./SessionLogList";

interface ContentAreaProps {
  vistaActual: string;
  darkMode: boolean;
  onBack: () => void;
  setVistaActual: (vista: string) => void;
}

const ContentArea: React.FC<ContentAreaProps> = ({ 
  vistaActual, 
  darkMode,
  onBack,
  setVistaActual
}) => {
  const renderVistaActual = () => {
    const views: Record<string, JSX.Element> = {
      "conexion-bd": <ConexionBD onBack={onBack} />,
      "informes": <ReportList />,
      "crear-mantenimiento": <ListarMantenimiento onBack={onBack} />,
      "estado-mantenimiento": <EstadoMantenimientos />,
      "usuarios": <UserList onEditUser={() => {}} onBackToDashboard={onBack} darkMode={darkMode} />,
      "querytool": <ToolQuery />,
      "revision-aws-backup": <RevisionBackupList onBack={onBack} />,
      "openvpn-dashboard": <OpenVPNDashboard />,
      "openvpn-config": <OpenVPNConfig />,
      "openvpn-logs": <OpenVPNLogs />,
      "openvpn-usuarios": <OpenVPNUsers />,
      "roles": <RoleManagement />,
      "permissions": <PermissionManagement />,
      "inicio": <MetricsDashboard darkMode={darkMode} />,
      "default": <MetricsDashboard darkMode={darkMode} />,
      "aws-cost-dashboard": <AwsCostDashboard />,
      "aws-excel-dashboard": <AwsExcelDashboard />,
      "aws-apm-dashboard": <AwsApmDashboard onBack={onBack} />,
      "logs-sesion": <SessionLogList />
    };

    return views[vistaActual] || views["default"];
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        {renderVistaActual()}
      </div>
    </div>
  );
};

export default ContentArea;