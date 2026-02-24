const { FamilyGroup, User } = require('../models');
const { ApiError } = require('../utils');

class GroupService {
  /**
   * Get all groups
   */
  async getAll(query = {}) {
    const { page = 1, limit = 10, search = '' } = query;

    const filter = { isActive: true };

    if (search) {
      filter.groupName = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      FamilyGroup.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FamilyGroup.countDocuments(filter)
    ]);

    return {
      data: groups,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get group by ID
   */
  async getById(id) {
    const group = await FamilyGroup.findById(id);
    if (!group) {
      throw ApiError.notFound('Group not found');
    }
    return group;
  }

  /**
   * Create new group
   */
  async create(data, adminId) {
    const group = await FamilyGroup.create({
      ...data,
      createdBy: adminId
    });

    // Update users with family group ID
    if (data.members && data.members.length > 0) {
      await User.updateMany(
        { _id: { $in: data.members } },
        { familyGroupId: group._id }
      );
    }

    return this.getById(group._id);
  }

  /**
   * Update group
   */
  async update(id, data) {
    const group = await FamilyGroup.findById(id);
    if (!group) {
      throw ApiError.notFound('Group not found');
    }

    // If members are being updated
    if (data.members) {
      const oldMembers = group.members.map(m => m._id.toString());
      const newMembers = data.members;

      // Remove old members
      const removedMembers = oldMembers.filter(m => !newMembers.includes(m));
      if (removedMembers.length > 0) {
        await User.updateMany(
          { _id: { $in: removedMembers } },
          { familyGroupId: null }
        );
      }

      // Add new members
      const addedMembers = newMembers.filter(m => !oldMembers.includes(m));
      if (addedMembers.length > 0) {
        await User.updateMany(
          { _id: { $in: addedMembers } },
          { familyGroupId: group._id }
        );
      }
    }

    Object.assign(group, data);
    await group.save();

    return this.getById(group._id);
  }

  /**
   * Delete group
   */
  async delete(id) {
    const group = await FamilyGroup.findById(id);
    if (!group) {
      throw ApiError.notFound('Group not found');
    }

    // Remove familyGroupId from all members
    await User.updateMany(
      { familyGroupId: group._id },
      { familyGroupId: null }
    );

    group.isActive = false;
    group.members = [];
    await group.save();

    return group;
  }

  /**
   * Add member to group
   */
  async addMember(groupId, userId) {
    const group = await FamilyGroup.findById(groupId);
    if (!group) {
      throw ApiError.notFound('Group not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Remove from old group if any
    if (user.familyGroupId) {
      await FamilyGroup.findByIdAndUpdate(
        user.familyGroupId,
        { $pull: { members: userId } }
      );
    }

    // Add to new group
    group.members.addToSet(userId);
    await group.save();

    // Update user
    user.familyGroupId = groupId;
    await user.save();

    return this.getById(groupId);
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId, userId) {
    const group = await FamilyGroup.findById(groupId);
    if (!group) {
      throw ApiError.notFound('Group not found');
    }

    // Remove from group
    group.members.pull(userId);
    await group.save();

    // Update user
    await User.findByIdAndUpdate(userId, { familyGroupId: null });

    return this.getById(groupId);
  }
}

module.exports = new GroupService();