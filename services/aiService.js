const { v4: uuidv4 } = require('uuid');
const geminiClient = require('./geminiClient');
const vectorClient = require('./vectorClient');
const Company = require('../models/Company');
const ReportAI = require('../models/ReportAI');
const { getExcelFilePath } = require('../utils/excelFileDiscovery');
const { parseExcelFile } = require('../utils/excelParser');

// Configuration
const AI_MAX_RECORDS_TO_SAMPLE = parseInt(process.env.AI_MAX_RECORDS_TO_SAMPLE) || 200;
const CHUNK_SIZE = 10; // Number of records per chunk for embeddings

/**
 * Check if AI services are available
 */
function isAIAvailable() {
  return geminiClient.isAvailable() && vectorClient.isAvailable();
}

/**
 * Get AI availability status
 */
function getAIStatus() {
  return {
    available: isAIAvailable(),
    gemini: geminiClient.isAvailable(),
    qdrant: vectorClient.isAvailable()
  };
}

/**
 * Load and parse records from company's Excel file
 * @param {object} company - Company document
 * @param {string} type - 'purchases' or 'sales'
 * @returns {Array} Parsed records
 */
async function loadRecordsFromCompany(company, type) {
  const reportPath = type === 'purchases' 
    ? company.purchasesReportPath 
    : company.salesReportPath;
  
  if (!reportPath) {
    throw new Error(`Nenhum arquivo de relatório de ${type === 'purchases' ? 'Compras' : 'Vendas'} configurado para esta empresa`);
  }
  
  const filePath = getExcelFilePath(reportPath);
  
  if (!filePath) {
    throw new Error('Arquivo de relatório não encontrado');
  }
  
  return parseExcelFile(filePath, type);
}

/**
 * Sample records for AI processing (to manage costs and latency)
 * @param {Array} records - Full list of records
 * @param {number} maxSamples - Maximum number of samples
 * @returns {Array} Sampled records
 */
function sampleRecords(records, maxSamples = AI_MAX_RECORDS_TO_SAMPLE) {
  if (records.length <= maxSamples) {
    return records;
  }
  
  // Sample evenly distributed records
  const step = Math.floor(records.length / maxSamples);
  const sampled = [];
  
  for (let i = 0; i < records.length && sampled.length < maxSamples; i += step) {
    sampled.push(records[i]);
  }
  
  return sampled;
}

/**
 * Build prompt for summary generation (Portuguese)
 * @param {Array} records - Sampled records
 * @param {string} type - 'purchases' or 'sales'
 * @param {string} companyName - Company name
 * @returns {string} Prompt for Gemini
 */
