import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { pdfjs } from 'react-pdf';
import { useDataContext } from '../../contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { normalizeText } from '../../lib/utils';
import { CSVValidatorService, ValidationDisplay } from './CSVValidator';
import { validateBalancePeriod, suggestMatchingPeriods } from '../../utils/dateValidation';
import { SupabaseService } from '../../lib/supabaseService';

// Para pdfjs-dist@5.3.93 (usa .mjs)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Agregar import de PapaParse
import Papa from 'papaparse';

interface DataRow {
  [key: string]: any;
}

const DataImport: React.FC = () => {
  const { setImportedData, addImportRecord, selectedPeriod, financialPeriods, selectedCompany } = useDataContext();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dateValidationResult, setDateValidationResult] = useState<any>(null);
  const [showDateConfirmation, setShowDateConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<DataRow[] | null>(null);
  const csvValidator = new CSVValidatorService();

  // Función para procesar datos validados
  const processValidatedData = async (filteredData: DataRow[], file: File, validation: any) => {
    console.log('✅ Datos filtrados finales:', filteredData.slice(0, 3));
    console.log('💰 Ejemplo de valores numéricos:', {
      SaldoActual: filteredData[0]?.SaldoActual,
      Debitos: filteredData[0]?.Debitos,
      Creditos: filteredData[0]?.Creditos,
      tipos: {
        SaldoActual: typeof filteredData[0]?.SaldoActual,
        Debitos: typeof filteredData[0]?.Debitos,
        Creditos: typeof filteredData[0]?.Creditos
      }
    });
    
    console.log('📤 Enviando al contexto:', filteredData.slice(0, 3));
    await setImportedData(filteredData);
    setError(null);
    
    const recordCount = filteredData.length;
    let successMsg = `Archivo ${file.type === 'text/csv' ? 'CSV' : 'Excel'} importado exitosamente. Se cargaron ${recordCount} registros.`;
    
    // Agregar información de validación al mensaje de éxito
    if (validation.warnings.length > 0) {
      successMsg += ` (${validation.warnings.length} advertencias encontradas)`;
    }

    // **GUARDADO AUTOMÁTICO EN SUPABASE**
    if (selectedCompany && selectedPeriod && filteredData.length > 0) {
      try {
        console.log('💾 Iniciando guardado automático en Supabase...');
        console.log('🏢 Empresa seleccionada:', selectedCompany.name);
        console.log('📅 Período seleccionado:', selectedPeriod.period_name);
        
        const saveResult = await SupabaseService.saveBalanceDataFromCSV(
          selectedCompany.id,
          selectedPeriod.id,
          filteredData
        );

        if (saveResult.success) {
          successMsg += ` ✅ Guardado en Supabase: ${saveResult.savedCount} cuentas.`;
          console.log('✅ Guardado automático exitoso:', saveResult);
        } else {
          console.warn('⚠️ Error en guardado automático:', saveResult.message);
          successMsg += ` ⚠️ Error guardando en Supabase: ${saveResult.message}`;
        }
      } catch (error) {
        console.error('❌ Error en guardado automático:', error);
        successMsg += ` ❌ Error guardando en Supabase: ${error.message}`;
      }
    } else {
      if (!selectedCompany) {
        console.log('⚠️ No hay empresa seleccionada - saltando guardado automático');
        successMsg += ' (No se guardó en Supabase: empresa no seleccionada)';
      } else if (!selectedPeriod) {
        console.log('⚠️ No hay período seleccionado - saltando guardado automático');
        successMsg += ' (No se guardó en Supabase: período no seleccionado)';
      }
    }
    
    setSuccessMessage(successMsg);
    
    addImportRecord({
      fileName: file.name,
      fileType: file.type === 'text/csv' ? 'CSV' : 'Excel',
      recordCount: recordCount,
      status: validation.warnings.length > 0 ? 'warning' : 'success',
      errorMessage: null,
      validationWarnings: validation.warnings.length,
      validationSuggestions: validation.suggestions.length
    });
    
    setIsProcessing(false);
  };

  // Función para confirmar importación con fechas discrepantes
  const confirmImportWithDateDiscrepancy = async () => {
    if (pendingData) {
      await processValidatedData(pendingData, { name: 'archivo', type: 'text/csv' } as File, { warnings: [], suggestions: [] });
      setShowDateConfirmation(false);
      setPendingData(null);
      setDateValidationResult(null);
    }
  };

  // Función para cancelar importación
  const cancelImport = () => {
    setShowDateConfirmation(false);
    setPendingData(null);
    setDateValidationResult(null);
    setIsProcessing(false);
  };

  const cleanData = (data: DataRow[]): DataRow[] => {
    return data.map(row => {
      const cleanedRow: DataRow = {};
      for (const key in row) {
        if (Object.hasOwn(row, key)) {
          const cleanedKey = normalizeText(key.trim());
          cleanedRow[cleanedKey] = row[key];
        }
      }
      return cleanedRow;
    });
  };

  const processCSV = (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        if (csvData) {
          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => normalizeText(header.trim()),
            complete: async (results) => {
              console.log('📊 Datos parseados del CSV:', results.data.slice(0, 3));
              const jsonData = results.data as DataRow[];
              

              
              // Ejecutar validaciones mejoradas
              const validation = csvValidator.validateCSVData(jsonData);
              setValidationResult(validation);
              setShowValidation(true);
              
              // Si hay errores críticos, no procesar
              if (!validation.isValid && validation.errors.length > 0) {
                setError(`Errores de validación encontrados: ${validation.errors.join(', ')}`);
                addImportRecord({
                  fileName: file.name,
                  fileType: 'CSV',
                  recordCount: 0,
                  status: 'error',
                  errorMessage: `Validación fallida: ${validation.errors.join(', ')}`
                });
                setIsProcessing(false);
                return;
              }
              
              const filteredData = filterFinancialData(jsonData);
              
              // Validar fechas del balance contra el período seleccionado
               const dateValidation = validateBalancePeriod(filteredData, selectedPeriod, financialPeriods);
               setDateValidationResult(dateValidation);
              
              if (!dateValidation.isValid) {
                // Si la validación falla, mostrar confirmación al usuario
                setPendingData(filteredData);
                setShowDateConfirmation(true);
                setIsProcessing(false);
                return;
              }
              
              // Si la validación pasa, procesar normalmente
               await processValidatedData(filteredData, file, validation);
            },
            error: (error) => {
              throw new Error(`Error parsing CSV: ${error.message}`);
            }
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Error procesando archivo CSV: ${errorMessage}`);
        
        addImportRecord({
          fileName: file.name,
          fileType: 'CSV',
          recordCount: 0,
          status: 'error',
          errorMessage: errorMessage
        });
        
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const filterFinancialData = (data: DataRow[]): DataRow[] => {
    console.log('🔍 Datos antes del filtro:', data.length);
    console.log('📋 Ejemplo de datos sin filtrar:', data.slice(0, 3));
    
    const filteredData = data.filter(row => {
      // Extraer y normalizar código (usar nombres en minúsculas que vienen del CSV)
      const codigo = String(row.codigo || row.Codigo || row.code || row.Code || row.cuenta || row.Cuenta || '').trim();
      
      // Extraer y normalizar descripción (usar nombres en minúsculas que vienen del CSV)
      const descripcion = String(
        row.descripcion || row.Descripcion || row.Description || row.cuenta || row.Cuenta || ''
      ).toLowerCase().trim();
  
      // Filtrar solo líneas completamente vacías o headers de software
      const isEmptyRow = !codigo && !descripcion && 
        !row.saldoactual && !row.SaldoActual && !row.Saldo && !row.Valor && !row.debitos && !row.Debitos && !row.creditos && !row.Creditos;
      
      const isSoftwareHeader = (
        descripcion.includes('profit plus') ||
        descripcion.includes('usuario:') ||
        descripcion.includes('página:') ||
        descripcion.includes('r.i.f.:') ||
        descripcion.includes('fecha:') ||
        descripcion.includes('hora:') ||
        descripcion.includes('contabilidad')
      );
  
      // CRITERIO MUY FLEXIBLE: Incluir cualquier fila que tenga al menos:
      // 1. Un código (cualquier código, no importa el formato)
      // 2. O una descripción de más de 2 caracteres
      // 3. O cualquier valor numérico
      const hasCode = codigo.length > 0;
      const hasDescription = descripcion.length > 2;
      // Función auxiliar para verificar si un valor numérico es significativo
      const hasSignificantValue = (value) => {
        if (value === undefined || value === null || value === '') return false;
        const numValue = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
        return !isNaN(numValue) && Math.abs(numValue) > 0.001; // Considerar valores > 0.001 como significativos
      };
      
      const hasAnyValue = (
        hasSignificantValue(row.saldoactual) ||
        hasSignificantValue(row.SaldoActual) ||
        hasSignificantValue(row.Saldo) ||
        hasSignificantValue(row.Valor) ||
        hasSignificantValue(row.debitos) ||
        hasSignificantValue(row.Debitos) ||
        hasSignificantValue(row.creditos) ||
        hasSignificantValue(row.Creditos) ||
        hasSignificantValue(row.saldoinicial) ||
        hasSignificantValue(row.SaldoInicial)
      );
  
      // Incluir la fila si NO es vacía, NO es header de software, Y tiene al menos código, descripción o valor
      const shouldInclude = !isEmptyRow && !isSoftwareHeader && (hasCode || hasDescription || hasAnyValue);
      
      if (!shouldInclude) {
        console.log('🚫 Fila filtrada:', { codigo, descripcion, hasCode, hasDescription, hasAnyValue, row });
      } else {
        console.log('✅ Fila incluida:', { codigo, descripcion, hasCode, hasDescription, hasAnyValue });
      }
      
      return shouldInclude;
    }).map(row => {
      // Limpiar valores numéricos
      const cleanedRow: DataRow = { ...row };
      
      const numericFields = ['saldoactual', 'SaldoActual', 'Saldo', 'Valor', 'Value', 'debitos', 'Debitos', 'creditos', 'Creditos', 'saldoinicial', 'SaldoInicial'];
          numericFields.forEach(field => {
            if (cleanedRow[field] !== undefined && cleanedRow[field] !== null) {
              // Función mejorada para limpiar valores numéricos
              const cleanNumericValue = (value: any): number => {
                if (!value || value === '') return 0;
                
                // Convertir a string y limpiar espacios
                let cleaned = String(value).trim();
                
                // Manejar paréntesis como números negativos
                if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
                  cleaned = '-' + cleaned.slice(1, -1);
                }
                
                // Remover caracteres no numéricos excepto punto, coma y guión
                cleaned = cleaned.replace(/[^\d.,-]/g, '');
                
                // Si tiene tanto punto como coma, determinar cuál es el separador decimal
                if (cleaned.includes('.') && cleaned.includes(',')) {
                  // Si el punto está después de la coma, la coma es separador de miles
                  if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
                    cleaned = cleaned.replace(/,/g, '');
                  } else {
                    // Si la coma está después del punto, el punto es separador de miles
                    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                  }
                } else if (cleaned.includes(',')) {
                  // Solo coma: podría ser separador decimal o de miles
                  const parts = cleaned.split(',');
                  if (parts.length === 2 && parts[1].length <= 3) {
                    // Probablemente separador decimal
                    cleaned = cleaned.replace(',', '.');
                  } else {
                    // Probablemente separador de miles
                    cleaned = cleaned.replace(/,/g, '');
                  }
                }
                
                const num = parseFloat(cleaned);
                console.log(`🔢 Parsing ${field}: "${value}" -> "${cleaned}" -> ${num}`);
                return isNaN(num) ? 0 : num;
              };
              
              const numValue = cleanNumericValue(cleanedRow[field]);
              if (!isNaN(numValue)) {
                cleanedRow[field] = numValue;
          }
        }
      });
      
      return cleanedRow;
    });
    
    console.log('✅ Datos después del filtro:', filteredData.length);
    console.log('📊 Ejemplo de datos filtrados:', filteredData.slice(0, 3));
    
    return filteredData;
  };

  const processExcel = (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          const cleanedData = cleanData(json);
          const financialData = filterFinancialData(cleanedData);
          
          // Validar fechas del balance contra el período seleccionado
           const dateValidation = validateBalancePeriod(financialData, selectedPeriod, financialPeriods);
           setDateValidationResult(dateValidation);
          
          if (!dateValidation.isValid) {
            // Si la validación falla, mostrar confirmación al usuario
            setPendingData(financialData);
            setShowDateConfirmation(true);
            setIsProcessing(false);
            return;
          }
          
          // Si la validación pasa, procesar normalmente
          await processValidatedData(financialData, file, { warnings: [], suggestions: [] });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Error procesando archivo Excel: ${errorMessage}`);
        
        addImportRecord({
          fileName: file.name,
          fileType: 'Excel',
          recordCount: 0,
          status: 'error',
          errorMessage: errorMessage
        });
        
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processPDF = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (data) {
          const arrayBuffer = data as ArrayBuffer;
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          let allLines: string[] = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Agrupar elementos por línea basada en posición Y
            const linesMap = new Map<number, string[]>();
            textContent.items.forEach((item: any) => {
              if (item.str.trim()) {
                const y = Math.round(item.transform[5]); // Posición Y (redondeada para agrupar líneas cercanas)
                if (!linesMap.has(y)) {
                  linesMap.set(y, []);
                }
                linesMap.get(y)!.push(item.str.trim());
              }
            });
            
            // Convertir mapa a array de líneas, ordenadas de arriba a abajo (Y descendente)
            const pageLines = Array.from(linesMap.entries())
              .sort((a, b) => b[0] - a[0]) // Ordenar por Y descendente (de arriba a abajo en página)
              .map(([, texts]) => texts.join(' ').trim())
              .filter(line => line.length > 0);
            
            allLines = allLines.concat(pageLines);
          }

          console.log(`Procesando ${allLines.length} líneas del PDF`);
          console.log('Primeras 20 líneas:', allLines.slice(0, 20));
          
          // Función para limpiar valores numéricos
          const cleanNumericValue = (value: string): number => {
            if (!value) return 0;
            const cleaned = value.replace(/[^\d,\.\-]/g, '').replace(/,/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          let processedData: any[] = [];
          
          // Patrones ajustados para manejar líneas más limpias
          const patterns = [
            // Patrón para seguros con códigos complejos: CODIGO DESCRIPCION SALDO_INICIAL DEBITOS CREDITOS SALDO_ACTUAL
            /^(\d{2,4}(?:-\d{2,4})*)\s+([^\d]+?)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s*$/,
            
            // Patrón más flexible para balances con 6 columnas
            /^([\d\-\.]+)\s+([^\d]+?)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s*$/,
            
            // Patrón para balances con 5 columnas (sin saldo inicial)
            /^([\d\-\.]+)\s+([^\d]+?)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s*$/,
            
            // Patrón para balances con 4 columnas (cuenta, descripción, débito, crédito)
            /^([\d\-\.]+)\s+([^\d]+?)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s*$/,
            
            // Patrón para códigos seguidos de valores numéricos (más flexible)
            /^(\d{2,6}(?:-\d{1,4})*)\s+([^\d]+?)\s+([\d,\.\-]+)\s*$/,
            
            // Patrón general para cualquier línea con números y texto
            /^(.+?)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s+([\d,\.\-]+)\s*$/,
            
            // Patrón para líneas que comienzan con números
            /^(\d+[\d\-\.]*)\s+(.+)$/,
            
            // Patrón para detectar cualquier combinación de números y texto
            /^([\d\-\.]+)\s+(.+?)\s+([\d,\.\-]+)(?:\s+([\d,\.\-]+))?(?:\s+([\d,\.\-]+))?(?:\s+([\d,\.\-]+))?\s*$/
          ];

          // Excluir patrones para encabezados y líneas no relevantes
          const excludePatterns = [
            /fecha:/i, /p[áa]gina/i, /usuario:/i, /balance.*general/i,
            /estado.*de.*resultados/i, /empresa:/i, /periodo:/i,
            /codigo.*descripcion/i, /cuenta.*debe.*haber/i, /^\s*$/
          ];

          for (const line of allLines) {
            if (excludePatterns.some(pattern => pattern.test(line.toLowerCase()))) continue;
            
            let matched = false;
            for (const pattern of patterns) {
              const match = line.match(pattern);
              if (match) {
                const row: any = {};
                if (match[1]) row.Codigo = match[1].trim();
                if (match[2]) row.Descripcion = match[2].trim();
                if (match[3]) row.SaldoInicial = cleanNumericValue(match[3]);
                if (match[4]) row.Debitos = cleanNumericValue(match[4]);
                if (match[5]) row.Creditos = cleanNumericValue(match[5]);
                if (match[6]) row.SaldoActual = cleanNumericValue(match[6]);
                
                // Validaciones estrictas
                const hasValidCode = row.Codigo && /^[\d\-\.]+$/.test(row.Codigo) && row.Codigo.length >= 2;
                const hasValidDescription = row.Descripcion && row.Descripcion.length >= 3;
                const hasNumericValues = Object.values(row).some(val => typeof val === 'number' && val !== 0);
                
                if (hasValidCode && hasValidDescription && hasNumericValues) {
                  row.SaldoActual = row.SaldoActual || row.SaldoInicial || 0;
                  row.Cuenta = `${row.Codigo} - ${row.Descripcion}`;
                  row.Valor = row.SaldoActual;
                  processedData.push(row);
                  matched = true;
                  break;
                }
              }
            }
            
            // Si no matchea, intentar parseo simple por partes
            if (!matched) {
              const parts = line.split(/\s+/).filter(part => part.trim());
              if (parts.length >= 3 && /^[\d\-\.]+$/.test(parts[0])) {
                const codigo = parts[0];
                const descripcion = parts.slice(1, -4).join(' ');
                const saldoInicial = cleanNumericValue(parts[parts.length - 4] || '0');
                const debitos = cleanNumericValue(parts[parts.length - 3] || '0');
                const creditos = cleanNumericValue(parts[parts.length - 2] || '0');
                const saldoActual = cleanNumericValue(parts[parts.length - 1] || '0');
                
                if (codigo.length >= 2 && descripcion.length >= 3 && (saldoInicial || debitos || creditos || saldoActual)) {
                  processedData.push({
                    Codigo: codigo,
                    Descripcion: descripcion,
                    SaldoInicial: saldoInicial,
                    Debitos: debitos,
                    Creditos: creditos,
                    SaldoActual: saldoActual,
                    Cuenta: `${codigo} - ${descripcion}`,
                    Valor: saldoActual
                  });
                }
              }
            }
          }

          console.log(`Extraídos ${processedData.length} registros del PDF`);
          await setImportedData(processedData);
          setError(null);
          
          const recordCount = processedData.length;
          const columnCount = processedData.length > 0 ? Object.keys(processedData[0]).length : 0;
          const successMsg = `Archivo PDF importado exitosamente. Se cargaron ${recordCount} registros con ${columnCount} columnas detectadas.`;
          setSuccessMessage(successMsg);
          
          addImportRecord({
            fileName: file.name,
            fileType: 'PDF',
            recordCount: recordCount,
            columnCount: columnCount,
            status: 'success',
            errorMessage: null
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Error procesando archivo PDF: ${errorMessage}`);
        
        addImportRecord({
          fileName: file.name,
          fileType: 'PDF',
            recordCount: 0,
            status: 'error',
            errorMessage: errorMessage
          });
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
      setError(null);
      setSuccessMessage(null);
      const file = acceptedFiles[0];
      if (file) {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          processCSV(file);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          processPDF(file);
        } else if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          processExcel(file);
        } else {
          setError('Tipo de archivo no soportado');
        }
      }
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
      onDrop,
      noClick: true,
      noKeyboard: true,
      accept: {
        'text/csv': ['.csv'],
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls']
      }
    });

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Importar Balance de Comprobación</CardTitle>
          <CardDescription>
            Arrastra y suelta o haz clic para seleccionar un archivo CSV, Excel o PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isProcessing ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}>
            <input {...getInputProps()} disabled={isProcessing} />
            {isProcessing ? (
              <div className="text-blue-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Procesando archivo...</p>
              </div>
            ) : isDragActive ? (
              <p className="text-blue-600">Suelta el archivo para importarlo...</p>
            ) : (
              <div className="text-gray-500">
                <p>Arrastra y suelta un archivo aquí</p>
                <p className="my-4">o</p>
                <Button type="button" onClick={open}>
                  Seleccionar Archivo
                </Button>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <p className="font-bold">Éxito</p>
              <p>{successMessage}</p>
            </div>
          )}
          {showValidation && validationResult && (
            <ValidationDisplay 
              validationResult={validationResult}
              onClose={() => setShowValidation(false)}
            />
          )}
          {showDateConfirmation && dateValidationResult && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Discrepancia de Fechas Detectada
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p><strong>Fecha del balance:</strong> {dateValidationResult.balanceDate}</p>
                    <p><strong>Período seleccionado:</strong> {selectedPeriod?.name}</p>
                    <p className="mt-2">{dateValidationResult.message}</p>
                    {dateValidationResult.suggestedPeriods && dateValidationResult.suggestedPeriods.length > 0 && (
                       <div className="mt-2">
                         <p><strong>Períodos sugeridos:</strong></p>
                         <ul className="list-disc list-inside ml-2">
                           {dateValidationResult.suggestedPeriods.map((period: any, index: number) => (
                             <li key={index}>{period.period_name}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <Button 
                      onClick={confirmImportWithDateDiscrepancy}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Continuar de todas formas
                    </Button>
                    <Button 
                      onClick={cancelImport}
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  export default DataImport;
