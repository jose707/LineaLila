// backend/src/models/Ride.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');

const Ride = sequelize.define(
  'Ride',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    passengerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id',
      },
      comment:
        'Referencia a Driver.id (solo conductores aprobados pueden tener rides)',
    },
    pickupLocation: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        latitude: null,
        longitude: null,
        address: null,
      },
    },
    dropoffLocation: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        latitude: null,
        longitude: null,
        address: null,
      },
    },
    distance: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER, // 🔥 En SEGUNDOS (no minutos)
      allowNull: false,
    },
    baseFare: {
      type: DataTypes.FLOAT,
      defaultValue: 3.0,
    },
    farePerKm: {
      type: DataTypes.FLOAT,
      defaultValue: 1.2,
    },
    farePerMinute: {
      type: DataTypes.FLOAT,
      defaultValue: 0.15,
    },
    totalFare: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    discountAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    promoCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    finalFare: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'requested',
        'accepted',
        'in_progress',
        'completed',
        'cancelled',
      ),
      defaultValue: 'requested',
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'wallet'),
      defaultValue: 'cash',
    },
    driverRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    driverReview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    passengerRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    passengerReview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: () => new Date(),
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellationReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancelledBy: {
      type: DataTypes.ENUM('passenger', 'driver', 'system'),
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    counterOffers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de contraofertas enviadas por conductores',
    },
  },
  {
    timestamps: true,
    tableName: 'rides',
  },
);

module.exports = Ride;