function buildSummaryPrompt(records, type, companyName) {
  const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
  const dateField = type === 'purchases' ? 'data_compra' : 'data_emissao';
  const typeLabel = type === 'purchases' ? 'Compras' : 'Vendas';
  
  // Aggregate stats for prompt context
  let totalValue = 0;
  let totalICMS = 0;
  let totalIPI = 0;
  let totalCOFINS = 0;
  let totalPIS = 0;
  const entitiesMap = {};
  const monthsMap = {};
  
  records.forEach(record => {
    totalValue += record.valor_total || 0;
    totalICMS += record.icms || 0;
    totalIPI += record.ipi || 0;
    totalCOFINS += record.cofins || 0;
    totalPIS += record.pis || 0;
    
    const entity = record[entityField] || 'Não informado';
    if (!entitiesMap[entity]) {
      entitiesMap[entity] = { total: 0, count: 0 };
    }
    entitiesMap[entity].total += record.valor_total || 0;
    entitiesMap[entity].count += 1;
    
    const dateStr = record[dateField];
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = { total: 0, count: 0 };
        }
        monthsMap[monthKey].total += record.valor_total || 0;
        monthsMap[monthKey].count += 1;
      }
    }
  });
  
  // Top entities
  const topEntities = Object.entries(entitiesMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, data]) => `${name}: R$ ${data.total.toFixed(2)} (${data.count} registros)`);
  
  // Monthly trends
  const monthlyTrends = Object.entries(monthsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => `${month}: R$ ${data.total.toFixed(2)} (${data.count} registros)`);
  
  const prompt = `
Você é um analista financeiro brasileiro especializado em relatórios fiscais e contábeis.
Analise os dados de ${typeLabel} da empresa "${companyName}" e gere um resumo executivo em português brasileiro.

DADOS AGREGADOS:
- Total de registros na amostra: ${records.length}
- Valor Total: R$ ${totalValue.toFixed(2)}
- Total ICMS: R$ ${totalICMS.toFixed(2)}
- Total IPI: R$ ${totalIPI.toFixed(2)}
- Total COFINS: R$ ${totalCOFINS.toFixed(2)}
- Total PIS: R$ ${totalPIS.toFixed(2)}
- Média por registro: R$ ${(totalValue / records.length).toFixed(2)}

TOP ${typeLabel === 'Compras' ? 'FORNECEDORES' : 'CLIENTES'}:
${topEntities.join('\n')}

EVOLUÇÃO MENSAL:
${monthlyTrends.join('\n')}

INSTRUÇÕES:
1. Gere um resumo conversacional em português brasileiro (3-5 parágrafos)
2. Cite métricas importantes: valor total, média, principais ${type === 'purchases' ? 'fornecedores' : 'clientes'}
3. Identifique tendências mensais (crescimento, queda, sazonalidade)
4. Aponte possíveis anomalias ou padrões interessantes (concentração em poucos ${type === 'purchases' ? 'fornecedores' : 'clientes'}, variações abruptas)
5. Evite mencionar nomes pessoais ou dados sensíveis específicos
6. Use linguagem profissional mas acessível
7. Formate valores em Real (R$) com duas casas decimais

RESUMO:
`;

  return prompt;
}

/**
 * Generate AI summary for a company's report
 * @param {string} companyId - Company ID
 * @param {string} type - 'purchases' or 'sales'
 * @param {boolean} force - Force regeneration even if cached
 * @returns {Promise<object>} Summary result
 */
async function generateSummary(companyId, type, force = false) {
  if (!geminiClient.isAvailable()) {
    throw new Error('Serviço de IA não disponível. Verifique a configuração de GOOGLE_API_KEY.');
  }
  
  const company = await Company.findById(companyId);
  if (!company || !company.isActive) {
    throw new Error('Empresa não encontrada ou inativa');
  }
  
  // Check cache
  if (!force) {
    const cached = await ReportAI.findOne({ company: companyId, type });
    if (cached && cached.summary) {
      return {
        summary: cached.summary,
        cached: true,
        updatedAt: cached.summaryUpdatedAt,
        recordsSampled: cached.meta?.recordsSampled || 0
      };
    }
  }
  
  // Load and sample records
  const records = await loadRecordsFromCompany(company, type);
  const sampledRecords = sampleRecords(records);
  
  // Build prompt and generate summary
  const prompt = buildSummaryPrompt(sampledRecords, type, company.name);
  const summary = await geminiClient.generateContent(prompt, {
    temperature: 0.7,
    maxOutputTokens: 1024
  });
  
  // Save to database
  const reportAI = await ReportAI.findOneAndUpdate(
    { company: companyId, type },
    {
      summary,
      summaryUpdatedAt: new Date(),
      meta: {
        recordsSampled: sampledRecords.length,
        totalRecords: records.length
      }
    },
    { upsert: true, new: true }
  );
  
  return {
    summary,
    cached: false,
    updatedAt: reportAI.summaryUpdatedAt,
    recordsSampled: sampledRecords.length
  };
}

/**
 * Create text chunks from records for embedding
 * @param {Array} records - Records to chunk
 * @param {string} type - 'purchases' or 'sales'
 * @param {string} companyId - Company ID
 * @returns {Array} Array of chunk objects
 */
