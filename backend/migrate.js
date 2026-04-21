const sequelize = require('./src/config/database');

const runMigrations = async () => {
  try {
    console.log('🔄 Ejecutando migraciones...');

    // Import all migrations from the migrations folder


    // Run each migration
    for (const migration of migrations) {
      console.log(`📝 Ejecutando: ${migration.name || 'Migración sin nombre'}`);
      await migration.up(sequelize.queryInterface, sequelize.Sequelize);
      console.log(`✅ Completado: ${migration.name || 'Migración sin nombre'}`);
    }

    console.log('✅ Todas las migraciones completadas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar migraciones:', error.message);
    process.exit(1);
  }
};

runMigrations();
