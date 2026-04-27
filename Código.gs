const SPREADSHEET_ID = "126D03op_tJdkWomRLhYr3_TGVapVURw1gMN1RczuUko";
const HOJA_PRODUCTOS = "Productos";
const HOJA_MOVIMIENTOS = "Movimientos";
const HOJA_UNIDADES = "Unidades";
const HOJA_GRUPOS = "Grupos";
const HOJA_AUDITORIA = "Auditoría";

const TIPOS_MOVIMIENTO = {
  INGRESO: "INGRESO",
  SALIDA: "SALIDA", 
  AJUSTE_POSITIVO: "AJUSTE_POSITIVO",
  AJUSTE_NEGATIVO: "AJUSTE_NEGATIVO",
  AJUSTE: "AJUSTE"
};

// Índices de columnas (0-based para arrays, 1-based para sheets)
const COL_PRODUCTOS = {
  CODIGO: 0,
  NOMBRE: 1,
  UNIDAD: 2,
  GRUPO: 3,
  STOCK_MIN: 4,
  FECHA_CREACION: 5,
  STOCK_ACTUAL: 6  // NUEVA COLUMNA PARA CACHÉ
};

const COL_MOVIMIENTOS = {
  CODIGO: 0,
  FECHA: 1,
  TIPO: 2,
  CANTIDAD: 3,
  USUARIO: 4,
  TIMESTAMP: 5,
  OBSERVACIONES: 6,
  STOCK_RESULTANTE: 7
};

function doGet() {
  try {
    return HtmlService.createHtmlOutputFromFile("index")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle("Sistema de Control de Inventario");
  } catch (error) {
    return HtmlService.createHtmlOutput(`
      <div style="padding: 20px; font-family: Arial; text-align: center;">
        <h2 style="color: #dc3545;">Error del Sistema</h2>
        <p>No se pudo cargar la aplicación: ${error.message}</p>
        <button onclick="window.location.reload()">Reintentar</button>
      </div>
    `);
  }
}

function registrarProducto(producto) {
  try {
    if (!producto || !producto.codigo || !producto.nombre) {
      return "Datos del producto incompletos. Código y nombre son obligatorios.";
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!sheet) {
      throw new Error(`La hoja '${HOJA_PRODUCTOS}' no existe. Inicialice el sistema primero.`);
    }
    
    // Verificar y crear cabeceras si es necesario
    if (!sheet.getLastRow()) {
      const cabeceras = ["Código", "Nombre", "Unidad", "Grupo", "Stock Mínimo", "Fecha Creación", "Stock Actual"];
      sheet.getRange(1, 1, 1, 7).setValues([cabeceras]);
      sheet.getRange(1, 1, 1, 7).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    
    const datos = sheet.getDataRange().getValues();
    const codigoNormalizado = producto.codigo.toString().trim().toUpperCase();
    
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][COL_PRODUCTOS.CODIGO] && datos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
        return "Ya existe un producto con este código.";
      }
    }
    
    const nombre = producto.nombre.toString().trim();
    const unidad = producto.unidad || "Unidades";
    const grupo = producto.grupo || "General";
    const stockMin = Math.max(0, parseInt(producto.stockMin) || 0);
    
    if (nombre.length < 2) {
      return "El nombre del producto debe tener al menos 2 caracteres.";
    }
    
    // Agregar producto con stock actual = 0
    sheet.appendRow([
      codigoNormalizado, 
      nombre, 
      unidad, 
      grupo, 
      stockMin,
      new Date(),
      0  // Stock Actual inicial
    ]);
    
    // Registrar auditoría
    registrarAuditoria("CREAR_PRODUCTO", codigoNormalizado, nombre, `Nuevo producto creado: ${nombre}`);
    
    return "Producto registrado correctamente.";
  } catch (error) {
    console.error("Error en registrarProducto:", error);
    return `Error al registrar producto: ${error.message}`;
  }
}

