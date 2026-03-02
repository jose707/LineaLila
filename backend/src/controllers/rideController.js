// backend/src/controllers/rideController.js
const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const createRide = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, distance, duration, fare } =
      req.body;
    const passengerId = req.user.id;

    console.log('🚕 [createRide] Datos recibidos del cliente:', {
      distance,
      duration,
      fare,
      pickupLocation: {
        address: pickupLocation?.address,
        lat: pickupLocation?.latitude,
        lng: pickupLocation?.longitude,
      },
    });

    // ✅ VERIFICAR TIPOS DE DATOS
    console.log('🚕 [createRide] Tipos de datos recibidos:', {
      distanceType: typeof distance,
      distanceValue: distance,
      durationType: typeof duration,
      durationValue: duration,
      fareType: typeof fare,
      fareValue: fare,
      fareIsNumber: typeof fare === 'number',
    });

    // Validar pickupLocation JSON
    if (
      !pickupLocation ||
      !pickupLocation.latitude ||
      !pickupLocation.longitude ||
      !pickupLocation.address
    ) {
      return res.status(400).json({
        error:
          'pickupLocation inválida. Debe tener latitude, longitude y address',
        received: pickupLocation,
      });
    }

    // Validar dropoffLocation JSON
    if (
      !dropoffLocation ||
      !dropoffLocation.latitude ||
      !dropoffLocation.longitude ||
      !dropoffLocation.address
    ) {
      return res.status(400).json({
        error:
          'dropoffLocation inválida. Debe tener latitude, longitude y address',
        received: dropoffLocation,
      });
    }

    // Validar y procesar distance y duration
    if (!distance || !duration) {
      return res.status(400).json({
        error: 'Faltan datos requeridos: distance, duration',
        received: { distance, duration },
      });
    }

    // ✅ Asegurar que distance y duration sean números
    const finalDistance = parseFloat(distance); // En metros
    const finalDuration = Math.round(parseFloat(duration)); // En segundos

    console.log('🚕 [createRide] Datos procesados:', {
      receivedDistance: distance,
      receivedDuration: duration,
      finalDistance: finalDistance,
      finalDuration: finalDuration,
      displayDistance: `${(finalDistance / 1000).toFixed(1)} km`, // Mostrar en km para claridad
      displayDuration: `${Math.floor(finalDuration / 60)} min`, // Mostrar en min para claridad
    });

    // ✅ Usar la tarifa enviada por el cliente (ya está bien calculada)
    // Si no viene, calcular basada en los datos
    let finalFare = fare;

    if (!finalFare) {
      // Convertir correctamente las unidades antes de calcular
      const distanceInKm = finalDistance / 1000; // metros a km
      const durationInMinutes = Math.floor(finalDuration / 60); // segundos a minutos (FLOOR para consistencia)

      const baseFare = 3.0;
      const farePerKm = 1.2;
      const farePerMinute = 0.15;
      finalFare =
        baseFare + distanceInKm * farePerKm + durationInMinutes * farePerMinute;
      finalFare = Math.round(finalFare * 100) / 100; // Redondear a 2 decimales
      console.log(
        '🚕 [createRide] Tarifa calculada en backend (si no viene del cliente):',
        {
          distanceInKm: distanceInKm.toFixed(2),
          durationInSeconds: finalDuration,
          durationInMinutes: durationInMinutes,
          baseFare,
          farePerKm,
          farePerMinute,
          calculatedFare: finalFare,
        },
      );
    } else {
      console.log('🚕 [createRide] Usando tarifa del cliente:', finalFare);
    }

    const ride = await Ride.create({
      passengerId,
      pickupLocation: {
        latitude: parseFloat(pickupLocation.latitude),
        longitude: parseFloat(pickupLocation.longitude),
        address: pickupLocation.address,
      },
      dropoffLocation: {
        latitude: parseFloat(dropoffLocation.latitude),
        longitude: parseFloat(dropoffLocation.longitude),
        address: dropoffLocation.address,
      },
      distance: finalDistance, // En metros ✅
      duration: finalDuration, // En segundos ✅
      baseFare: 3.0,
      farePerKm: 1.2,
      farePerMinute: 0.15,
      totalFare: parseFloat(finalFare), // ✅ Asegurar que sea número
      finalFare: parseFloat(finalFare), // ✅ Asegurar que sea número
      status: 'requested',
    });

    console.log('✅ [createRide] Viaje creado exitosamente:', {
      id: ride.id,
      status: ride.status,
      passengerId: ride.passengerId,
      pickupLocation: ride.pickupLocation.address,
      dropoffLocation: ride.dropoffLocation.address,
      displayDistance: `${(ride.distance / 1000).toFixed(1)} km`,
      displayDuration: `${Math.floor(ride.duration / 60)} min`,
      displayFare: `Bs ${ride.finalFare.toFixed(2)}`,
      // Valores crudos en BD (para auditoría)
      rawValues: {
        distance: `${ride.distance} m`,
        duration: `${ride.duration} s`,
        totalFare: ride.totalFare,
        finalFare: ride.finalFare,
      },
    });

    res.status(201).json({
      message: 'Solicitud de viaje creada',
      ride,
    });
  } catch (error) {
    console.error('❌ [createRide] Error al crear viaje:', error);
    res.status(500).json({
      error: 'Error al crear la solicitud de viaje',
      details: error.message,
    });
  }
};

