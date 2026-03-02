// Script para sincronizar la BD con los modelos
// Uso: node src/scripts/syncDatabase.js

const sequelize = require('../config/database');

// Importar modelos
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const DriverRequest = require('../models/DriverRequest');
const RequestFile = require('../models/RequestFile');

// Importar asociaciones
const setupAssociations = require('../models/associations');
setupAssociations();

const syncDatabase = async () => {
  try {
    console.log('🔄 Sincronizando BD con los modelos...');

    // Sincronizar con alter: true para actualizar tablas existentes
    await sequelize.sync({
      alter: true, // Permite modificar tablas sin perder datos
      logging: console.log,
    });

    console.log('✅ BD sincronizada exitosamente');
    console.log('📋 Tablas creadas/actualizadas:');
    console.log('  - users');
    console.log('  - drivers');
    console.log('  - rides');
    console.log('  - driver_requests');
    console.log('  - request_files');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando BD:', error);
    process.exit(1);
  }
};

syncDatabase();
