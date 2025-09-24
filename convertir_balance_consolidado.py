#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conversor del Balance Consolidado Automático al Formato Estándar

Este script convierte el archivo Balance_Consolidado_Automatico.xlsx
al formato estándar CSV recomendado para el sistema de estados financieros.

Autor: Sistema IA Estados Financieros
Fecha: 2025
"""

import pandas as pd
import numpy as np
from datetime import datetime
import re

def extraer_metadatos(df):
    """
    Extrae metadatos del balance consolidado automático
    """
    metadatos = {}
    
    # Buscar información del sistema
    for i in range(min(10, len(df))):
        fila = df.iloc[i]
        texto = str(fila[1]) if pd.notna(fila[1]) else ""
        
        if "Profit Plus" in texto:
            metadatos['sistema'] = "Profit Plus Contabilidad"
        
        if "Fecha:Desde" in texto:
            # Extraer fechas del período
            match = re.search(r'Desde (\d{2}/\d{2}/\d{4}) Hasta (\d{2}/\d{2}/\d{4})', texto)
            if match:
                metadatos['fecha_desde'] = match.group(1)
                metadatos['fecha_hasta'] = match.group(2)
        
        if "Fecha:" in str(fila[6]):
            # Extraer fecha de generación
            fecha_gen = str(fila[6]).replace('Fecha:', '').strip()
            metadatos['fecha_generacion'] = fecha_gen
    
    return metadatos

def limpiar_datos_balance(df):
    """
    Limpia y normaliza los datos del balance
    """
    # Encontrar el inicio de los datos (después de los encabezados)
    inicio_datos = None
    for i, fila in df.iterrows():
        if str(fila[1]) == 'Código' and str(fila[2]) == 'Descripción':
            inicio_datos = i + 1
            break
    
    if inicio_datos is None:
        raise ValueError("No se encontró el inicio de los datos")
    
    # Extraer datos desde el inicio identificado
    datos = df.iloc[inicio_datos:].copy()
    
    # Asignar nombres de columnas
    datos.columns = ['Tabla', 'Codigo', 'Descripcion', 'Col3', 
                    'SaldoInicial', 'Debitos', 'Col6', 'Creditos', 
                    'SaldoActual', 'Col9']
    
    # Filtrar solo filas con código válido
    datos = datos[datos['Codigo'].notna() & 
                 (datos['Codigo'] != 'Código') &
                 (datos['Codigo'].str.strip() != '')].copy()
    
    # Limpiar y convertir valores numéricos
    columnas_numericas = ['SaldoInicial', 'Debitos', 'Creditos', 'SaldoActual']
    
    for col in columnas_numericas:
        datos[col] = pd.to_numeric(datos[col], errors='coerce').fillna(0)
    
    # Limpiar códigos y descripciones
    datos['Codigo'] = datos['Codigo'].str.strip()
    datos['Descripcion'] = datos['Descripcion'].str.strip()
    
    return datos[['Codigo', 'Descripcion', 'SaldoInicial', 'Debitos', 'Creditos', 'SaldoActual']]

def determinar_naturaleza_cuenta(codigo):
    """
    Determina la naturaleza de la cuenta basada en el código
    """
    # Convertir a string si no lo es
    codigo_str = str(codigo).strip()
    
    if codigo_str.startswith('1') or codigo_str.startswith('2'):
        return 'Deudora'  # Activos
    elif codigo_str.startswith('3'):
        return 'Acreedora'  # Pasivos
    elif codigo_str.startswith('4'):
        return 'Acreedora'  # Patrimonio
    elif codigo_str.startswith('5'):
        return 'Deudora'    # Ingresos (en seguros puede variar)
    elif codigo_str.startswith('6'):
        return 'Deudora'    # Gastos
    else:
        return 'Deudora'    # Por defecto

def convertir_a_formato_estandar(archivo_excel, archivo_salida=None):
    """
    Convierte el balance consolidado automático al formato estándar
    """
    print(f"Procesando archivo: {archivo_excel}")
    
    # Leer archivo Excel
    try:
        df = pd.read_excel(archivo_excel, header=None)
        print(f"Archivo leído exitosamente. Dimensiones: {df.shape}")
    except Exception as e:
        print(f"Error al leer el archivo: {e}")
        return None
    
    # Extraer metadatos
    metadatos = extraer_metadatos(df)
    print(f"Metadatos extraídos: {metadatos}")
    
    # Limpiar y procesar datos
    try:
        datos_limpios = limpiar_datos_balance(df)
        print(f"Datos procesados: {len(datos_limpios)} registros")
    except Exception as e:
        print(f"Error al procesar datos: {e}")
        return None
    
    # Agregar campos del formato estándar
    datos_estandar = datos_limpios.copy()
    
    # Determinar naturaleza de cada cuenta
    datos_estandar['Naturaleza'] = datos_estandar['Codigo'].apply(determinar_naturaleza_cuenta)
    
    # Calcular nivel jerárquico
    datos_estandar['Nivel'] = datos_estandar['Codigo'].apply(
        lambda x: len([p for p in str(x).split('-') if p.strip()]) if pd.notna(x) else 1
    )
    
    # Agregar metadatos como campos
    datos_estandar['FechaPeriodo'] = metadatos.get('fecha_hasta', '')
    datos_estandar['SistemaOrigen'] = metadatos.get('sistema', 'Profit Plus')
    
    # Reordenar columnas según formato estándar
    columnas_finales = [
        'Codigo', 'Descripcion', 'Naturaleza', 'Nivel',
        'SaldoInicial', 'Debitos', 'Creditos', 'SaldoActual',
        'FechaPeriodo', 'SistemaOrigen'
    ]
    
    datos_estandar = datos_estandar[columnas_finales]
    
    # Guardar archivo
    if archivo_salida is None:
        archivo_salida = archivo_excel.replace('.xlsx', '_formato_estandar.csv')
    
    try:
        datos_estandar.to_csv(archivo_salida, index=False, encoding='utf-8')
        print(f"Archivo convertido guardado en: {archivo_salida}")
    except Exception as e:
        print(f"Error al guardar archivo: {e}")
        return None
    
    # Mostrar estadísticas
    print("\n=== ESTADÍSTICAS DE CONVERSIÓN ===")
    print(f"Total de cuentas procesadas: {len(datos_estandar)}")
    print(f"Cuentas por nivel:")
    print(datos_estandar['Nivel'].value_counts().sort_index())
    print(f"\nCuentas por naturaleza:")
    print(datos_estandar['Naturaleza'].value_counts())
    
    # Validar balances
    total_debitos = datos_estandar['Debitos'].sum()
    total_creditos = datos_estandar['Creditos'].sum()
    diferencia = abs(total_debitos - total_creditos)
    
    print(f"\n=== VALIDACIÓN DE BALANCES ===")
    print(f"Total Débitos: ${total_debitos:,.2f}")
    print(f"Total Créditos: ${total_creditos:,.2f}")
    print(f"Diferencia: ${diferencia:,.2f}")
    
    if diferencia < 0.01:
        print("✅ Balance cuadrado")
    else:
        print("⚠️  Balance no cuadra - revisar datos")
    
    return datos_estandar

def main():
    """
    Función principal
    """
    archivo_entrada = "Balance_Consolidado_Automatico.xlsx"
    archivo_salida = "balance_consolidado_formato_estandar.csv"
    
    print("=== CONVERSOR BALANCE CONSOLIDADO AUTOMÁTICO ===")
    print(f"Fecha de procesamiento: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    resultado = convertir_a_formato_estandar(archivo_entrada, archivo_salida)
    
    if resultado is not None:
        print("\n✅ Conversión completada exitosamente")
        print(f"\nPrimeros 5 registros del archivo convertido:")
        print(resultado.head().to_string(index=False))
    else:
        print("\n❌ Error en la conversión")

if __name__ == "__main__":
    main()