function registrarMovimiento(mov) {
  try {
    if (!mov || !mov.codigo || !mov.fecha || !mov.tipo || !mov.cantidad) {
      return "Datos del movimiento incompletos.";
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet || !movSheet) {
      throw new Error("Las hojas del sistema no existen. Inicialice el sistema primero.");
    }
    
    // Crear cabeceras en movimientos si no existen
    if (!movSheet.getLastRow()) {
      const cabeceras = ["Código", "Fecha", "Tipo", "Cantidad", "Usuario", "Timestamp", "Observaciones", "Stock Resultante"];
      movSheet.getRange(1, 1, 1, 8).setValues([cabeceras]);
      movSheet.getRange(1, 1, 1, 8).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    
    const codigoNormalizado = mov.codigo.toString().trim().toUpperCase();
    const cantidad = parseFloat(mov.cantidad);
    const tipo = mov.tipo.toString().toUpperCase();
    
    if (cantidad <= 0) {
      return "La cantidad debe ser mayor a 0.";
    }
    
    if (!Object.values(TIPOS_MOVIMIENTO).includes(tipo)) {
      return `Tipo de movimiento inválido: ${tipo}`;
    }
    
    // Buscar producto y obtener su fila
    const productos = prodSheet.getDataRange().getValues();
    let productoRow = -1;
    let nombreProducto = "";
    let stockActual = 0;
    let tieneColumnaStock = false;
    
    for (let i = 1; i < productos.length; i++) {
      if (productos[i][COL_PRODUCTOS.CODIGO] && 
          productos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
        productoRow = i + 1;
        nombreProducto = productos[i][COL_PRODUCTOS.NOMBRE];
        
        // IMPORTANTE: Verificar si columna 7 existe y tiene valor
        if (productos[i].length > COL_PRODUCTOS.STOCK_ACTUAL && 
            productos[i][COL_PRODUCTOS.STOCK_ACTUAL] !== undefined && 
            productos[i][COL_PRODUCTOS.STOCK_ACTUAL] !== null &&
            productos[i][COL_PRODUCTOS.STOCK_ACTUAL] !== "") {
          stockActual = parseFloat(productos[i][COL_PRODUCTOS.STOCK_ACTUAL]) || 0;
          tieneColumnaStock = true;
        } else {
          // FALLBACK: Calcular stock desde movimientos si columna 7 no existe
          stockActual = calcularStockDesdeCero(codigoNormalizado);
          tieneColumnaStock = false;
        }
        break;
      }
    }
    
    if (productoRow === -1) {
      return "El producto no existe. Regístrelo primero.";
    }
    
    // DEBUG: Log para verificar
    console.log(`Movimiento: ${codigoNormalizado}, Stock actual: ${stockActual}, Tipo: ${tipo}, Cantidad: ${cantidad}`);
    
    // Validar stock suficiente para salidas
    if ((tipo === TIPOS_MOVIMIENTO.SALIDA || tipo === TIPOS_MOVIMIENTO.AJUSTE_NEGATIVO) && stockActual < cantidad) {
      return `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`;
    }
    
    // Calcular nuevo stock resultante
    let stockResultante = stockActual;
    switch (tipo) {
      case TIPOS_MOVIMIENTO.INGRESO:
      case TIPOS_MOVIMIENTO.AJUSTE_POSITIVO:
        stockResultante = stockActual + cantidad;
        break;
      case TIPOS_MOVIMIENTO.SALIDA:
      case TIPOS_MOVIMIENTO.AJUSTE_NEGATIVO:
        stockResultante = stockActual - cantidad;
        break;
      case TIPOS_MOVIMIENTO.AJUSTE:
        stockResultante = stockActual + cantidad;
        break;
    }
    
    stockResultante = Math.max(0, Math.round(stockResultante * 100) / 100);
    
    // Crear fecha correctamente
    let fechaMovimiento;
    if (typeof mov.fecha === 'string') {
      const partesFecha = mov.fecha.split('-');
      fechaMovimiento = new Date(parseInt(partesFecha[0]), parseInt(partesFecha[1]) - 1, parseInt(partesFecha[2]), 12, 0, 0);
    } else {
      fechaMovimiento = new Date(mov.fecha);
    }
    
    // Registrar movimiento
    movSheet.appendRow([
      codigoNormalizado, 
      fechaMovimiento, 
      tipo, 
      cantidad,
      Session.getActiveUser().getEmail() || "Sistema",
      new Date(),
      mov.observaciones || "",
      stockResultante
    ]);
    
    // ACTUALIZAR STOCK EN CACHÉ de productos
    // Asegurar que la columna existe (agregar si falta)
    if (!tieneColumnaStock) {
      const ultimaColumna = productos[Math.min(1, productos.length - 1)].length;
      if (ultimaColumna <= COL_PRODUCTOS.STOCK_ACTUAL) {
        // Agregar la columna faltante a TODO el rango
        const prodRow = prodSheet.getLastRow();
        for (let i = 2; i <= prodRow; i++) {
          prodSheet.getRange(i, COL_PRODUCTOS.STOCK_ACTUAL + 1).setValue(0);
        }
      }
    }
    
    prodSheet.getRange(productoRow, COL_PRODUCTOS.STOCK_ACTUAL + 1).setValue(stockResultante);
    
    // Registrar auditoría
    registrarAuditoria("MOVIMIENTO", codigoNormalizado, nombreProducto, 
      `${tipo}: ${cantidad} un. Stock: ${stockActual} → ${stockResultante}`);
    
    return "Movimiento registrado correctamente.";
  } catch (error) {
    console.error("Error en registrarMovimiento:", error);
    return `Error al registrar movimiento: ${error.message}`;
  }
}

// NUEVA FUNCIÓN: Calcular stock desde cero (para compatibilidad con datos antiguos)
function calcularStockDesdeCero(codigo) {
  try {
    if (!codigo) return 0;
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!movSheet) {
      return 0;
    }
    
    const movimientos = movSheet.getDataRange().getValues();
    let cantidad = 0;
    const codigoNormalizado = codigo.toString().trim().toUpperCase();
    
    for (let i = 1; i < movimientos.length; i++) {
      const [cod, fecha, tipo, cant] = movimientos[i];
      if (cod && cod.toString().trim().toUpperCase() === codigoNormalizado) {
        const valor = parseFloat(cant) || 0;
        const tipoMovimiento = tipo.toString().toUpperCase();
        
        switch (tipoMovimiento) {
          case TIPOS_MOVIMIENTO.INGRESO:
          case TIPOS_MOVIMIENTO.AJUSTE_POSITIVO:
            cantidad += valor;
            break;
          case TIPOS_MOVIMIENTO.SALIDA:
          case TIPOS_MOVIMIENTO.AJUSTE_NEGATIVO:
            cantidad -= valor;
            break;
          case TIPOS_MOVIMIENTO.AJUSTE:
            cantidad += valor;
            break;
        }
      }
    }
    
    return Math.max(0, Math.round(cantidad * 100) / 100);
  } catch (error) {
    console.error("Error en calcularStockDesdeCero:", error);
    return 0;
  }
}

