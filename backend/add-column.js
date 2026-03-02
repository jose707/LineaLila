// Script para agregar la columna counterOffers a la tabla rides
const sequelize = require('./src/config/database');
const { DataTypes } = require('sequelize');

async function addCounterOffersColumn() {
  try {
    console.log('🔄 Verificando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    console.log('📝 Agregando columna counterOffers a la tabla rides...');

    await sequelize.queryInterface.addColumn('rides', 'counterOffers', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de contraofertas enviadas por conductores',
    });

    console.log('✅ Columna counterOffers agregada exitosamente');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  La columna counterOffers ya existe');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await sequelize.close();
  }
}

addCounterOffersColumn();
