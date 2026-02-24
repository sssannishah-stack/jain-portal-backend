const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { protect, adminOnly, validate } = require('../middleware');
const { createUserValidator, updateUserValidator, userIdValidator } = require('../validators');

// All routes require admin authentication
router.use(protect, adminOnly);

// Get users without group (for adding to groups)
router.get('/without-group', userController.getUsersWithoutGroup);

// CRUD operations
router.route('/')
  .get(userController.getUsers)
  .post(createUserValidator, validate, userController.createUser);

router.route('/:id')
  .get(userIdValidator, validate, userController.getUser)
  .put(updateUserValidator, validate, userController.updateUser)
  .delete(userIdValidator, validate, userController.deleteUser);

// Get credentials
router.get('/:id/credentials', userIdValidator, validate, userController.getCredentials);

module.exports = router;