function buscarProductoPorCodigo(codigo) {
  try {
    if (!codigo || codigo.trim().length < 1) {
      return [];
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!sheet) {
      return [];
    }
    
    const datos = sheet.getDataRange().getValues();
    
    if (datos.length <= 1) {
      return [];
    }
    
    const textoBusqueda = codigo.toString().toUpperCase().trim();
    const encontrados = [];
    
    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      if (fila[0] && fila[0].toString().toUpperCase().startsWith(textoBusqueda)) {
        encontrados.push({
          codigo: fila[0],
          nombre: fila[1],
          unidad: fila[2] || "Unidades",
          grupo: fila[3] || "General"
        });
      }
    }
    
    return encontrados.slice(0, 10);
  } catch (error) {
    console.error("Error en buscarProductoPorCodigo:", error);
    return [];
  }
}

function buscarProducto(texto) {
  try {
    if (!texto || texto.trim().length < 1) {
      return [];
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!sheet) {
      throw new Error(`La hoja '${HOJA_PRODUCTOS}' no existe.`);
    }
    
    const datos = sheet.getDataRange().getValues();
    
    if (datos.length <= 1) {
      return [];
    }
    
    const textoBusqueda = texto.toString().toLowerCase().trim();
    const encontrados = [];
    
    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      if (fila[COL_PRODUCTOS.CODIGO] && (
        fila[COL_PRODUCTOS.CODIGO].toString().toLowerCase().includes(textoBusqueda) ||
        fila[COL_PRODUCTOS.NOMBRE].toString().toLowerCase().includes(textoBusqueda) ||
        (fila[COL_PRODUCTOS.GRUPO] && fila[COL_PRODUCTOS.GRUPO].toString().toLowerCase().includes(textoBusqueda))
      )) {
        // Usar stock del caché (OPTIMIZACIÓN)
        const stockActual = parseFloat(fila[COL_PRODUCTOS.STOCK_ACTUAL]) || 0;
        encontrados.push([
          fila[COL_PRODUCTOS.CODIGO],
          fila[COL_PRODUCTOS.NOMBRE],
          fila[COL_PRODUCTOS.UNIDAD],
          fila[COL_PRODUCTOS.GRUPO],
          fila[COL_PRODUCTOS.STOCK_MIN] || 0,
          stockActual
        ]);
      }
    }
    
    return encontrados.sort((a, b) => a[1].localeCompare(b[1]));
  } catch (error) {
    console.error("Error en buscarProducto:", error);
    return [];
  }
}

function obtenerStock() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!prodSheet) {
      throw new Error(`La hoja '${HOJA_PRODUCTOS}' no existe.`);
    }
    
    const productos = prodSheet.getDataRange().getValues();
    
    if (productos.length <= 1) {
      return [];
    }
    
    const stock = [];
    
    for (let i = 1; i < productos.length; i++) {
      const [codigo, nombre, unidad, grupo, stockMin, , stockActual] = productos[i];
      if (codigo && nombre) {
        // Usar stock del caché en lugar de calcular (OPTIMIZACIÓN)
        const cantidad = parseFloat(stockActual) || 0;
        stock.push({
          codigo: codigo.toString(), 
          nombre: nombre.toString(), 
          unidad: unidad || "Unidades", 
          grupo: grupo || "General", 
          stockMin: Math.max(0, parseInt(stockMin) || 0),
          cantidad: cantidad
        });
      }
    }
    
    return stock.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (error) {
    console.error("Error en obtenerStock:", error);
    return [];
  }
}

function calcularStock(codigo) {
  try {
    if (!codigo) return 0;
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!prodSheet) {
      return 0;
    }
    
    // PRIMERO: Intentar usar el caché (OPTIMIZACIÓN)
    const datos = prodSheet.getDataRange().getValues();
    const codigoNormalizado = codigo.toString().trim().toUpperCase();
    
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][COL_PRODUCTOS.CODIGO] && 
          datos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
        const stockEnCache = parseFloat(datos[i][COL_PRODUCTOS.STOCK_ACTUAL]) || 0;
        if (stockEnCache !== undefined && stockEnCache >= 0) {
          return stockEnCache; // Usar el caché si está disponible
        }
      }
    }
    
    // FALLBACK: Si no hay caché, calcular desde movimientos (para compatibilidad)
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!movSheet) {
      return 0;
    }
    
    const movimientos = movSheet.getDataRange().getValues();
    let cantidad = 0;
    
    for (let i = 1; i < movimientos.length; i++) {
      const [cod, fecha, tipo, cant] = movimientos[i];
      if (cod && cod.toString().trim().toUpperCase() === codigoNormalizado) {
        const valor = parseFloat(cant) || 0;
        const tipoMovimiento = tipo.toString().toUpperCase();
        
        switch (tipoMovimiento) {
          case TIPOS_MOVIMIENTO.INGRESO:
          case TIPOS_MOVIMIENTO.AJUSTE_POSITIVO:
            cantidad += valor;
            break;
          case TIPOS_MOVIMIENTO.SALIDA:
          case TIPOS_MOVIMIENTO.AJUSTE_NEGATIVO:
            cantidad -= valor;
            break;
          case TIPOS_MOVIMIENTO.AJUSTE:
            cantidad += valor;
            break;
        }
      }
    }
    
    return Math.max(0, Math.round(cantidad * 100) / 100);
  } catch (error) {
    console.error("Error en calcularStock:", error);
    return 0;
  }
}

