'use strict';

/**
 * Migración: Agregar 'panic' al ENUM notification_type
 * 
 * Extiende el ENUM de tipos de notificaciones con el nuevo tipo 'panic'
 * para notificaciones relacionadas con eventos de pánico.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = sql => queryInterface.sequelize.query(sql);

    // Agregar el nuevo valor 'panic' al ENUM notification_type
    await q(`
      ALTER TYPE notification_type ADD VALUE 'panic';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Nota: No podemos eliminar valores de un ENUM en PostgreSQL.
    // Solo podemos renombrar el tipo y recrearlo sin el valor.
    // En este caso, dejamos que el rollback sea manual o simplemente no hacemos nada.
    console.log('⚠️  Rollback no soportado para ENUM. Elimina manualmente el valor "panic" si es necesario.');
  },
};