function createChunks(records, type, companyId) {
  const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
  const dateField = type === 'purchases' ? 'data_compra' : 'data_emissao';
  const typeLabel = type === 'purchases' ? 'Compras' : 'Vendas';
  
  const chunks = [];
  
  // Strategy 1: Chunk by entity (supplier/customer)
  const byEntity = {};
  records.forEach(record => {
    const entity = record[entityField] || 'Não informado';
    if (!byEntity[entity]) {
      byEntity[entity] = [];
    }
    byEntity[entity].push(record);
  });
  
  for (const [entity, entityRecords] of Object.entries(byEntity)) {
    let totalValue = 0;
    let minDate = null;
    let maxDate = null;
    
    entityRecords.forEach(r => {
      totalValue += r.valor_total || 0;
      const date = new Date(r[dateField]);
      if (!isNaN(date.getTime())) {
        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;
      }
    });
    
    const dateRange = minDate && maxDate 
      ? `de ${minDate.toLocaleDateString('pt-BR')} a ${maxDate.toLocaleDateString('pt-BR')}`
      : '';
    
    const text = `${typeLabel} com ${entity}: ${entityRecords.length} registros, valor total R$ ${totalValue.toFixed(2)} ${dateRange}`.trim();
    
    chunks.push({
      id: uuidv4(),
      text,
      meta: {
        companyId,
        type,
        entity,
        totalValue,
        recordCount: entityRecords.length,
        chunkType: 'entity'
      }
    });
  }
  
  // Strategy 2: Chunk by blocks of N records (for general queries)
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const block = records.slice(i, i + CHUNK_SIZE);
    const blockSummary = block.map(r => {
      const entity = r[entityField] || 'N/A';
      const value = r.valor_total || 0;
      const date = r[dateField] ? new Date(r[dateField]).toLocaleDateString('pt-BR') : 'N/A';
      return `${entity}: R$ ${value.toFixed(2)} em ${date}`;
    }).join('; ');
    
    const text = `${typeLabel} bloco ${Math.floor(i / CHUNK_SIZE) + 1}: ${blockSummary}`;
    
    chunks.push({
      id: uuidv4(),
      text,
      meta: {
        companyId,
        type,
        blockIndex: Math.floor(i / CHUNK_SIZE),
        recordCount: block.length,
        chunkType: 'block'
      }
    });
  }
  
  return chunks;
}

/**
 * Index company records in Qdrant for semantic search
 * @param {string} companyId - Company ID
 * @param {string} type - 'purchases' or 'sales'
 * @returns {Promise<object>} Indexing result
 */
async function indexRecords(companyId, type) {
  if (!isAIAvailable()) {
    throw new Error('Serviços de IA não disponíveis. Verifique GOOGLE_API_KEY e QDRANT_URL.');
  }
  
  const company = await Company.findById(companyId);
  if (!company || !company.isActive) {
    throw new Error('Empresa não encontrada ou inativa');
  }
  
  // Load records
  const records = await loadRecordsFromCompany(company, type);
  const sampledRecords = sampleRecords(records);
  
  // Create chunks
  const chunks = createChunks(sampledRecords, type, companyId);
  
  // Delete existing points for this company/type
  await vectorClient.deleteByCompanyAndType(companyId, type);
  
  // Generate embeddings and upsert
  const points = [];
  for (const chunk of chunks) {
    const embedding = await geminiClient.generateEmbedding(chunk.text);
    points.push({
      id: chunk.id,
      vector: embedding,
      payload: {
        companyId,
        type,
        chunkId: chunk.id,
        text: chunk.text,
        meta: chunk.meta
      }
    });
  }
  
  await vectorClient.upsertPoints(points);
  
  // Update database
  await ReportAI.findOneAndUpdate(
    { company: companyId, type },
    {
      embeddingsIndexedAt: new Date(),
      chunks: chunks.length,
      meta: {
        recordsSampled: sampledRecords.length,
        totalRecords: records.length
      }
    },
    { upsert: true, new: true }
  );
  
  return {
    chunksIndexed: chunks.length,
    recordsProcessed: sampledRecords.length
  };
}