function obtenerHistorial(filtros) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!movSheet || !prodSheet) {
      throw new Error("Las hojas del sistema no existen.");
    }
    
    const movimientos = movSheet.getDataRange().getValues();
    const productos = prodSheet.getDataRange().getValues();
    
    const prodMap = {};
    for (let i = 1; i < productos.length; i++) {
      if (productos[i][0]) {
        prodMap[productos[i][0].toString().toUpperCase()] = productos[i][1];
      }
    }
    
    const fechaDesde = new Date(filtros.fechaDesde + 'T00:00:00');
    const fechaHasta = new Date(filtros.fechaHasta + 'T23:59:59');
    
    if (fechaDesde > fechaHasta) {
      throw new Error("La fecha 'desde' no puede ser posterior a la fecha 'hasta'");
    }
    
    const resultado = [];
    
    for (let i = 1; i < movimientos.length; i++) {
      const mov = movimientos[i];
      if (!mov[0] || !mov[1]) continue;
      
      try {
        const fechaMov = new Date(mov[1]);
        const tipoMov = mov[2] ? mov[2].toString().toUpperCase() : "";
        
        if (fechaMov >= fechaDesde && fechaMov <= fechaHasta) {
          if (!filtros.tipo || tipoMov === filtros.tipo.toUpperCase()) {
            const codigoProducto = mov[0].toString().toUpperCase();
            resultado.push({
              codigo: mov[0],
              fecha: formatearFecha(fechaMov),
              tipo: tipoMov,
              cantidad: parseFloat(mov[3]) || 0,
              producto: prodMap[codigoProducto] || "Producto no encontrado",
              observaciones: mov[6] || "",
              usuario: mov[4] || "N/A"
            });
          }
        }
      } catch (dateError) {
        console.warn(`Fecha inválida en movimiento fila ${i + 1}:`, mov[1]);
        continue;
      }
    }
    
    return resultado.sort((a, b) => {
      const fechaA = new Date(a.fecha.split('/').reverse().join('-'));
      const fechaB = new Date(b.fecha.split('/').reverse().join('-'));
      return fechaB - fechaA;
    });
  } catch (error) {
    console.error("Error en obtenerHistorial:", error);
    return [];
  }
}

function obtenerResumen() {
  try {
    const stats = obtenerEstadisticas();
    
    if (!stats) {
      return { totalProductos: 0, totalMovimientos: 0, sinStock: 0, stockBajo: 0, valorTotalInventario: 0, movimientosUltimoMes: 0 };
    }
    
    return {
      totalProductos: stats.totalProductos,
      totalMovimientos: stats.totalMovimientos,
      sinStock: stats.productosSinStock,
      stockBajo: stats.productosStockBajo,
      valorTotalInventario: stats.totalStock,
      movimientosUltimoMes: stats.movimientosUltimoMes
    };
  } catch (error) {
    console.error("Error en obtenerResumen:", error);
    return { totalProductos: 0, totalMovimientos: 0, sinStock: 0, stockBajo: 0, valorTotalInventario: 0, movimientosUltimoMes: 0 };
  }
}

function validarIntegridad() {
  const errores = [];
  const advertencias = [];
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const hojasRequeridas = [HOJA_PRODUCTOS, HOJA_MOVIMIENTOS, HOJA_UNIDADES, HOJA_GRUPOS];
    hojasRequeridas.forEach(nombreHoja => {
      if (!ss.getSheetByName(nombreHoja)) {
        errores.push(`Falta la hoja requerida: ${nombreHoja}`);
      }
    });
    
    if (errores.length > 0) {
      return { errores, advertencias };
    }
    
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    const productos = prodSheet.getDataRange().getValues();
    const movimientos = movSheet.getDataRange().getValues();
    
    // NUEVA VALIDACIÓN: Verificar columna 7 (Stock Actual)
    let columnStockFaltante = false;
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][COL_PRODUCTOS.CODIGO]) continue;
      
      const stockCol = productos[i][COL_PRODUCTOS.STOCK_ACTUAL];
      if (stockCol === undefined || stockCol === null || stockCol === "") {
        columnStockFaltante = true;
        advertencias.push(`Producto fila ${i + 1} (${productos[i][COL_PRODUCTOS.CODIGO]}): Falta "Stock Actual"`);
      }
    }
    
    if (columnStockFaltante) {
      advertencias.push("⚠️ IMPORTANTE: Ejecute 'Migrar Datos Antiguos' para llenar los stocks");
    }
    
    // Validar duplicados y formato
    const codigosVistos = new Set();
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][COL_PRODUCTOS.CODIGO]) continue;
      
      const codigo = productos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase();
      if (codigosVistos.has(codigo)) {
        errores.push(`Código de producto duplicado: ${productos[i][COL_PRODUCTOS.CODIGO]} (fila ${i + 1})`);
      }
      codigosVistos.add(codigo);
      
      if (!productos[i][COL_PRODUCTOS.NOMBRE] || productos[i][COL_PRODUCTOS.NOMBRE].toString().trim().length < 2) {
        errores.push(`Producto ${codigo} tiene nombre inválido (fila ${i + 1})`);
      }
      
      const stockMin = productos[i][COL_PRODUCTOS.STOCK_MIN];
      if (stockMin && (isNaN(stockMin) || stockMin < 0)) {
        errores.push(`Producto ${codigo} tiene stock mínimo inválido: ${stockMin}`);
      }
    }
    
    // Validar movimientos
    const codigosProductos = new Set();
    for (let i = 1; i < productos.length; i++) {
      if (productos[i][COL_PRODUCTOS.CODIGO]) {
        codigosProductos.add(productos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase());
      }
    }
    
    for (let i = 1; i < movimientos.length; i++) {
      if (!movimientos[i][COL_MOVIMIENTOS.CODIGO]) continue;
      
      const codigo = movimientos[i][COL_MOVIMIENTOS.CODIGO].toString().trim().toUpperCase();
      const tipo = movimientos[i][COL_MOVIMIENTOS.TIPO] ? movimientos[i][COL_MOVIMIENTOS.TIPO].toString().toUpperCase() : "";
      const cantidad = movimientos[i][COL_MOVIMIENTOS.CANTIDAD];
      
      if (!codigosProductos.has(codigo)) {
        errores.push(`Movimiento fila ${i + 1}: Producto inexistente: ${movimientos[i][COL_MOVIMIENTOS.CODIGO]}`);
      }
      
      if (tipo && !Object.values(TIPOS_MOVIMIENTO).includes(tipo)) {
        errores.push(`Movimiento fila ${i + 1}: Tipo inválido: ${tipo}`);
      }
      
      if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
        errores.push(`Movimiento fila ${i + 1}: Cantidad inválida: ${cantidad}`);
      }
      
      if (movimientos[i][COL_MOVIMIENTOS.FECHA]) {
        try {
          new Date(movimientos[i][COL_MOVIMIENTOS.FECHA]);
        } catch (e) {
          errores.push(`Movimiento fila ${i + 1}: Fecha inválida: ${movimientos[i][COL_MOVIMIENTOS.FECHA]}`);
        }
      }
    }
    
    // Validar stocks negativos
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][COL_PRODUCTOS.CODIGO]) continue;
      
      const codigo = productos[i][COL_PRODUCTOS.CODIGO];
      const stock = parseFloat(productos[i][COL_PRODUCTOS.STOCK_ACTUAL]) || 0;
      
      if (stock < 0) {
        errores.push(`Producto ${codigo} (fila ${i + 1}) tiene stock negativo: ${stock}`);
      }
    }
    
    return { errores, advertencias };
  } catch (error) {
    errores.push(`Error al validar integridad: ${error.message}`);
    return { errores, advertencias };
  }
}

