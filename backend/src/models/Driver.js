// backend/src/models/Driver.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');

const Driver = sequelize.define(
  'Driver',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    licenseExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    vehicleType: {
      type: DataTypes.ENUM('sedan', 'suv', 'van', 'motorcycle'),
      allowNull: true,
    },
    vehiclePlate: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    vehicleYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    vehicleColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vehicleModel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documents: {
      type: DataTypes.JSON,
      defaultValue: {
        soatPhoto: null,
        ruatPhoto: null,
        licensePhoto: null,
      },
    },
    backgroundCheckPassed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    rejectionReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankAccount: {
      type: DataTypes.JSON,
      defaultValue: {
        accountHolder: null,
        accountNumber: null,
        bankName: null,
      },
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    totalEarnings: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalRides: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    currentLocation: {
      type: DataTypes.JSON,
      defaultValue: {
        latitude: null,
        longitude: null,
        timestamp: null,
      },
    },
  },
  {
    timestamps: true,
    tableName: 'drivers',
  },
);

module.exports = Driver;