const getRideById = async (req, res) => {
  try {
    const { id } = req.params;

    // Solo loguear una vez cada 10 segundos para no saturar logs
    const logKey = `getRideById_${id}`;
    const lastLogTime = global.lastLogs?.[logKey] || 0;
    const now = Date.now();
    const shouldLog = now - lastLogTime > 10000; // Log cada 10s

    let ride;
    try {
      ride = await Ride.findByPk(id, {
        include: [
          {
            model: User,
            as: 'passenger',
            attributes: { exclude: ['password'] },
          },
          {
            model: Driver,
            as: 'driver',
            required: false,
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
              {
                model: User,
                as: 'User', // Especificar el alias 'User'
                attributes: { exclude: ['password', 'createdAt', 'updatedAt'] },
              },
            ],
          },
        ],
      });
      if (shouldLog) {
        console.log('✅ [getRideById] Ride obtenido con asociaciones:', {
          rideId: ride?.id,
          hasDriver: !!ride?.driver,
          driverHasUser: !!ride?.driver?.User,
        });
        if (!global.lastLogs) global.lastLogs = {};
        global.lastLogs[logKey] = now;
      }
    } catch (associationError) {
      console.warn(
        '⚠️ [getRideById] Error cargando asociaciones:',
        associationError.message,
      );
      // Retornar viaje sin Driver si hay error
      ride = await Ride.findByPk(id);
    }

    if (!ride) {
      return res.status(404).json({
        error: 'Viaje no encontrado',
      });
    }

    if (shouldLog) {
      console.log('📍 [getRideById] Retornando ride con estructura:', {
        rideId: ride.id,
        hasDriver: !!ride.driver,
        driverStructure: ride.driver
          ? {
              id: ride.driver.id,
              userId: ride.driver.userId,
              hasUser: !!ride.driver.User,
              UserKeys: ride.driver.User ? Object.keys(ride.driver.User) : [],
            }
          : null,
      });
    }

    // Calcular tiempo restante para cada contra-oferta (20 segundos de validez)
    const OFFER_VALIDITY_SECONDS = 20;
    const enrichedRide = ride.toJSON();

    if (
      enrichedRide.counterOffers &&
      Array.isArray(enrichedRide.counterOffers)
    ) {
      enrichedRide.counterOffers = enrichedRide.counterOffers.map(offer => {
        const offerCreatedTime = new Date(offer.createdAt).getTime();
        const elapsedSeconds = Math.floor((now - offerCreatedTime) / 1000);
        const timeLeftInSeconds = Math.max(
          0,
          OFFER_VALIDITY_SECONDS - elapsedSeconds,
        );

        return {
          ...offer,
          timeLeftInSeconds,
          isExpired: timeLeftInSeconds === 0,
        };
      });
    }

    res.status(200).json({
      ride: enrichedRide,
    });
  } catch (error) {
    console.error('Error al obtener viaje:', error);
    res.status(500).json({
      error: 'Error al obtener el viaje',
    });
  }
};

