const express = require('express');
const router = express.Router();
const { gathaController } = require('../controllers');
const { protect, adminOnly, userOnly, validate } = require('../middleware');
const { 
  addGathaValidator, 
  adminAddGathaValidator, 
  gathaIdValidator,
  gathaQueryValidator
} = require('../validators');

// User routes
router.post(
  '/add', 
  protect, 
  userOnly, 
  addGathaValidator, 
  validate, 
  gathaController.addGatha
);

router.get(
  '/my', 
  protect, 
  userOnly, 
  gathaQueryValidator, 
  validate, 
  gathaController.getOwnGatha
);

router.get(
  '/family', 
  protect, 
  userOnly, 
  gathaQueryValidator, 
  validate, 
  gathaController.getFamilyGatha
);

// Admin routes
router.get(
  '/pending', 
  protect, 
  adminOnly, 
  gathaQueryValidator, 
  validate, 
  gathaController.getPendingGatha
);

router.put(
  '/:id/approve', 
  protect, 
  adminOnly, 
  gathaIdValidator, 
  validate, 
  gathaController.approveGatha
);

router.put(
  '/:id/reject', 
  protect, 
  adminOnly, 
  gathaIdValidator, 
  validate, 
  gathaController.rejectGatha
);

router.post(
  '/bulk-approve', 
  protect, 
  adminOnly, 
  gathaController.bulkApproveGatha
);

router.post(
  '/add-for-user', 
  protect, 
  adminOnly, 
  adminAddGathaValidator, 
  validate, 
  gathaController.addGathaForUser
);

module.exports = router;