function obtenerListas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    let unidadesSheet = ss.getSheetByName(HOJA_UNIDADES);
    let gruposSheet = ss.getSheetByName(HOJA_GRUPOS);
    
    if (!unidadesSheet) {
      unidadesSheet = ss.insertSheet(HOJA_UNIDADES);
      const unidadesPredeterminadas = [
        ["Unidad"],
        ["Unidades"],
        ["Kilogramos"],
        ["Gramos"],
        ["Toneladas"],
        ["Litros"],
        ["Mililitros"],
        ["Metros"],
        ["Centímetros"],
        ["Metros Cuadrados"],
        ["Metros Cúbicos"],
        ["Piezas"],
        ["Cajas"],
        ["Paquetes"],
        ["Docenas"]
      ];
      unidadesSheet.getRange(1, 1, unidadesPredeterminadas.length, 1).setValues(unidadesPredeterminadas);
      unidadesSheet.getRange(1, 1).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    
    if (!gruposSheet) {
      gruposSheet = ss.insertSheet(HOJA_GRUPOS);
      const gruposPredeterminados = [
        ["Grupo"],
        ["Materia Prima"],
        ["Producto Terminado"],
        ["Producto en Proceso"],
        ["Herramientas"],
        ["Consumibles"],
        ["Repuestos"],
        ["Equipos"],
        ["Suministros"],
        ["Empaques"],
        ["Químicos"],
        ["General"]
      ];
      gruposSheet.getRange(1, 1, gruposPredeterminados.length, 1).setValues(gruposPredeterminados);
      gruposSheet.getRange(1, 1).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    
    const unidadesData = unidadesSheet.getDataRange().getValues();
    const gruposData = gruposSheet.getDataRange().getValues();
    
    const unidades = unidadesData.slice(1).map(r => r[0]).filter(u => u && u.toString().trim());
    const grupos = gruposData.slice(1).map(r => r[0]).filter(g => g && g.toString().trim());
    
    return { 
      unidades: unidades.sort(), 
      grupos: grupos.sort() 
    };
  } catch (error) {
    console.error("Error en obtenerListas:", error);
    return { 
      unidades: ["Unidades", "Kilogramos", "Litros", "Piezas"], 
      grupos: ["General", "Materia Prima", "Producto Terminado"] 
    };
  }
}

function exportarStockCSV() {
  try {
    const stock = obtenerStock();
    
    if (stock.length === 0) {
      return null;
    }
    
    let csv = "\uFEFF";
    csv += "Código,Nombre,Unidad,Grupo,Stock Mínimo,Stock Actual,Estado,Diferencia\n";
    
    stock.forEach(producto => {
      let estado = "Normal";
      let diferencia = "";
      
      if (producto.cantidad <= 0) {
        estado = "Sin Stock";
        diferencia = `-${producto.stockMin}`;
      } else if (producto.cantidad <= producto.stockMin && producto.stockMin > 0) {
        estado = "Stock Bajo";
        diferencia = `-${producto.stockMin - producto.cantidad}`;
      } else {
        diferencia = `+${producto.cantidad - producto.stockMin}`;
      }
      
      csv += `"${producto.codigo}","${producto.nombre}","${producto.unidad}","${producto.grupo}",${producto.stockMin},${producto.cantidad},"${estado}","${diferencia}"\n`;
    });
    
    const fechaHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm-ss");
    const nombreArchivo = `Inventario_${fechaHora}.csv`;
    
    const blob = Utilities.newBlob(csv, 'text/csv; charset=utf-8', nombreArchivo);
    
    let carpeta;
    try {
      carpeta = DriveApp.getFoldersByName("Reportes Inventario").next();
    } catch (e) {
      carpeta = DriveApp.getRootFolder();
    }
    
    const archivo = carpeta.createFile(blob);
    
    return archivo.getUrl();
  } catch (error) {
    console.error("Error en exportarStockCSV:", error);
    return null;
  }
}

