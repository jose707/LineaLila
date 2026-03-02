// Script para sincronizar la BD y crear tablas nuevas
const sequelize = require('./backend/src/config/database');

// Importar modelos
const User = require('./backend/src/models/User');
const Driver = require('./backend/src/models/Driver');
const Ride = require('./backend/src/models/Ride');
const DriverRequest = require('./backend/src/models/DriverRequest');
const RequestFile = require('./backend/src/models/RequestFile');

async function syncDatabase() {
  try {
    console.log('🔄 Sincronizando base de datos...\n');

    // Sincronizar con force: true para recrear tablas
    await sequelize.sync({ force: false, alter: true });

    console.log('✅ Base de datos sincronizada correctamente\n');

    // Verificar tablas creadas
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 TABLAS CREADAS:');
    console.log('==================');
    const relevantTables = tables[0].filter(row =>
      ['Driver', 'User', 'Ride', 'Request'].some(t =>
        row.table_name.includes(t),
      ),
    );

    relevantTables.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });

    // Detalles de DriverRequests
    console.log('\n📋 ESTRUCTURA DriverRequests:');
    const driverRequestCols = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'DriverRequests'
      ORDER BY ordinal_position;
    `);

    if (driverRequestCols[0].length > 0) {
      driverRequestCols[0].forEach(col => {
        console.log(`  ✓ ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('  ❌ Tabla DriverRequests no encontrada');
    }

    // Detalles de RequestFiles
    console.log('\n📋 ESTRUCTURA RequestFiles:');
    const requestFileCols = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'RequestFiles'
      ORDER BY ordinal_position;
    `);

    if (requestFileCols[0].length > 0) {
      requestFileCols[0].forEach(col => {
        console.log(`  ✓ ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('  ❌ Tabla RequestFiles no encontrada');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error sincronizando:', error);
    process.exit(1);
  }
}

syncDatabase();
