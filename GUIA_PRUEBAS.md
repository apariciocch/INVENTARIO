# 🧪 Guía de Pruebas del Sistema de Inventario

## Modo de Ejecutar Pruebas

### Desde la Interfaz Web

1. **Abre la aplicación web** (deploy del Google Apps Script)
2. Ve a la pestaña **Configuración**
3. Haz clic en el botón **"🧪 Ejecutar Pruebas"**
4. Confirma en el mensaje de confirmación
5. Espera a que complete (toma 5-10 segundos)
6. Verás los resultados de todas las pruebas

### Desde Google Apps Script

1. Abre Google Apps Script (Extensions → Apps Script)
2. En la consola, ejecuta:
   ```javascript
   ejecutarTodasLasPruebas()
   ```
3. Revisa los logs en Tools → Execution logs

---

## 📋 Qué Prueban

### 1. **Inicializar Sistema** ✓
- Crea todas las hojas necesarias
- Configura cabeceras
- Formatos de número y fecha

### 2. **Registrar Producto** ✓
- Crea producto TEST001
- Valida campos obligatorios
- Stock inicia en 0

### 3. **Ingreso (100 unidades)** ✓
- Stock: 0 → 100
- Suma correctamente
- Registra movimiento

### 4. **Salida (30 unidades)** ✓
- Stock: 100 → 70
- Valida stock disponible
- Resta correctamente

### 5. **Ajuste Positivo (+5)** ✓
- Stock: 70 → 75
- Suma sin validación
- Registra como ajuste

### 6. **Ajuste Negativo (-10)** ✓
- Stock: 75 → 65
- Valida stock antes de restar
- Registra como ajuste

### 7. **Validación de Stock** ✓
- Intenta retirar 1000 unidades
- Debe RECHAZAR con error
- Mensaje: "Stock insuficiente"

### 8. **Validación de Integridad** ✓
- Verifica estructura
- Detecta errores
- Genera advertencias si es necesario

### 9. **Historial de Movimientos** ✓
- Obtiene movimientos del último mes
- Debe mostrar 6 movimientos (todos los de la prueba)
- Verifica que se registren fechas y tipos

### 10. **Estadísticas** ✓
- Total de productos
- Stock total del inventario
- Productos sin stock
- Productos con stock bajo

---

## ✅ Resultados Esperados

| Prueba | Esperado | Validación |
|--------|----------|-----------|
| Sistema inicializado | ✓ | OK |
| Producto registrado | TEST001 | OK |
| Ingreso 100 | Stock = 100 | ✓ SUMA |
| Salida 30 | Stock = 70 | ✓ RESTA |
| Ajuste +5 | Stock = 75 | ✓ SUMA |
| Ajuste -10 | Stock = 65 | ✓ RESTA |
| Validación stock | Stock insuficiente | ✓ ERROR |
| Integridad | Sin errores | ✓ OK |
| Historial | 6 movimientos | ✓ REGISTRADOS |
| Estadísticas | Datos consistentes | ✓ OK |

---

## 📊 Verificaciones Adicionales

Después de las pruebas, puedes verificar:

### En Google Sheet
1. Pestaña **Productos**
   - Fila con TEST001
   - Columna 7 (Stock Actual) = 65

2. Pestaña **Movimientos**
   - 6 filas con movimientos de TEST001
   - Tipos: INGRESO, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO
   - Stock Resultante: 100, 70, 75, 65, error, 65

3. Pestaña **Auditoría**
   - Registros de cada acción
   - Usuario del sistema
   - Timestamps

### En la Interfaz
1. **Dashboard**
   - Total Productos: +1
   - Total Stock: +65

2. **Inventario**
   - TEST001 visible
   - Stock Actual: 65

3. **Historial**
   - 6 movimientos listados
   - Fechas de hoy
   - Tipos correctos

---

## 🧹 Limpiar Después de Pruebas

Después de verificar todo funciona, puedes limpiar:

1. En Configuración → **Limpiar Datos de Prueba**
2. O manual: elimina filas con "TEST" en el código

---

## 🔧 Solución de Problemas

### "Error: Stock insuficiente" inesperado
- Verifica que la 7ª columna (Stock Actual) tenga valores
- Ejecuta: Configuración → Migrar Datos Antiguos

### Pruebas no se ejecutan
- Actualiza la página (F5)
- Verifica que el Google Sheet ID sea correcto
- Mira la consola de desarrollador (F12 → Console)

### Stock muestra 0 en todas partes
- Ejecuta: Configuración → Sincronizar Stock
- Luego: Configuración → Validar Integridad

### Falta historial de movimientos
- Verifica que la pestaña "Movimientos" exista
- Ejecuta Validar Integridad para diagnosticar

---

## 📈 Interpretación de Resultados

```
✓ Exitosas: 10/10 = TODO FUNCIONA PERFECTAMENTE
❌ Fallidas: 0/10

✓ Exitosas: 9/10 = Revisar la fallida
❌ Fallidas: 1/10
```

Si tienes **10/10 exitosas**, el sistema está 100% funcional.

---

## 📝 Notas

- Las pruebas son **no destructivas** (no borran datos existentes)
- Solo afectan datos con código "TEST"
- Se pueden ejecutar múltiples veces
- Los datos de prueba se limpian manualmente si las dejas

---

**¿Preguntas?** Revisa la auditoría del sistema para ver qué sucedió en cada paso.