function inicializarHojas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Inicializar hoja PRODUCTOS
    let prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    if (!prodSheet) {
      prodSheet = ss.insertSheet(HOJA_PRODUCTOS);
    }
    
    if (prodSheet.getLastRow() === 0) {
      const encabezados = [["Código", "Nombre", "Unidad", "Grupo", "Stock Mínimo", "Fecha Creación", "Stock Actual"]];
      prodSheet.getRange(1, 1, 1, 7).setValues(encabezados);
      const headerRange = prodSheet.getRange(1, 1, 1, 7);
      headerRange.setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
      
      prodSheet.getRange("A:A").setNumberFormat("@");
      prodSheet.getRange("E:E").setNumberFormat("0");
      prodSheet.getRange("F:F").setNumberFormat("dd/mm/yyyy hh:mm");
      prodSheet.getRange("G:G").setNumberFormat("0.##");
      
      prodSheet.autoResizeColumns(1, 7);
    }
    
    // Inicializar hoja MOVIMIENTOS
    let movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    if (!movSheet) {
      movSheet = ss.insertSheet(HOJA_MOVIMIENTOS);
    }
    
    if (movSheet.getLastRow() === 0) {
      const encabezados = [["Código", "Fecha", "Tipo", "Cantidad", "Usuario", "Timestamp", "Observaciones", "Stock Resultante"]];
      movSheet.getRange(1, 1, 1, 8).setValues(encabezados);
      const headerRange = movSheet.getRange(1, 1, 1, 8);
      headerRange.setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
      
      movSheet.getRange("A:A").setNumberFormat("@");
      movSheet.getRange("B:B").setNumberFormat("dd/mm/yyyy");
      movSheet.getRange("D:D").setNumberFormat("0.##");
      movSheet.getRange("F:F").setNumberFormat("dd/mm/yyyy hh:mm:ss");
      movSheet.getRange("H:H").setNumberFormat("0.##");
      
      movSheet.autoResizeColumns(1, 8);
    }
    
    // Inicializar listas de unidades y grupos
    obtenerListas();
    
    return "Sistema inicializado correctamente. Todas las hojas han sido creadas y configuradas.";
  } catch (error) {
    console.error("Error en inicializarHojas:", error);
    return `Error al inicializar sistema: ${error.message}`;
  }
}

function getTipoMovimientoTexto(tipo) {
  switch (tipo.toUpperCase()) {
    case TIPOS_MOVIMIENTO.INGRESO:
      return "Ingreso";
    case TIPOS_MOVIMIENTO.SALIDA:
      return "Salida";
    case TIPOS_MOVIMIENTO.AJUSTE_POSITIVO:
      return "Ajuste Positivo";
    case TIPOS_MOVIMIENTO.AJUSTE_NEGATIVO:
      return "Ajuste Negativo";
    case TIPOS_MOVIMIENTO.AJUSTE:
      return "Ajuste";
    default:
      return tipo;
  }
}

function formatearFecha(fecha) {
  try {
    const f = new Date(fecha);
    if (isNaN(f.getTime())) {
      throw new Error("Fecha inválida");
    }
    return Utilities.formatDate(f, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } catch (error) {
    console.error("Error en formatearFecha:", error);
    return "Fecha inválida";
  }
}

// ==================== NUEVAS FUNCIONES MEJORADAS ====================

function registrarAuditoria(accion, codigo, nombre, detalles) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let auditSheet = ss.getSheetByName(HOJA_AUDITORIA);
    
    if (!auditSheet) {
      auditSheet = ss.insertSheet(HOJA_AUDITORIA);
      const encabezados = [["Fecha", "Acción", "Código", "Nombre", "Detalles", "Usuario"]];
      auditSheet.getRange(1, 1, 1, 6).setValues(encabezados);
      auditSheet.getRange(1, 1, 1, 6).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    
    auditSheet.appendRow([
      new Date(),
      accion,
      codigo,
      nombre,
      detalles,
      Session.getActiveUser().getEmail() || "Sistema"
    ]);
  } catch (error) {
    console.error("Error al registrar auditoría:", error);
  }
}

function editarProducto(codigo, actualizaciones) {
  try {
    if (!codigo || !actualizaciones) {
      return "Parámetros incompletos";
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!prodSheet) {
      return "Hoja de productos no encontrada";
    }

    const datos = prodSheet.getDataRange().getValues();
    const codigoNormalizado = codigo.toString().trim().toUpperCase();
    
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][COL_PRODUCTOS.CODIGO] && 
          datos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
        
        // Actualizar campos permitidos
        if (actualizaciones.nombre) {
          prodSheet.getRange(i + 1, COL_PRODUCTOS.NOMBRE + 1).setValue(actualizaciones.nombre);
        }
        if (actualizaciones.unidad) {
          prodSheet.getRange(i + 1, COL_PRODUCTOS.UNIDAD + 1).setValue(actualizaciones.unidad);
        }
        if (actualizaciones.grupo) {
          prodSheet.getRange(i + 1, COL_PRODUCTOS.GRUPO + 1).setValue(actualizaciones.grupo);
        }
        if (actualizaciones.stockMin !== undefined) {
          prodSheet.getRange(i + 1, COL_PRODUCTOS.STOCK_MIN + 1).setValue(Math.max(0, parseInt(actualizaciones.stockMin) || 0));
        }
        
        registrarAuditoria("EDITAR_PRODUCTO", codigo, actualizaciones.nombre || datos[i][COL_PRODUCTOS.NOMBRE], 
          JSON.stringify(actualizaciones));
        
        return "Producto actualizado correctamente";
      }
    }
    
    return "Producto no encontrado";
  } catch (error) {
    console.error("Error en editarProducto:", error);
    return `Error al editar producto: ${error.message}`;
  }
}

