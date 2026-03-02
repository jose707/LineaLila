// LineaLila Backend - PostgreSQL + Sequelize
// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const sequelize = require('./config/database');

// Importar modelos ANTES de sincronizar
const User = require('./models/User');
const Driver = require('./models/Driver');
const Ride = require('./models/Ride');
const DriverRequest = require('./models/DriverRequest');
const RequestFile = require('./models/RequestFile');

// Importar y configurar asociaciones
const setupAssociations = require('./models/associations');
setupAssociations();

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());

// CORS
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.FRONTEND_MOBILE || 'http://localhost:8081',
    ],
    credentials: true,
  }),
);

// Parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir archivos estáticos de uploads CON HEADERS ANTI-CACHE
app.use(
  '/uploads',
  (req, res, next) => {
    // Agregar headers para prevenir caching
    res.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    );
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  },
  express.static(path.join(__dirname, './uploads')),
);

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/requests', require('./routes/requests')); // Nuevo: manejar requests versionadas
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

// Sincronizar base de datos y iniciar servidor
const startServer = async () => {
  try {
    // Sincronizar base de datos - usar alter: true para actualizar tablas
    const syncOptions = {
      alter: true, // Permite alterar/crear tablas sin perder datos
      logging: console.log, // Log para debug
    };

    console.log('🔄 Sincronizando base de datos...');
    await sequelize.sync(syncOptions);
    console.log('✅ Base de datos sincronizada correctamente\n');

    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
