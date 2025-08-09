import React from 'react';
import { FolderTree, Table, Eye, Code, Zap, Hash, ChevronDown } from 'lucide-react';

interface Schema {
  name: string;
  type: string;
}

interface Table {
  schema: string;
  name: string;
  type: string;
}

interface View {
  schema: string;
  name: string;
  type: string;
}

interface Function {
  schema: string;
  name: string;
  type: string;
}

interface Trigger {
  schema: string;
  name: string;
  table: string;
  type: string;
}

interface Sequence {
  schema: string;
  name: string;
  type: string;
}

export interface DatabaseStructure {
  schemas: Schema[];
  tables: Table[];
  views: View[];
  functions: Function[];
  triggers: Trigger[];
  sequences: Sequence[];
}

interface DatabaseStructureTreeProps {
  structure: DatabaseStructure;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onTableContextMenu: (e: React.MouseEvent, schema: string, tableName: string) => void;
  onTableClick: (schema: string, tableName: string) => void;
  dbType: "mysql" | "pgsql" | "sqlserver" | "mongodb";
}

const DatabaseStructureTree: React.FC<DatabaseStructureTreeProps> = ({
  structure,
  expandedSections,
  onToggleSection,
  onTableContextMenu,
  onTableClick,
  dbType
}) => {
  const getIconForType = (type: string) => {
    switch (type) {
      case 'schema':
        return <FolderTree size={16} className="text-yellow-600" />;
      case 'table':
        return <Table size={16} className="text-blue-600" />;
      case 'view':
        return <Eye size={16} className="text-green-600" />;
      case 'function':
        return <Code size={16} className="text-purple-600" />;
      case 'trigger':
        return <Zap size={16} className="text-orange-600" />;
      case 'sequence':
        return <Hash size={16} className="text-pink-600" />;
      default:
        return <FolderTree size={16} />;
    }
  };

  return (
    <div className="h-full">
      <div className="py-2">
        <div className="space-y-1">
          {/* Sección de Schemas */}
          <div className="px-2">
            <div 
              className="font-semibold flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded"
              onClick={() => onToggleSection('schemas')}
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform ${expandedSections.schemas ? 'rotate-0' : '-rotate-90'}`} 
              />
              <FolderTree size={16} /> Schemas
            </div>
            
            {expandedSections.schemas && (
              <div className="ml-4 mt-1">
                {structure.schemas.map((schema: Schema) => (
                  <div key={schema.name} className="py-1">
                    <div className="flex items-center gap-2 font-medium">
                      {getIconForType('schema')} {schema.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de Tablas */}
          <div className="px-2">
            <div 
              className="font-semibold flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded"
              onClick={() => onToggleSection('tables')}
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform ${expandedSections.tables ? 'rotate-0' : '-rotate-90'}`} 
              />
              <Table size={16} className="text-blue-600" /> Tablas
            </div>
            
            {expandedSections.tables && (
              <div className="ml-4">
                {structure.schemas.map((schema: Schema) => (
                  <div key={schema.name} className="py-1">
                    <div className="font-medium text-gray-600 py-1">
                      {schema.name}
                    </div>
                    <div className="space-y-0.5">
                      {structure.tables
                        .filter((table: Table) => table.schema === schema.name)
                        .map((table: Table) => (
                          <div 
                            key={table.name}
                            className="ml-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer p-1.5 rounded"
                            onClick={() => onTableClick(schema.name, table.name)}
                            onContextMenu={(e) => onTableContextMenu(e, schema.name, table.name)}
                          >
                            {getIconForType('table')} {table.name}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de Vistas */}
          <div className="px-2">
            <div 
              className="font-semibold flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded"
              onClick={() => onToggleSection('views')}
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform ${expandedSections.views ? 'rotate-0' : '-rotate-90'}`} 
              />
              <Eye size={16} className="text-green-600" /> Vistas
            </div>
            
            {expandedSections.views && (
              <div className="ml-4">
                {structure.schemas.map((schema: Schema) => (
                  <div key={schema.name} className="py-1">
                    <div className="font-medium text-gray-600 py-1">
                      {schema.name}
                    </div>
                    <div className="space-y-0.5">
                      {structure.views
                        .filter((view: View) => view.schema === schema.name)
                        .map((view: View) => (
                          <div 
                            key={view.name}
                            className="ml-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer p-1.5 rounded"
                            onClick={() => onTableClick(schema.name, view.name)}
                          >
                            {getIconForType('view')} {view.name}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de Funciones */}
          <div className="px-2">
            <div 
              className="font-semibold flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded"
              onClick={() => onToggleSection('functions')}
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform ${expandedSections.functions ? 'rotate-0' : '-rotate-90'}`} 
              />
              <Code size={16} className="text-purple-600" /> Funciones
            </div>
            
            {expandedSections.functions && (
              <div className="ml-4">
                {structure.schemas.map((schema: Schema) => (
                  <div key={schema.name} className="py-1">
                    <div className="font-medium text-gray-600 py-1">
                      {schema.name}
                    </div>
                    <div className="space-y-0.5">
                      {structure.functions
                        .filter((func: Function) => func.schema === schema.name)
                        .map((func: Function) => (
                          <div key={func.name} className="ml-2 flex items-center gap-2 p-1.5">
                            {getIconForType('function')} {func.name}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de Triggers */}
          <div className="px-2">
            <div 
              className="font-semibold flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded"
              onClick={() => onToggleSection('triggers')}
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform ${expandedSections.triggers ? 'rotate-0' : '-rotate-90'}`} 
              />
              <Zap size={16} className="text-orange-600" /> Triggers
            </div>
            
            {expandedSections.triggers && (
              <div className="ml-4">
                {structure.schemas.map((schema: Schema) => (
                  <div key={schema.name} className="py-1">
                    <div className="font-medium text-gray-600 py-1">
                      {schema.name}
                    </div>
                    <div className="space-y-0.5">
                      {structure.triggers
                        .filter((trigger: Trigger) => trigger.schema === schema.name)
                        .map((trigger: Trigger) => (
                          <div key={trigger.name} className="ml-2 flex items-center gap-2 p-1.5">
                            {getIconForType('trigger')} {trigger.name} ({trigger.table})
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de Secuencias (solo para PostgreSQL) */}
          {dbType === 'pgsql' && (
            <div className="px-2">
              <div 
                className="font-semibold flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded"
                onClick={() => onToggleSection('sequences')}
              >
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${expandedSections.sequences ? 'rotate-0' : '-rotate-90'}`} 
                />
                <Hash size={16} className="text-pink-600" /> Secuencias
              </div>
              
              {expandedSections.sequences && (
                <div className="ml-4">
                  {structure.schemas.map((schema: Schema) => (
                    <div key={schema.name} className="py-1">
                      <div className="font-medium text-gray-600 py-1">
                        {schema.name}
                      </div>
                      <div className="space-y-0.5">
                        {structure.sequences
                          .filter((seq: Sequence) => seq.schema === schema.name)
                          .map((seq: Sequence) => (
                            <div key={seq.name} className="ml-2 flex items-center gap-2 p-1.5">
                              {getIconForType('sequence')} {seq.name}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseStructureTree; 