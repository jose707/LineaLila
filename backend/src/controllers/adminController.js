// backend/src/controllers/adminController.js
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const DriverRequest = require('../models/DriverRequest');
const RequestFile = require('../models/RequestFile');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const getAllUsers = async (req, res) => {
  try {
    const { search, role, limit = 20, offset = 0, inactive } = req.query;
    const whereClause = {};

    // Si inactive=true, mostrar solo inactivos; si no, mostrar solo activos
    whereClause.isActive = inactive === 'true' ? false : true;

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    const total = await User.count({ where: whereClause });

    res.status(200).json({
      users,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      error: 'Error al obtener usuarios',
    });
  }
};

const getAllDrivers = async (req, res) => {
  try {
    const { status, search, limit = 20, offset = 0 } = req.query;
    const whereClause = { userId: { [Op.not]: null } };

    if (status) {
      whereClause.status = status;
    }

    // Obtener la solicitud más reciente por usuario
    const requests = await DriverRequest.findAll({
      where: whereClause,
      order: [
        ['userId', 'ASC'],
        ['version', 'DESC'],
      ],
      raw: false,
    });

    // Agrupar por userId y quedarse solo con la versión más reciente
    const latestByUser = {};
    requests.forEach(req => {
      if (!latestByUser[req.userId]) {
        latestByUser[req.userId] = req;
      }
    });

    const uniqueRequests = Object.values(latestByUser).slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit),
    );

    // Para cada solicitud, obtener sus archivos y usuario
    const requestsWithFiles = await Promise.all(
      uniqueRequests.map(async request => {
        // Obtener el usuario
        const user = await User.findByPk(request.userId, {
          attributes: { exclude: ['password'] },
        });

        const requestFiles = await RequestFile.findAll({
          where: { requestId: request.id },
        });

        console.log(`📋 Request ${request.id} (v${request.version}):`, {
          status: request.status,
          fileCount: requestFiles.length,
          files: requestFiles.map(f => `${f.fileType}(${f.status})`).join(', '),
        });

        // Log detallado de archivos
        requestFiles.forEach(f => {
          console.log(`  - ${f.fileType}: ${f.filename} [${f.status}]`);
        });

        let files = {};
        requestFiles.forEach(file => {
          files[file.fileType] = {
            filename: file.filename,
            url: `http://192.168.100.133:3000/uploads/drivers/${file.filename}`,
            status: file.status,
            uploadedAt: file.uploadedAt,
          };
        });

        console.log(
          `Final files object keys for request ${request.id}:`,
          Object.keys(files),
        );

        return {
          ...request.toJSON(),
          User: user ? user.toJSON() : null,
          files,
        };
      }),
    );

    const total = Object.keys(latestByUser).length;

    res.status(200).json({
      requests: requestsWithFiles,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error al obtener solicitudes de conductores:', error);
    res.status(500).json({
      error: 'Error al obtener solicitudes',
    });
  }
};

const approveDriver = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Obtener la solicitud del conductor
    const request = await DriverRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    if (request.status === 'approved') {
      return res.status(400).json({
        error: 'Esta solicitud ya fue aprobada',
      });
    }

    // Obtener userId del request (ahora es columna directa)
    const userId = request.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'No se encontró el usuario en la solicitud',
      });
    }

    // Obtener los datos del vehículo de metadata
    const metadata = request.metadata || {};

    // Crear el Driver con los datos de la solicitud
    const driver = await Driver.create({
      userId,
      status: 'approved',
      backgroundCheckPassed: true,
      licenseNumber: metadata.ciNumber,
      licenseExpiry: new Date(new Date().getFullYear() + 1, 0, 1),
      vehicleType: metadata.vehicleType,
      vehiclePlate: metadata.vehiclePlate,
      vehicleYear: metadata.vehicleYear,
      vehicleColor: metadata.vehicleColor || '',
      vehicleModel: metadata.vehicleModel || '',
      isAvailable: true,
    });

    // Asociar el driver a la solicitud
    await request.update({
      driverId: driver.id,
      status: 'approved',
    });

    // Marcar todos los archivos como aprobados
    await RequestFile.update(
      { status: 'approved' },
      { where: { requestId: request.id } },
    );

    console.log(
      `✅ Solicitud ${requestId} aprobada - Driver ${driver.id} creado para usuario ${userId}`,
    );

    res.status(200).json({
      message: 'Conductor aprobado y creado exitosamente',
      driver,
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({
      error: 'Error al aprobar la solicitud',
    });
  }
};

