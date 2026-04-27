# Sistema de Control de Inventario - Versión Optimizada

## 📋 Descripción
Sistema web de control de inventario integrado con Google Sheets que permite gestionar productos, movimientos de stock, reportes y análisis de inventario en tiempo real.

## ⚠️ CAMBIOS IMPORTANTES (v2.0)

### Nuevas Cabeceras en Google Sheets
**Tabla "Productos"** - Columna 7 agregada:
- **Stock Actual**: Caché del stock actual (se actualiza automáticamente)

Esta columna optimiza el rendimiento del sistema de forma dramática.

### 🔴 IMPORTANTE PARA USUARIOS CON DATOS ANTIGUOS

Si tienes productos pero la columna 7 está vacía:
1. Ve a **Configuración → Validar Integridad**
2. Sistema alertará si faltan datos
3. Ve a **Configuración → Migrar Datos Antiguos**
4. Se llenará la columna 7 con los stocks desde el historial

### ✅ Validaciones de Flujo (PROBADAS)
- ✓ **Ingreso**: Suma stock correctamente
- ✓ **Salida**: Valida stock suficiente
- ✓ **Ajustes**: Funcionan bidireccionales
- ✓ **Compatibilidad**: Funciona con datos antiguos
- ✓ **Caché**: Se actualiza en cada movimiento
- ✓ **Fallback**: Si caché falta, calcula desde historial

## ✨ Características Principales

### 1. Dashboard
- 📊 Vista general del inventario
- 📈 Estadísticas de stock (total, bajo, sin stock)
- 📅 Movimientos del último mes
- ⚠️ Alertas de productos críticos

### 2. Gestión de Productos
- ✅ Registrar nuevos productos
- ✏️ Editar productos existentes
- 🗑️ Eliminar productos sin movimientos
- 🔍 Búsqueda avanzada en tiempo real

### 3. Movimientos de Inventario
- 📥 Registrar ingresos
- 📤 Registrar salidas
- ⚙️ Ajustes positivos y negativos
- 📝 Observaciones personalizadas
- ✓ Validación automática de stock

### 4. Reportes y Análisis
- 📋 Historial de movimientos con filtros
- 🎯 Reportes de stock por período
- 📊 Exportar datos a CSV
- 📈 Estadísticas por grupo/categoría

### 5. Funcionalidades de Administración
- 🔄 Sincronizar stock (recalcular desde movimientos)
- ✔️ Validar integridad del sistema
- 🔧 Inicializar sistema
- 📝 Auditoría de acciones

## 🚀 Mejoras de Performance

### Caché de Stock
- **Antes**: Calcular stock = recorrer todos los movimientos (O(n*m))
- **Ahora**: Leer valor en caché (O(1))
- **Mejora**: 100-1000x más rápido en sistemas grandes

### Optimizaciones
- Búsquedas más veloces
- Dashboards cargan instantáneamente
- Menos consumo de cuota de API de Google

## 📊 Estructura de Datos

### Tabla: Productos
| Columna | Nombre | Tipo | Descripción |
|---------|--------|------|-------------|
| 1 | Código | Texto | ID único del producto |
| 2 | Nombre | Texto | Nombre descriptivo |
| 3 | Unidad | Texto | Unidad de medida |
| 4 | Grupo | Texto | Categoría del producto |
| 5 | Stock Mínimo | Número | Nivel de alerta |
| 6 | Fecha Creación | Fecha | Cuándo se registró |
| 7 | Stock Actual | Número | **CACHÉ - se actualiza automáticamente** |

### Tabla: Movimientos
| Columna | Nombre | Descripción |
|---------|--------|-------------|
| 1 | Código | Del producto |
| 2 | Fecha | Del movimiento |
| 3 | Tipo | INGRESO/SALIDA/AJUSTE_POSITIVO/AJUSTE_NEGATIVO |
| 4 | Cantidad | Unidades movidas |
| 5 | Usuario | Quién registró |
| 6 | Timestamp | Cuándo se registró |
| 7 | Observaciones | Notas adicionales |
| 8 | Stock Resultante | Stock después del movimiento |

### Tablas Adicionales
- **Unidades**: Listado de unidades de medida
- **Grupos**: Categorías de productos
- **Auditoría**: Registro de todas las acciones (se crea automáticamente)

## 🔧 Funciones Disponibles

### Backend (Google Apps Script)

#### Productos
- `registrarProducto(producto)` - Crear producto
- `editarProducto(codigo, actualizaciones)` - Editar producto
- `eliminarProducto(codigo)` - Eliminar producto
- `obtenerProductoDetallado(codigo)` - Info completa + historial
- `buscarProducto(texto)` - Búsqueda flexible
- `buscarProductoPorCodigo(codigo)` - Búsqueda por código
- `obtenerStock()` - Listado de stock actual

#### Movimientos
- `registrarMovimiento(mov)` - Registrar entrada/salida
- `obtenerHistorial(filtros)` - Historial con filtros
- `obtenerHistorialDetallado(codigo)` - Solo para un producto

#### Análisis
- `obtenerResumen()` - Estadísticas principales
- `obtenerEstadisticas()` - Estadísticas detalladas
- `generarReporteStockBajo()` - Productos con baja stock
- `exportarStockCSV()` - Exportar a CSV

#### Mantenimiento
- `sincronizarStockDesdeMovimientos()` - Recalcular stock desde movimientos
- `validarIntegridad()` - Detectar inconsistencias
- `inicializarHojas()` - Crear/configurar hojas
- `registrarAuditoria()` - Logging de acciones

## 💻 Instalación

1. **Crear Google Sheet** con nombre: "Sistema Inventario"
2. **Copiar ID del Sheet** a la constante `SPREADSHEET_ID` en Código.gs
3. **Agregar archivos**:
   - `Código.gs` → Google Apps Script
   - `index.html` → HTML del proyecto
4. **Deploy** → Deploy as Web App
   - Execute as: Tu cuenta
   - Access: Anyone
5. **Abrir URL** del deploy

## 🎯 Flujo Típico de Uso

### Primer Uso
1. Ir a **Configuración** → **Inicializar Sistema**
2. Sistema crea todas las hojas necesarias

### Operación Normal
1. **Registrar Productos** en "Nuevo producto"
2. **Registrar Movimientos** (compras, ventas, etc.)
3. **Consultar Stock** en "Inventario"
4. **Revisar Reportes** en "Reportes y Análisis"

### Mantenimiento
- Si hay inconsistencias: **Sincronizar Stock**
- Si hay dudas: **Validar Integridad**

## 📚 Tipos de Movimientos

- **INGRESO**: Compra o entrada de producto
- **SALIDA**: Venta o retiro de producto
- **AJUSTE_POSITIVO**: Corrección de error (stock faltante encontrado)
- **AJUSTE_NEGATIVO**: Corrección de error (stock extra no registrado)

## 🔐 Notas de Seguridad

- El sistema registra todos los cambios en auditoría
- No se pueden eliminar productos con movimientos
- Validación de stock insuficiente en salidas
- Códigos de producto no se pueden duplicar

## 🆘 Solución de Problemas

### El stock no coincide con mis registros
→ Ve a **Configuración** → **Sincronizar Stock**

### Recibí error "Stock insuficiente"
→ Verifica el stock actual en "Inventario"

### Un producto desapareció
→ Usa "Buscar" para localizarlo
→ Revisa **Auditoría** para historial

### El producto tiene movimientos pero necesito eliminarlo
→ Sincroniza stock y contacta administrador

## 📞 Soporte
Para issues o mejoras, revisa la auditoría del sistema y valida integridad.