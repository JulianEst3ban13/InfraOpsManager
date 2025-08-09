import React from 'react';
import { Database, FileText, Settings, Home, Users, Activity, MessageSquare, FileJson, FolderOpenDot, Shield, LayoutDashboard, Cog, FileTerminal, LucideIcon, SquareStack, FileKey } from "lucide-react";
import ChatInterface from "./ChatInterface";
import config from "../config/config";
import { useState } from "react";
import { PermissionGuard, AnyPermissionGuard } from "./PermissionGuard";
import { usePermissions } from '../context/PermissionContext';

interface SidebarNavigationProps {
  isCollapsed: boolean;
  vistaActual: string;
  setVistaActual: (vista: string) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  vista?: string;
  action?: () => void;
  isActive?: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  subItems?: SubItem[];
  requiredPermissions?: string[];
  permission?: string;
}

interface SubItem {
  label: string;
  icon?: LucideIcon;
  vista: string;
  permission?: string;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  isCollapsed,
  vistaActual,
  setVistaActual,
  showChat,
  setShowChat
}) => {
  const { permissions } = usePermissions();
  const [openVPNExpanded, setOpenVPNExpanded] = useState(false);
  const [permissionsExpanded, setPermissionsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const navItems: NavItem[] = [
    {
      label: "Inicio",
      icon: Home,
      vista: "inicio"
    },
    {
      label: "OpenVPNAdmin",
      icon: Shield,
      isExpandable: true,
      isExpanded: openVPNExpanded,
      onExpand: () => setOpenVPNExpanded(!openVPNExpanded),
      subItems: [
        {
          label: "Panel de Control",
          icon: LayoutDashboard,
          vista: "openvpn-dashboard",
          permission: "ver_vpn_dashboard"
        },
        {
          label: "Usuarios VPN",
          icon: Users,
          vista: "openvpn-usuarios",
          permission: "ver_vpn_usuarios"
        },
        {
          label: "Configuración VPN",
          icon: Cog,
          vista: "openvpn-config",
          permission: "ver_vpn_config"
        },
        {
          label: "Logs VPN",
          icon: FileTerminal,
          vista: "openvpn-logs",
          permission: "ver_vpn_logs"
        }
      ],
      requiredPermissions: ["ver_vpn_dashboard", "ver_vpn_usuarios", "ver_vpn_config", "ver_vpn_logs"]
    },
    {
      label: "Conexiones BD",
      icon: Database,
      vista: "conexion-bd",
      permission: "ver_conexiones_bd"
    },
    {
      label: "Crear Mantenimiento",
      icon: Settings,
      vista: "crear-mantenimiento",
      permission: "ver_vista_crear_mantenimiento"
    },
    {
      label: "Estado Mantenimientos",
      icon: Activity,
      vista: "estado-mantenimiento",
      permission: "ver_estado_mantenimientos"
    },
    {
      label: "Informes",
      icon: FileText,
      vista: "informes",
      permission: "ver_informes"
    },
    {
      label: "QueryTool",
      icon: FileJson,
      vista: "querytool",
      permission: "ver_query_tool"
    },
    {
      label: "Revisión AWS Backup",
      icon: FolderOpenDot,
      vista: "revision-aws-backup",
      permission: "ver_revisiones_backup"
    },
    {
      label: "Usuarios",
      icon: Users,
      vista: "usuarios",
      permission: "ver_usuarios"
    },
    {
      label: "Gestión de Permisos",
      icon: Shield,
      isExpandable: true,
      isExpanded: permissionsExpanded,
      onExpand: () => setPermissionsExpanded(!permissionsExpanded),
      subItems: [
        {
          label: "Roles",
          icon: SquareStack,
          vista: "roles",
          permission: "ver_roles"
        },
        {
          label: "Permisos",
          icon: FileKey,
          vista: "permissions",
          permission: "ver_permisos"
        },
        {
          label: "Gestión de Logs de Sesión",
          icon: Activity,
          vista: "logs-sesion",
          permission: "ver_sesiones"
        }
      ],
      requiredPermissions: ["ver_roles", "ver_permisos"]
    },
    {
      label: "Costos AWS",
      icon: LayoutDashboard,
      isExpandable: true,
      isExpanded: expandedItems.includes("costos-aws"),
      onExpand: () => {
        setExpandedItems((prev) =>
          prev.includes("costos-aws")
            ? prev.filter((item) => item !== "costos-aws")
            : [...prev, "costos-aws"]
        );
      },
      subItems: [
        {
          label: "Dashboard Costos Diarios",
          icon: Activity,
          vista: "aws-cost-dashboard",
          permission: "ver_costos_aws"
        },
        {
          label: "Dashboard Excel AWS",
          icon: FileText,
          vista: "aws-excel-dashboard",
          permission: "ver_excel_aws"
        }
      ],
      requiredPermissions: ["ver_costos_aws", "ver_excel_aws"]
    },
    {
      label: "AWS APM",
      icon: Activity,
      vista: "aws-apm-dashboard",
      permission: "ver_aws_apm"
    },
    {
      label: "Chat Asistente",
      icon: MessageSquare,
      action: () => setShowChat(!showChat),
      isActive: showChat
    },
  ];

  return (
    <aside className={`fixed top-0 left-0 h-full bg-rose-700/90 text-white w-64 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out z-20 ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}`}>
      <div className="p-5 text-lg font-bold">Panel de Control</div>
      <nav className="flex-1 overflow-y-auto">
        <ul>
          {navItems.map((item) => {
            const navItemContent = (
              <li key={`${item.vista ?? item.label}-${item.action ? 'action' : 'view'}`}>
                <button
                  onClick={() => item.isExpandable ? item.onExpand?.() : (item.action?.() ?? (item.vista && setVistaActual(item.vista)))}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-800 cursor-pointer flex items-center justify-between ${
                    (item.vista === vistaActual && !item.isExpandable) ? 'bg-neutral-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-2" />
                    {item.label}
                  </div>
                  {item.isExpandable && (
                    <span className={`transform transition-transform ${item.isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  )}
                </button>
                {item.isExpandable && item.isExpanded && item.subItems && (
                  <ul className="pl-4">
                    {item.subItems.map((subItem) => {
                      const content = (
                        <li key={subItem.vista}>
                          <button
                            onClick={() => setVistaActual(subItem.vista)}
                            className={`w-full text-left pl-11 pr-4 py-2 hover:bg-neutral-800 cursor-pointer flex items-center ${
                              subItem.vista === vistaActual ? 'bg-neutral-800' : ''
                            }`}
                          >
                            {subItem.icon ? (
                              <subItem.icon className="w-4 h-4 mr-2" />
                            ) : (
                              <span className="w-4 h-4 mr-2" />
                            )}
                            {subItem.label}
                          </button>
                        </li>
                      );
                      if (subItem.permission) {
                        return (
                          <PermissionGuard key={subItem.vista} permission={subItem.permission}>
                            {content}
                          </PermissionGuard>
                        );
                      }
                      return content;
                    })}
                  </ul>
                )}
              </li>
            );
            if (item.requiredPermissions) {
              return (
                <AnyPermissionGuard key={item.label} permissions={item.requiredPermissions}>
                  {navItemContent}
                </AnyPermissionGuard>
              );
            }
            if (item.permission) {
              return (
                <PermissionGuard key={item.label} permission={item.permission}>
                  {navItemContent}
                </PermissionGuard>
              );
            }
            return navItemContent;
          })}
        </ul>
      </nav>

      {showChat && (
        <ChatInterface 
          assistantId="asst_RbkVercWGtbAyvjB3cRrp4q8" 
          apiUrl={`${config.apiBaseUrl}:${config.apiPort}/api/ai/chat`}   
        />
      )}
    </aside>
  );
};

export default SidebarNavigation;