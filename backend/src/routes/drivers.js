// backend/src/routes/drivers.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const driverController = require('../controllers/driverController');
const { authMiddleware } = require('../middleware/auth');

// Configurar multer para subida de archivos
const uploadDir = path.join(__dirname, '../uploads/drivers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPEG/PNG'));
    }
  },
});

// Campos de archivo esperados
const uploadFields = upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'ciFront', maxCount: 1 },
  { name: 'ciBack', maxCount: 1 },
  { name: 'antecedentsPhoto', maxCount: 1 },
  { name: 'carFront', maxCount: 1 },
  { name: 'carBack', maxCount: 1 },
  { name: 'carLeft', maxCount: 1 },
  { name: 'carRight', maxCount: 1 },
  { name: 'soatPhoto', maxCount: 1 },
  { name: 'ruatPhoto', maxCount: 1 },
]);

// Public routes
router.post(
  '/register',
  authMiddleware,
  uploadFields,
  driverController.registerDriver,
);

// Resubmit documents for rejected application
router.post(
  '/resubmit',
  authMiddleware,
  uploadFields,
  driverController.resubmitDocuments,
);

// Get driver status for current user
router.get('/status', authMiddleware, driverController.getDriverStatus);

// 📍 Actualizar ubicación del conductor en tiempo real
router.put('/location', authMiddleware, driverController.updateDriverLocation);

// Serve driver documents with anti-cache headers
router.get('/document/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/drivers', filename);

  // Validar que el archivo solicitado está dentro del directorio de uploads
  const normalizedPath = path.normalize(filepath);
  const uploadDirNormalized = path.normalize(uploadDir);
  if (!normalizedPath.startsWith(uploadDirNormalized)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  // Agregar headers anti-cache
  res.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  );
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  res.sendFile(filepath);
});

module.exports = router;
