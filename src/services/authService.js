const { Admin, User, FamilyGroup } = require('../models');
const { generateToken, ApiError } = require('../utils');

class AuthService {
  /**
   * Admin Login - Using Name and Password
   */
  async adminLogin(name, password) {
    // Find admin by username or name (case insensitive)
    const admin = await Admin.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${name}$`, 'i') } },
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    });

    if (!admin) {
      throw ApiError.unauthorized('Invalid name or password');
    }

    if (!admin.isActive) {
      throw ApiError.unauthorized('Your account is inactive');
    }

    // Check password (plain text comparison)
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid name or password');
    }

    // Generate token
    const token = generateToken({
      id: admin._id,
      role: admin.role
    });

    return {
      admin: admin.toJSON(),
      token
    };
  }

  /**
   * User Login - Using Name and Password
   */
  async userLogin(name, password) {
    // Find user by name and password (removed isActive: true filter temporarily)
    const user = await User.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      password: password
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid name or password');
    }

    // Get family members if user is in a group
    let familyMembers = [user];
    let familyGroupId = null;

    if (user.familyGroupId) {
      familyGroupId = user.familyGroupId._id || user.familyGroupId;

      const group = await FamilyGroup.findById(familyGroupId);
      if (group && group.members) {
        familyMembers = group.members.filter(m => m.isActive);
      }
    }

    // Generate token
    const token = generateToken({
      id: user._id,
      role: 'user',
      familyGroupId: familyGroupId,
      familyMembers: familyMembers.map(m => m._id)
    });

    return {
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        address: user.address,
        familyGroupId: user.familyGroupId
      },
      familyMembers: familyMembers.map(m => ({
        _id: m._id,
        name: m.name
      })),
      familyGroupId,
      token
    };
  }

  /**
   * Verify Token
   */
  async verifyToken(decoded) {
    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        throw ApiError.unauthorized('Invalid token');
      }
      return { type: 'admin', data: admin };
    } else {
      const user = await User.findById(decoded.id);
      if (!user) {
        throw ApiError.unauthorized('Invalid token');
      }
      return { type: 'user', data: user };
    }
  }
}

module.exports = new AuthService();