const rejectDriver = async (req, res) => {
  try {
    const { driverId, requestId } = req.params;
    const { reason } = req.body;

    // Soportar ambos parámetros: driverId (legacy) y requestId (nuevo)
    let request;

    if (requestId) {
      // Nuevo sistema: recibir requestId
      request = await DriverRequest.findByPk(requestId);
    } else if (driverId) {
      // Sistema legacy: encontrar la solicitud más reciente del driver
      request = await DriverRequest.findOne({
        where: { driverId },
        order: [['version', 'DESC']],
      });
    }

    if (!request) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    if (request.status === 'rejected') {
      return res.status(400).json({
        error: 'Esta solicitud ya fue rechazada',
      });
    }

    // Extraer documentos rechazados del reason
    const rejectionReason = reason || '';
    let rejectedDocsList = [];
    let rejectedDocumentsKeys = [];

    if (
      rejectionReason.includes(
        'Documentos rechazados que deben ser reenviados:',
      )
    ) {
      const parts = rejectionReason.split(
        'Documentos rechazados que deben ser reenviados:',
      );
      if (parts.length > 1) {
        rejectedDocsList = parts[1]
          .split(',')
          .map(doc => doc.trim())
          .filter(doc => doc.length > 0);
      }
    }

    // Mapear nombres en español a claves técnicas
    const docMapping = {
      'Foto Perfil': 'profilePhoto',
      'CI Frente': 'ciFront',
      'CI Dorso': 'ciBack',
      Antecedentes: 'antecedentsPhoto',
      'Auto Frente': 'carFront',
      'Auto Dorso': 'carBack',
      'Auto Izquierda': 'carLeft',
      'Auto Derecha': 'carRight',
      SOAT: 'soatPhoto',
      RUAT: 'ruatPhoto',
    };

    // Marcar documentos como rejected en la BD
    for (const rejectedName of rejectedDocsList) {
      const rejectedKey = docMapping[rejectedName];
      if (rejectedKey) {
        rejectedDocumentsKeys.push(rejectedKey);
        await RequestFile.update(
          { status: 'rejected' },
          {
            where: {
              requestId: request.id,
              fileType: rejectedKey,
            },
          },
        );
      }
    }

    // Marcar todos los documentos NO rechazados como 'approved'
    const allDocumentTypes = Object.values(docMapping);
    for (const docType of allDocumentTypes) {
      if (!rejectedDocumentsKeys.includes(docType)) {
        await RequestFile.update(
          { status: 'approved' },
          {
            where: {
              requestId: request.id,
              fileType: docType,
            },
          },
        );
      }
    }

    // Update request status
    await request.update({
      status: 'rejected',
      rejectionReason: reason,
      rejectedDocuments: rejectedDocumentsKeys,
    });

    console.log(
      `✅ Solicitud ${request.id} rechazada - Usuario ${request.userId} - Razón: ${reason}`,
    );

    res.status(200).json({
      message: 'Solicitud rechazada correctamente',
      request,
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({
      error: 'Error al rechazar la solicitud',
    });
  }
};

const getPendingDriverRequests = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Obtener las solicitudes de conductor pendientes (nuevo sistema)
    const pendingRequests = await DriverRequest.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Para cada solicitud, obtener datos del usuario y archivos
    const requestsWithDetails = await Promise.all(
      pendingRequests.map(async request => {
        // Obtener usuario
        const user = await User.findByPk(request.userId, {
          attributes: { exclude: ['password'] },
        });

        // Obtener archivos de esta solicitud
        const requestFiles = await RequestFile.findAll({
          where: { requestId: request.id },
        });

        // Construir objeto de archivos con URL completa
        let files = {};
        requestFiles.forEach(file => {
          files[file.fileType] = {
            filename: file.filename,
            url: `http://192.168.100.133:3000/uploads/drivers/${file.filename}`,
            status: file.status,
            uploadedAt: file.uploadedAt,
          };
        });

        return {
          id: request.id,
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          licenseNumber: request.metadata?.ciNumber || '',
          licenseExpiryDate: new Date(
            new Date().getFullYear() + 1,
            0,
            1,
          ).toISOString(),
          vehicleType: request.metadata?.vehicleType || '',
          vehiclePlate: request.metadata?.vehiclePlate || '',
          vehicleYear: request.metadata?.vehicleYear || 0,
          documentsVerified: Object.values(files).every(
            f => f.status === 'approved',
          ),
          backgroundCheckPassed: false,
          backgroundCheckDate: request.createdAt?.toISOString() || '',
          applicationDate: request.createdAt?.toISOString() || '',
          status: request.status,
          rejectionReason: request.rejectionReason || '',
          verificationNotes: '',
          userId: request.userId,
          currentRequest: {
            id: request.id,
            version: request.version,
            status: request.status,
            rejectionReason: request.rejectionReason,
            files,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
          },
        };
      }),
    );

    // Contar total de solicitudes pendientes
    const total = await DriverRequest.count({ where: { status: 'pending' } });

    res.status(200).json({
      drivers: requestsWithDetails,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    res.status(500).json({
      error: 'Error al obtener solicitudes pendientes',
    });
  }
};

const getAllRides = async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 20, offset = 0 } = req.query;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const rides = await Ride.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    const total = await Ride.count({ where: whereClause });

    res.status(200).json({
      rides,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    res.status(500).json({
      error: 'Error al obtener viajes',
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalDrivers = await Driver.count();
    const activeDrivers = await Driver.count({ where: { isAvailable: true } });
    const totalRides = await Ride.count();
    const completedRides = await Ride.count({ where: { status: 'completed' } });

    const totalRevenue = await Ride.sum('finalFare', {
      where: { status: 'completed', paymentStatus: 'completed' },
    });

    const avgRideRating = await Ride.findAll({
      attributes: [
        [
          Ride.sequelize.fn('AVG', Ride.sequelize.col('driverRating')),
          'avgRating',
        ],
      ],
      raw: true,
    });

    const ridesThisMonth = await Ride.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().setDate(1)),
        },
        status: 'completed',
      },
    });

    res.status(200).json({
      analytics: {
        totalUsers,
        totalDrivers,
        activeDrivers,
        totalRides,
        completedRides,
        totalRevenue: totalRevenue || 0,
        avgRideRating: avgRideRating[0]?.avgRating || 0,
        ridesThisMonth,
      },
    });
  } catch (error) {
    console.error('Error al obtener análiticas:', error);
    res.status(500).json({
      error: 'Error al obtener las análiticas',
    });
  }
};

