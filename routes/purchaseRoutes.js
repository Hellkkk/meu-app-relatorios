const express = require('express');
const router = express.Router();
const multer = require('multer');
const purchaseController = require('../controllers/purchaseController');
const { authenticate } = require('../middleware/authorization');

// Configurar multer para armazenamento em memória
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos .xlsx e .xls (verificar MIME type e extensão)
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream' // Alguns sistemas enviam como octet-stream
    ];
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const allowedExtensions = ['xlsx', 'xls'];
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Apenas arquivos .xlsx e .xls são permitidos. Recebido: ${file.mimetype}, extensão: ${fileExtension}`));
    }
  }
});

// @route   POST /api/purchases/upload
// @desc    Upload e processamento de planilha Excel
// @access  Private (autenticado)
router.post('/upload', authenticate, upload.single('file'), purchaseController.uploadExcel);

// @route   POST /api/purchases/reload-repo
// @desc    Recarregar dados da planilha do repositório
// @access  Private (autenticado)
router.post('/reload-repo', authenticate, purchaseController.reloadFromRepo);

// @route   GET /api/purchases
// @desc    Listar compras com paginação e filtros
// @access  Private (autenticado)
router.get('/', authenticate, purchaseController.listPurchases);

module.exports = router;
