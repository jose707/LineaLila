// backend/src/models/associations.js
const Driver = require('./Driver');
const DriverRequest = require('./DriverRequest');
const RequestFile = require('./RequestFile');
const User = require('./User');
const Ride = require('./Ride');

// Definir asociaciones
const setupAssociations = () => {
  // Driver tiene muchos DriverRequests
  Driver.hasMany(DriverRequest, {
    foreignKey: 'driverId',
    onDelete: 'CASCADE',
  });

  // DriverRequest pertenece a Driver
  DriverRequest.belongsTo(Driver, {
    foreignKey: 'driverId',
  });

  // DriverRequest tiene muchos RequestFiles
  DriverRequest.hasMany(RequestFile, {
    foreignKey: 'requestId',
    onDelete: 'CASCADE',
  });

  // RequestFile pertenece a DriverRequest
  RequestFile.belongsTo(DriverRequest, {
    foreignKey: 'requestId',
  });

  // Driver pertenece a User
  Driver.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User', // Usar alias 'User' con mayúsculas para consistencia
  });

  // User tiene muchos Drivers
  User.hasMany(Driver, {
    foreignKey: 'userId',
  });

  // ============================
  // RIDE ASSOCIATIONS
  // ============================

  // Ride pertenece a User (como pasajero)
  Ride.belongsTo(User, {
    foreignKey: 'passengerId',
    as: 'passenger',
  });

  // Ride pertenece a Driver (conductor, puede ser null)
  Ride.belongsTo(Driver, {
    foreignKey: 'driverId',
    as: 'driver',
  });

  // User tiene muchos Rides (como pasajero)
  User.hasMany(Ride, {
    foreignKey: 'passengerId',
    as: 'ridesAsPassenger',
  });

  // Driver tiene muchos Rides
  Driver.hasMany(Ride, {
    foreignKey: 'driverId',
    as: 'ridesAsDriver',
  });
};

module.exports = setupAssociations;