function eliminarProducto(codigo) {
  try {
    if (!codigo) {
      return "Código de producto requerido";
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet) {
      return "Hoja de productos no encontrada";
    }

    const codigoNormalizado = codigo.toString().trim().toUpperCase();
    const datos = prodSheet.getDataRange().getValues();
    
    // Verificar si tiene movimientos
    if (movSheet) {
      const movimientos = movSheet.getDataRange().getValues();
      for (let i = 1; i < movimientos.length; i++) {
        if (movimientos[i][COL_MOVIMIENTOS.CODIGO] && 
            movimientos[i][COL_MOVIMIENTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
          return "No se puede eliminar un producto que tiene movimientos registrados";
        }
      }
    }
    
    // Eliminar fila del producto
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][COL_PRODUCTOS.CODIGO] && 
          datos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
        prodSheet.deleteRow(i + 1);
        registrarAuditoria("ELIMINAR_PRODUCTO", codigo, datos[i][COL_PRODUCTOS.NOMBRE], "Producto eliminado");
        return "Producto eliminado correctamente";
      }
    }
    
    return "Producto no encontrado";
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    return `Error al eliminar producto: ${error.message}`;
  }
}

function obtenerProductoDetallado(codigo) {
  try {
    if (!codigo) {
      return null;
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet) {
      return null;
    }

    const codigoNormalizado = codigo.toString().trim().toUpperCase();
    const productos = prodSheet.getDataRange().getValues();
    
    for (let i = 1; i < productos.length; i++) {
      if (productos[i][COL_PRODUCTOS.CODIGO] && 
          productos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado) {
        
        let historialReciente = [];
        if (movSheet) {
          const movimientos = movSheet.getDataRange().getValues();
          historialReciente = movimientos
            .slice(1)
            .filter(m => m[COL_MOVIMIENTOS.CODIGO] && 
                    m[COL_MOVIMIENTOS.CODIGO].toString().trim().toUpperCase() === codigoNormalizado)
            .slice(-10)
            .reverse();
        }
        
        return {
          codigo: productos[i][COL_PRODUCTOS.CODIGO],
          nombre: productos[i][COL_PRODUCTOS.NOMBRE],
          unidad: productos[i][COL_PRODUCTOS.UNIDAD],
          grupo: productos[i][COL_PRODUCTOS.GRUPO],
          stockMin: productos[i][COL_PRODUCTOS.STOCK_MIN],
          stockActual: productos[i][COL_PRODUCTOS.STOCK_ACTUAL],
          fechaCreacion: productos[i][COL_PRODUCTOS.FECHA_CREACION],
          ultimosMovimientos: historialReciente
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error en obtenerProductoDetallado:", error);
    return null;
  }
}

function generarReporteStockBajo(stockMinimo = true) {
  try {
    const stock = obtenerStock();
    
    let alertas = [];
    if (stockMinimo) {
      alertas = stock.filter(p => p.cantidad <= p.stockMin && p.cantidad > 0);
    } else {
      alertas = stock.filter(p => p.cantidad <= 0);
    }
    
    return {
      total: stock.length,
      alertas: alertas.length,
      productos: alertas,
      generadoEn: new Date()
    };
  } catch (error) {
    console.error("Error en generarReporteStockBajo:", error);
    return { total: 0, alertas: 0, productos: [] };
  }
}

function sincronizarStockDesdeMovimientos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet || !movSheet) {
      return "Hojas no encontradas";
    }

    const productos = prodSheet.getDataRange().getValues();
    const movimientos = movSheet.getDataRange().getValues();
    
    let actualizados = 0;
    let errores = [];
    
    // Recalcular stock para cada producto
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][COL_PRODUCTOS.CODIGO]) continue;
      
      const codigo = productos[i][COL_PRODUCTOS.CODIGO].toString().trim().toUpperCase();
      let stockCalculado = 0;
      
      // Sumar todos los movimientos del producto
      for (let j = 1; j < movimientos.length; j++) {
        if (movimientos[j][COL_MOVIMIENTOS.CODIGO] && 
            movimientos[j][COL_MOVIMIENTOS.CODIGO].toString().trim().toUpperCase() === codigo) {
          
          const tipo = movimientos[j][COL_MOVIMIENTOS.TIPO].toString().toUpperCase();
          const cantidad = parseFloat(movimientos[j][COL_MOVIMIENTOS.CANTIDAD]) || 0;
          
          switch (tipo) {
            case 'INGRESO':
            case 'AJUSTE_POSITIVO':
              stockCalculado += cantidad;
              break;
            case 'SALIDA':
            case 'AJUSTE_NEGATIVO':
              stockCalculado -= cantidad;
              break;
            case 'AJUSTE':
              stockCalculado += cantidad;
              break;
          }
        }
      }
      
      stockCalculado = Math.max(0, Math.round(stockCalculado * 100) / 100);
      
      // Obtener valor actual en caché
      const stockCacheado = parseFloat(productos[i][COL_PRODUCTOS.STOCK_ACTUAL]) || 0;
      
      // Actualizar si hay cambios o si caché está vacío
      if (stockCalculado !== stockCacheado || productos[i][COL_PRODUCTOS.STOCK_ACTUAL] === undefined || productos[i][COL_PRODUCTOS.STOCK_ACTUAL] === null || productos[i][COL_PRODUCTOS.STOCK_ACTUAL] === "") {
        try {
          prodSheet.getRange(i + 1, COL_PRODUCTOS.STOCK_ACTUAL + 1).setValue(stockCalculado);
          actualizados++;
          console.log(`✓ Producto ${codigo}: ${stockCacheado} → ${stockCalculado}`);
        } catch (e) {
          errores.push(`Producto ${codigo}: ${e.message}`);
        }
      }
    }
    
    registrarAuditoria("SINCRONIZACION", "SISTEMA", "Stock", 
      `Se sincronizó stock de ${actualizados} productos. Errores: ${errores.length}`);
    
    let mensaje = `✓ Sincronización completada. ${actualizados} productos actualizados.`;
    if (errores.length > 0) {
      mensaje += `\n⚠️ Errores: ${errores.join(", ")}`;
    }
    
    return mensaje;
  } catch (error) {
    console.error("Error en sincronizarStockDesdeMovimientos:", error);
    return `❌ Error en sincronización: ${error.message}`;
  }
}