const getActiveRide = async (req, res) => {
  try {
    const userId = req.user.id;

    let activeRide;
    try {
      activeRide = await Ride.findOne({
        where: {
          [Op.or]: [{ passengerId: userId }, { driverId: userId }],
          status: {
            [Op.in]: ['requested', 'accepted', 'in_progress'],
          },
        },
        include: [
          {
            model: User,
            as: 'passenger',
            attributes: { exclude: ['password'] },
          },
          {
            model: Driver,
            as: 'driver',
            required: false,
            include: [
              {
                model: User,
                as: 'User',
                attributes: { exclude: ['password'] },
              },
            ],
          },
        ],
      });
    } catch (associationError) {
      console.warn(
        '⚠️ [getActiveRide] Error cargando asociaciones:',
        associationError.message,
      );
      // Retornar viaje sin Driver si hay error
      activeRide = await Ride.findOne({
        where: {
          [Op.or]: [{ passengerId: userId }, { driverId: userId }],
          status: {
            [Op.in]: ['requested', 'accepted', 'in_progress'],
          },
        },
      });
    }

    if (!activeRide) {
      return res.status(404).json({
        error: 'No hay viajes activos',
      });
    }

    res.status(200).json({
      ride: activeRide,
    });
  } catch (error) {
    console.error('Error al obtener viaje activo:', error);
    res.status(500).json({
      error: 'Error al obtener el viaje activo',
    });
  }
};

const getRideHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const rides = await Ride.findAll({
      where: {
        [Op.or]: [{ passengerId: userId }, { driverId: userId }],
        status: {
          [Op.in]: ['completed', 'cancelled'],
        },
      },
      include: [
        { model: User, as: 'passenger', attributes: { exclude: ['password'] } },
        {
          model: Driver,
          as: 'driver',
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: { exclude: ['password'] },
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await Ride.count({
      where: {
        [Op.or]: [{ passengerId: userId }, { driverId: userId }],
        status: {
          [Op.in]: ['completed', 'cancelled'],
        },
      },
    });

    res.status(200).json({
      rides,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      error: 'Error al obtener el historial de viajes',
    });
  }
};

const acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.id;

    console.log('🚗 [acceptRide] Intentando aceptar viaje:', {
      rideId,
      driverId,
      userExists: !!req.user,
      userIdExists: !!req.user?.id,
    });

    // Validar que el conductor esté autenticado
    if (!driverId) {
      return res.status(401).json({
        error: 'Conductor no autenticado',
      });
    }

    // 🔥 VALIDAR QUE EL USUARIO SEA UN CONDUCTOR APROBADO
    const driver = await Driver.findOne({
      where: { userId: driverId, status: 'approved' },
    });

    if (!driver) {
      console.warn('⚠️ [acceptRide] Usuario no es conductor aprobado:', {
        userId: driverId,
      });
      return res.status(403).json({
        error:
          'No eres un conductor aprobado. Debes completar tu registro y ser aprobado para aceptar viajes.',
      });
    }

    console.log('✅ [acceptRide] Conductor validado:', {
      driverId: driver.id,
      userId: driver.userId,
      status: driver.status,
    });

    // UPDATE atómico: validar status en la misma operación
    // Evita race condition donde dos conductores aceptan el mismo viaje
    const [updated] = await Ride.update(
      {
        driverId: driver.id, // Usar driver.id del registro drivers, no userId
        status: 'accepted',
        acceptedAt: new Date(),
      },
      {
        where: {
          id: rideId,
          status: 'requested', // ← Validar AQUÍ en la actualización
        },
      },
    );

    console.log('🚗 [acceptRide] Resultado de actualización:', {
      updated,
      rideId,
      driverId: driver.id,
    });

    if (updated === 0) {
      // Verificar si el viaje existe pero no está en estado 'requested'
      const ride = await Ride.findByPk(rideId);
      if (!ride) {
        return res.status(404).json({
          error: 'Viaje no encontrado',
        });
      }

      // Log específico para entender por qué falló la aceptación
      console.warn(
        '⚠️ [acceptRide] Fallo al aceptar. Estado actual:',
        ride.status,
      );

      if (ride.status === 'cancelled') {
        return res.status(400).json({
          error: 'Esta solicitud fue cancelada por el pasajero',
        });
      } else if (ride.status === 'accepted') {
        return res.status(400).json({
          error: 'Esta solicitud ya fue aceptada por otro conductor',
        });
      }

      return res.status(400).json({
        error:
          'El viaje ya fue aceptado por otro conductor o ha sido cancelado',
      });
    }

    // Obtener el viaje actualizado
    let ride;
    try {
      ride = await Ride.findByPk(rideId, {
        include: [
          {
            model: User,
            as: 'passenger',
            attributes: { exclude: ['password'] },
          },
          {
            model: Driver,
            as: 'driver',
            required: false,
            include: [
              {
                model: User,
                as: 'User',
                attributes: { exclude: ['password'] },
              },
            ],
          },
        ],
      });
    } catch (associationError) {
      console.warn(
        '⚠️ [acceptRide] Error cargando asociaciones:',
        associationError.message,
      );
      ride = await Ride.findByPk(rideId);
    }

    console.log('✅ [acceptRide] Viaje aceptado exitosamente:', {
      rideId: ride.id,
      status: ride.status,
      driverId: ride.driverId,
      passengerName: ride.passenger?.name,
    });

    res.status(200).json({
      message: 'Viaje aceptado exitosamente',
      ride,
    });
  } catch (error) {
    console.error('❌ [acceptRide] Error al aceptar viaje:', error);
    console.error('❌ [acceptRide] Stack trace:', error.stack);
    console.error('❌ [acceptRide] Error message:', error.message);
    res.status(500).json({
      error: 'Error al aceptar el viaje',
      details: error.message,
    });
  }
};

const completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverRating, driverReview } = req.body;

    // UPDATE atómico: validar status en la misma operación
    const [updated] = await Ride.update(
      {
        status: 'completed',
        completedAt: new Date(),
        driverRating,
        driverReview,
        paymentStatus: 'completed',
      },
      {
        where: {
          id: rideId,
          status: 'in_progress', // ← Validar AQUÍ en la actualización
        },
      },
    );

    if (updated === 0) {
      // Verificar si el viaje existe pero no está en estado 'in_progress'
      const ride = await Ride.findByPk(rideId);
      if (!ride) {
        return res.status(404).json({
          error: 'Viaje no encontrado',
        });
      }
      return res.status(400).json({
        error: 'El viaje no está en progreso o ya fue completado',
      });
    }

    // Obtener el viaje actualizado
    let ride;
    try {
      ride = await Ride.findByPk(rideId, {
        include: [
          {
            model: User,
            as: 'passenger',
            attributes: { exclude: ['password'] },
          },
          {
            model: Driver,
            as: 'driver',
            required: false,
            include: [
              {
                model: User,
                as: 'User',
                attributes: { exclude: ['password'] },
              },
            ],
          },
        ],
      });
    } catch (associationError) {
      console.warn(
        '⚠️ [completeRide] Error cargando asociaciones:',
        associationError.message,
      );
      ride = await Ride.findByPk(rideId);
    }

    res.status(200).json({
      message: 'Viaje completado exitosamente',
      ride,
    });
  } catch (error) {
    console.error('Error al completar viaje:', error);
    res.status(500).json({
      error: 'Error al completar el viaje',
    });
  }
};

