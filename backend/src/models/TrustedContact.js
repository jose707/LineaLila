// backend/src/models/TrustedContact.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TrustedContact = sequelize.define(
  'TrustedContact',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del contacto de confianza',
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Número de teléfono del contacto',
    },
    relation: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Relación con el usuario (ej: madre, amigo, etc.)',
    },
  },
  {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'trusted_contacts',
  },
);

module.exports = TrustedContact;
