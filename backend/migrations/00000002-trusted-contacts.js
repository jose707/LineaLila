'use strict';

/**
 * Migración: Tabla trusted_contacts
 * 
 * Crea la tabla para almacenar contactos de confianza (máx 3 por usuario).
 * Usado para el sistema de emergencias y notificaciones de seguridad.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = sql => queryInterface.sequelize.query(sql);

    // Crear tabla trusted_contacts
    await queryInterface.createTable('trusted_contacts', {
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
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      relation: {
        type: Sequelize.STRING,
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

    // Crear índice en user_id
    await queryInterface.addIndex('trusted_contacts', ['user_id'], {
      name: 'idx_trusted_contacts_user',
    });

    // Crear restricción UNIQUE (user_id, phone)
    await q(`
      ALTER TABLE trusted_contacts 
      ADD CONSTRAINT uq_trusted_contact UNIQUE (user_id, phone);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trusted_contacts');
  },
};
