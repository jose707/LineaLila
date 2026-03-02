// backend/src/models/index.js
const User = require('./User');
const Driver = require('./Driver');
const Ride = require('./Ride');

// Definir asociaciones
// User → Driver (1-a-1): Un usuario puede tener una solicitud de conductor
Driver.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Driver, { foreignKey: 'userId' });

// Ride → User (Pasajero): Un pasajero hace muchos rides
Ride.belongsTo(User, { foreignKey: 'passengerId', as: 'passenger' });
User.hasMany(Ride, { foreignKey: 'passengerId', as: 'passengerRides' });

// Ride → Driver: Un driver (si está aprobado) tiene muchos rides
Ride.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
Driver.hasMany(Ride, { foreignKey: 'driverId', as: 'rides' });

module.exports = {
  User,
  Driver,
  Ride,
};
