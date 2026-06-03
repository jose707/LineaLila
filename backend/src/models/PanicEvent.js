// backend/src/models/PanicEvent.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const PanicEvent = sequelize.define(
  'PanicEvent',
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
    ride_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rides',
        key: 'id',
      },
      field: 'ride_id',
      comment: 'Nullable: el pánico puede ocurrir fuera de un viaje',
    },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false,
      comment: 'Ubicación donde se disparó el pánico (POINT WGS84)',
      field: 'location',
    },
    audio_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL del audio de 40 segundos del pánico (almacenado externamente)',
      field: 'audio_url',
    },
    triggered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha/hora cuando se disparó el botón de pánico',
      field: 'triggered_at',
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora cuando se resolvió el evento (si aplica)',
      field: 'resolved_at',
    },
  },
  {
    timestamps: false,
    tableName: 'panic_events',
  },
);

module.exports = PanicEvent;
