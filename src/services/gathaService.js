const { Gatha, User } = require('../models');
const { ApiError, getDateRange, STATUS } = require('../utils');

class GathaService {
  /**
   * Add gatha (User)
   */
  async add(data, markedByUserId, familyMemberIds = []) {
    const { date, userIds, gathaType, gathaCount, gathaDetails } = data;
    const results = [];
    const errors = [];

    for (const userId of userIds) {
      // Check if user can add for this user
      if (userId !== markedByUserId.toString() && !familyMemberIds.includes(userId)) {
        errors.push({
          userId,
          message: 'You can only add gatha for yourself or family members'
        });
        continue;
      }

      try {
        const gatha = await Gatha.create({
          date: new Date(date),
          userId,
          gathaType,
          gathaCount,
          gathaDetails,
          markedBy: markedByUserId,
          markedByAdmin: false,
          status: STATUS.PENDING
        });

        results.push(gatha);
      } catch (error) {
        errors.push({
          userId,
          message: error.message
        });
      }
    }

    return { results, errors };
  }

  /**
   * Get user's own gatha
   */
  async getOwn(userId, query = {}) {
    const { startDate, endDate, status, gathaType, page = 1, limit = 20 } = query;

    const filter = { userId };

    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      filter.date = { $gte: start, $lte: end };
    }

    if (status) {
      filter.status = status;
    }

    if (gathaType) {
      filter.gathaType = gathaType;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Gatha.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Gatha.countDocuments(filter)
    ]);

    return { data, total };
  }

  /**
   * Get family gatha
   */
  async getFamily(familyMemberIds, query = {}) {
    const { startDate, endDate, status, gathaType, page = 1, limit = 50 } = query;

    const filter = { userId: { $in: familyMemberIds } };

    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      filter.date = { $gte: start, $lte: end };
    }

    if (status) {
      filter.status = status;
    }

    if (gathaType) {
      filter.gathaType = gathaType;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Gatha.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Gatha.countDocuments(filter)
    ]);

    return { data, total };
  }

  /**
   * Get pending approvals (Admin)
   */
  async getPending(query = {}) {
    const { startDate, endDate, page = 1, limit = 50 } = query;

    const filter = { status: STATUS.PENDING };

    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      filter.date = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Gatha.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Gatha.countDocuments(filter)
    ]);

    return { data, total };
  }

  /**
   * Approve gatha (Admin)
   */
  async approve(id, adminId) {
    const gatha = await Gatha.findById(id);
    if (!gatha) {
      throw ApiError.notFound('Gatha record not found');
    }

    gatha.status = STATUS.APPROVED;
    gatha.approvedBy = adminId;
    gatha.approvedAt = new Date();
    await gatha.save();

    return gatha;
  }

  /**
   * Reject gatha (Admin)
   */
  async reject(id, adminId, remarks = '') {
    const gatha = await Gatha.findById(id);
    if (!gatha) {
      throw ApiError.notFound('Gatha record not found');
    }

    gatha.status = STATUS.REJECTED;
    gatha.approvedBy = adminId;
    gatha.rejectedAt = new Date();
    gatha.remarks = remarks;
    await gatha.save();

    return gatha;
  }

  /**
   * Bulk approve (Admin)
   */
  async bulkApprove(ids, adminId) {
    const result = await Gatha.updateMany(
      { _id: { $in: ids }, status: STATUS.PENDING },
      {
        status: STATUS.APPROVED,
        approvedBy: adminId,
        approvedAt: new Date()
      }
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Add gatha for user (Admin)
   */
  async addForUser(data, adminId) {
    const { date, userId, gathaType, gathaCount, gathaDetails, autoApprove = true } = data;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const gatha = await Gatha.create({
      date: new Date(date),
      userId,
      gathaType,
      gathaCount,
      gathaDetails,
      markedBy: userId,
      markedByAdmin: true,
      status: autoApprove ? STATUS.APPROVED : STATUS.PENDING,
      approvedBy: autoApprove ? adminId : null,
      approvedAt: autoApprove ? new Date() : null
    });

    return gatha;
  }
}

module.exports = new GathaService();