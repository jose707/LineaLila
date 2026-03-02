const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RequestFile = sequelize.define(
  'RequestFile',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      // Referencias foráneas se definen en associations.js
    },
    fileType: {
      type: DataTypes.ENUM(
        'profilePhoto',
        'ciFront',
        'ciBack',
        'antecedentsPhoto',
        'carFront',
        'carBack',
        'carLeft',
        'carRight',
        'soatPhoto',
        'ruatPhoto',
      ),
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'request_files',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['requestId', 'fileType'],
        name: 'unique_request_file_type',
      },
    ],
  },
);

module.exports = RequestFile;