const getRideRequests = async (req, res) => {
  try {
    console.log(
      '📡 [getRideRequests] Buscando solicitudes de viajes pendientes...',
    );

    // Obtener todas las solicitudes de viajes que están en estado 'requested' (pendientes)
    // El conductor puede ver solicitudes de otros pasajeros para aceptar
    const rides = await Ride.findAll({
      where: {
        status: 'requested', // Solo viajes solicitados (sin aceptar)
      },
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'name', 'phone', 'profilePhoto', 'rating'],
        },
      ],
      order: [['createdAt', 'DESC']], // Ordenar por más recientes
    });

    console.log('📡 [getRideRequests] Viajes encontrados:', rides.length);

    // Transformar la respuesta a un formato más limpio
    const rideRequests = rides.map((ride, index) => {
      const transformed = {
        rideId: ride.id,
        passengerName: ride.passenger?.name || 'Pasajero desconocido',
        passengerPhone: ride.passenger?.phone || '',
        passengerRating: ride.passenger?.rating || 0,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        fare: ride.totalFare || ride.finalFare,
        distance: ride.distance,
        duration: ride.duration,
        notes: ride.notes || '',
      };

      // 🔥 DEBUG: Log cada viaje devuelto
      console.log(`📡 [getRideRequests] Viaje ${index + 1}:`, {
        rideId: transformed.rideId,
        distance: transformed.distance,
        distanceType: typeof transformed.distance,
        duration: transformed.duration,
        durationType: typeof transformed.duration,
        fare: transformed.fare,
        fareType: typeof transformed.fare,
        dbValues: {
          ride_distance: ride.distance,
          ride_duration: ride.duration,
          ride_totalFare: ride.totalFare,
          ride_finalFare: ride.finalFare,
        },
      });

      return transformed;
    });

    console.log(
      '📡 [getRideRequests] Respuesta transformada:',
      JSON.stringify(rideRequests, null, 2),
    );
    res.status(200).json(rideRequests);
  } catch (error) {
    console.error(
      '❌ [getRideRequests] Error al obtener solicitudes de viajes:',
      error,
    );
    res.status(500).json({
      error: 'Error al obtener solicitudes de viajes',
      details: error.message,
    });
  }
};

const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason, cancelledBy } = req.body;

    console.log('🔴 [cancelRide] Parámetros recibidos:', {
      rideId,
      reason,
      cancelledBy,
    });

    // 🔥 VERIFICAR STATUS ACTUAL ANTES DE ACTUALIZAR
    const rideBeforeUpdate = await Ride.findByPk(rideId);
    if (!rideBeforeUpdate) {
      console.log('🔴 [cancelRide] El viaje NO existe:', rideId);
      return res.status(404).json({
        error: 'Viaje no encontrado',
      });
    }

    console.log('🔴 [cancelRide] Status ANTES de actualizar:', {
      id: rideBeforeUpdate.id,
      status: rideBeforeUpdate.status,
      cancelledBy: rideBeforeUpdate.cancelledBy,
    });

    // UPDATE atómico: validar que NO esté completado o ya cancelado
    const [updated] = await Ride.update(
      {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledBy,
        cancelledAt: new Date(),
      },
      {
        where: {
          id: rideId,
          status: {
            [Op.notIn]: ['completed', 'cancelled'],
          },
        },
      },
    );

    console.log('🔴 [cancelRide] UPDATE Query ejecutado');
    console.log('🔴 [cancelRide] Filas actualizadas:', updated);
    console.log('🔴 [cancelRide] rideId:', rideId);

    // Verificar que se actualizó correctamente
    const rideAfterUpdate = await Ride.findByPk(rideId);
    console.log('🔴 [cancelRide] Status DESPUÉS de actualizar:', {
      id: rideAfterUpdate.id,
      status: rideAfterUpdate.status,
      cancelledBy: rideAfterUpdate.cancelledBy,
      cancelledAt: rideAfterUpdate.cancelledAt,
    });

    if (updated === 0) {
      console.log(
        '🔴 [cancelRide] No se pudo actualizar. El viaje está en estado:',
        rideBeforeUpdate.status,
      );
      return res.status(400).json({
        error: `No se puede cancelar un viaje en estado: ${rideBeforeUpdate.status}`,
      });
    }

    // Obtener el viaje actualizado
    let ride;
    try {
      ride = await Ride.findByPk(rideId, {
        include: [
          {
            model: User,
            as: 'passenger',
            attributes: { exclude: ['password'] },
          },
          {
            model: Driver,
            as: 'driver',
            required: false,
            include: [
              {
                model: User,
                as: 'User',
                attributes: { exclude: ['password'] },
              },
            ],
          },
        ],
      });
    } catch (associationError) {
      console.warn(
        '⚠️ [cancelRide] Error cargando asociaciones, retornando viaje básico:',
        associationError.message,
      );
      // Si hay error en asociaciones, al menos retornar el viaje sin Driver
      ride = await Ride.findByPk(rideId);
    }

    console.log('🔴 [cancelRide] Viaje actualizado:', {
      id: ride.id,
      status: ride.status,
      cancelledBy: ride.cancelledBy,
    });

    res.status(200).json({
      message: 'Viaje cancelado',
      ride,
    });
  } catch (error) {
    console.error('❌ [cancelRide] Error al cancelar viaje:', error);
    res.status(500).json({
      error: 'Error al cancelar el viaje',
      details: error.message,
    });
  }
};

const startRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    // UPDATE atómico: validar que esté en estado 'accepted'
    const [updated] = await Ride.update(
      {
        status: 'in_progress',
        startedAt: new Date(),
      },
      {
        where: {
          id: rideId,
          status: 'accepted', // ← Solo se puede iniciar si fue aceptado
        },
      },
    );

    if (updated === 0) {
      // Verificar si el viaje existe pero no está en estado 'accepted'
      const ride = await Ride.findByPk(rideId);
      if (!ride) {
        return res.status(404).json({
          error: 'Viaje no encontrado',
        });
      }

      return res.status(400).json({
        error: 'El viaje no está en estado aceptado',
        currentStatus: ride.status,
      });
    }

    // Recuperar el viaje actualizado con asociaciones
    let ride;
    try {
      ride = await Ride.findByPk(rideId, {
        include: [
          {
            model: User,
            as: 'passenger',
            attributes: { exclude: ['password'] },
          },
          {
            model: Driver,
            as: 'driver',
            required: false,
            include: [
              {
                model: User,
                as: 'User',
                attributes: { exclude: ['password'] },
              },
            ],
          },
        ],
      });
    } catch (associationError) {
      console.warn(
        '⚠️ [startRide] Error cargando asociaciones:',
        associationError.message,
      );
      ride = await Ride.findByPk(rideId);
    }

    res.status(200).json({
      message: 'Viaje iniciado',
      ride,
    });
  } catch (error) {
    console.error('❌ [startRide] Error al iniciar viaje:', error);
    res.status(500).json({
      error: 'Error al iniciar el viaje',
      details: error.message,
    });
  }
};

// 💰 CONTRA-OFERTAS DE TARIFA

const submitCounterOffer = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { proposedPrice } = req.body;
    const driverId = req.user.id;

    console.log('💰 [submitCounterOffer] Nueva contra-oferta:', {
      rideId,
      driverId,
      proposedPrice,
    });

    // Validar que el conductor esté aprobado
    const driver = await Driver.findOne({
      where: { userId: driverId, status: 'approved' },
      include: [
        {
          model: User,
          as: 'User',
          attributes: { exclude: ['password'] },
        },
      ],
    });

    if (!driver) {
      return res.status(403).json({
        error: 'No eres un conductor aprobado',
      });
    }

    // Obtener el viaje
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje esté en estado 'requested'
    if (ride.status !== 'requested') {
      return res.status(400).json({
        error: 'El viaje ya fue aceptado o cancelado',
      });
    }

    // Crear objeto de contra-oferta
    const counterOffer = {
      offerId: uuidv4(),
      driverId: driver.id,
      driverName: driver.User.name,
      driverRating: driver.User.rating || 0,
      driverPhone: driver.User.phone,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      licensePlate: driver.licensePlate,
      proposedPrice,
      offerType:
        proposedPrice === ride.finalFare ? 'accepted' : 'counter_offer',
      createdAt: new Date(),
      accepted: false,
    };

    // Agregar contra-oferta al array
    const currentOffers = ride.counterOffers || [];
    currentOffers.push(counterOffer);

    // Actualizar el viaje - Asegurar que Sequelize lo detecte
    ride.set('counterOffers', currentOffers);
    ride.changed('counterOffers', true);
    await ride.save();

    console.log('✅ [submitCounterOffer] Contra-oferta guardada:', {
      rideId,
      offerId: counterOffer.offerId,
      driverName: counterOffer.driverName,
      price: proposedPrice,
      totalOffers: currentOffers.length,
    });

    res.status(201).json({
      message: 'Contra-oferta enviada',
      offer: counterOffer,
    });
  } catch (error) {
    console.error('❌ [submitCounterOffer] Error:', error);
    res.status(500).json({
      error: 'Error al enviar contra-oferta',
      details: error.message,
    });
  }
};

