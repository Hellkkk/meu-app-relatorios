const fs = require('fs');
const path = require('path');

/**
 * Descobre todos os arquivos .xlsx em um diretório
 * @param {string} directory - Diretório para buscar arquivos (default: raiz do projeto)
 * @returns {Array} Array de objetos com informações dos arquivos
 */
function discoverExcelFiles(directory = null) {
  const baseDir = directory || process.env.EXCEL_FILES_DIR || path.resolve(__dirname, '..');
  
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Diretório não encontrado: ${baseDir}`);
  }

  const files = [];
  
  try {
    const entries = fs.readdirSync(baseDir);
    
    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry);
      
      // Apenas arquivos .xlsx (não diretórios)
      if (fs.statSync(fullPath).isFile() && entry.toLowerCase().endsWith('.xlsx')) {
        const stats = fs.statSync(fullPath);
        
        files.push({
          filename: entry,
          path: fullPath,
          relativePath: path.relative(path.resolve(__dirname, '..'), fullPath),
          size: stats.size,
          mtime: stats.mtime,
          mtimeMs: stats.mtimeMs
        });
      }
    }
  } catch (error) {
    console.error('Erro ao ler diretório:', error);
    throw new Error(`Erro ao listar arquivos: ${error.message}`);
  }
  
  // Ordenar por nome
  files.sort((a, b) => a.filename.localeCompare(b.filename));
  
  return files;
}

/**
 * Verifica se um arquivo Excel existe
 * @param {string} relativePath - Caminho relativo do arquivo
 * @returns {boolean}
 */
function excelFileExists(relativePath) {
  if (!relativePath) return false;
  
  const projectRoot = path.resolve(__dirname, '..');
  const fullPath = path.isAbsolute(relativePath) 
    ? relativePath 
    : path.resolve(projectRoot, relativePath);
  
  return fs.existsSync(fullPath) && fullPath.toLowerCase().endsWith('.xlsx');
}

/**
 * Obtém o caminho absoluto de um arquivo Excel
 * @param {string} relativePath - Caminho relativo do arquivo
 * @returns {string|null} Caminho absoluto ou null se não existir
 */
function getExcelFilePath(relativePath) {
  if (!relativePath) return null;
  
  const projectRoot = path.resolve(__dirname, '..');
  const fullPath = path.isAbsolute(relativePath) 
    ? relativePath 
    : path.resolve(projectRoot, relativePath);
  
  if (excelFileExists(relativePath)) {
    return fullPath;
  }
  
  return null;
}

module.exports = {
  discoverExcelFiles,
  excelFileExists,
  getExcelFilePath
};
