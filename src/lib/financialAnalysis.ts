import { formatNumber, formatRatio, formatPercentage } from './numberFormatting';
import { financialOptimizer } from './performance/FinancialCalculationOptimizer';

export interface FinancialData {
  [key: string]: any;
}

export interface FinancialRatios {
  liquidez: {
    corriente: number;
    rapida: number;
    efectivo: number;
  };
  rentabilidad: {
    roe: number;
    roa: number;
    margenNeto: number;
    margenBruto: number;
  };
  endeudamiento: {
    total: number;
    patrimonial: number;
    cobertura: number;
  };
  actividad: {
    rotacionActivos: number;
    rotacionInventarios: number;
    rotacionCuentasPorCobrar: number;
  };
  seguros?: {
    solvencia: number;
    coberturaTecnica: number;
    ratioReservas: number;
  };
}

export interface PatrimonialEquationValidation {
  activo: number;
  pasivo: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
  egresoMenosIngreso: number;
  control: number;
  diferencia: number;
  isValid: boolean;
  hasSignErrors: boolean;
  errorMessage?: string;
}

export interface FinancialInsights {
  ratios: FinancialRatios;
  tendencias: {
    ventasVariacion: number;
    utilidadVariacion: number;
    activosVariacion: number;
  };
  alertas: string[];
  recomendaciones: string[];
  resumenEjecutivo: string;
  patrimonialValidation: PatrimonialEquationValidation;
  structure?: {
    currentAssets: number;
    nonCurrentAssets: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  profitability?: {
    revenue: number;
    cogs: number;
    operatingExpenses: number;
    netIncome: number;
  };
}

export class FinancialAnalysisEngine {
  private data: FinancialData[];
  private processedBalanceSheet?: FinancialData;
  private processedIncomeStatement?: FinancialData;

  constructor(data: FinancialData[], balanceSheetData?: FinancialData, incomeStatementData?: FinancialData) {
    this.data = data;
    this.processedBalanceSheet = balanceSheetData;
    this.processedIncomeStatement = incomeStatementData;
  }

  // Función para encontrar valores en los datos por palabras clave
  private findValue(keywords: string[]): number {
    console.log(`🔍 Buscando valor para keywords: [${keywords.join(', ')}]`);
    // Primero intentar buscar por códigos específicos de seguros
    if (keywords.includes('Activo Corriente') || keywords.includes('activo corriente')) {
      const disponible = this.findValueByCode(['1.101', '1.102', '1.103']);
      const inversiones = this.findValueByCode(['1.201', '1.202', '1.203']);
      const primas = this.findValueByCode(['1.301', '1.302']);
      if (disponible + inversiones + primas > 0) {
        return disponible + inversiones + primas;
      }
      
      // Buscar en texto de seguros
      const activoValue = this.extractSpecificAccountFromText(['efectivo', 'caja', 'bancos', 'inversiones', 'cuentas por cobrar']);
      if (activoValue > 0) return activoValue;
    }
    
    if (keywords.includes('Pasivo Corriente') || keywords.includes('pasivo corriente')) {
      const obligacionesCorto = this.findValueByCode(['4.402.01']);
      if (obligacionesCorto > 0) {
        return obligacionesCorto;
      }
      
      // Buscar en texto de seguros
      const pasivoValue = this.extractSpecificAccountFromText(['proveedores', 'cuentas por pagar', 'obligaciones']);
      if (pasivoValue > 0) return pasivoValue;
    }
    
    if (keywords.includes('Total Pasivos') || keywords.includes('pasivo total')) {
      const reservasTecnicas = this.findValueByCode(['4.401']);
      const obligaciones = this.findValueByCode(['4.402']);
      if (reservasTecnicas + obligaciones > 0) {
        return reservasTecnicas + obligaciones;
      }
    }
    
    if (keywords.includes('Patrimonio') || keywords.includes('patrimonio')) {
      const patrimonio = this.findValueByCode(['4.409', '4.410']);
      if (patrimonio > 0) {
        return patrimonio;
      }
    }
    
    if (keywords.includes('Total Activos') || keywords.includes('activo total')) {
      const activoValue = this.extractTotalActivoFromText();
      if (activoValue > 0) return activoValue;
    }
    
    if (keywords.includes('Efectivo y Bancos') || keywords.includes('efectivo')) {
      const efectivoValue = this.extractSpecificAccountFromText(['efectivo', 'caja', 'bancos', 'disponible']);
      if (efectivoValue > 0) return efectivoValue;
    }
    
    if (keywords.includes('Inventarios') || keywords.includes('inventarios')) {
      const inventarioValue = this.extractSpecificAccountFromText(['inventarios', 'existencias', 'mercaderías']);
      if (inventarioValue > 0) return inventarioValue;
    }
    
    if (keywords.includes('Ventas') || keywords.includes('ventas')) {
      const ventasValue = this.extractSpecificAccountFromText(['ventas', 'ingresos', 'primas']);
      if (ventasValue > 0) return ventasValue;
    }
    
    if (keywords.includes('Utilidad Neta') || keywords.includes('utilidad neta')) {
      const utilidadValue = this.extractSpecificAccountFromText(['utilidad', 'ganancia', 'resultado']);
      if (utilidadValue > 0) return utilidadValue;
    }
    
    if (keywords.includes('Costo de Ventas') || keywords.includes('costo de ventas')) {
      const costoValue = this.extractSpecificAccountFromText(['costo', 'gastos', 'siniestros']);
      if (costoValue > 0) return costoValue;
    }
    
    // Buscar en los datos normalmente
    for (const row of this.data) {
      // Buscar en múltiples posibles nombres de columnas para la cuenta
      const cuenta = row.Cuenta || row.cuenta || row.Account || row.account || 
                    row.Descripcion || row.descripcion || row.Description || row.description ||
                    row.Concepto || row.concepto || row.Item || row.item || '';
      
      // También buscar por código de cuenta
      const codigo = row.Codigo || row.codigo || row.Code || row.code || '';
      const cuentaCompleta = `${codigo} ${cuenta}`.trim();
      
      // Filtrar datos que contengan headers de software
      if (cuenta.includes('Profit Plus') || cuenta.includes('Usuario:') || cuenta.includes('Página:') || 
          cuenta.includes('R.I.F.:') || cuenta.includes('Fecha:') || cuenta.includes('Hora:') ||
          cuenta.length < 3) {
        continue;
      }
      
      if (keywords.some(keyword => 
        cuenta.toLowerCase().includes(keyword.toLowerCase()) || 
        cuentaCompleta.toLowerCase().includes(keyword.toLowerCase())
      )) {
        // Buscar valor en orden de prioridad para balance de comprobación
        let valor = 0;
        
        // 1. Si hay saldo actual (formato real), usarlo
        if (row.SaldoActual !== undefined && row.SaldoActual !== null && row.SaldoActual !== '') {
          valor = this.parseNumber(row.SaldoActual);
        }
        // 2. Si hay saldo específico, usarlo
        else if (row.Saldo !== undefined && row.Saldo !== null && row.Saldo !== '') {
          valor = this.parseNumber(row.Saldo);
        }
        // 3. Si hay débitos/créditos (formato real), calcular neto
        else if ((row.Debitos !== undefined || row.Creditos !== undefined)) {
          const debitos = this.parseNumber(row.Debitos || 0);
          const creditos = this.parseNumber(row.Creditos || 0);
          const saldoInicial = this.parseNumber(row.SaldoInicial || 0);
          valor = saldoInicial + debitos - creditos;
        }
        // 4. Si hay saldos deudor/acreedor, calcular neto
        else if ((row.SaldoDeudor !== undefined || row.SaldoAcreedor !== undefined)) {
          const deudor = this.parseNumber(row.SaldoDeudor || 0);
          const acreedor = this.parseNumber(row.SaldoAcreedor || 0);
          valor = deudor - acreedor;
        }
        // 5. Si hay debe/haber, calcular neto
        else if ((row.Debe !== undefined || row.Haber !== undefined)) {
          const debe = this.parseNumber(row.Debe || 0);
          const haber = this.parseNumber(row.Haber || 0);
          valor = debe - haber;
        }
        // 6. Buscar en columnas tradicionales
        else {
          valor = this.parseNumber(
            row.Valor || row.valor || row.Value || row.value ||
            row.Monto || row.monto || row.Amount || row.amount ||
            row.Importe || row.importe || row.Total || row.total || 0
          );
        }
        
        if (!isNaN(valor) && valor !== 0) {
          console.log(`  ✅ Valor encontrado: "${cuenta}" -> ${Math.abs(valor)}`);
          return Math.abs(valor); // Usar valor absoluto para cálculos de ratios
        }
      }
    }
    
    // Si no se encuentra por descripción, intentar extraer de texto completo para seguros
    if (keywords.includes('Patrimonio') || keywords.includes('patrimonio')) {
      const insuranceValue = this.extractValueFromInsuranceText(['UTILIDAD TECNICA', 'RESERVAS PARA RIESGOS']);
      if (insuranceValue !== 0) {
        console.log(`  ✅ Valor de seguros encontrado: ${insuranceValue}`);
        return insuranceValue;
      }
    }
    
    console.log(`  ❌ No se encontró valor para keywords: [${keywords.join(', ')}]`);
    return 0;
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remover caracteres no numéricos excepto punto y coma
      const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }
  
