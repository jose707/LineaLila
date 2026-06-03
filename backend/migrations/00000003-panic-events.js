'use strict';

/**
 * Migración: Tabla panic_events
 * 
 * Crea la tabla para almacenar eventos del botón de pánico (SOS).
 * Incluye ubicación, URL de audio (opcional), timestamps.
 * ride_id es nullable ya que el pánico puede ocurrir fuera de un viaje.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = sql => queryInterface.sequelize.query(sql);

    // Crear tabla panic_events
    await queryInterface.createTable('panic_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      ride_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'rides',
          key: 'id',
        },
      },
      location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false,
      },
      audio_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      triggered_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Crear índices
    await queryInterface.addIndex('panic_events', ['user_id'], {
      name: 'idx_panic_events_user',
    });

    await q(`
      CREATE INDEX idx_panic_events_geo ON panic_events 
      USING GIST(location);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('panic_events');
  },
};
