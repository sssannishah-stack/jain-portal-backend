const { User, FamilyGroup } = require('../models');
const { ApiError } = require('../utils');

class UserService {
  /**
   * Get all users with pagination and filters
   */
  async getAll(query = {}) {
    const {
      page = 1,
      limit = 100,
      search = '',
      groupId,
      isActive
    } = query;

    const filter = { isActive: true };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (groupId) {
      filter.familyGroupId = groupId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    return {
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get user by ID
   */
  async getById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  /**
   * Create new user
   */
  async create(data, adminId) {
    // Trim and prepare data
    const name = data.name?.trim();
    const password = data.password?.trim();

    if (!name || !password) {
      throw ApiError.badRequest('Name and password are required');
    }

    // Check for duplicate name + password combination
    const existing = await User.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      password: password
    });

    if (existing) {
      throw ApiError.conflict('This name and password combination already exists. Please use a different password.');
    }

    // Create user
    const user = await User.create({
      name: name,
      password: password,
      phone: data.phone || '',
      address: data.address || '',
      familyGroupId: data.familyGroupId || null,
      createdBy: adminId || null,
      isActive: true
    });

    // If familyGroupId is provided, add user to group
    if (data.familyGroupId) {
      await FamilyGroup.findByIdAndUpdate(
        data.familyGroupId,
        { $addToSet: { members: user._id } }
      );
    }

    // Fetch and return the user with populated fields
    return this.getById(user._id);
  }

  /**
   * Update user
   */
  async update(id, data) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prepare update data
    const updateData = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    
    if (data.password !== undefined) {
      updateData.password = data.password.trim();
    }
    
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    
    if (data.address !== undefined) {
      updateData.address = data.address;
    }

    // Check for duplicate if name or password is being changed
    if (updateData.name || updateData.password) {
      const checkName = updateData.name || user.name;
      const checkPassword = updateData.password || user.password;

      const existing = await User.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${checkName}$`, 'i') },
        password: checkPassword
      });

      if (existing) {
        throw ApiError.conflict('This name and password combination already exists.');
      }
    }

    // Handle family group change
    const oldGroupId = user.familyGroupId?._id || user.familyGroupId;
    let newGroupId = data.familyGroupId;

    // Handle empty string or null
    if (newGroupId === '' || newGroupId === 'null' || newGroupId === null) {
      newGroupId = null;
    }

    // Remove from old group if changing groups
    if (oldGroupId && (!newGroupId || oldGroupId.toString() !== newGroupId?.toString())) {
      await FamilyGroup.findByIdAndUpdate(
        oldGroupId,
        { $pull: { members: user._id } }
      );
    }

    // Add to new group if provided
    if (newGroupId && (!oldGroupId || oldGroupId.toString() !== newGroupId.toString())) {
      await FamilyGroup.findByIdAndUpdate(
        newGroupId,
        { $addToSet: { members: user._id } }
      );
      updateData.familyGroupId = newGroupId;
    } else if (newGroupId === null) {
      updateData.familyGroupId = null;
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

    // Return updated user with populated fields
    return this.getById(user._id);
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Remove from family group if exists
    if (user.familyGroupId) {
      await FamilyGroup.findByIdAndUpdate(
        user.familyGroupId._id || user.familyGroupId,
        { $pull: { members: user._id } }
      );
    }

    user.isActive = false;
    user.familyGroupId = null;
    await user.save();

    return user;
  }

  /**
   * Get user credentials (for admin)
   */
  async getCredentials(id) {
    const user = await User.findById(id).select('name password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return {
      name: user.name,
      password: user.password
    };
  }

  /**
   * Get users without group
   */
  async getUsersWithoutGroup() {
    return User.find({ 
      familyGroupId: null,
      isActive: true 
    }).select('name phone');
  }
}

module.exports = new UserService();