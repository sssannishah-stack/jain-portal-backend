const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verify JWT token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Check if it's admin or user
    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        throw ApiError.unauthorized('Admin not found or inactive');
      }
      req.admin = admin;
      req.userType = 'admin';
    } else {
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('User not found or inactive');
      }
      req.user = user;
      req.userType = 'user';
      req.familyGroupId = decoded.familyGroupId;
      req.familyMembers = decoded.familyMembers;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw error;
  }
});

/**
 * Admin only middleware
 */
const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.userType !== 'admin') {
    throw ApiError.forbidden('Access denied. Admin only.');
  }
  next();
});

/**
 * User only middleware
 */
const userOnly = asyncHandler(async (req, res, next) => {
  if (req.userType !== 'user') {
    throw ApiError.forbidden('Access denied. User only.');
  }
  next();
});

/**
 * Super admin only middleware
 */
const superAdminOnly = asyncHandler(async (req, res, next) => {
  if (req.userType !== 'admin' || req.admin.role !== 'super_admin') {
    throw ApiError.forbidden('Access denied. Super admin only.');
  }
  next();
});

module.exports = {
  protect,
  adminOnly,
  userOnly,
  superAdminOnly
};