const createPromoCode = async (req, res) => {
  try {
    const { code, discountPercentage, discountAmount, maxUses, expiryDate } =
      req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Código promocional requerido',
      });
    }

    res.status(201).json({
      message: 'Código promocional creado',
      promoCode: {
        code,
        discountPercentage,
        discountAmount,
        maxUses,
        expiryDate,
      },
    });
  } catch (error) {
    console.error('Error al crear código promocional:', error);
    res.status(500).json({
      error: 'Error al crear código promocional',
    });
  }
};

const deleteDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({
        error: 'Conductor no encontrado',
      });
    }

    // Verificar si tiene viajes activos
    const activeRides = await Ride.count({
      where: {
        driverId: driverId,
        status: { [Op.in]: ['accepted', 'in_progress'] },
      },
    });

    if (activeRides > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar un conductor con viajes activos',
      });
    }

    // Eliminar el registro del conductor (User se mantiene)
    await driver.destroy();

    res.status(200).json({
      message: 'Conductor eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar conductor:', error);
    res.status(500).json({
      error: 'Error al eliminar el conductor',
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    // Desactivar el usuario en lugar de eliminarlo
    await user.update({
      isActive: false,
    });

    res.status(200).json({
      message: 'Usuario desactivado exitosamente',
      user,
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      error: 'Error al desactivar el usuario',
    });
  }
};

const enableUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    // Habilitar el usuario
    await user.update({
      isActive: true,
    });

    res.status(200).json({
      message: 'Usuario habilitado exitosamente',
      user,
    });
  } catch (error) {
    console.error('Error al habilitar usuario:', error);
    res.status(500).json({
      error: 'Error al habilitar el usuario',
    });
  }
};

module.exports = {
  getAllUsers,
  getAllDrivers,
  approveDriver,
  rejectDriver,
  getPendingDriverRequests,
  deleteDriver,
  deleteUser,
  enableUser,
  getAllRides,
  getAnalytics,
  createPromoCode,
};
