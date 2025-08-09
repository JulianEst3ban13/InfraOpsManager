# AWS Cost Dashboard - Documentación Completa

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Endpoints API](#endpoints-api)
5. [Controladores](#controladores)
6. [Frontend - Componentes React](#frontend---componentes-react)
7. [Funcionalidades Principales](#funcionalidades-principales)
8. [Sistema de Correos](#sistema-de-correos)
9. [Generación de Gráficos](#generación-de-gráficos)
10. [Configuración y Despliegue](#configuración-y-despliegue)

---

## 🎯 Descripción General

El **AWS Cost Dashboard** es un módulo completo para la gestión y visualización de costos diarios de AWS. Permite a los usuarios:

- Registrar costos diarios por mes/año
- Establecer presupuestos mensuales
- Visualizar datos mediante gráficos interactivos
- Enviar reportes por correo electrónico
- Gestionar costos con interfaz intuitiva

### Características Principales
- ✅ Dashboard interactivo con filtros por año/mes
- ✅ Gráficos de líneas, barras y torta
- ✅ Sistema de presupuestos mensuales
- ✅ Envío automático de reportes por correo
- ✅ Gestión CRUD completa de costos
- ✅ Interfaz responsive y moderna
- ✅ Validación de días duplicados con sugerencias automáticas
- ✅ Modal de confirmación personalizado para eliminación
- ✅ Prevención de múltiples envíos con estados de carga
- ✅ Selector de días con indicadores de disponibilidad

---

## 🏗️ Arquitectura del Sistema

### Estructura de Archivos
```
server/
├── controllers/
│   └── awsController.js          # Controlador principal AWS
├── routes/
│   └── aws.js                    # Rutas API AWS
├── database/
│   └── aws.sql                   # Esquema de base de datos
└── services/
    └── emailService.js           # Servicio de correos

src/
├── components/
│   ├── AwsCostDashboard.tsx      # Componente principal
│   ├── AwsBudgetModal.tsx        # Modal de presupuestos
│   └── dashboard/                # Componentes del dashboard
└── utils/
    └── axios.ts                  # Configuración HTTP
```

### Tecnologías Utilizadas
- **Backend**: Node.js, Express, MySQL
- **Frontend**: React, TypeScript, Chart.js
- **Estilos**: Tailwind CSS
- **Correos**: Nodemailer
- **Gráficos**: react-chartjs-2

---

## 🗄️ Base de Datos

### Tabla: `aws_budgets`
```sql
CREATE TABLE aws_budgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    month INT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_year_month (year, month)
);
```

### Tabla: `aws_costs`
```sql
CREATE TABLE aws_costs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    week INT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔌 Endpoints API

### 1. Gestión de Presupuestos

#### `GET /aws/budget`
Obtiene el presupuesto para un año y mes específicos.

**Parámetros:**
- `year` (number): Año del presupuesto
- `month` (number): Mes del presupuesto (0-11)

**Respuesta:**
```json
{
    "id": 1,
    "year": 2025,
    "month": 0,
    "value": 5000.00,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
}
```

#### `POST /aws/budget`
Crea un nuevo presupuesto mensual.

**Body:**
```json
{
    "year": 2025,
    "month": 0,
    "value": 5000.00
}
```

#### `PUT /aws/budget`
Actualiza un presupuesto existente.

**Body:**
```json
{
    "year": 2025,
    "month": 0,
    "value": 6000.00
}
```

#### `DELETE /aws/budget`
Elimina un presupuesto.

**Parámetros:**
- `year` (number): Año del presupuesto
- `month` (number): Mes del presupuesto

### 2. Gestión de Costos Diarios

#### `GET /aws/cost`
Obtiene los costos diarios para un año y mes específicos.

**Parámetros:**
- `year` (number): Año de los costos
- `month` (number): Mes de los costos (0-11)

**Respuesta:**
```json
[
    {
        "id": 1,
        "year": 2025,
        "month": 0,
        "day": 1,
        "week": 1,
        "value": 150.50,
        "created_at": "2025-01-01T00:00:00Z"
    }
]
```

#### `POST /aws/cost`
Crea un nuevo costo diario.

**Body:**
```json
{
    "year": 2025,
    "month": 0,
    "day": 1,
    "week": 1,
    "value": 150.50
}
```

**Respuestas:**

**Éxito (200):**
```json
{
    "success": true,
    "message": "Costo diario creado exitosamente",
    "createdCost": {
        "id": 1,
        "year": 2025,
        "month": 0,
        "day": 1,
        "week": 1,
        "value": 150.50,
        "created_at": "2025-01-01T00:00:00Z"
    }
}
```

**Error - Día Duplicado (409):**
```json
{
    "success": false,
    "error": "DUPLICATE_DAY_COST",
    "message": "Ya existe un costo para el día especificado",
    "existingCost": {
        "id": 1,
        "year": 2025,
        "month": 0,
        "day": 1,
        "week": 1,
        "value": 150.50
    },
    "suggestedDay": 2
}
```

#### `PUT /aws/cost/:id`
Actualiza un costo diario existente.

**Body:**
```json
{
    "value": 200.00
}
```

#### `DELETE /aws/cost/:id`
Elimina un costo diario.

**Respuestas:**

**Éxito (200):**
```json
{
    "success": true,
    "message": "Costo diario eliminado exitosamente",
    "deletedCost": {
        "id": 1,
        "year": 2025,
        "month": 0,
        "day": 1,
        "week": 1,
        "value": 150.50,
        "created_at": "2025-01-01T00:00:00Z"
    }
}
```

**Error - No Encontrado (404):**
```json
{
    "success": false,
    "error": "COST_NOT_FOUND",
    "message": "El costo diario no fue encontrado"
}
```

**Error - Parámetros Inválidos (400):**
```json
{
    "success": false,
    "error": "INVALID_PARAMETERS",
    "message": "ID de costo inválido"
}
```

### 3. Envío de Correos

#### `POST /aws/send-cost-summary`
Envía un resumen de costos por correo electrónico.

**Body:**
```json
{
    "emails": ["usuario@empresa.com"],
    "year": 2025,
    "month": 0,
    "presupuesto": 5000.00,
    "gasto": 3500.00,
    "avance": 70.0,
    "chartImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Correo enviado correctamente"
}
```

---

## 🎮 Controladores

### `awsController.js`

#### Funciones Principales:

##### `getBudget(req, res)`
Obtiene el presupuesto mensual.
```javascript
const getBudget = async (req, res) => {
    const { year, month } = req.query;
    // Consulta a la base de datos
    // Retorna presupuesto o null
};
```

##### `createBudget(req, res)`
Crea un nuevo presupuesto.
```javascript
const createBudget = async (req, res) => {
    const { year, month, value } = req.body;
    // Validación de datos
    // Inserción en base de datos
    // Retorna presupuesto creado
};
```

##### `updateBudget(req, res)`
Actualiza un presupuesto existente.
```javascript
const updateBudget = async (req, res) => {
    const { year, month, value } = req.body;
    // Actualización en base de datos
    // Retorna presupuesto actualizado
};
```

##### `deleteBudget(req, res)`
Elimina un presupuesto.
```javascript
const deleteBudget = async (req, res) => {
    const { year, month } = req.query;
    // Eliminación de base de datos
    // Retorna confirmación
};
```

##### `getCosts(req, res)`
Obtiene costos diarios filtrados.
```javascript
const getCosts = async (req, res) => {
    const { year, month } = req.query;
    // Consulta filtrada por año/mes
    // Retorna array de costos
};
```

##### `createCost(req, res)`
Crea un nuevo costo diario con validación de duplicados.
```javascript
const createCost = async (req, res) => {
    const { year, month, day, week, value } = req.body;
    
    try {
        // Verificar si ya existe un costo para el día especificado
        const existingCost = await db.query(
            'SELECT * FROM aws_costs WHERE year = ? AND month = ? AND day = ?',
            [year, month, day]
        );
        
        if (existingCost.length > 0) {
            // Buscar próximo día disponible
            const suggestedDay = await findNextAvailableDay(year, month, day);
            
            return res.status(409).json({
                success: false,
                error: 'DUPLICATE_DAY_COST',
                message: 'Ya existe un costo para el día especificado',
                existingCost: existingCost[0],
                suggestedDay
            });
        }
        
        // Insertar nuevo costo
        const result = await db.query(
            'INSERT INTO aws_costs (year, month, day, week, value) VALUES (?, ?, ?, ?, ?)',
            [year, month, day, week, value]
        );
        
        const createdCost = {
            id: result.insertId,
            year, month, day, week, value,
            created_at: new Date()
        };
        
        res.status(200).json({
            success: true,
            message: 'Costo diario creado exitosamente',
            createdCost
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }
};
```

##### `updateCost(req, res)`
Actualiza un costo diario.
```javascript
const updateCost = async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;
    // Actualización en base de datos
    // Retorna costo actualizado
};
```

##### `deleteCost(req, res)`
Elimina un costo diario con validación de existencia.
```javascript
const deleteCost = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Verificar si el costo existe antes de eliminar
        const existingCost = await db.query(
            'SELECT * FROM aws_costs WHERE id = ?',
            [id]
        );
        
        if (existingCost.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'COST_NOT_FOUND',
                message: 'El costo diario no fue encontrado'
            });
        }
        
        // Eliminar el costo
        await db.query('DELETE FROM aws_costs WHERE id = ?', [id]);
        
        res.status(200).json({
            success: true,
            message: 'Costo diario eliminado exitosamente',
            deletedCost: existingCost[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }
};
```

##### `sendCostSummaryEmail(req, res)`
Envía resumen por correo.
```javascript
const sendCostSummaryEmail = async (req, res) => {
    const { emails, year, month, presupuesto, gasto, avance, chartImage } = req.body;
    // Validación de datos
    // Generación de HTML del correo
    // Envío mediante Nodemailer
    // Retorna resultado del envío
};
```

---

## 🎨 Frontend - Componentes React

### `AwsCostDashboard.tsx`

#### Estado Principal:
```typescript
interface AwsCostDashboardState {
    // Filtros
    filtroAnio: number;
    filtroMes: number;
    
    // Datos
    costos: CostoDiario[];
    presupuestos: Presupuesto[];
    diasOcupados: number[];
    
    // Modales
    showBudgetModal: boolean;
    showAddCostModal: boolean;
    showEmailModal: boolean;
    showDeleteCostModal: boolean;
    
    // Estados de carga
    guardandoCosto: boolean;
    editandoCosto: boolean;
    eliminandoCosto: boolean;
    editandoPresupuesto: boolean;
    
    // Gráficos
    chartType: 'line' | 'bar' | 'pie';
    chartFullScreen: boolean;
    
    // Correos
    otrosCorreos: string;
    periodo: 'actual' | 'rango';
    
    // Confirmación de eliminación
    costToDelete: CostoDiario | null;
}
```

#### Funciones Principales:

##### `handleAgregarCosto(e: React.FormEvent)`
Agrega un nuevo costo diario con validación de duplicados y prevención de múltiples envíos.
```typescript
const handleAgregarCosto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (guardandoCosto) return;
    
    // Validar que el día no esté ocupado
    if (diasOcupados.includes(formDia)) {
        toast.error(`El día ${formDia} ya tiene un costo registrado. Por favor seleccione otro día.`);
        return;
    }
    
    setGuardandoCosto(true);
    
    try {
        const response = await axiosInstance.post("/aws/cost", {
            year: formAnio,
            month: formMes,
            day: formDia,
            week: semana,
            value: Number(formValor)
        });
        
        if (response.data.success) {
            // Actualizar estado y mostrar confirmación
            setShowAddCostModal(false);
            setFormValor("");
            setFormDia(1);
            
            // Refrescar datos
            const costRes = await axiosInstance.get("/aws/cost", {
                params: { year: filtroAnio, month: filtroMes }
            });
            setCostos(costRes.data || []);
            
            // Mostrar toast con información del costo creado
            const createdCost = response.data.createdCost;
            toast.success(`Costo de $${createdCost.value.toLocaleString()} agregado para el día ${createdCost.day} de ${meses[createdCost.month]} ${createdCost.year}`);
        }
    } catch (err: any) {
        // Manejar error de día duplicado específicamente
        if (err.response?.status === 409 && err.response?.data?.error === 'DUPLICATE_DAY_COST') {
            const errorData = err.response.data;
            const existingCost = errorData.existingCost;
            const suggestedDay = errorData.suggestedDay;
            
            toast.error(
                `Ya existe un costo de $${existingCost.value.toLocaleString()} para el día ${existingCost.day} de ${meses[existingCost.month]} ${existingCost.year}. ` +
                `Sugerencia: Use el día ${suggestedDay} o edite el costo existente.`,
                { duration: 6000 }
            );
            
            // Actualizar el día sugerido en el formulario
            if (suggestedDay <= 31) {
                setFormDia(suggestedDay);
            }
        } else {
            toast.error("Error al guardar el costo diario: " + (err.response?.data?.message || err.message || "Error desconocido"));
        }
    } finally {
        setGuardandoCosto(false);
    }
};
```

##### `handleAgregarPresupuesto(data: Presupuesto)`
Agrega un nuevo presupuesto.
```typescript
const handleAgregarPresupuesto = async (data: Presupuesto) => {
    // Llamada a API POST /aws/budget
    // Actualización de estado
    // Cierre de modal
};
```

##### `handleConfirmarEliminarCosto(costo: CostoDiario)`
Muestra modal de confirmación para eliminar costo.
```typescript
const handleConfirmarEliminarCosto = (costo: CostoDiario) => {
    setCostToDelete(costo);
    setShowDeleteCostModal(true);
};
```

##### `handleEliminarCosto()`
Elimina un costo diario con confirmación y estados de carga.
```typescript
const handleEliminarCosto = async () => {
    if (!costToDelete) return;
    
    // Prevenir múltiples envíos
    if (eliminandoCosto) return;
    
    setEliminandoCosto(true);
    
    try {
        const response = await axiosInstance.delete(`/aws/cost/${costToDelete.id}`);
        
        if (response.data.success) {
            // Refrescar datos
            const costRes = await axiosInstance.get("/aws/cost", {
                params: { year: filtroAnio, month: filtroMes }
            });
            setCostos(costRes.data || []);
            
            // Cerrar modal y limpiar estado
            setShowDeleteCostModal(false);
            setCostToDelete(null);
            
            // Mostrar toast con información del costo eliminado
            const deletedCost = response.data.deletedCost;
            toast.success(`Costo de $${deletedCost.value.toLocaleString()} eliminado del día ${deletedCost.day} de ${meses[deletedCost.month]} ${deletedCost.year}`);
        }
    } catch (err: any) {
        if (err.response?.status === 404) {
            toast.error("El costo diario no fue encontrado. Puede que ya haya sido eliminado.");
        } else if (err.response?.status === 400) {
            toast.error("Error en la solicitud: " + (err.response.data.message || "Parámetros inválidos"));
        } else {
            toast.error("Error al eliminar el costo diario: " + (err.response?.data?.message || err.message || "Error desconocido"));
        }
    } finally {
        setEliminandoCosto(false);
    }
};
```

##### `actualizarDiasOcupados()`
Actualiza la lista de días ocupados y sugiere días alternativos.
```typescript
const actualizarDiasOcupados = () => {
    const diasConCostos = costos.map(c => c.day);
    setDiasOcupados(diasConCostos);
    
    // Si el día actual está ocupado, sugerir el siguiente disponible
    if (diasConCostos.includes(formDia)) {
        const proximoDiaDisponible = encontrarProximoDiaDisponible(formDia, diasConCostos);
        if (proximoDiaDisponible) {
            setFormDia(proximoDiaDisponible);
            toast.success(`Día ${formDia} ocupado. Cambiado automáticamente al día ${proximoDiaDisponible}.`);
        }
    }
};
```

##### `encontrarProximoDiaDisponible(diaActual: number, diasOcupados: number[])`
Encuentra el próximo día disponible para agregar un costo.
```typescript
const encontrarProximoDiaDisponible = (diaActual: number, diasOcupados: number[]): number | null => {
    for (let dia = diaActual + 1; dia <= 31; dia++) {
        if (!diasOcupados.includes(dia)) {
            return dia;
        }
    }
    // Si no hay días disponibles después, buscar antes
    for (let dia = diaActual - 1; dia >= 1; dia--) {
        if (!diasOcupados.includes(dia)) {
            return dia;
        }
    }
    return null; // No hay días disponibles
};
```

##### `getChartBase64(chartRef: any)`
Genera imagen base64 del gráfico.
```typescript
const getChartBase64 = async (chartRef: any) => {
    // Forzar renderizado del gráfico
    // Obtener canvas
    // Convertir a base64
    // Retornar string base64
};
```

##### `handleEnviarCorreo()`
Envía resumen por correo.
```typescript
const handleEnviarCorreo = async () => {
    // Generar imagen del gráfico
    // Validar datos
    // Llamada a API POST /aws/send-cost-summary
    // Mostrar notificación
};
```

### `AwsBudgetModal.tsx`

Modal para crear/editar presupuestos.

#### Props:
```typescript
interface AwsBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Presupuesto) => void;
}
```

---

## ⚙️ Funcionalidades Principales

### 1. Dashboard Interactivo

#### Filtros de Navegación:
- **Selector de Año**: Permite elegir entre años disponibles
- **Selector de Mes**: Permite elegir mes específico
- **Botón Actualizar**: Refresca datos manualmente

#### Resumen de Costos:
- **Presupuesto Mensual**: Muestra presupuesto establecido
- **Gasto Acumulado**: Suma total de costos del mes
- **Porcentaje de Avance**: Calculado automáticamente
- **Indicador de Excedido**: Alerta visual si se supera presupuesto

### 2. Gestión de Costos

#### Agregar Costo Diario:
- **Formulario Completo**: Año, mes, día, valor
- **Cálculo Automático**: Semana calculada automáticamente
- **Validación**: Campos requeridos y valores numéricos
- **Prevención de Duplicados**: Validación frontend y backend de días ocupados
- **Sugerencias Automáticas**: Sugiere próximo día disponible si el seleccionado está ocupado
- **Estados de Carga**: Botón deshabilitado durante el guardado para prevenir múltiples envíos
- **Indicadores Visuales**: Días no disponibles marcados en rojo con "(No disponible)"

#### Editar Costo:
- **Modal de Edición**: Permite modificar valor existente
- **Validación en Tiempo Real**: Verifica datos antes de guardar

#### Eliminar Costo:
- **Modal de Confirmación**: Diálogo personalizado con información detallada del costo a eliminar
- **Información Detallada**: Muestra fecha, semana y valor del costo antes de eliminar
- **Estados de Carga**: Botón deshabilitado durante la eliminación
- **Manejo de Errores**: Diferentes mensajes según el tipo de error (404, 400, 500)
- **Actualización Automática**: Lista se actualiza inmediatamente después de la eliminación
- **Feedback Visual**: Toast con información del costo eliminado

### 3. Gestión de Presupuestos

#### Crear Presupuesto:
- **Modal Dedicado**: Interfaz específica para presupuestos
- **Validación**: Asegura valores positivos
- **Unicidad**: Un presupuesto por mes/año

#### Editar Presupuesto:
- **Acceso Directo**: Botones de edición en resumen
- **Actualización Inmediata**: Cambios reflejados al instante

#### Eliminar Presupuesto:
- **Confirmación**: Previene eliminaciones accidentales
- **Limpieza**: Elimina presupuesto de la base de datos

---

## 📧 Sistema de Correos

### Configuración de Nodemailer

#### Configuración en `emailService.js`:
```javascript
const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
```

### Plantilla de Correo

#### Estructura HTML:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Resumen de Costos AWS</title>
</head>
<body>
    <!-- Header con logo NW Group -->
    <div style="background: #25282e; padding: 20px; text-align: center;">
        <img src="data:image/png;base64,..." alt="NW Group Logo">
        <h1 style="color: white;">Resumen de Costos AWS</h1>
        <p style="color: white;">{mes} {año}</p>
    </div>
    
    <!-- Contenido del reporte -->
    <div style="padding: 20px;">
        <!-- Métricas principales -->
        <!-- Gráfico embebido -->
        <!-- Detalles de costos -->
    </div>
</body>
</html>
```

### Funcionalidades del Correo

#### Destinatarios Automáticos:
```javascript
const correosFijos = [
    "andresf@gruponw.com",
    "mauriciol@gruponw.com", 
    "coordinacionventas@netwoods.net",
    "infraestructura@gruponw.com"
];
```

#### Periodos de Envío:
- **Mes Actual**: Envía resumen del mes seleccionado
- **Periodo Personalizado**: (Funcionalidad futura)

#### Contenido del Correo:
- **Logo NW Group**: Imagen base64 embebida
- **Métricas Principales**: Presupuesto, gasto, avance
- **Gráfico de Costos**: Imagen base64 del gráfico
- **Tabla de Costos**: Detalle día por día
- **Alertas**: Indicadores de excedido

---

## 📊 Generación de Gráficos

### Tecnologías Utilizadas

#### Chart.js + react-chartjs-2:
```javascript
import { Line, Bar, Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement
} from "chart.js";
```

### Tipos de Gráficos

#### 1. Gráfico de Líneas
```javascript
const chartData = {
    labels: dias,
    datasets: [{
        label: "Costo Diario (USD)",
        data: valores,
        borderColor: "#6366f1",
        backgroundColor: "#6366f1",
        tension: 0.2
    }]
};
```

#### 2. Gráfico de Barras
```javascript
const barData = {
    labels: dias,
    datasets: [{
        label: "Costo Diario (USD)",
        data: valores,
        backgroundColor: "#6366f1"
    }]
};
```

#### 3. Gráfico de Torta
```javascript
const pieData = {
    labels: dias.map(d => `Día ${d}`),
    datasets: [{
        data: valores,
        backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', ...]
    }]
};
```

### Generación de Imágenes Base64

#### Proceso de Exportación:
```javascript
const getChartBase64 = async (chartRef: any) => {
    return new Promise<string>((resolve) => {
        // Forzar renderizado
        forceChartRender(chartRef);
        
        setTimeout(() => {
            // Obtener canvas
            const canvas = chartRef.current.canvas;
            
            // Convertir a base64
            const base64 = canvas.toDataURL('image/png', 1.0);
            resolve(base64);
        }, 1000);
    });
};
```

#### Gráfico Oculto para Exportación:
```jsx
<div style={{ 
    position: 'absolute', 
    left: '-9999px', 
    visibility: 'hidden',
    width: 800, 
    height: 400 
}}>
    <Line
        ref={exportLineChartRef}
        data={chartData}
        options={{
            responsive: false,
            maintainAspectRatio: false,
            animation: false
        }}
        width={800}
        height={400}
    />
</div>
```

---

## 🚀 Configuración y Despliegue

### Variables de Entorno

#### Backend (`.env`):
```env
# Base de datos
DB_HOST=localhost
DB_USER=usuario
DB_PASSWORD=password
DB_NAME=nombre_db

# SMTP para correos
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=correo@gmail.com
SMTP_PASS=password_app

# Configuración general
PORT=3000
NODE_ENV=production
```

### Instalación de Dependencias

#### Backend:
```bash
npm install express mysql2 nodemailer cors dotenv
```

#### Frontend:
```bash
npm install react-chartjs-2 chart.js axios react-hot-toast lucide-react
```

### Scripts de Despliegue

#### Desarrollo:
```bash
# Backend
npm run dev

# Frontend
npm run dev
```

#### Producción:
```bash
# Backend
npm start

# Frontend
npm run build
```

### Configuración de Base de Datos

#### Ejecutar Migraciones:
```sql
-- Crear tablas AWS
source database/aws.sql;

-- Insertar datos de prueba (opcional)
INSERT INTO aws_budgets (year, month, value) VALUES (2025, 0, 5000.00);
INSERT INTO aws_costs (year, month, day, week, value) VALUES (2025, 0, 1, 1, 150.50);
```

---

## 🔧 Mantenimiento y Troubleshooting

### Problemas Comunes

#### 1. Gráficos no se renderizan:
```javascript
// Solución: Forzar renderizado
const forceChartRender = (chartRef) => {
    if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.update('none');
    }
};
```

#### 2. Correos no se envían:
- Verificar configuración SMTP
- Revisar logs del servidor
- Validar formato de correos destinatarios

#### 3. Base64 truncado:
```javascript
// Solución: Aumentar timeout
setTimeout(() => {
    // Generar base64
}, 1000); // Aumentar si es necesario
```

#### 4. Costos duplicados por día:
```javascript
// Solución: Validación backend implementada
const existingCost = await db.query(
    'SELECT * FROM aws_costs WHERE year = ? AND month = ? AND day = ?',
    [year, month, day]
);
if (existingCost.length > 0) {
    return res.status(409).json({
        success: false,
        error: 'DUPLICATE_DAY_COST',
        message: 'Ya existe un costo para el día especificado'
    });
}
```

#### 5. Múltiples envíos simultáneos:
```javascript
// Solución: Estados de carga implementados
if (guardandoCosto) return; // Prevenir múltiples envíos
setGuardandoCosto(true);
// ... operación
setGuardandoCosto(false);
```

### Logs y Monitoreo

#### Logs del Backend:
```javascript
console.log('📧 Enviando correo a:', emails);
console.log('📊 Generando gráfico...');
console.log('✅ Operación completada');
```

#### Logs del Frontend:
```javascript
console.log('🔄 Actualizando datos...');
console.log('📈 Gráfico renderizado');
console.log('📧 Preparando envío de correo');
```

---

## 📝 Notas de Desarrollo

### Mejores Prácticas Implementadas

1. **Validación de Datos**: Todos los inputs son validados
2. **Manejo de Errores**: Try-catch en todas las operaciones async
3. **Responsive Design**: Interfaz adaptativa para móviles
4. **Accesibilidad**: Controles accesibles por teclado
5. **Performance**: Lazy loading de componentes pesados

### Consideraciones de Seguridad

1. **Validación Backend**: Todas las entradas validadas en servidor
2. **Sanitización**: Datos limpiados antes de procesar
3. **Autenticación**: Endpoints protegidos (implementar según necesidades)
4. **Rate Limiting**: Protección contra spam (implementar según necesidades)
5. **Prevención de Duplicados**: Validación robusta para evitar costos duplicados por día
6. **Estados de Carga**: Prevención de múltiples envíos simultáneos
7. **Manejo de Errores**: Respuestas HTTP apropiadas con códigos de estado específicos

### Escalabilidad

1. **Modularidad**: Componentes reutilizables
2. **Separación de Responsabilidades**: Controladores, servicios, rutas separados
3. **Configuración Externa**: Variables de entorno para configuración
4. **Base de Datos Optimizada**: Índices en campos de búsqueda frecuente

---

## 📞 Soporte y Contacto

Para soporte técnico o consultas sobre el módulo AWS Cost Dashboard:

- **Desarrollador**: Equipo de Desarrollo NW Group
- **Email**: infraestructura@gruponw.com
- **Documentación**: Este archivo y comentarios en código
- **Repositorio**: Control de versiones en Git

---

## 🆕 Últimas Mejoras Implementadas (Enero 2025)

### **Mejora 1: Prevención de Múltiples Envíos**
- **Problema**: Los usuarios podían hacer múltiples clics en "Guardar" creando registros duplicados
- **Solución**: Implementación de estados de carga (`guardandoCosto`, `eliminandoCosto`, etc.)
- **Resultado**: Botones se deshabilitan durante las operaciones, previniendo envíos múltiples

### **Mejora 2: Modal de Confirmación Personalizado**
- **Problema**: El `window.confirm()` nativo era poco informativo
- **Solución**: Modal personalizado con información detallada del costo a eliminar
- **Resultado**: Usuario ve fecha, semana y valor antes de confirmar eliminación

### **Mejora 3: Validación de Días Duplicados**
- **Problema**: Se podían crear costos para días que ya tenían registros
- **Solución**: Validación frontend y backend con sugerencias automáticas
- **Resultado**: 
  - Backend retorna error 409 con información del costo existente
  - Frontend sugiere próximo día disponible automáticamente
  - Selector muestra días no disponibles en rojo

### **Mejora 4: Interfaz de Usuario Mejorada**
- **Problema**: Texto "Días ocupados" era confuso y ocupaba espacio
- **Solución**: Eliminación del texto y cambio de "(Ocupado)" por "(No disponible)"
- **Resultado**: Modal más limpio y terminología más profesional

### **Mejora 5: Manejo de Errores Robusto**
- **Problema**: Errores genéricos sin información útil
- **Solución**: Códigos HTTP específicos y mensajes detallados
- **Resultado**: 
  - Error 409 para días duplicados
  - Error 404 para costos no encontrados
  - Error 400 para parámetros inválidos
  - Toast informativos con sugerencias específicas

### **Beneficios de las Mejoras**
- ✅ **Experiencia de Usuario**: Interfaz más intuitiva y profesional
- ✅ **Prevención de Errores**: Validaciones robustas evitan datos incorrectos
- ✅ **Feedback Claro**: Mensajes informativos guían al usuario
- ✅ **Performance**: Estados de carga previenen operaciones innecesarias
- ✅ **Mantenibilidad**: Código más robusto y fácil de mantener

---

*Última actualización: Enero 2025*
*Versión del módulo: 1.1.0* 