// ==================== SCRIPT DE PRUEBAS COMPLETO ====================
// Este script prueba todos los flujos del sistema

function ejecutarTodasLasPruebas() {
  console.log("🧪 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA...\n");
  
  const resultados = [];
  
  try {
    // Prueba 1: Inicializar sistema
    console.log("1️⃣ Inicializando sistema...");
    const initResult = inicializarHojas();
    resultados.push({ prueba: "Inicializar Sistema", resultado: initResult, estado: "✓" });
    console.log("   → " + initResult);
    
    // Prueba 2: Registrar producto de prueba
    console.log("\n2️⃣ Registrando producto de prueba...");
    const producto = {
      codigo: "TEST001",
      nombre: "Producto Test",
      unidad: "Unidades",
      grupo: "General",
      stockMin: 10
    };
    const prodResult = registrarProducto(producto);
    resultados.push({ prueba: "Registrar Producto", resultado: prodResult, estado: prodResult.includes("correctamente") ? "✓" : "❌" });
    console.log("   → " + prodResult);
    
    // Prueba 3: Ingreso inicial
    console.log("\n3️⃣ Prueba INGRESO (agregando 100 unidades)...");
    const ingreso = {
      codigo: "TEST001",
      fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      tipo: "INGRESO",
      cantidad: 100,
      observaciones: "Ingreso inicial de prueba"
    };
    const ingresoResult = registrarMovimiento(ingreso);
    resultados.push({ prueba: "Ingreso 100", resultado: ingresoResult, estado: ingresoResult.includes("correctamente") ? "✓" : "❌" });
    console.log("   → " + ingresoResult);
    
    // Verificar stock después de ingreso
    const stock1 = obtenerStock();
    const producto1 = stock1.find(p => p.codigo === "TEST001");
    console.log("   → Stock después de ingreso: " + (producto1 ? producto1.cantidad : "NO ENCONTRADO"));
    
    // Prueba 4: Salida
    console.log("\n4️⃣ Prueba SALIDA (retirando 30 unidades)...");
    const salida = {
      codigo: "TEST001",
      fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      tipo: "SALIDA",
      cantidad: 30,
      observaciones: "Salida de prueba"
    };
    const salidaResult = registrarMovimiento(salida);
    resultados.push({ prueba: "Salida 30", resultado: salidaResult, estado: salidaResult.includes("correctamente") ? "✓" : "❌" });
    console.log("   → " + salidaResult);
    
    // Verificar stock después de salida
    const stock2 = obtenerStock();
    const producto2 = stock2.find(p => p.codigo === "TEST001");
    console.log("   → Stock después de salida: " + (producto2 ? producto2.cantidad : "NO ENCONTRADO"));
    
    // Prueba 5: Ajuste Positivo
    console.log("\n5️⃣ Prueba AJUSTE POSITIVO (agregando 5 unidades)...");
    const ajustePlus = {
      codigo: "TEST001",
      fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      tipo: "AJUSTE_POSITIVO",
      cantidad: 5,
      observaciones: "Ajuste positivo de prueba"
    };
    const ajustePlusResult = registrarMovimiento(ajustePlus);
    resultados.push({ prueba: "Ajuste Positivo +5", resultado: ajustePlusResult, estado: ajustePlusResult.includes("correctamente") ? "✓" : "❌" });
    console.log("   → " + ajustePlusResult);
    
    // Verificar stock
    const stock3 = obtenerStock();
    const producto3 = stock3.find(p => p.codigo === "TEST001");
    console.log("   → Stock después de ajuste +: " + (producto3 ? producto3.cantidad : "NO ENCONTRADO"));
    
    // Prueba 6: Ajuste Negativo
    console.log("\n6️⃣ Prueba AJUSTE NEGATIVO (restando 10 unidades)...");
    const ajusteMinus = {
      codigo: "TEST001",
      fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      tipo: "AJUSTE_NEGATIVO",
      cantidad: 10,
      observaciones: "Ajuste negativo de prueba"
    };
    const ajusteMinusResult = registrarMovimiento(ajusteMinus);
    resultados.push({ prueba: "Ajuste Negativo -10", resultado: ajusteMinusResult, estado: ajusteMinusResult.includes("correctamente") ? "✓" : "❌" });
    console.log("   → " + ajusteMinusResult);
    
    // Verificar stock final
    const stock4 = obtenerStock();
    const producto4 = stock4.find(p => p.codigo === "TEST001");
    console.log("   → Stock después de ajuste -: " + (producto4 ? producto4.cantidad : "NO ENCONTRADO"));
    
    // Prueba 7: Validación de stock insuficiente
    console.log("\n7️⃣ Prueba VALIDACIÓN (intentar vender más del disponible)...");
    const salidaMala = {
      codigo: "TEST001",
      fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      tipo: "SALIDA",
      cantidad: 1000,
      observaciones: "Intento de venta inválida"
    };
    const salidaMalaResult = registrarMovimiento(salidaMala);
    const esError = salidaMalaResult.includes("Stock insuficiente");
    resultados.push({ prueba: "Validación Stock", resultado: salidaMalaResult, estado: esError ? "✓" : "❌" });
    console.log("   → " + salidaMalaResult);
    console.log("   → (Esperado: error de stock insuficiente) " + (esError ? "✓ CORRECTO" : "❌ ERROR"));
    
    // Prueba 8: Validación de integridad
    console.log("\n8️⃣ Prueba VALIDACIÓN DE INTEGRIDAD...");
    const validacion = validarIntegridad();
    const tieneErrores = validacion.errores.length > 0;
    resultados.push({ 
      prueba: "Validar Integridad", 
      resultado: `Errores: ${validacion.errores.length}, Advertencias: ${validacion.advertencias ? validacion.advertencias.length : 0}`,
      estado: tieneErrores ? "❌" : "✓" 
    });
    
    if (tieneErrores) {
      console.log("   ❌ Errores encontrados:");
      validacion.errores.forEach(e => console.log("      - " + e));
    } else {
      console.log("   ✓ Sistema íntegro");
    }
    
    if (validacion.advertencias && validacion.advertencias.length > 0) {
      console.log("   ⚠️ Advertencias:");
      validacion.advertencias.forEach(a => console.log("      - " + a));
    }
    
    // Prueba 9: Obtener historial
    console.log("\n9️⃣ Prueba HISTORIAL DE MOVIMIENTOS...");
    const filtros = {
      fechaDesde: Utilities.formatDate(new Date(Date.now() - 7*24*60*60*1000), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      fechaHasta: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      tipo: ""
    };
    const historial = obtenerHistorial(filtros);
    resultados.push({ 
      prueba: "Historial", 
      resultado: `${historial.length} movimientos registrados`,
      estado: historial.length > 0 ? "✓" : "❌" 
    });
    console.log("   → Movimientos encontrados: " + historial.length);
    
    // Prueba 10: Estadísticas
    console.log("\n🔟 Prueba ESTADÍSTICAS...");
    const estadisticas = obtenerEstadisticas();
    console.log("   → Total Productos: " + estadisticas.totalProductos);
    console.log("   → Stock Total: " + estadisticas.totalStock);
    console.log("   → Productos sin stock: " + estadisticas.productosSinStock);
    console.log("   → Productos con stock bajo: " + estadisticas.productosStockBajo);
    resultados.push({ 
      prueba: "Estadísticas", 
      resultado: `${estadisticas.totalProductos} productos, stock total: ${estadisticas.totalStock}`,
      estado: "✓" 
    });
    
  } catch (error) {
    console.error("❌ ERROR EN PRUEBAS: " + error);
    resultados.push({ prueba: "Error General", resultado: error.message, estado: "❌" });
  }
  
  // Resumen final
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMEN FINAL DE PRUEBAS");
  console.log("=".repeat(70));
  
  let exitosas = 0;
  let fallidas = 0;
  
  resultados.forEach(r => {
    console.log(`${r.estado} ${r.prueba}: ${r.resultado.substring(0, 50)}`);
    if (r.estado === "✓") exitosas++;
    else fallidas++;
  });
  
  console.log("\n" + "=".repeat(70));
  console.log(`✓ Exitosas: ${exitosas}/${resultados.length}`);
  console.log(`❌ Fallidas: ${fallidas}/${resultados.length}`);
  console.log("=".repeat(70) + "\n");
  
  return {
    exitosas,
    fallidas,
    total: resultados.length,
    detalles: resultados
  };
}

// Función para limpiar datos de prueba (opcional)
function limpiarPruebasDelSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet || !movSheet) return "Hojas no encontradas";
    
    let productosEliminados = 0;
    let movimientosEliminados = 0;
    
    // Eliminar producto de prueba
    const datos = prodSheet.getDataRange().getValues();
    for (let i = datos.length - 1; i >= 1; i--) {
      if (datos[i][COL_PRODUCTOS.CODIGO] && 
          datos[i][COL_PRODUCTOS.CODIGO].toString().includes("TEST")) {
        prodSheet.deleteRow(i + 1);
        productosEliminados++;
      }
    }
    
    // Eliminar movimientos de prueba
    const movDatos = movSheet.getDataRange().getValues();
    for (let i = movDatos.length - 1; i >= 1; i--) {
      if (movDatos[i][COL_MOVIMIENTOS.CODIGO] && 
          movDatos[i][COL_MOVIMIENTOS.CODIGO].toString().includes("TEST")) {
        movSheet.deleteRow(i + 1);
        movimientosEliminados++;
      }
    }
    
    console.log(`✓ Limpieza: ${productosEliminados} productos, ${movimientosEliminados} movimientos eliminados`);
    return `✓ Datos de prueba eliminados. (${productosEliminados} prod, ${movimientosEliminados} mov)`;
  } catch (error) {
    console.error("Error al limpiar: " + error);
    return "Error al limpiar datos";
  }
}
