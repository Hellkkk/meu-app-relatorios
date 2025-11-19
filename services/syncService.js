const fs = require('fs');
const path = require('path');
const { parseExcelFile } = require('../utils/excelParser');
const { getExcelFilePath } = require('../utils/excelFileDiscovery');
const PurchaseRecord = require('../models/PurchaseRecord');
const SalesRecord = require('../models/SalesRecord');
const Company = require('../models/Company');

/**
 * Sync Excel data to database for a specific company and type
 * @param {string} companyId - MongoDB ObjectId of the company
 * @param {string} type - 'purchases' or 'sales'
 * @returns {Object} - { success, inserted, stats, lastSyncAt }
 */
async function syncExcelToDb(companyId, type) {
  if (!['purchases', 'sales'].includes(type)) {
    throw new Error('Invalid type. Must be "purchases" or "sales"');
  }

  // 1. Find the company and get the correct file path
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  const reportPath = type === 'purchases' 
    ? company.purchasesReportPath 
    : company.salesReportPath;

  if (!reportPath) {
    throw new Error(`No ${type} report path configured for this company`);
  }

  // 2. Get absolute file path and verify it exists
  const filePath = getExcelFilePath(reportPath);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${reportPath}`);
  }

  // 3. Parse the Excel file with canonical fields
  console.log(`[SYNC] Parsing ${type} file: ${filePath}`);
  const records = parseExcelFile(filePath, type);
  
  if (!records || records.length === 0) {
    throw new Error('No valid records found in Excel file');
  }

  console.log(`[SYNC] Parsed ${records.length} records from Excel`);

  // 4. Delete old records for this company + type
  const Model = type === 'purchases' ? PurchaseRecord : SalesRecord;
  const deleteResult = await Model.deleteMany({ companyId });
  console.log(`[SYNC] Deleted ${deleteResult.deletedCount} old records`);

  // 5. Prepare records for insertion
  const recordsToInsert = records.map(record => {
    const doc = {
      companyId,
      tipo: type,
      numero_nfe: record.numero_nfe,
      cfop: record.cfop,
      valor_total: record.valor_total,
      icms: record.icms,
      ipi: record.ipi,
      pis: record.pis,
      cofins: record.cofins,
      bruto: record.bruto || 0
    };

    // Add type-specific fields
    if (type === 'purchases') {
      doc.fornecedor = record.fornecedor;
      doc.data_compra = new Date(record.data_compra);
    } else {
      doc.cliente = record.cliente;
      doc.data_emissao = new Date(record.data_emissao);
    }

    // Optionally store original row for auditing
    if (record.outras_info || record.__sourceRow !== undefined) {
      doc.originalRow = {
        sourceRow: record.__sourceRow,
        outras_info: record.outras_info
      };
    }

    return doc;
  });

  // 6. Bulk insert records in chunks for efficiency
  const CHUNK_SIZE = 1000;
  let totalInserted = 0;

  for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
    const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
    const insertResult = await Model.insertMany(chunk, { ordered: false });
    totalInserted += insertResult.length;
    console.log(`[SYNC] Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${insertResult.length} records`);
  }

  // 7. Calculate stats from inserted data
  const stats = await Model.aggregate([
    { $match: { companyId } },
    {
      $group: {
        _id: null,
        totalValue: { $sum: '$valor_total' },
        totalICMS: { $sum: '$icms' },
        totalIPI: { $sum: '$ipi' },
        totalPIS: { $sum: '$pis' },
        totalCOFINS: { $sum: '$cofins' },
        count: { $sum: 1 }
      }
    }
  ]);

  const statsData = stats[0] || {
    totalValue: 0,
    totalICMS: 0,
    totalIPI: 0,
    totalPIS: 0,
    totalCOFINS: 0,
    count: 0
  };

  const lastSyncAt = new Date();

  console.log(`[SYNC] Completed: ${totalInserted} records inserted`);
  console.log(`[SYNC] Stats:`, statsData);

  return {
    success: true,
    inserted: totalInserted,
    stats: statsData,
    lastSyncAt
  };
}

/**
 * Check if collection is empty for a company
 */
async function isCollectionEmpty(companyId, type) {
  const Model = type === 'purchases' ? PurchaseRecord : SalesRecord;
  const count = await Model.countDocuments({ companyId });
  return count === 0;
}

/**
 * Get file modification time
 */
function getFileMTime(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (error) {
    console.error('Error getting file mtime:', error);
    return null;
  }
}

module.exports = {
  syncExcelToDb,
  isCollectionEmpty,
  getFileMTime
};