/**
 * Build NLQ prompt for answering questions
 * @param {string} question - User question
 * @param {Array} context - Retrieved context chunks
 * @returns {string} Prompt for Gemini
 */
function buildNLQPrompt(question, context) {
  const contextText = context.map((c, i) => `[${i + 1}] ${c.payload.text}`).join('\n');
  
  return `
Você é um assistente de análise financeira brasileiro. Responda à pergunta do usuário com base no contexto fornecido.
Use linguagem profissional em português brasileiro. Se a informação não estiver disponível no contexto, diga educadamente.

CONTEXTO DOS RELATÓRIOS:
${contextText}

PERGUNTA DO USUÁRIO:
${question}

INSTRUÇÕES:
1. Responda de forma direta e objetiva em português brasileiro
2. Cite números e valores quando relevante (em R$)
3. Mencione as fontes quando apropriado (ex: "conforme dados de Compras...")
4. Se não houver informação suficiente, indique isso claramente
5. Limite a resposta a 3-4 parágrafos

RESPOSTA:
`;
}

/**
 * Perform semantic search / NLQ query
 * @param {string} query - User query
 * @param {Array} accessibleCompanyIds - Company IDs the user can access (empty for admin)
 * @param {number} topK - Number of results to retrieve
 * @returns {Promise<object>} Search result with answer and sources
 */
async function semanticSearch(query, accessibleCompanyIds = [], topK = 8) {
  if (!isAIAvailable()) {
    throw new Error('Serviços de IA não disponíveis. Verifique GOOGLE_API_KEY e QDRANT_URL.');
  }
  
  // Generate embedding for query
  const queryEmbedding = await geminiClient.generateEmbedding(query);
  
  // Build filter for user's accessible companies
  let filter = null;
  if (accessibleCompanyIds && accessibleCompanyIds.length > 0) {
    filter = {
      must: [{
        key: 'companyId',
        match: {
          any: accessibleCompanyIds.map(id => id.toString())
        }
      }]
    };
  }
  
  // Search Qdrant
  const results = await vectorClient.search(queryEmbedding, topK, filter);
  
  if (results.length === 0) {
    return {
      answer: 'Não encontrei informações relevantes nos relatórios disponíveis para responder sua pergunta. Verifique se os dados foram indexados.',
      sources: []
    };
  }
  
  // Build prompt and generate answer
  const prompt = buildNLQPrompt(query, results);
  const answer = await geminiClient.generateContent(prompt, {
    temperature: 0.5,
    maxOutputTokens: 1024
  });
  
  // Extract unique sources
  const sourcesMap = new Map();
  results.forEach(r => {
    const key = `${r.payload.companyId}-${r.payload.type}`;
    if (!sourcesMap.has(key)) {
      sourcesMap.set(key, {
        companyId: r.payload.companyId,
        type: r.payload.type,
        chunkId: r.payload.chunkId,
        score: r.score
      });
    }
  });
  
  return {
    answer,
    sources: Array.from(sourcesMap.values())
  };
}

/**
 * Get user's accessible company IDs from req.user
 * Handles both populated companies and ObjectId arrays
 * @param {object} user - User object from req.user
 * @returns {Array<string>} Array of company ID strings
 */
function getUserAccessibleCompanyIds(user) {
  if (!user) return [];
  
  // Admin has access to all companies (return empty array to bypass filter)
  if (user.role === 'admin' || (user.isAdmin && typeof user.isAdmin === 'function' && user.isAdmin())) {
    return [];
  }
  
  // Normalize companies array (may be populated or just ObjectIds)
  const companies = user.companies || [];
  return companies.map(c => {
    const id = c && c._id ? c._id : c;
    return id.toString();
  });
}

module.exports = {
  isAIAvailable,
  getAIStatus,
  loadRecordsFromCompany,
  sampleRecords,
  generateSummary,
  indexRecords,
  semanticSearch,
  getUserAccessibleCompanyIds,
  AI_MAX_RECORDS_TO_SAMPLE
};
