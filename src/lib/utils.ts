// Utilidades de texto
export const normalizeText = (text: string): string => {
    return text
        .normalize('NFD')                    // separa acentos
        .replace(/[\u0300-\u036f]/g, '')   // elimina marcas diacríticas
        .replace(/[^a-zA-Z0-9]/g, '_')       // reemplaza no‐alfanuméricos por “_”
        .toLowerCase();                      // minúsculas
};