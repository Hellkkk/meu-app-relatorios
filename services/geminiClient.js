const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

// Initialize client
let genAI = null;

/**
 * Check if Gemini client is available (API key configured)
 */
function isAvailable() {
  return !!GOOGLE_API_KEY;
}

/**
 * Get the GoogleGenerativeAI instance (lazy initialization)
 */
function getClient() {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY não configurada. Configure a variável de ambiente para usar funcionalidades de IA.');
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  }
  
  return genAI;
}

/**
 * Generate text content using Gemini
 * @param {string} prompt - The prompt to send to the model
 * @param {object} options - Optional configuration
 * @returns {Promise<string>} Generated text
 */
async function generateContent(prompt, options = {}) {
  const client = getClient();
  const model = client.getGenerativeModel({ 
    model: options.model || GEMINI_MODEL,
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxOutputTokens || 2048,
      ...options.generationConfig
    }
  });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Generate embeddings for text using Gemini
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} Embedding vector (768 dimensions for text-embedding-004)
 */
async function generateEmbedding(text) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts (batch)
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateEmbeddings(texts) {
  const embeddings = [];
  
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }
  
  return embeddings;
}

module.exports = {
  isAvailable,
  getClient,
  generateContent,
  generateEmbedding,
  generateEmbeddings,
  GEMINI_MODEL,
  GEMINI_EMBEDDING_MODEL
};