  // Función para extraer valores específicos de texto de seguros
  private extractValueFromInsuranceText(keywords: string[]): number {
    for (const item of this.data) {
      const text = JSON.stringify(item).toLowerCase();
      
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          const match = text.match(new RegExp(`${keyword.toLowerCase()}[^\d]*([\d,\.]+)`, 'i'));
          if (match) {
            const value = this.parseNumber(match[1]);
            if (value > 0) {
              return value;
            }
          }
        }
      }
    }
    return 0;
  }

  // Función para extraer valores específicos de cuentas en texto
  private extractSpecificAccountFromText(accountKeywords: string[]): number {
    for (const item of this.data) {
      const text = JSON.stringify(item).toLowerCase();
      
      for (const keyword of accountKeywords) {
        if (text.includes(keyword)) {
          const match = text.match(new RegExp(`${keyword}[^\d]*([\d,\.]+)`, 'i'));
          if (match) {
            const value = this.parseNumber(match[1]);
            if (value > 0) {
              return value;
            }
          }
        }
      }
    }
    return 0;
  }

  // Función para extraer el total de activos de texto
  private extractTotalActivoFromText(): number {
    for (const item of this.data) {
      const text = JSON.stringify(item).toLowerCase();
      
      const patterns = [
        /total\s*activ[oa]s?[^\d]*([\d,\.]+)/i,
        /activ[oa]s?\s*total[^\d]*([\d,\.]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const value = this.parseNumber(match[1]);
          if (value > 0) {
            return value;
          }
        }
      }
    }
    return 0;
  }

  // Mapeo de códigos del CSV a códigos tradicionales del plan contable
  private mapCsvCodeToTraditional(csvCode: string): string[] {
    const code = csvCode.toString();
    const mappings: { [key: string]: string[] } = {
      // Activos (códigos que empiezan con 201)
      '201-01-01-': ['1', '11', '111', '1101', '1102', '1103', '1104'], // Efectivo y Bancos
      '201-01-02-': ['1', '12', '121', '1201', '1202', '1203'], // Inventarios
      '201-01-03-': ['1', '11', '111', '1101', '1102', '1103', '1104'], // Efectivo y Bancos (específico)
      '201-01-04-': ['1', '13', '131', '1301', '1302', '1303'], // Cuentas por Cobrar
      '201-01-': ['1', '11', '111', '1101', '1102', '1103', '1104', '1201', '1202', '1203', '1301', '1302', '1303'], // Activo Corriente general
      '201-02-': ['1', '14', '141', '1401', '1402', '1403', '1.1', '1.2'], // Activo No Corriente
      '201-03-': ['1', '13', '131', '1.3'], // Otros Activos
      '201-': ['1'], // Activos en general
      
      // Códigos venezolanos de activos
      '201': ['1', '11', '12', '13', '14'], // Activos venezolanos
      '201-01': ['1', '11', '111', '1101', '1102', '1103', '1104'], // Activo Corriente venezolano
      '201-02': ['1', '12', '121', '1201', '1202', '1203'], // Inventarios venezolanos
      '201-03': ['1', '13', '131', '1301', '1302', '1303'], // Cuentas por Cobrar venezolanas
      '201-04': ['1', '14', '141', '1401', '1402', '1403'], // Activo Fijo venezolano
      '202': ['1', '14', '141', '1401', '1402', '1403'], // Activo No Corriente venezolano
      
      // Pasivos (códigos que empiezan con 202)
      '202-01-': ['2', '21', '211', '2101', '2102', '2103'], // Pasivo Corriente
      '202-02-': ['2', '22', '221', '2201', '2202', '2203'], // Pasivo No Corriente
      '202-': ['2'], // Pasivos en general
      
      // Activos - Efectivo y Bancos (códigos que empiezan con 203-06 y 203-11)
      '203-06-': ['1', '11', '111', '1101', '1102', '1103'], // Inversiones en el extranjero, bancos
      '203-11-': ['1', '11', '111', '1101', '1102', '1103'], // Disponible, caja chica
      
      // Patrimonio (códigos que empiezan con 203-01, 203-02)
      '203-01-': ['3', '31', '311', '3101', '3102', '3103'], // Capital
      '203-02-': ['3', '32', '321', '3201', '3202', '3203'], // Resultados
      
      // Códigos venezolanos específicos
      '301': ['2', '21', '211', '2101', '2102', '2103'], // Pasivo Corriente venezolano
      '301-01': ['2', '21', '211', '2101'], // Pasivo Corriente específico
      '301-02': ['2', '21', '212', '2102'], // Pasivo Corriente específico
      '301-03': ['2', '21', '213', '2103'], // Pasivo Corriente específico
      '302': ['2', '22', '221', '2201', '2202', '2203'], // Pasivo No Corriente venezolano
      '302-01': ['2', '22', '221', '2201'], // Pasivo No Corriente específico
      '401': ['3', '31', '311', '3101', '3102', '3103'], // Patrimonio venezolano
      '401-01': ['3', '31', '311', '3101'], // Capital venezolano
      '401-02': ['3', '32', '321', '3201'], // Resultados venezolanos
      
      // Ingresos (códigos que empiezan con 204)
      '204-01-': ['4', '41', '411', '4101', '4102', '4103'], // Ingresos Operacionales
      '204-02-': ['4', '42', '421', '4201', '4202', '4203'], // Otros Ingresos
      '204-': ['4'], // Ingresos en general
      
      // Gastos (códigos que empiezan con 205)
      '205-01-': ['5', '51', '511', '5101', '5102', '5103'], // Gastos Operacionales
      '205-02-': ['5', '52', '521', '5201', '5202', '5203'], // Gastos Financieros
      '205-03-': ['5', '53', '531', '5301', '5302', '5303'], // Gastos Administrativos
      '205-04-': ['5', '54', '541', '5401', '5402', '5403'], // Otros Gastos
      '205-05-': ['5', '55', '551', '5501', '5502', '5503'], // Gastos Extraordinarios
      '205-': ['5'], // Gastos en general
      
      // Gastos Operacionales (códigos 5.x - plan contable venezolano)
      '5.1': ['5', '51', '511', '5101', '5102', '5103'], // Gastos de Ventas
      '5.1.1': ['5', '51', '511', '5101'], // Gastos de Ventas específicos
      '5.1.2': ['5', '51', '512', '5102'], // Gastos de Ventas específicos
      '5.1.3': ['5', '51', '513', '5103'], // Gastos de Ventas específicos
      '5.1.4': ['5', '51', '514', '5104'], // Gastos de Ventas específicos
      '5.1.5': ['5', '51', '515', '5105'], // Gastos de Ventas específicos
      '5.1.6': ['5', '51', '516', '5106'], // Gastos de Ventas específicos
      '5.1.7': ['5', '51', '517', '5107'], // Gastos de Ventas específicos
      '5.1.8': ['5', '51', '518', '5108'], // Gastos de Ventas específicos
      '5.1.9': ['5', '51', '519', '5109'], // Gastos de Ventas específicos
      '5.2': ['5', '52', '521', '5201', '5202', '5203'], // Gastos Administrativos
      '5.2.1': ['5', '52', '521', '5201'], // Gastos Administrativos específicos
      '5.2.2': ['5', '52', '522', '5202'], // Gastos Administrativos específicos
      '5.2.3': ['5', '52', '523', '5203'], // Gastos Administrativos específicos
      '5.2.4': ['5', '52', '524', '5204'], // Gastos Administrativos específicos
      '5.2.5': ['5', '52', '525', '5205'], // Gastos Administrativos específicos
      '5.2.6': ['5', '52', '526', '5206'], // Gastos Administrativos específicos
      '5.2.7': ['5', '52', '527', '5207'], // Gastos Administrativos específicos
      '5.2.8': ['5', '52', '528', '5208'], // Gastos Administrativos específicos
      '5.2.9': ['5', '52', '529', '5209'], // Gastos Administrativos específicos
      '5.3': ['5', '53', '531', '5301', '5302', '5303'], // Gastos Financieros
      '5.4': ['5', '54', '541', '5401', '5402', '5403'], // Otros Gastos
      '5.5': ['5', '55', '551', '5501', '5502', '5503'] // Gastos Extraordinarios
    };
    
    // Buscar mapeo por prefijo (del más específico al más general)
    const sortedPrefixes = Object.keys(mappings).sort((a, b) => b.length - a.length);
    
    for (const prefix of sortedPrefixes) {
      if (code.startsWith(prefix)) {
        return mappings[prefix];
      }
    }
    
    // Si no hay mapeo específico, usar el código tal como está
    return [code];
  }

  // Función para buscar valores por código contable
  private findValueByCode(codes: string[]): number {
    // Buscar códigos específicos
    console.log('🔍 Buscando códigos:', codes);
    
    let totalValue = 0;
    const processedCodes = new Set<string>(); // Para evitar duplicados
    const foundValues: Array<{codigo: string, valor: number}> = [];
    
    // Primero buscar en datos estructurados
    for (const row of this.data) {
      const codigo = row.Codigo || row.codigo || row.Code || row.code || '';
      
      // Evitar procesar el mismo código múltiples veces
      if (processedCodes.has(codigo.toString())) {
        continue;
      }
      
      // Mapear el código del CSV a códigos tradicionales
      const mappedCodes = this.mapCsvCodeToTraditional(codigo);
      
      // Verificar si alguno de los códigos buscados coincide EXACTAMENTE
      const hasExactMatch = codes.some(searchCode => {
        // Coincidencia exacta con el código original
        if (codigo.toString() === searchCode) return true;
        // Coincidencia exacta con códigos mapeados
        return mappedCodes.includes(searchCode);
      });
      
      // Si no hay coincidencia exacta, verificar coincidencias por prefijo más específicas
      const hasPrefixMatch = !hasExactMatch && codes.some(searchCode => {
        // Solo permitir prefijos si el código buscado termina en '-' (indica que busca una categoría)
        if (searchCode.endsWith('-')) {
          return codigo.toString().startsWith(searchCode) || 
                 mappedCodes.some(mappedCode => mappedCode.startsWith(searchCode));
        }
        return false;
      });
      
      const hasMatch = hasExactMatch || hasPrefixMatch;
      
      if (hasMatch) {
        processedCodes.add(codigo.toString()); // Marcar como procesado
        let valor = 0;
        
        // Usar la misma lógica de prioridad que findValue - incluir campos en minúsculas
        if (row.SaldoActual !== undefined && row.SaldoActual !== null && row.SaldoActual !== '') {
          valor = this.parseNumber(row.SaldoActual);
        }
        else if (row.saldoactual !== undefined && row.saldoactual !== null && row.saldoactual !== '') {
          valor = this.parseNumber(row.saldoactual);
        }
        else if (row.Saldo !== undefined && row.Saldo !== null && row.Saldo !== '') {
          valor = this.parseNumber(row.Saldo);
        }
        else if ((row.Debitos !== undefined || row.Creditos !== undefined)) {
          const debitos = this.parseNumber(row.Debitos || 0);
          const creditos = this.parseNumber(row.Creditos || 0);
          const saldoInicial = this.parseNumber(row.SaldoInicial || 0);
          valor = saldoInicial + debitos - creditos;
        }
        else if ((row.debitos !== undefined || row.creditos !== undefined)) {
          const debitos = this.parseNumber(row.debitos || 0);
          const creditos = this.parseNumber(row.creditos || 0);
          const saldoInicial = this.parseNumber(row.saldoinicial || 0);
          valor = saldoInicial + debitos - creditos;
        }
        else if ((row.SaldoDeudor !== undefined || row.SaldoAcreedor !== undefined)) {
          const deudor = this.parseNumber(row.SaldoDeudor || 0);
          const acreedor = this.parseNumber(row.SaldoAcreedor || 0);
          valor = deudor - acreedor;
        }
        else if ((row.Debe !== undefined || row.Haber !== undefined)) {
          const debe = this.parseNumber(row.Debe || 0);
          const haber = this.parseNumber(row.Haber || 0);
          valor = debe - haber;
        }
        else {
          valor = this.parseNumber(
            row.Valor || row.valor || row.Value || row.value ||
            row.Monto || row.monto || row.Amount || row.amount ||
            row.Importe || row.importe || row.Total || row.total || 0
          );
        }
        
        if (!isNaN(valor) && valor !== 0) {
          const valorAbs = Math.abs(valor);
          totalValue += valorAbs; // Sumar todos los valores encontrados
          foundValues.push({codigo: codigo.toString(), valor: valorAbs});
          console.log(`💰 Código ${codigo} encontrado con valor:`, valorAbs);
        }
      }
    }
    
    // Si se encontraron valores, retornar el total
    if (totalValue > 0) {
      console.log(`📊 Resumen para códigos [${codes.join(', ')}]:`);
      console.log('   Valores encontrados:', foundValues);
      console.log('   Total calculado:', totalValue);
      return totalValue;
    }
    
    // Si no se encuentra en datos estructurados, buscar en texto de seguros
    const textValue = this.extractValueByCodeFromText(codes);
    if (textValue > 0) {
      return textValue;
    }
    return 0;
  }
  
  // Función para buscar valores directamente por nombre de propiedad
  private findDirectValue(propertyName: string): number {
    for (const row of this.data) {
      if (row.hasOwnProperty(propertyName)) {
        const value = this.parseNumber(row[propertyName]);
        if (!isNaN(value) && value !== 0) {
          console.log(`✅ Valor directo encontrado para ${propertyName}:`, value);
          return Math.abs(value);
        }
      }
    }
    console.log(`❌ No se encontró valor directo para ${propertyName}`);
    return 0;
  }

  // Función para extraer valores por código de texto de seguros
  private extractValueByCodeFromText(codes: string[]): number {
    for (const row of this.data) {
      const allText = Object.values(row).join(' ');
      
      // Buscar patrones específicos de códigos de seguros
      for (const code of codes) {
        // Buscar patrón: código - descripción = valor
        const pattern = new RegExp(`${code.replace('.', '\\.')}[^\d]*([\d,]+\.\d{2})`, 'g');
        const matches = allText.match(pattern);
        
        if (matches) {
          for (const match of matches) {
            const valueMatch = match.match(/([\d,]+\.\d{2})/);
            if (valueMatch) {
              const value = this.parseNumber(valueMatch[1]);
              if (value > 0) {
                return value;
              }
            }
          }
        }
      }
      
      // Buscar códigos específicos conocidos en el texto
      if (codes.includes('4.401') && allText.includes('RESERVAS TÉCNICAS')) {
        const reservasMatch = allText.match(/RESERVAS TÉCNICAS[^\d]*([\d,]+\.\d{2})/i);
        if (reservasMatch) {
          const value = this.parseNumber(reservasMatch[1]);
          return value;
        }
      }
      
      if (codes.includes('4.402') && allText.includes('OBLIGACIONES')) {
        const obligacionesMatch = allText.match(/OBLIGACIONES[^\d]*([\d,]+\.\d{2})/i);
        if (obligacionesMatch) {
          const value = this.parseNumber(obligacionesMatch[1]);
          return value;
        }
      }
      
      if ((codes.includes('4.409') || codes.includes('4.410')) && allText.includes('UTILIDAD')) {
        const utilidadMatch = allText.match(/UTILIDAD[^\d]*([\d,]+\.\d{2})/i);
        if (utilidadMatch) {
          const value = this.parseNumber(utilidadMatch[1]);
          return value;
        }
      }
    }
    
    return 0;
  }

  // Funciones para calcular totales cuando no están explícitos
  private calculateActivoCorriente(): number {
    console.log('🏦 Calculando Activo Corriente...');
    // Códigos tradicionales
    let efectivo = this.findValueByCode(['1101', '1102', '1103', '1104']);
    let cuentasCobrar = this.findValueByCode(['1301', '1302', '1303']);
    let inventarios = this.findValueByCode(['1201', '1202', '1203']);
    console.log('💰 Valores tradicionales - Efectivo:', efectivo, 'Cuentas por cobrar:', cuentasCobrar, 'Inventarios:', inventarios);
    
    // Códigos del plan contable estándar proporcionado
    const efectivoEstandar = this.findValueByCode(['1.0.1', '1.0.1.1', '1.0.1.2', '1.0.1.3', '1.0.1.4']); // Efectivos en Caja y Bancos
    const documentosCuentasCobrar = this.findValueByCode(['1.0.2', '1.0.2.1', '1.0.2.2', '1.0.2.3', '1.0.2.4']); // Documentos y Cuentas por Cobrar
    const inventariosEstandar = this.findValueByCode(['1.0.3', '1.0.3.1', '1.0.3.2', '1.0.3.3']); // Inventarios
    const gastosAdelantado = this.findValueByCode(['1.0.4', '1.0.4.1', '1.0.4.2', '1.0.4.3', '1.0.4.4']); // Gastos Pagados por Adelantado
    const activosDiferidos = this.findValueByCode(['1.0.5', '1.0.5.1', '1.0.5.2', '1.0.5.4']); // Activos Diferidos
    
    // Códigos específicos para empresas de seguros
    const disponibleSeguros = this.findValueByCode(['1.101', '1.102', '1.103']); // Disponible en seguros
    const inversionesSeguros = this.findValueByCode(['1.201', '1.202', '1.203']); // Inversiones corrientes
    const primasCobrar = this.findValueByCode(['1.301', '1.302']); // Primas por cobrar
    
    // Si no encuentra por códigos, buscar por nombres
    if (efectivo === 0) {
      efectivo = this.findValue(['Efectivo y Bancos', 'efectivo', 'cash', 'caja', 'bancos', 'caja general', 'banco nación', 'banco', 'disponible']);
    }
    if (cuentasCobrar === 0) {
      cuentasCobrar = this.findValue(['Cuentas por Cobrar', 'cuentas por cobrar', 'accounts receivable', 'deudores', 'clientes']);
    }
    if (inventarios === 0) {
      inventarios = this.findValue(['Inventarios', 'inventarios', 'inventory', 'existencias', 'mercaderías', 'mercaderias']);
    }
    
    const total = efectivo + cuentasCobrar + inventarios + efectivoEstandar + documentosCuentasCobrar + 
           inventariosEstandar + gastosAdelantado + activosDiferidos + disponibleSeguros + 
           inversionesSeguros + primasCobrar;
    console.log('✅ Total Activo Corriente calculado:', total);
    return total;
  }

  private calculatePasivoCorriente(): number {
    console.log('🏦 Calculando Pasivo Corriente...');
    // Códigos tradicionales
    let cuentasPagar = this.findValueByCode(['2101', '2102', '2103']);
    let deudasCorto = this.findValueByCode(['2201', '2202', '2203']);
    console.log('💰 Valores tradicionales - Cuentas por pagar:', cuentasPagar, 'Deudas corto plazo:', deudasCorto);
    
    // Códigos del plan contable estándar - Pasivos Corrientes
    const pasivosCorrientesEstandar = this.findValueByCode([
      '2.0.1', '2.0.2', '2.0.3', '2.0.4', '2.0.5', '2.0.6', '2.0.7', '2.0.8'
    ]); // Documentos por pagar, Cuentas por Pagar, Sueldos, Intereses, etc.
    
    // Códigos específicos para empresas de seguros - Obligaciones a corto plazo
    const obligacionesCortoSeguros = this.findValueByCode(['4.402.01']); // Obligaciones a Corto Plazo
    
    // Si no encuentra por códigos, buscar por nombres
    if (cuentasPagar === 0) {
      cuentasPagar = this.findValue(['Cuentas por Pagar', 'cuentas por pagar', 'accounts payable', 'proveedores', 'acreedores']);
    }
    if (deudasCorto === 0) {
      deudasCorto = this.findValue(['Préstamos Bancarios', 'prestamos bancarios', 'deudas corto plazo', 'obligaciones corrientes']);
    }
    
    const total = cuentasPagar + deudasCorto + pasivosCorrientesEstandar + obligacionesCortoSeguros;
    console.log('✅ Total Pasivo Corriente calculado:', total);
    return total;
  }

  private calculateActivoTotal(): number {
    console.log('🏦 Calculando Activo Total...');
    const activoCorriente = this.calculateActivoCorriente();
    const activoFijo = this.findValueByCode(['1401', '1402', '1403', '14']);
    console.log('💰 Activo Corriente:', activoCorriente, 'Activo Fijo:', activoFijo);
    
    // Códigos del plan contable estándar
    const instrumentosFinancieros = this.findValueByCode(['1.1', '1.1.1', '1.1.2', '1.1.3', '1.1.4']); // Inversiones
    const propiedadPlantaEquipo = this.findValueByCode(['1.2', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6']); // Activos Fijos
    const otrosActivos = this.findValueByCode(['1.3', '1.3.1', '1.3.2']); // Otros Activos
    
    const total = activoCorriente + activoFijo + instrumentosFinancieros + propiedadPlantaEquipo + otrosActivos;
    console.log('✅ Total Activo Total calculado:', total);
    return total;
  }

  private calculatePatrimonio(): number {
    console.log('🏦 Calculando Patrimonio...');
    // Códigos tradicionales
    const capitalSocial = this.findValueByCode(['3101', '3102']);
    const resultadosAcumulados = this.findValueByCode(['3201', '3202']);
    console.log('💰 Capital Social:', capitalSocial, 'Resultados Acumulados:', resultadosAcumulados);
    
    // Códigos del plan contable estándar - Capital
    const capitalEstandar = this.findValueByCode(['3.0', '3.0.1', '3.0.2', '3.0.3', '3.0.4']); // Capital Social, Retiros, Resultados, Utilidades Retenidas
    
    // Códigos específicos para empresas de seguros
    const patrimonioSeguros = this.findValueByCode(['4.409']); // PATRIMONIO en plan de seguros
    const capitalPagadoSeguros = this.findValueByCode(['4.409.01']); // Capital Pagado
    const utilidadEjercicioSeguros = this.findValueByCode(['4.409.02']); // Utilidad del Ejercicio
    const superavitSeguros = this.findValueByCode(['4.410']); // SUPERÁVIT NO REALIZADO
    
    const total = capitalSocial + resultadosAcumulados + capitalEstandar + patrimonioSeguros + capitalPagadoSeguros + utilidadEjercicioSeguros + superavitSeguros;
    console.log('✅ Total Patrimonio calculado:', total);
    return total;
  }

  private calculateUtilidadNeta(): number {
    console.log('🏦 Calculando Utilidad Neta...');
    // Buscar por códigos contables
    let ventas = this.findValueByCode(['4101', '4102', '41']);
    let costoVentas = this.findValueByCode(['5101', '5102', '51']);
    let gastosAdmin = this.findValueByCode(['6101', '6102', '61']);
    let gastosVentas = this.findValueByCode(['6201', '6202', '62']);
    let gastosFinancieros = this.findValueByCode(['7101', '7102', '71']);
    console.log('💰 Valores iniciales - Ventas:', ventas, 'Costo Ventas:', costoVentas, 'Gastos Admin:', gastosAdmin);
    
    // Códigos del plan contable estándar
    const ingresosEstandar = this.findValueByCode(['4.0', '4.0.1', '4.0.2', '4.1']); // Ingresos Ordinarios y Extraordinarios
    const costosEstandar = this.findValueByCode(['5.0', '5.0.1', '5.0.2']); // Costo de las Mercancías Vendidas
    const gastosVentasEstandar = this.findValueByCode(['5.1', '5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5']); // Gastos de Ventas (clase 5)
    const gastosAdminEstandar = this.findValueByCode(['5.2', '5.2.1', '5.2.2', '5.2.3', '5.2.4', '5.2.5', '5.2.6', '5.2.7', '5.2.8', '5.2.9', '5.2.10', '5.2.11', '5.2.12']); // Gastos Generales y Administrativos (clase 5)
    const gastosFinancierosEstandar = this.findValueByCode(['5.3', '5.3.1', '5.3.2', '5.3.3']); // Gastos Financieros (clase 5)
    const otrosGastosEstandar = this.findValueByCode(['5.4', '5.4.1']); // Otros Gastos (clase 5)
    
    // Si no encuentra por códigos, buscar por nombres
    if (ventas === 0) {
      ventas = this.findValue(['Ventas', 'ventas', 'ingresos', 'revenue', 'sales', 'ventas mercaderías', 'ventas mercaderias', 'ingresos por ventas']);
    }
    if (costoVentas === 0) {
      costoVentas = this.findValue(['Costo de Ventas', 'costo de ventas', 'cost of sales', 'costo ventas', 'costo mercaderías vendidas', 'costo mercaderias vendidas']);
    }
    if (gastosAdmin === 0) {
      gastosAdmin = this.findValue(['Gastos Administrativos', 'gastos administrativos', 'gastos admin', 'gastos generales']);
    }
    if (gastosVentas === 0) {
      gastosVentas = this.findValue(['Gastos de Ventas', 'gastos de ventas', 'gastos ventas']);
    }
    if (gastosFinancieros === 0) {
      gastosFinancieros = this.findValue(['Gastos Financieros', 'gastos financieros', 'interest expense', 'intereses']);
    }
    
    const totalIngresos = ventas + ingresosEstandar;
    const totalCostos = costoVentas + costosEstandar;
    const totalGastos = gastosAdmin + gastosVentas + gastosFinancieros + gastosVentasEstandar + gastosAdminEstandar + gastosFinancierosEstandar + otrosGastosEstandar;
    
    console.log('💰 Totales calculados - Ingresos:', totalIngresos, 'Costos:', totalCostos, 'Gastos:', totalGastos);
    const utilidadNeta = totalIngresos - totalCostos - totalGastos;
    console.log('✅ Utilidad Neta calculada:', utilidadNeta);
    return utilidadNeta;
  }

  private calculatePasivoTotal(): number {
    console.log('🏦 Calculando Pasivo Total...');
    const pasivoCorriente = this.calculatePasivoCorriente();
    // Códigos tradicionales
    const pasivoLargo = this.findValueByCode(['2401', '2402', '24']);
    
    // Códigos del plan contable estándar
    const pasivoLargoEstandar = this.findValueByCode(['2.1', '2.1.1', '2.1.2']); // Pasivo a Largo Plazo
    const pasivosDiferidos = this.findValueByCode(['2.2', '2.2.1']); // Pasivos Diferidos
    
    // Códigos específicos para empresas de seguros
    const reservasTecnicas = this.findValueByCode(['4.401']); // RESERVAS TÉCNICAS
    const obligacionesLargoSeguros = this.findValueByCode(['4.402.02']); // Obligaciones a Largo Plazo
    const todasObligacionesSeguros = this.findValueByCode(['4.402']); // Todas las OBLIGACIONES A PAGAR
    
    console.log('💰 Valores para Pasivo Total - Corriente:', pasivoCorriente, 'Largo Plazo:', pasivoLargo, 'Reservas Técnicas:', reservasTecnicas);
    const total = pasivoCorriente + pasivoLargo + pasivoLargoEstandar + pasivosDiferidos + reservasTecnicas + obligacionesLargoSeguros + todasObligacionesSeguros;
    console.log('✅ Total Pasivo Total calculado:', total);
    return total;
  }

  private calculateUtilidadOperativa(): number {
    const ventas = this.findValueByCode(['4101', '4102', '41']);
    const costoVentas = this.findValueByCode(['5101', '5102', '51']);
    const gastosOperativos = this.findValueByCode(['6101', '6102', '6201', '6202', '61', '62']);
    const utilidadOperativa = ventas - costoVentas - gastosOperativos;
    console.log('📊 UTILIDAD OPERATIVA - Ventas:', ventas, 'Costo Ventas:', costoVentas, 'Gastos Operativos:', gastosOperativos, 'Resultado:', utilidadOperativa);
    return utilidadOperativa;
  }

  private calculateTotalIngresos(): number {
    const ventas = this.findValueByCode(['4101', '4102', '41']);
    const ingresosEstandar = this.findValueByCode(['4.0', '4.0.1', '4.0.2', '4.1']); // Ingresos Ordinarios y Extraordinarios
    const ingresosFinancieros = this.findValueByCode(['4201', '4202', '42']); // Ingresos Financieros
    const otrosIngresos = this.findValueByCode(['4301', '4302', '43']); // Otros Ingresos
    
    // Códigos específicos para empresas de seguros
    const primasEmitidasSeguros = this.findValueByCode(['3.101', '3.102']); // Primas Emitidas
    const ingresosInversionesSeguros = this.findValueByCode(['3.201', '3.202']); // Ingresos por Inversiones
    
    return ventas + ingresosEstandar + ingresosFinancieros + otrosIngresos + primasEmitidasSeguros + ingresosInversionesSeguros;
  }

  private calculateTotalGastos(): number {
    const costoVentas = this.findValueByCode(['5101', '5102', '51']);
    const gastosAdmin = this.findValueByCode(['6101', '6102', '61']);
    const gastosVentas = this.findValueByCode(['6201', '6202', '62']);
    const gastosFinancieros = this.findValueByCode(['7101', '7102', '71']);
    
    // Códigos del plan contable estándar
    const costosEstandar = this.findValueByCode(['5.0', '5.0.1', '5.0.2']); // Costo de las Mercancías Vendidas
    const gastosVentasEstandar = this.findValueByCode(['5.1', '5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5']); // Gastos de Ventas (clase 5)
    const gastosAdminEstandar = this.findValueByCode(['5.2', '5.2.1', '5.2.2', '5.2.3', '5.2.4', '5.2.5', '5.2.6', '5.2.7', '5.2.8', '5.2.9', '5.2.10', '5.2.11', '5.2.12']); // Gastos Generales y Administrativos (clase 5)
    const gastosFinancierosEstandar = this.findValueByCode(['5.3', '5.3.1', '5.3.2', '5.3.3']); // Gastos Financieros (clase 5)
    const otrosGastosEstandar = this.findValueByCode(['5.4', '5.4.1']); // Otros Gastos (clase 5)
    
    // Códigos específicos para empresas de seguros
    const siniestrosSeguros = this.findValueByCode(['3.301', '3.302']); // Siniestros
    const gastosOperativosSeguros = this.findValueByCode(['3.401', '3.402']); // Gastos Operativos
    
    return costoVentas + gastosAdmin + gastosVentas + gastosFinancieros + costosEstandar + 
           gastosVentasEstandar + gastosAdminEstandar + gastosFinancierosEstandar + otrosGastosEstandar +
           siniestrosSeguros + gastosOperativosSeguros;
  }

  private validatePatrimonialEquation(): PatrimonialEquationValidation {
    // Usar directamente los valores del balance procesado si están disponibles
    let activo = 0;
    let pasivo = 0;
    let patrimonio = 0;
    let ingresos = 0;
    let gastos = 0;
    
    if (this.processedBalanceSheet) {
      activo = this.processedBalanceSheet.totalAssets || 0;
      pasivo = this.processedBalanceSheet.totalLiabilities || 0;
      patrimonio = this.processedBalanceSheet.totalEquity || 0;
      // Usando valores del balance procesado
    } else {
      // Fallback a búsqueda manual solo si no hay datos procesados
      activo = this.findValue(['Total Activos', 'activo total', 'total assets', 'activos totales']) || this.calculateActivoTotal();
      pasivo = this.findValue(['Total Pasivos', 'pasivo total', 'total liabilities', 'pasivos totales']) || this.calculatePasivoTotal();
      patrimonio = this.findValue(['Patrimonio', 'patrimonio', 'equity', 'capital']) || this.calculatePatrimonio();
      // Usando búsqueda manual para ecuación patrimonial
    }
    
    // Usar datos procesados del estado de resultados si están disponibles
    if (this.processedIncomeStatement) {
      ingresos = this.processedIncomeStatement.revenue || 0;
      gastos = this.processedIncomeStatement.totalExpenses || (this.processedIncomeStatement.costOfGoodsSold + this.processedIncomeStatement.operatingExpenses) || 0;
      // Usando valores del estado de resultados procesado
    } else {
      // Fallback a búsqueda manual solo si no hay datos procesados
      ingresos = this.calculateTotalIngresos();
      gastos = this.calculateTotalGastos();
      // Usando búsqueda manual para ingresos y gastos
    }
    
    // Ecuación patrimonial básica: Activo = Pasivo + Patrimonio
    // Para balances con resultado del ejercicio: Activo = Pasivo + Patrimonio + (Ingresos - Gastos)
    const resultadoEjercicio = ingresos - gastos; // Utilidad o pérdida del ejercicio
    const egresoMenosIngreso = gastos - ingresos; // Para mostrar en la tabla (formato tradicional)
    const pasivoMasPatrimonio = pasivo + patrimonio;
    const pasivoMasPatrimonioMasResultado = pasivoMasPatrimonio + resultadoEjercicio;
    
    // Control usando la ecuación extendida
    const control = activo;
    const diferencia = control - pasivoMasPatrimonioMasResultado;
    
    // Verificar si hay errores de signo (patrimonio negativo es válido en caso de pérdidas acumuladas)
    const hasSignErrors = false; // Removemos esta validación ya que patrimonio negativo puede ser válido
    
    // Calcular tolerancia dinámica basada en el tamaño de los valores
    const maxValue = Math.max(Math.abs(activo), Math.abs(pasivoMasPatrimonioMasResultado));
    const tolerance = Math.max(1.00, maxValue * 0.001); // 0.1% del valor mayor o mínimo 1.00
    
    // Verificar si la ecuación cuadra
    const isValid = Math.abs(diferencia) <= tolerance;
    
    let errorMessage: string | undefined;
    if (!isValid) {
      const percentageError = maxValue > 0 ? (Math.abs(diferencia) / maxValue * 100) : 0;
      errorMessage = `La ecuación patrimonial no cuadra. Diferencia: ${formatNumber(diferencia)} (${percentageError.toFixed(2)}%). Activo (${formatNumber(activo)}) ≠ Pasivo + Patrimonio + Resultado (${formatNumber(pasivoMasPatrimonioMasResultado)})`;
    }
    
    return {
      activo,
      pasivo,
      patrimonio,
      ingresos,
      gastos,
      egresoMenosIngreso,
      control,
      diferencia,
      isValid,
      hasSignErrors,
      errorMessage
    };
  }

  // Calcular ratios de liquidez
  private calculateLiquidityRatios(): FinancialRatios['liquidez'] {
    console.log('📊 Calculando ratios de liquidez...');
    
    // Usar datos procesados si están disponibles
    let activoCorriente = 0;
    let pasivoCorriente = 0;
    let inventarios = 0;
    let efectivo = 0;
    
    if (this.processedBalanceSheet) {
      activoCorriente = this.processedBalanceSheet.activosCorrientes || 0;
      pasivoCorriente = this.processedBalanceSheet.pasivosCorrientes || 0;
      inventarios = this.processedBalanceSheet.inventarios || 0;
      efectivo = this.processedBalanceSheet.efectivo || 0;
      console.log('✅ Usando datos procesados del Balance General');
    } else {
      // Fallback a búsqueda manual
      activoCorriente = this.findValue(['Activo Corriente', 'activo corriente', 'activos corrientes', 'current assets']) ||
                             this.findValueByCode(['11', '1101', '1102', '1103', '1201', '1301']) ||
                             this.findValueByCode(['1.101', '1.102', '1.201', '1.301']) ||
                             this.findValueByCode(['201', '201-01', '201-02', '201-03', '201-04']) ||
                             this.calculateActivoCorriente();
      pasivoCorriente = this.findValue(['Pasivo Corriente', 'pasivo corriente', 'pasivos corrientes', 'current liabilities', 'proveedores', 'préstamos bancarios', 'prestamos bancarios']) ||
                             this.findValueByCode(['21', '2101', '2102', '2103', '2201']) ||
                             this.findValueByCode(['4.402.01']) ||
                             this.findValueByCode(['301', '301-01', '301-02', '301-03']) ||
                             this.calculatePasivoCorriente();
      inventarios = this.findValue(['Inventarios', 'inventarios', 'inventory', 'existencias', 'mercaderías', 'mercaderias', 'mercaderías']) ||
                         this.findValueByCode(['1201', '1202', '1203']) ||
                         this.findValueByCode(['1.0.3', '1.0.3.1', '1.0.3.2', '1.0.3.3']);
      efectivo = this.findValue(['Efectivo y Bancos', 'efectivo', 'cash', 'caja', 'bancos', 'caja general', 'banco nación', 'banco', 'disponible']) ||
                      this.findValueByCode(['1101', '1102', '1103', '1104']) ||
                      this.findValueByCode(['1.101', '1.102', '1.103']) ||
                      this.findValueByCode(['1.0.1', '1.0.1.1', '1.0.1.2', '1.0.1.3', '1.0.1.4']);
      console.log('⚠️ Usando búsqueda manual en datos importados');
    }
    
    console.log('💰 Valores para liquidez - Activo Corriente:', activoCorriente, 'Pasivo Corriente:', pasivoCorriente, 'Inventarios:', inventarios, 'Efectivo:', efectivo);

    const ratiosLiquidez = {
      corriente: pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : 0,
      rapida: pasivoCorriente > 0 ? (activoCorriente - inventarios) / pasivoCorriente : 0,
      efectivo: pasivoCorriente > 0 ? efectivo / pasivoCorriente : 0
    };
    console.log('✅ Ratios de liquidez calculados:', ratiosLiquidez);
    return ratiosLiquidez;
  }

  // Calcular ratios de rentabilidad
  private calculateProfitabilityRatios(): FinancialRatios['rentabilidad'] {
    console.log('📊 Calculando ratios de rentabilidad...');
    
    // Usar datos procesados si están disponibles
    let utilidadNeta = 0;
    let ventas = 0;
    let activoTotal = 0;
    let patrimonio = 0;
    let costoVentas = 0;
    
    if (this.processedIncomeStatement && this.processedBalanceSheet) {
      utilidadNeta = this.processedIncomeStatement.netIncome || 0;
      ventas = this.processedIncomeStatement.revenue || 0;
      costoVentas = this.processedIncomeStatement.costOfGoodsSold || 0;
      activoTotal = this.processedBalanceSheet.totalAssets || 0;
      patrimonio = this.processedBalanceSheet.totalEquity || 0;
      console.log('✅ Usando datos procesados del Estado de Resultados y Balance General');
      console.log('📊 Valores procesados - Utilidad Neta:', utilidadNeta, 'Ventas:', ventas, 'Activo Total:', activoTotal, 'Patrimonio:', patrimonio);
    } else {
      // Fallback a búsqueda manual
      utilidadNeta = this.findValue(['Utilidad Neta', 'utilidad neta', 'net income', 'ganancia neta', 'resultado del ejercicio']) ||
                            this.calculateUtilidadNeta();
      ventas = this.findValue(['Ventas', 'ventas', 'ingresos', 'revenue', 'sales', 'ventas mercaderías', 'ventas mercaderias', 'ingresos por ventas']) ||
                      this.findValueByCode(['4101', '4102', '4103', '41']);
      activoTotal = this.findValue(['Total Activos', 'activo total', 'total assets', 'activos totales']) ||
                           this.calculateActivoTotal();
      patrimonio = this.findValue(['Patrimonio', 'patrimonio', 'equity', 'capital', 'capital social', 'resultados acumulados', 'Capital Social', 'Resultados Acumulados', 'Utilidades Retenidas', 'utilidades retenidas']) ||
                          this.findValueByCode(['31', '3101', '3201', '32']) ||
                          this.findValueByCode(['4.409', '4.410']) ||
                          this.findValueByCode(['401', '401-01', '401-02']) ||
                          this.calculatePatrimonio();
      costoVentas = this.findValue(['Costo de Ventas', 'costo de ventas', 'cost of sales', 'costo ventas', 'costo mercaderías vendidas', 'costo mercaderias vendidas']) ||
                           this.findValueByCode(['5101', '5102', '51']);
      console.log('⚠️ Usando búsqueda manual en datos importados');
    }
    
    console.log('💰 Valores para rentabilidad - Utilidad Neta:', utilidadNeta, 'Ventas:', ventas, 'Activo Total:', activoTotal, 'Patrimonio:', patrimonio, 'Costo Ventas:', costoVentas);

    const margenBruto = ventas > 0 ? ((ventas - costoVentas) / ventas) * 100 : 0;
    const margenNeto = ventas > 0 ? (utilidadNeta / ventas) * 100 : 0;
    const roa = activoTotal > 0 ? (utilidadNeta / activoTotal) * 100 : 0;
    const roe = patrimonio > 0 ? (utilidadNeta / patrimonio) * 100 : 0;

    const ratiosRentabilidad = {
      roe,
      roa,
      margenNeto,
      margenBruto
    };
    console.log('✅ Ratios de rentabilidad calculados:', ratiosRentabilidad);
    return ratiosRentabilidad;
  }

  // Calcular ratios de endeudamiento
  private calculateDebtRatios(): FinancialRatios['endeudamiento'] {
    console.log('📊 Calculando ratios de endeudamiento...');
    const pasivoTotal = this.findValue(['Total Pasivos', 'pasivo total', 'total liabilities', 'pasivos totales', 'reservas técnicas', 'reservas tecnicas']) ||
                       this.findValueByCode(['4.401', '4.402']) || // Códigos de seguros - RESERVAS TÉCNICAS y OBLIGACIONES
                       this.findValueByCode(['301', '302', '301-01', '301-02', '302-01']) || // Códigos venezolanos de pasivos
                       this.calculatePasivoTotal();
    const activoTotal = this.findValue(['Total Activos', 'activo total', 'total assets', 'activos totales']) ||
                       this.findValueByCode(['201', '202']) || // Códigos venezolanos de activos
                       this.calculateActivoTotal();
    const patrimonio = this.findValue(['Patrimonio', 'patrimonio', 'equity', 'capital', 'capital social', 'resultados acumulados']) ||
                      this.findValueByCode(['31', '3101', '3201', '32']) || // Códigos típicos de patrimonio
                      this.findValueByCode(['4.409', '4.410']) || // Códigos de seguros - PATRIMONIO y SUPERÁVIT
                      this.findValueByCode(['401', '401-01', '401-02']) || // Códigos venezolanos de patrimonio
                      this.calculatePatrimonio();
    console.log('💰 Valores para endeudamiento - Pasivo Total:', pasivoTotal, 'Activo Total:', activoTotal, 'Patrimonio:', patrimonio);
    const utilidadOperativa = this.findValue(['Utilidad Operativa', 'utilidad operativa', 'operating income', 'ebit']) ||
                             this.calculateUtilidadOperativa();
    const gastosFinancieros = this.findValue(['Gastos Financieros', 'gastos financieros', 'interest expense', 'intereses', 'intereses perdidos', 'interestExpense']) ||
                             this.findValueByCode(['7101', '7102', '71']) || // Códigos típicos de gastos financieros
                             this.findDirectValue('interestExpense') || // Buscar directamente interestExpense
                             this.findDirectValue('gastosFinancieros'); // Buscar directamente gastosFinancieros

    console.log('🔍 COBERTURA DE INTERESES - Utilidad Operativa:', utilidadOperativa);
    console.log('🔍 COBERTURA DE INTERESES - Gastos Financieros:', gastosFinancieros);
    console.log('🔍 COBERTURA DE INTERESES - Cálculo:', utilidadOperativa, '/', gastosFinancieros, '=', gastosFinancieros > 0 ? utilidadOperativa / gastosFinancieros : 0);

    const ratiosEndeudamiento = {
      total: activoTotal > 0 ? (pasivoTotal / activoTotal) * 100 : 0,
      patrimonial: patrimonio > 0 ? (pasivoTotal / patrimonio) * 100 : 0,
      cobertura: gastosFinancieros > 0 ? utilidadOperativa / gastosFinancieros : 0
    };
    console.log('✅ Ratios de endeudamiento calculados:', ratiosEndeudamiento);
    return ratiosEndeudamiento;
  }

  // Calcular ratios de actividad
  private calculateActivityRatios(): FinancialRatios['actividad'] {
    console.log('📊 Calculando ratios de actividad...');
    const ventas = this.findValue(['Ventas', 'ventas', 'ingresos', 'revenue', 'sales']);
    const activoTotal = this.findValue(['Total Activos', 'activo total', 'total assets', 'activos totales']);
    const inventarios = this.findValue(['Inventarios', 'inventarios', 'inventory', 'existencias']);
    const cuentasPorCobrar = this.findValue(['Cuentas por Cobrar', 'cuentas por cobrar', 'accounts receivable', 'deudores']);
    const costoVentas = this.findValue(['Costo de Ventas', 'costo de ventas', 'cost of sales', 'costo ventas']);
    console.log('💰 Valores para actividad - Ventas:', ventas, 'Activo Total:', activoTotal, 'Inventarios:', inventarios);

    const ratiosActividad = {
      rotacionActivos: activoTotal > 0 ? ventas / activoTotal : 0,
      rotacionInventarios: inventarios > 0 ? costoVentas / inventarios : 0,
      rotacionCuentasPorCobrar: cuentasPorCobrar > 0 ? ventas / cuentasPorCobrar : 0
    };
    console.log('✅ Ratios de actividad calculados:', ratiosActividad);
    return ratiosActividad;
  }

  // Calcular ratios específicos para empresas de seguros
  private calculateInsuranceRatios(): FinancialRatios['seguros'] {
    const reservasTecnicas = this.findValue(['Reservas Técnicas', 'reservas técnicas', 'reservas tecnicas']) ||
                            this.findValueByCode(['4.401']); // RESERVAS TÉCNICAS
    const patrimonio = this.findValue(['Patrimonio', 'patrimonio']) ||
                      this.findValueByCode(['4.409', '4.410']) ||
                      this.calculatePatrimonio();
    const activoTotal = this.findValue(['Total Activos', 'activo total']) ||
                       this.calculateActivoTotal();
    const primasEmitidas = this.findValue(['Primas Emitidas', 'primas emitidas', 'primas']) ||
                          this.findValueByCode(['5.101', '5.102']); // Códigos típicos de primas
    
    return {
      // Ratio de solvencia: Patrimonio / Reservas Técnicas
      solvencia: reservasTecnicas > 0 ? (patrimonio / reservasTecnicas) * 100 : 0,
      // Cobertura técnica: Activos / Reservas Técnicas
      coberturaTecnica: reservasTecnicas > 0 ? (activoTotal / reservasTecnicas) * 100 : 0,
      // Ratio de reservas: Reservas Técnicas / Primas Emitidas
      ratioReservas: primasEmitidas > 0 ? (reservasTecnicas / primasEmitidas) * 100 : 0
    };
  }

  // Detectar si es una empresa de seguros
  private detectInsuranceCompany(): boolean {
    // Buscar indicadores de que es una empresa de seguros
    const hasReservasTecnicas = this.findValue(['Reservas Técnicas', 'reservas técnicas']) > 0 ||
                               this.findValueByCode(['4.401']) > 0;
    const hasPrimas = this.findValue(['Primas', 'primas emitidas']) > 0;
    const hasInsuranceCodes = this.data.some(row => {
      const codigo = row.Codigo || row.codigo || '';
      return codigo.toString().startsWith('4.401') || codigo.toString().startsWith('4.402');
    });
    
    return hasReservasTecnicas || hasPrimas || hasInsuranceCodes;
  }

  // Detectar el tipo de empresa basándose en los códigos contables presentes
  private detectCompanyType(): 'insurance' | 'commercial' | 'unknown' {
    // Primero verificar si es empresa de seguros
    if (this.detectInsuranceCompany()) {
      return 'insurance';
    }

    // Verificar si tiene códigos del plan contable estándar comercial
    const hasStandardCodes = this.data.some(row => {
      const codigo = row.Codigo || row.codigo || '';
      const codigoStr = codigo.toString();
      return codigoStr.startsWith('1.0.') || codigoStr.startsWith('2.0.') || 
             codigoStr.startsWith('3.0.') || codigoStr.startsWith('4.0.') ||
             codigoStr.startsWith('5.0.') || codigoStr.startsWith('5.1.');
    });

    // Verificar si tiene cuentas típicas de empresas comerciales
    const hasCommercialAccounts = this.findValue(['Inventarios', 'inventarios', 'Costo de Ventas', 'costo de ventas', 
                                                  'Ventas', 'ventas', 'Compras', 'compras']) > 0;

    if (hasStandardCodes || hasCommercialAccounts) {
      return 'commercial';
    }

    return 'unknown';
  }

  // Generar alertas basadas en los ratios con umbrales específicos del análisis financiero
  private generateAlerts(ratios: FinancialRatios): string[] {
    const alerts: string[] = [];

    // ALERTAS DE LIQUIDEZ (umbrales específicos)
    if (ratios.liquidez.corriente < 1.0) {
      alerts.push('🔴 CRÍTICO: Razón Corriente muy baja (< 1.0) - Serios problemas de liquidez a corto plazo');
    } else if (ratios.liquidez.corriente < 1.5) {
      alerts.push('⚠️ Razón Corriente baja (< 1.5) - Posibles dificultades para cubrir obligaciones corrientes');
    }
    
    if (ratios.liquidez.rapida < 1.0) {
      alerts.push('🔴 CRÍTICO: Prueba Ácida muy baja (< 1.0) - Liquidez inmediata insuficiente');
    } else if (ratios.liquidez.rapida < 1.2) {
      alerts.push('⚠️ Prueba Ácida baja (< 1.2) - Dependencia excesiva de inventarios para liquidez');
    }
    
    if (ratios.liquidez.efectivo < 0.5) {
      alerts.push('🔴 CRÍTICO: Ratio de Efectivo muy bajo (< 0.5) - Disponibilidad inmediata insuficiente');
    }

    // ALERTAS DE ENDEUDAMIENTO (umbrales específicos)
    if (ratios.endeudamiento.total > 70) {
      alerts.push('🔴 CRÍTICO: Endeudamiento Total muy alto (> 70%) - Riesgo financiero extremo');
    } else if (ratios.endeudamiento.total > 60) {
      alerts.push('⚠️ Endeudamiento Total alto (> 60%) - Monitorear capacidad de pago');
    }
    
    if (ratios.endeudamiento.patrimonial > 200) {
      alerts.push('🔴 CRÍTICO: Endeudamiento Patrimonial excesivo (> 200%) - Deuda supera 2x el patrimonio');
    } else if (ratios.endeudamiento.patrimonial > 150) {
      alerts.push('⚠️ Endeudamiento Patrimonial alto (> 150%) - Estructura financiera desequilibrada');
    }
    
    if (ratios.endeudamiento.cobertura < 1) {
      alerts.push('🔴 CRÍTICO: Cobertura de Intereses insuficiente (< 1x) - Utilidad operativa no cubre gastos financieros');
    } else if (ratios.endeudamiento.cobertura < 2.5) {
      alerts.push('⚠️ Cobertura de Intereses baja (< 2.5x) - Margen estrecho para cubrir gastos financieros');
    }

    // ALERTAS DE RENTABILIDAD (umbrales específicos)
    if (ratios.rentabilidad.margenNeto < 5) {
      alerts.push('🔴 CRÍTICO: Margen Neto muy bajo (< 5%) - Eficiencia operativa deficiente');
    } else if (ratios.rentabilidad.margenNeto < 8) {
      alerts.push('⚠️ Margen Neto bajo (< 8%) - Revisar estructura de costos y gastos');
    }
    
    if (ratios.rentabilidad.roa <= 0) {
      alerts.push('🔴 CRÍTICO: ROA negativo o nulo - Los activos no generan rentabilidad');
    } else if (ratios.rentabilidad.roa < 5) {
      alerts.push('⚠️ ROA bajo (< 5%) - Baja eficiencia en el uso de activos');
    }
    
    if (ratios.rentabilidad.roe <= 0) {
      alerts.push('🔴 CRÍTICO: ROE negativo o nulo - No hay retorno para los accionistas');
    } else if (ratios.rentabilidad.roe < 10) {
      alerts.push('⚠️ ROE bajo (< 10%) - Rentabilidad insuficiente sobre el patrimonio');
    }

    // ALERTAS ESPECÍFICAS PARA EMPRESAS DE SEGUROS (umbrales específicos)
    if (ratios.seguros) {
      if (ratios.seguros.solvencia < 100) {
        alerts.push('🔴 CRÍTICO: Ratio de Solvencia insuficiente (< 100%) - Patrimonio no cubre reservas técnicas');
      } else if (ratios.seguros.solvencia < 120) {
        alerts.push('⚠️ Ratio de Solvencia bajo (< 120%) - Margen de solvencia estrecho');
      }
      
      if (ratios.seguros.coberturaTecnica < 100) {
        alerts.push('🔴 CRÍTICO: Cobertura Técnica insuficiente (< 100%) - Activos no cubren reservas técnicas');
      } else if (ratios.seguros.coberturaTecnica < 110) {
        alerts.push('⚠️ Cobertura Técnica baja (< 110%) - Margen de cobertura estrecho');
      }
      
      if (ratios.seguros.ratioReservas < 100) {
        alerts.push('🔴 CRÍTICO: Ratio de Reservas insuficiente (< 100%) - Reservas técnicas inadecuadas vs primas');
      } else if (ratios.seguros.ratioReservas > 150) {
        alerts.push('⚠️ Ratio de Reservas muy alto (> 150%) - Posible sobre-reserva que afecta rentabilidad');
      }
    }

    return alerts;
  }

  // Generar recomendaciones basadas en análisis financiero detallado
  private generateRecommendations(ratios: FinancialRatios): string[] {
    const recommendations: string[] = [];

    // RECOMENDACIONES DE LIQUIDEZ
    if (ratios.liquidez.corriente > 2.5) {
      recommendations.push('💡 LIQUIDEZ: Exceso de liquidez detectado - Considerar inversiones productivas o reducir activos ociosos');
    } else if (ratios.liquidez.corriente >= 1.5 && ratios.liquidez.corriente <= 2.5) {
      recommendations.push('✅ LIQUIDEZ: Nivel óptimo de liquidez corriente - Mantener este equilibrio');
    } else if (ratios.liquidez.corriente < 1.0) {
      recommendations.push('🚨 LIQUIDEZ: Urgente mejorar liquidez - Acelerar cobranzas, renegociar plazos de pago o inyectar capital');
    }
    
    if (ratios.liquidez.rapida < 1.0) {
      recommendations.push('💡 LIQUIDEZ: Reducir dependencia de inventarios - Optimizar gestión de stock y acelerar rotación');
    }
    
    if (ratios.liquidez.efectivo < 0.5) {
      recommendations.push('💡 LIQUIDEZ: Incrementar disponibilidades inmediatas - Establecer líneas de crédito o mejorar flujo de caja');
    }

    // RECOMENDACIONES DE ENDEUDAMIENTO
    if (ratios.endeudamiento.total < 30) {
      recommendations.push('💡 ENDEUDAMIENTO: Bajo apalancamiento - Considerar deuda estratégica para impulsar crecimiento');
    } else if (ratios.endeudamiento.total > 70) {
      recommendations.push('🚨 ENDEUDAMIENTO: Reducir deuda urgentemente - Reestructurar pasivos, vender activos no esenciales o capitalizar');
    } else if (ratios.endeudamiento.total >= 50 && ratios.endeudamiento.total <= 70) {
      recommendations.push('⚠️ ENDEUDAMIENTO: Monitorear nivel de deuda - Evitar nuevo endeudamiento hasta mejorar ratios');
    }
    
    if (ratios.endeudamiento.patrimonial > 200) {
      recommendations.push('🚨 ENDEUDAMIENTO: Fortalecer patrimonio urgentemente - Aportes de capital, retener utilidades o conversión deuda-capital');
    }
    
    if (ratios.endeudamiento.cobertura < 2.5) {
      recommendations.push('💡 ENDEUDAMIENTO: Mejorar cobertura de intereses - Incrementar utilidad operativa o renegociar tasas de interés');
    }

    // RECOMENDACIONES DE RENTABILIDAD
    if (ratios.rentabilidad.margenBruto > 40 && ratios.rentabilidad.margenNeto < 8) {
      recommendations.push('💡 RENTABILIDAD: Optimizar gastos operativos - Buen margen bruto pero alto gasto administrativo/ventas');
    }
    
    if (ratios.rentabilidad.margenNeto < 5) {
      recommendations.push('🚨 RENTABILIDAD: Revisar estructura de costos - Analizar precios, proveedores y eficiencia operativa');
    } else if (ratios.rentabilidad.margenNeto >= 15) {
      recommendations.push('✅ RENTABILIDAD: Excelente margen neto - Considerar reinversión para crecimiento sostenible');
    }
    
    if (ratios.rentabilidad.roa < 5) {
      recommendations.push('💡 RENTABILIDAD: Mejorar eficiencia de activos - Optimizar uso de activos o desinvertir en activos improductivos');
    }
    
    if (ratios.rentabilidad.roe < 10) {
      recommendations.push('💡 RENTABILIDAD: Incrementar retorno patrimonial - Mejorar rentabilidad operativa o considerar apalancamiento moderado');
    } else if (ratios.rentabilidad.roe >= 20) {
      recommendations.push('✅ RENTABILIDAD: Excelente ROE - Mantener estrategia actual y considerar distribución de dividendos');
    }

    // RECOMENDACIONES DE ACTIVIDAD
    if (ratios.actividad.rotacionActivos < 1) {
      recommendations.push('💡 ACTIVIDAD: Mejorar rotación de activos - Incrementar ventas o reducir base de activos');
    }
    
    if (ratios.actividad.rotacionInventarios < 6) {
      recommendations.push('💡 ACTIVIDAD: Acelerar rotación de inventarios - Mejorar gestión de stock y políticas de inventario');
    }
    
    if (ratios.actividad.rotacionCuentasPorCobrar < 8) {
      recommendations.push('💡 ACTIVIDAD: Mejorar cobranzas - Revisar políticas de crédito y acelerar recuperación de cartera');
    }

    // RECOMENDACIONES ESPECÍFICAS PARA EMPRESAS DE SEGUROS
    if (ratios.seguros) {
      if (ratios.seguros.solvencia > 200) {
        recommendations.push('🏥 SEGUROS: Excelente solvencia - Considerar expansión de operaciones, nuevos productos o distribución de dividendos');
      } else if (ratios.seguros.solvencia < 120) {
        recommendations.push('🚨 SEGUROS: Fortalecer solvencia - Incrementar capital, retener utilidades o revisar política de reservas');
      }
      
      if (ratios.seguros.coberturaTecnica > 150) {
        recommendations.push('🏥 SEGUROS: Excelente cobertura técnica - Activos sólidos permiten crecimiento en suscripción');
      } else if (ratios.seguros.coberturaTecnica < 110) {
        recommendations.push('🚨 SEGUROS: Mejorar cobertura técnica - Incrementar activos líquidos o revisar composición de cartera');
      }
      
      if (ratios.seguros.ratioReservas < 100) {
        recommendations.push('🚨 SEGUROS: Incrementar reservas técnicas - Revisar adecuación actuarial y política de reservas');
      } else if (ratios.seguros.ratioReservas > 150) {
        recommendations.push('💡 SEGUROS: Evaluar nivel de reservas - Posible sobre-reserva que afecta rentabilidad');
      }
    }

    return recommendations;
  }

  // Análisis completo
  public analyze(): FinancialInsights {
    const ratios: FinancialRatios = {
      liquidez: this.calculateLiquidityRatios(),
      rentabilidad: this.calculateProfitabilityRatios(),
      endeudamiento: this.calculateDebtRatios(),
      actividad: this.calculateActivityRatios()
    };

    // Detectar el tipo de empresa y agregar ratios específicos
    const companyType = this.detectCompanyType();
    if (companyType === 'insurance') {
      ratios.seguros = this.calculateInsuranceRatios();
    }

    // Validar ecuación patrimonial
    const patrimonialValidation = this.validatePatrimonialEquation();

    const alertas = this.generateAlerts(ratios);
    const recomendaciones = this.generateRecommendations(ratios);

    // Agregar alertas de validación patrimonial
    if (patrimonialValidation.errorMessage) {
      alertas.unshift(`⚠️ ECUACIÓN PATRIMONIAL: ${patrimonialValidation.errorMessage}`);
    }

    // Generar resumen ejecutivo
    const resumenEjecutivo = this.generateExecutiveSummary(ratios);

    // Calcular tendencias (simplificado para datos actuales)
    const tendencias = {
      ventasVariacion: 0, // Se calculará con datos históricos
      utilidadVariacion: 0,
      activosVariacion: 0
    };

    // Calcular estructura financiera
    const activoCorriente = this.calculateActivoCorriente();
    const activoTotal = this.calculateActivoTotal();
    const pasivoTotal = this.calculatePasivoTotal();
    const patrimonio = this.calculatePatrimonio();
    const ingresos = this.calculateTotalIngresos();
    const utilidadNeta = this.calculateUtilidadNeta();

    const structure = {
      currentAssets: activoCorriente,
      nonCurrentAssets: activoTotal - activoCorriente,
      totalAssets: activoTotal,
      totalLiabilities: pasivoTotal,
      totalEquity: patrimonio
    };

    const profitability = {
      revenue: ingresos,
      cogs: 0, // Se calculará si hay datos disponibles
      operatingExpenses: this.calculateTotalGastos(),
      netIncome: utilidadNeta
    };

    console.log('FinancialAnalysisEngine - analyze() result:', {
      ratios,
      structure,
      profitability,
      alertas,
      recomendaciones,
      resumenEjecutivo
    });

    return {
      ratios,
      tendencias,
      alertas,
      recomendaciones,
      resumenEjecutivo,
      patrimonialValidation,
      structure,
      profitability
    };
  }

  private generateExecutiveSummary(ratios: FinancialRatios): string {
    // Evaluación de liquidez con umbrales específicos
    const liquidezStatus = ratios.liquidez.corriente >= 2.0 ? 'excelente' : 
                          ratios.liquidez.corriente >= 1.5 ? 'buena' : 
                          ratios.liquidez.corriente >= 1.0 ? 'aceptable' : 'crítica';
    
    // Evaluación de rentabilidad con umbrales específicos
    const rentabilidadStatus = ratios.rentabilidad.margenNeto >= 15 ? 'excelente' : 
                              ratios.rentabilidad.margenNeto >= 8 ? 'buena' : 
                              ratios.rentabilidad.margenNeto >= 5 ? 'aceptable' : 'deficiente';
    
    // Evaluación de endeudamiento con umbrales específicos
    const endeudamientoStatus = ratios.endeudamiento.total <= 30 ? 'conservador' : 
                               ratios.endeudamiento.total <= 50 ? 'moderado' : 
                               ratios.endeudamiento.total <= 70 ? 'alto' : 'crítico';
    
    // Evaluación de ROE y ROA
    const roeStatus = ratios.rentabilidad.roe >= 20 ? 'excelente' : 
                     ratios.rentabilidad.roe >= 15 ? 'muy bueno' : 
                     ratios.rentabilidad.roe >= 10 ? 'bueno' : 
                     ratios.rentabilidad.roe > 0 ? 'bajo' : 'negativo';
    
    const roaStatus = ratios.rentabilidad.roa >= 10 ? 'excelente' : 
                     ratios.rentabilidad.roa >= 5 ? 'bueno' : 
                     ratios.rentabilidad.roa > 0 ? 'bajo' : 'negativo';

    let summary = `RESUMEN EJECUTIVO: La empresa presenta una situación financiera con liquidez ${liquidezStatus} ` +
                  `(razón corriente: ${formatRatio(ratios.liquidez.corriente)}, prueba ácida: ${formatRatio(ratios.liquidez.rapida)}), ` +
                  `rentabilidad ${rentabilidadStatus} (margen neto: ${formatPercentage(ratios.rentabilidad.margenNeto)}) y ` +
                  `nivel de endeudamiento ${endeudamientoStatus} (${formatPercentage(ratios.endeudamiento.total)}). ` +
                  `La rentabilidad patrimonial (ROE) es ${roeStatus} con ${formatPercentage(ratios.rentabilidad.roe)} y ` +
                  `la rentabilidad sobre activos (ROA) es ${roaStatus} con ${formatPercentage(ratios.rentabilidad.roa)}.`;

    // Agregar información específica de seguros con umbrales actualizados
    if (ratios.seguros) {
      const solvenciaStatus = ratios.seguros.solvencia >= 150 ? 'excelente' : 
                             ratios.seguros.solvencia >= 120 ? 'buena' : 
                             ratios.seguros.solvencia >= 100 ? 'adecuada' : 'insuficiente';
      
      const coberturaTecnicaStatus = ratios.seguros.coberturaTecnica >= 130 ? 'excelente' : 
                                    ratios.seguros.coberturaTecnica >= 110 ? 'buena' : 
                                    ratios.seguros.coberturaTecnica >= 100 ? 'adecuada' : 'insuficiente';
      
      const reservasStatus = ratios.seguros.ratioReservas >= 120 && ratios.seguros.ratioReservas <= 150 ? 'óptimo' : 
                            ratios.seguros.ratioReservas >= 100 ? 'adecuado' : 'insuficiente';
      
      summary += ` Como empresa de seguros, muestra solvencia ${solvenciaStatus} (${formatPercentage(ratios.seguros.solvencia)}), ` +
                 `cobertura técnica ${coberturaTecnicaStatus} (${formatPercentage(ratios.seguros.coberturaTecnica)}) y ` +
                 `nivel de reservas ${reservasStatus} (${formatPercentage(ratios.seguros.ratioReservas)}).`;
    }

    return summary;
  }

  /**
   * Método optimizado para análisis financiero con mejoras de rendimiento
   * Utiliza caché, memoización y procesamiento asíncrono cuando es posible
   */
  public async analyzeOptimized(): Promise<FinancialInsights> {
    try {
      // Intentar usar el optimizador de rendimiento
      const optimizedRatios = await financialOptimizer.calculateOptimizedRatios(
        this.data,
        this.processedBalanceSheet,
        this.processedIncomeStatement
      );

      if (optimizedRatios) {
        // Usar los ratios optimizados y completar el análisis
        const tendencias = {
          ventasVariacion: 0,
          utilidadVariacion: 0,
          activosVariacion: 0
        };

        const alertas = this.generateAlerts(optimizedRatios);
        const recomendaciones = this.generateRecommendations(optimizedRatios);
        const resumenEjecutivo = this.generateExecutiveSummary(optimizedRatios);
        const patrimonialValidation = this.validatePatrimonialEquation();

        // Calcular estructura financiera optimizada
        const activoTotal = this.calculateActivoTotal();
        const activoCorriente = this.calculateActivoCorriente();
        const pasivoTotal = this.calculatePasivoTotal();
        const patrimonio = this.calculatePatrimonio();
        const ingresos = this.calculateTotalIngresos();
        const utilidadNeta = this.calculateUtilidadNeta();

        const structure = {
          currentAssets: activoCorriente,
          nonCurrentAssets: activoTotal - activoCorriente,
          totalAssets: activoTotal,
          totalLiabilities: pasivoTotal,
          totalEquity: patrimonio
        };

        const profitability = {
          revenue: ingresos,
          cogs: 0,
          operatingExpenses: this.calculateTotalGastos(),
          netIncome: utilidadNeta
        };

        console.log('FinancialAnalysisEngine - analyzeOptimized() result:', {
          ratios: optimizedRatios,
          structure,
          profitability,
          alertas,
          recomendaciones,
          resumenEjecutivo
        });

        return {
          ratios: optimizedRatios,
          tendencias,
          alertas,
          recomendaciones,
          resumenEjecutivo,
          patrimonialValidation,
          structure,
          profitability
        };
      }
    } catch (error) {
      console.warn('Error en análisis optimizado, usando método tradicional:', error);
    }

    // Fallback al método tradicional si el optimizado falla
    return this.analyze();
  }
}

// Función helper para crear análisis desde datos importados
export function createFinancialAnalysis(
  importedData: FinancialData[], 
  balanceSheetData?: FinancialData, 
  incomeStatementData?: FinancialData
): FinancialInsights | null {
  if (!importedData || importedData.length === 0) {
    console.log('❌ No hay datos importados para analizar');
    return null;
  }

  const engine = new FinancialAnalysisEngine(importedData, balanceSheetData, incomeStatementData);
  const result = engine.analyze();
  
  return result;
}

/**
 * Función optimizada para crear análisis financiero con mejoras de rendimiento
 * Utiliza el motor optimizado cuando es posible
 */
export async function createOptimizedFinancialAnalysis(
  importedData: FinancialData[], 
  balanceSheetData?: FinancialData, 
  incomeStatementData?: FinancialData
): Promise<FinancialInsights | null> {
  if (!importedData || importedData.length === 0) {
    console.log('❌ No hay datos importados para analizar');
    return null;
  }

  const engine = new FinancialAnalysisEngine(importedData, balanceSheetData, incomeStatementData);
  
  try {
    const result = await engine.analyzeOptimized();
    return result;
  } catch (error) {
    console.warn('Error en análisis optimizado, usando método tradicional:', error);
    return createFinancialAnalysis(importedData, balanceSheetData, incomeStatementData);
  }
}