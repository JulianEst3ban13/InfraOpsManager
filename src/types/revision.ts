export interface Revision {
    id: number;
    usuario_id: number;
    observaciones: string;
    instancia: string;
    fecha_revision: string;
    DB_USA_SITCA: boolean;
    DB_HG_PGSQL_SAJE_ARM: boolean;
    DB_BR_PGSQL_SANITCO: boolean;
    DB_BR_PGSQL_SAEPLUS_ARM: boolean;
    DB_BR_PGSQL_NWADMIN_ARM: boolean;
    DB_BR_MYSQL_VISITENTRY: boolean;
    DB_BR_MYSQL_TASK: boolean;
    DB_BR_MYSQL_RINGOW: boolean;
    DB_BR_MYSQL_PAGINAS: boolean;
    DB_BR_MYSQL_MOVILMOVE: boolean;
    DB_BR_MYSQL_CORREOS: boolean;
    DB_BR_MYSQL_CONTROLTURNOS: boolean;
    created_at: string;
} 