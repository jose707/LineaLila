// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get(
  '/users',
  authMiddleware,
  adminMiddleware,
  adminController.getAllUsers,
);
router.delete(
  '/users/:userId',
  authMiddleware,
  adminMiddleware,
  adminController.deleteUser,
);
router.put(
  '/users/:userId/enable',
  authMiddleware,
  adminMiddleware,
  adminController.enableUser,
);
router.get(
  '/drivers',
  authMiddleware,
  adminMiddleware,
  adminController.getAllDrivers,
);
router.get(
  '/drivers/pending',
  authMiddleware,
  adminMiddleware,
  adminController.getPendingDriverRequests,
);
router.put(
  '/drivers/:driverId/approve',
  authMiddleware,
  adminMiddleware,
  adminController.approveDriver,
);
router.put(
  '/requests/:requestId/approve',
  authMiddleware,
  adminMiddleware,
  adminController.approveDriver,
);
router.put(
  '/drivers/:driverId/reject',
  authMiddleware,
  adminMiddleware,
  adminController.rejectDriver,
);
router.put(
  '/requests/:requestId/reject',
  authMiddleware,
  adminMiddleware,
  adminController.rejectDriver,
);
router.delete(
  '/drivers/:driverId',
  authMiddleware,
  adminMiddleware,
  adminController.deleteDriver,
);
router.get(
  '/rides',
  authMiddleware,
  adminMiddleware,
  adminController.getAllRides,
);
router.get(
  '/analytics',
  authMiddleware,
  adminMiddleware,
  adminController.getAnalytics,
);
router.post(
  '/promo-codes',
  authMiddleware,
  adminMiddleware,
  adminController.createPromoCode,
);

module.exports = router;