const getCounterOffers = async (req, res) => {
  try {
    const { rideId } = req.params;

    // Solo loguear una vez cada 10 segundos para no saturar logs
    const logKey = `getCounterOffers_${rideId}`;
    const lastLogTime = global.lastLogs?.[logKey] || 0;
    const now = Date.now();
    const shouldLog = now - lastLogTime > 10000; // Log cada 10s

    if (shouldLog) {
      console.log(
        '📋 [getCounterOffers] Obteniendo contra-ofertas para:',
        rideId,
      );
      if (!global.lastLogs) global.lastLogs = {};
      global.lastLogs[logKey] = now;
    }

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({
        error: 'Viaje no encontrado',
      });
    }

    const offers = ride.counterOffers || [];

    if (shouldLog) {
      console.log(
        '✅ [getCounterOffers] Contra-ofertas encontradas:',
        offers.length,
      );
    }

    res.status(200).json({
      offers: offers,
      rideId: ride.id,
      passengerName: ride.passenger?.name || 'Pasajero',
      originalFare: ride.finalFare,
    });
  } catch (error) {
    console.error('❌ [getCounterOffers] Error:', error);
    res.status(500).json({
      error: 'Error al obtener contra-ofertas',
      details: error.message,
    });
  }
};

const acceptCounterOffer = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { offerId, finalPrice } = req.body;
    const passengerId = req.user.id;

    console.log('✅ [acceptCounterOffer] Aceptando contra-oferta:', {
      rideId,
      offerId,
      finalPrice,
      passengerId,
    });

    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: { exclude: ['password'] },
        },
        {
          model: Driver,
          as: 'driver',
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: { exclude: ['password'] },
            },
          ],
        },
      ],
    });

    if (!ride) {
      return res.status(404).json({
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje pertenece al pasajero autenticado
    if (ride.passengerId !== passengerId) {
      return res.status(403).json({
        error: 'Este viaje no te pertenece',
      });
    }

    // Encontrar la contra-oferta
    const offers = ride.counterOffers || [];
    const selectedOffer = offers.find(o => o.offerId === offerId);

    if (!selectedOffer) {
      return res.status(404).json({
        error: 'Contra-oferta no encontrada',
      });
    }

    // Actualizar el viaje con la contra-oferta aceptada
    const updatedOffers = offers.map(o =>
      o.offerId === offerId
        ? { ...o, accepted: true }
        : { ...o, accepted: false },
    );

    // Usar set y changed para que Sequelize detecte la actualización
    ride.set({
      driverId: selectedOffer.driverId,
      finalFare: finalPrice,
      status: 'accepted',
      acceptedAt: new Date(),
      counterOffers: updatedOffers,
    });
    ride.changed('counterOffers', true);
    await ride.save();

    // Recargar el viaje con asociaciones
    const updatedRide = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: { exclude: ['password'] },
        },
        {
          model: Driver,
          as: 'driver',
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: { exclude: ['password'] },
            },
          ],
        },
      ],
    });

    console.log('✅ [acceptCounterOffer] Contra-oferta aceptada:', {
      rideId,
      driverId: selectedOffer.driverId,
      finalPrice,
    });

    res.status(200).json({
      message: 'Contra-oferta aceptada',
      ride: updatedRide,
    });
  } catch (error) {
    console.error('❌ [acceptCounterOffer] Error:', error);
    res.status(500).json({
      error: 'Error al aceptar contra-oferta',
      details: error.message,
    });
  }
};

module.exports = {
  createRide,
  getRideById,
  getActiveRide,
  getRideHistory,
  getRideRequests,
  acceptRide,
  startRide,
  completeRide,
  cancelRide,
  submitCounterOffer,
  getCounterOffers,
  acceptCounterOffer,
};
