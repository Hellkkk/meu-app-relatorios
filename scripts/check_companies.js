try {
  require('../routes/companies.js');
  console.log('companies.js loaded OK');
} catch (err) {
  console.error('Error loading companies.js:', err && err.stack || err);
  process.exit(1);
}
