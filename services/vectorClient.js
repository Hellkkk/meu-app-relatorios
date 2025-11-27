const { QdrantClient } = require('@qdrant/js-client-rest');

// Configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'reports_ai';

// Embedding dimension for text-embedding-004
const EMBEDDING_DIMENSION = 768;

// Initialize client
let client = null;

/**
 * Check if Qdrant client is available (URL configured)
 */
function isAvailable() {
  return !!QDRANT_URL;
}

/**
 * Get the Qdrant client (lazy initialization)
 */
function getClient() {
  if (!client) {
    const config = {
      url: QDRANT_URL
    };
    
    if (QDRANT_API_KEY) {
      config.apiKey = QDRANT_API_KEY;
    }
    
    client = new QdrantClient(config);
  }
  
  return client;
}

/**
 * Ensure collection exists with proper configuration
 * @param {string} collectionName - Collection name (default: QDRANT_COLLECTION)
 */
async function ensureCollection(collectionName = QDRANT_COLLECTION) {
  const qdrant = getClient();
  
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: 'Cosine'
        }
      });
      console.log(`[Qdrant] Collection '${collectionName}' created with size=${EMBEDDING_DIMENSION}, distance=Cosine`);
    }
    
    return true;
  } catch (error) {
    console.error('[Qdrant] Error ensuring collection:', error.message);
    throw error;
  }
}

/**
 * Upsert points (embeddings) into collection
 * @param {Array} points - Array of points with id, vector, and payload
 * @param {string} collectionName - Collection name (default: QDRANT_COLLECTION)
 */
async function upsertPoints(points, collectionName = QDRANT_COLLECTION) {
  const qdrant = getClient();
  
  await ensureCollection(collectionName);
  
  await qdrant.upsert(collectionName, {
    points: points.map(p => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload
    }))
  });
  
  return points.length;
}

/**
 * Search for similar vectors in the collection
 * @param {number[]} queryVector - Query embedding vector
 * @param {number} topK - Number of results to return
 * @param {object} filter - Optional filter for payload fields
 * @param {string} collectionName - Collection name (default: QDRANT_COLLECTION)
 * @returns {Promise<Array>} Array of matching points with scores
 */
async function search(queryVector, topK = 8, filter = null, collectionName = QDRANT_COLLECTION) {
  const qdrant = getClient();
  
  const searchParams = {
    vector: queryVector,
    limit: topK,
    with_payload: true
  };
  
  if (filter) {
    searchParams.filter = filter;
  }
  
  const results = await qdrant.search(collectionName, searchParams);
  
  return results.map(r => ({
    id: r.id,
    score: r.score,
    payload: r.payload
  }));
}

/**
 * Delete points by filter
 * @param {object} filter - Filter for points to delete
 * @param {string} collectionName - Collection name (default: QDRANT_COLLECTION)
 */
async function deleteByFilter(filter, collectionName = QDRANT_COLLECTION) {
  const qdrant = getClient();
  
  await qdrant.delete(collectionName, {
    filter
  });
}

/**
 * Delete points by company ID and type
 * @param {string} companyId - Company ID
 * @param {string} type - Report type (purchases or sales)
 * @param {string} collectionName - Collection name (default: QDRANT_COLLECTION)
 */
async function deleteByCompanyAndType(companyId, type, collectionName = QDRANT_COLLECTION) {
  await deleteByFilter({
    must: [
      { key: 'companyId', match: { value: companyId } },
      { key: 'type', match: { value: type } }
    ]
  }, collectionName);
}

/**
 * Get collection info
 * @param {string} collectionName - Collection name (default: QDRANT_COLLECTION)
 */
async function getCollectionInfo(collectionName = QDRANT_COLLECTION) {
  const qdrant = getClient();
  
  try {
    const info = await qdrant.getCollection(collectionName);
    return info;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

module.exports = {
  isAvailable,
  getClient,
  ensureCollection,
  upsertPoints,
  search,
  deleteByFilter,
  deleteByCompanyAndType,
  getCollectionInfo,
  QDRANT_COLLECTION,
  EMBEDDING_DIMENSION
};
