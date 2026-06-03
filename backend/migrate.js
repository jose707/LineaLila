const sequelize = require('./src/config/database');
const initialSchema = require('./migrations/00000000-initial-schema');
const rideWaypoints = require('./migrations/00000001-ride-waypoints');
const trustedContacts = require('./migrations/00000002-trusted-contacts');
const panicEvents = require('./migrations/00000003-panic-events');
const alterNotificationType = require('./migrations/00000004-alter-notification-type');

const runMigrations = async () => {
  const migrations = [
    { name: '00000000-initial-schema', migration: initialSchema },
    { name: '00000001-ride-waypoints', migration: rideWaypoints },
    { name: '00000002-trusted-contacts', migration: trustedContacts },
    { name: '00000003-panic-events', migration: panicEvents },
    { name: '00000004-alter-notification-type', migration: alterNotificationType },
  ];

  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    let successCount = 0;
    let skipCount = 0;

    for (const { name, migration } of migrations) {
      try {
        console.log(`🔄 Ejecutando migración: ${name}`);
        await migration.up(sequelize.queryInterface, sequelize.Sequelize);
        console.log(`✅ ${name} completada exitosamente\n`);
        successCount++;
      } catch (error) {
        const errorMsg = error.message.toLowerCase();
        // Ignorar errores si la migración ya fue ejecutada
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate key') ||
          errorMsg.includes('ya existe') ||
          errorMsg.includes('clave duplicada') ||
          errorMsg.includes('type') ||
          errorMsg.includes('tipo')
        ) {
          console.log(`⚠️  ${name} ya fue ejecutada o parcialmente completada (ignorando)\n`);
          skipCount++;
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ Proceso completado: ${successCount} exitosas, ${skipCount} omitidas`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar migraciones:', error.message);
    process.exit(1);
  }
};

runMigrations();
