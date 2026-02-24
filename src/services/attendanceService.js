const { Attendance, User, FamilyGroup } = require('../models');
const { ApiError, getDateRange, STATUS } = require('../utils');

class AttendanceService {
  /**
   * Mark attendance (User)
   */
  async mark(data, markedByUserId, familyMemberIds = []) {
    const { date, userIds } = data;
    const results = [];
    const errors = [];

    // Validate that user can mark for these users (family members)
    for (const userId of userIds) {
      // Check if user is marking for self or family member
      if (userId !== markedByUserId.toString() && !familyMemberIds.includes(userId)) {
        errors.push({
          userId,
          message: 'You can only mark attendance for yourself or family members'
        });
        continue;
      }

      try {
        // Check if attendance already exists for this date
        const existing = await Attendance.findOne({
          userId,
          date: new Date(date)
        });

        if (existing) {
          errors.push({
            userId,
            message: 'Attendance already marked for this date'
          });
          continue;
        }

        const attendance = await Attendance.create({
          date: new Date(date),
          userId,
          markedBy: markedByUserId,
          markedByAdmin: false,
          status: STATUS.PENDING
        });

        results.push(attendance);
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
   * Get user's own attendance
   */
  async getOwn(userId, query = {}) {
    const { startDate, endDate, status, page = 1, limit = 20 } = query;

    const filter = { userId };

    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      filter.date = { $gte: start, $lte: end };
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(filter)
    ]);

    return { data, total };
  }

  /**
   * Get family attendance
   */
  async getFamily(familyMemberIds, query = {}) {
    const { startDate, endDate, status, page = 1, limit = 50 } = query;

    const filter = { userId: { $in: familyMemberIds } };

    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      filter.date = { $gte: start, $lte: end };
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(filter)
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
      Attendance.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(filter)
    ]);

    return { data, total };
  }

  /**
   * Approve attendance (Admin)
   */
  async approve(id, adminId) {
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      throw ApiError.notFound('Attendance record not found');
    }

    attendance.status = STATUS.APPROVED;
    attendance.approvedBy = adminId;
    attendance.approvedAt = new Date();
    await attendance.save();

    return attendance;
  }

  /**
   * Reject attendance (Admin)
   */
  async reject(id, adminId, remarks = '') {
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      throw ApiError.notFound('Attendance record not found');
    }

    attendance.status = STATUS.REJECTED;
    attendance.approvedBy = adminId;
    attendance.rejectedAt = new Date();
    attendance.remarks = remarks;
    await attendance.save();

    return attendance;
  }

  /**
   * Bulk approve (Admin)
   */
  async bulkApprove(ids, adminId) {
    const result = await Attendance.updateMany(
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
   * Add attendance for user (Admin)
   */
  async addForUser(data, adminId) {
    const { date, userId, autoApprove = true } = data;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check for existing attendance
    const existing = await Attendance.findOne({
      userId,
      date: new Date(date)
    });

    if (existing) {
      throw ApiError.conflict('Attendance already exists for this date');
    }

    const attendance = await Attendance.create({
      date: new Date(date),
      userId,
      markedBy: userId,
      markedByAdmin: true,
      status: autoApprove ? STATUS.APPROVED : STATUS.PENDING,
      approvedBy: autoApprove ? adminId : null,
      approvedAt: autoApprove ? new Date() : null
    });

    return attendance;
  }
}

module.exports = new AttendanceService();