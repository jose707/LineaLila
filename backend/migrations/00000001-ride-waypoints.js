'use strict';

/**
 * Migración: Tabla ride_waypoints
 * 
 * Crea la tabla para almacenar las paradas intermedias de viajes.
 * Cada viaje puede tener múltiples paradas ordenadas por sequence.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = sql => queryInterface.sequelize.query(sql);

    // Crear tabla ride_waypoints
    await queryInterface.createTable('ride_waypoints', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      ride_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'rides',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      sequence: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      arrived_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      departed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Crear índices
    await queryInterface.addIndex('ride_waypoints', ['ride_id'], {
      name: 'idx_ride_waypoints_ride_id',
    });

    await q(`
      CREATE INDEX idx_ride_waypoints_geo ON ride_waypoints 
      USING GIST(location);
    `);

    // Crear restricción UNIQUE (ride_id, sequence)
    await q(`
      ALTER TABLE ride_waypoints 
      ADD CONSTRAINT uq_ride_waypoint UNIQUE (ride_id, sequence);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ride_waypoints');
  },
};