function migrarDatosAntiguos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!prodSheet) {
      return "Hoja de productos no encontrada";
    }

    const datos = prodSheet.getDataRange().getValues();
    
    // Verificar si columna 7 existe y tiene datos válidos
    let columnFaltante = false;
    for (let i = 1; i < datos.length; i++) {
      if (datos[i].length <= COL_PRODUCTOS.STOCK_ACTUAL ||
          datos[i][COL_PRODUCTOS.STOCK_ACTUAL] === undefined ||
          datos[i][COL_PRODUCTOS.STOCK_ACTUAL] === null ||
          datos[i][COL_PRODUCTOS.STOCK_ACTUAL] === "") {
        columnFaltante = true;
        break;
      }
    }
    
    if (!columnFaltante) {
      return "✓ Sistema ya tiene Stock Actual. No se necesita migración.";
    }
    
    console.log("🔄 Detectada: Necesario agregar columna Stock Actual");
    
    // Agregar cabecera si falta
    if (datos.length === 1 || datos[0].length <= COL_PRODUCTOS.STOCK_ACTUAL) {
      try {
        prodSheet.getRange(1, COL_PRODUCTOS.STOCK_ACTUAL + 1).setValue("Stock Actual");
        console.log("✓ Cabecera 'Stock Actual' agregada");
      } catch (e) {
        console.warn("Nota: Cabecera puede ya existir");
      }
    }
    
    // Llenar columna 7 con cálculos desde movimientos
    let procesados = 0;
    for (let i = 1; i < datos.length; i++) {
      if (!datos[i][COL_PRODUCTOS.CODIGO]) continue;
      
      const codigo = datos[i][COL_PRODUCTOS.CODIGO];
      const stockCalculado = calcularStockDesdeCero(codigo);
      
      prodSheet.getRange(i + 1, COL_PRODUCTOS.STOCK_ACTUAL + 1).setValue(stockCalculado);
      procesados++;
    }
    
    registrarAuditoria("MIGRACION", "SISTEMA", "Setup", 
      `Migración completada: ${procesados} productos procesados`);
    
    return `✓ Migración completada. ${procesados} productos procesados. Stock calculado desde historial.`;
  } catch (error) {
    console.error("Error en migrarDatosAntiguos:", error);
    return `❌ Error en migración: ${error.message}`;
  }
}

function obtenerEstadisticas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet || !movSheet) {
      return null;
    }

    const productos = prodSheet.getDataRange().getValues();
    const movimientos = movSheet.getDataRange().getValues();
    
    let totalStock = 0;
    let productosConStock = 0;
    let productosSinStock = 0;
    let productosStockBajo = 0;
    const grupos = new Map();
    
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][COL_PRODUCTOS.CODIGO]) continue;
      
      const stock = parseFloat(productos[i][COL_PRODUCTOS.STOCK_ACTUAL]) || 0;
      const stockMin = parseFloat(productos[i][COL_PRODUCTOS.STOCK_MIN]) || 0;
      const grupo = productos[i][COL_PRODUCTOS.GRUPO] || "Sin grupo";
      
      totalStock += stock;
      
      if (stock > 0) productosConStock++;
      if (stock <= 0) productosSinStock++;
      if (stock > 0 && stock <= stockMin) productosStockBajo++;
      
      if (!grupos.has(grupo)) {
        grupos.set(grupo, { cantidad: 0, stock: 0 });
      }
      const g = grupos.get(grupo);
      g.cantidad++;
      g.stock += stock;
    }
    
    return {
      totalProductos: Math.max(0, productos.length - 1),
      totalMovimientos: Math.max(0, movimientos.length - 1),
      totalStock,
      productosConStock,
      productosSinStock,
      productosStockBajo,
      grupos: Object.fromEntries(grupos),
      movimientosUltimoMes: obtenerMovimientosUltimoMes(movimientos)
    };
  } catch (error) {
    console.error("Error en obtenerEstadisticas:", error);
    return null;
  }
}

function obtenerMovimientosUltimoMes(movimientos) {
  try {
    const fechaUnMesAtras = new Date();
    fechaUnMesAtras.setMonth(fechaUnMesAtras.getMonth() - 1);
    
    let contador = 0;
    for (let i = 1; i < movimientos.length; i++) {
      if (movimientos[i][COL_MOVIMIENTOS.FECHA]) {
        try {
          const fecha = new Date(movimientos[i][COL_MOVIMIENTOS.FECHA]);
          if (fecha >= fechaUnMesAtras) {
            contador++;
          }
        } catch (e) {
          // Ignorar fechas inválidas
        }
      }
    }
    return contador;
  } catch (error) {
    return 0;
  }
}