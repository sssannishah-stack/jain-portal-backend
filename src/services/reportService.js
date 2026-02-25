const { User, FamilyGroup, Attendance, Gatha } = require('../models');
const { getDateRange, getCurrentMonthRange, getTodayRange, STATUS } = require('../utils');

class ReportService {
  /**
   * Get admin dashboard stats
   */
  async getAdminDashboard() {
    const { start: monthStart, end: monthEnd } = getCurrentMonthRange();
    const { start: todayStart, end: todayEnd } = getTodayRange();

    const [
      totalStudents,
      totalGroups,
      pendingAttendance,
      pendingGatha,
      todayAttendance,
      monthlyAttendance,
      monthlyGatha
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      FamilyGroup.countDocuments({ isActive: true }),
      Attendance.countDocuments({ status: STATUS.PENDING }),
      Gatha.countDocuments({ status: STATUS.PENDING }),
      Attendance.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
        status: STATUS.APPROVED
      }),
      Attendance.countDocuments({
        date: { $gte: monthStart, $lte: monthEnd },
        status: STATUS.APPROVED
      }),
      Gatha.aggregate([
        {
          $match: {
            date: { $gte: monthStart, $lte: monthEnd },
            status: STATUS.APPROVED
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$gathaCount' }
          }
        }
      ])
    ]);

    return {
      totalStudents,
      totalGroups,
      pendingApprovals: pendingAttendance + pendingGatha,
      pendingAttendance,
      pendingGatha,
      todayAttendance,
      monthlyAttendance,
      monthlyGatha: monthlyGatha[0]?.total || 0
    };
  }

  /**
   * Get user dashboard stats
   */
  async getUserDashboard(userId, familyMemberIds = []) {
    const { start: monthStart, end: monthEnd } = getCurrentMonthRange();

    const userFilter = { userId, status: STATUS.APPROVED };
    const familyFilter = {
      userId: { $in: familyMemberIds },
      status: STATUS.APPROVED
    };

    const [
      myAttendance,
      myNewGatha,
      myRevisionGatha,
      myPending,
      familyAttendance,
      familyGatha
    ] = await Promise.all([
      // My stats
      Attendance.countDocuments({
        ...userFilter,
        date: { $gte: monthStart, $lte: monthEnd }
      }),
      Gatha.aggregate([
        {
          $match: {
            ...userFilter,
            gathaType: 'new',
            date: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$gathaCount' } } }
      ]),
      Gatha.aggregate([
        {
          $match: {
            ...userFilter,
            gathaType: 'revision',
            date: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$gathaCount' } } }
      ]),
      Promise.all([
        Attendance.countDocuments({ userId, status: STATUS.PENDING }),
        Gatha.countDocuments({ userId, status: STATUS.PENDING })
      ]),
      // Family stats
      Attendance.countDocuments({
        ...familyFilter,
        date: { $gte: monthStart, $lte: monthEnd }
      }),
      Gatha.aggregate([
        {
          $match: {
            ...familyFilter,
            date: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$gathaCount' } } }
      ])
    ]);

    return {
      myStats: {
        attendance: myAttendance,
        newGatha: myNewGatha[0]?.total || 0,
        revisionGatha: myRevisionGatha[0]?.total || 0,
        pending: myPending[0] + myPending[1]
      },
      familyStats: {
        attendance: familyAttendance,
        gatha: familyGatha[0]?.total || 0,
        memberCount: familyMemberIds.length
      }
    };
  }

  /**
   * Get student-wise report
   */
  async getStudentReport(query = {}) {
    const { startDate, endDate } = query;

    let dateFilter = {};
    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      dateFilter = { $gte: start, $lte: end };
    }

    const students = await User.find({ isActive: true }).lean();

    const report = await Promise.all(
      students.map(async (student) => {
        const filter = {
          userId: student._id,
          status: STATUS.APPROVED,
          ...(dateFilter.hasOwnProperty('$gte') && { date: dateFilter })
        };

        const [attendance, gathaStats] = await Promise.all([
          Attendance.countDocuments(filter),
          Gatha.aggregate([
            { $match: filter },
            {
              $group: {
                _id: '$gathaType',
                total: { $sum: '$gathaCount' }
              }
            }
          ])
        ]);

        const newGatha = gathaStats.find(g => g._id === 'new')?.total || 0;
        const revisionGatha = gathaStats.find(g => g._id === 'revision')?.total || 0;

        return {
          _id: student._id,
          name: student.name,
          familyGroupId: student.familyGroupId,
          totalAttendance: attendance,
          newGatha,
          revisionGatha,
          totalGatha: newGatha + revisionGatha
        };
      })
    );

    return { data: report };
  }

  /**
   * Get group-wise report
   */
  async getGroupReport(query = {}) {
    const { startDate, endDate } = query;

    let dateFilter = {};
    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      dateFilter = { $gte: start, $lte: end };
    }

    const groups = await FamilyGroup.find({ isActive: true }).lean();

    const report = await Promise.all(
      groups.map(async (group) => {
        const memberIds = group.members.map(m => m._id || m);

        if (memberIds.length === 0) {
          return {
            _id: group._id,
            groupName: group.groupName,
            memberCount: 0,
            totalAttendance: 0,
            totalGatha: 0,
            avgAttendance: 0,
            avgGatha: 0
          };
        }

        const filter = {
          userId: { $in: memberIds },
          status: STATUS.APPROVED,
          ...(dateFilter.hasOwnProperty('$gte') && { date: dateFilter })
        };

        const [attendance, gatha] = await Promise.all([
          Attendance.countDocuments(filter),
          Gatha.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$gathaCount' } } }
          ])
        ]);

        const totalGatha = gatha[0]?.total || 0;
        const memberCount = memberIds.length;

        return {
          _id: group._id,
          groupName: group.groupName,
          memberCount,
          members: group.members,
          totalAttendance: attendance,
          totalGatha,
          avgAttendance: memberCount > 0 ? (attendance / memberCount).toFixed(2) : 0,
          avgGatha: memberCount > 0 ? (totalGatha / memberCount).toFixed(2) : 0
        };
      })
    );

    return { data: report };
  }

  /**
   * Get single student detailed report
   */
  async getStudentDetailReport(studentId, query = {}) {
    const { startDate, endDate } = query;

    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    let dateFilter = {};
    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      dateFilter = { date: { $gte: start, $lte: end } };
    }

    const filter = {
      userId: studentId,
      status: STATUS.APPROVED,
      ...dateFilter
    };

    const [attendance, gatha] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }),
      Gatha.find(filter).sort({ date: -1 })
    ]);

    // Calculate summary
    const summary = {
      totalAttendance: attendance.length,
      newGatha: gatha.filter(g => g.gathaType === 'new').reduce((sum, g) => sum + g.gathaCount, 0),
      revisionGatha: gatha.filter(g => g.gathaType === 'revision').reduce((sum, g) => sum + g.gathaCount, 0)
    };
    summary.totalGatha = summary.newGatha + summary.revisionGatha;

    return {
      student,
      summary,
      attendance,
      gatha
    };
  }

  /**
   * Get single group detailed report
   */
  async getGroupDetailReport(groupId, query = {}) {
    const { startDate, endDate } = query;

    const group = await FamilyGroup.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const memberIds = group.members.map(m => m._id || m);

    let dateFilter = {};
    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      dateFilter = { date: { $gte: start, $lte: end } };
    }

    // Get individual member stats
    const memberStats = await Promise.all(
      group.members.map(async (member) => {
        const filter = {
          userId: member._id,
          status: STATUS.APPROVED,
          ...dateFilter
        };

        const [attendance, gathaStats] = await Promise.all([
          Attendance.countDocuments(filter),
          Gatha.aggregate([
            { $match: filter },
            {
              $group: {
                _id: '$gathaType',
                total: { $sum: '$gathaCount' }
              }
            }
          ])
        ]);

        const newGatha = gathaStats.find(g => g._id === 'new')?.total || 0;
        const revisionGatha = gathaStats.find(g => g._id === 'revision')?.total || 0;

        return {
          _id: member._id,
          name: member.name,
          attendance,
          newGatha,
          revisionGatha,
          totalGatha: newGatha + revisionGatha
        };
      })
    );

    // Calculate group summary
    const summary = memberStats.reduce(
      (acc, m) => ({
        totalAttendance: acc.totalAttendance + m.attendance,
        totalNewGatha: acc.totalNewGatha + m.newGatha,
        totalRevisionGatha: acc.totalRevisionGatha + m.revisionGatha,
        totalGatha: acc.totalGatha + m.totalGatha
      }),
      { totalAttendance: 0, totalNewGatha: 0, totalRevisionGatha: 0, totalGatha: 0 }
    );

    return {
      group,
      summary,
      memberStats
    };
  }

  /**
   * Get top performers
   */
  async getTopPerformers(query = {}) {
    const { limit = 10 } = query;
    const { start, end } = getCurrentMonthRange();

    const topByAttendance = await Attendance.aggregate([
      {
        $match: {
          status: STATUS.APPROVED,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          name: '$user.name',
          attendance: '$count'
        }
      }
    ]);

    const topByGatha = await Gatha.aggregate([
      {
        $match: {
          status: STATUS.APPROVED,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$userId',
          total: { $sum: '$gathaCount' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          name: '$user.name',
          gatha: '$total'
        }
      }
    ]);

    return {
      topByAttendance,
      topByGatha
    };
  }

  /**
   * Get analytics stats for a custom date range (Admin)
   */
  async getAnalyticsStats(query = {}) {
    const { startDate, endDate, limit = 10 } = query;

    let dateFilter = {};
    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      dateFilter = { $gte: start, $lte: end };
    } else {
      const { start, end } = getCurrentMonthRange();
      dateFilter = { $gte: start, $lte: end };
    }

    const matchFilter = { status: STATUS.APPROVED, date: dateFilter };

    const [
      totalStudents,
      totalAttendance,
      uniqueStudentsAttended,
      gathaBreakdown,
      topByAttendance,
      topByGatha
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),

      Attendance.countDocuments(matchFilter),

      Attendance.distinct('userId', matchFilter).then(ids => ids.length),

      Gatha.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$gathaType', total: { $sum: '$gathaCount' } } }
      ]),

      // Top students by attendance
      Attendance.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $project: { _id: 1, name: '$user.name', attendance: '$count' } }
      ]),

      // Top students by gatha
      Gatha.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$userId', total: { $sum: '$gathaCount' } } },
        { $sort: { total: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $project: { _id: 1, name: '$user.name', gatha: '$total' } }
      ])
    ]);

    const newGatha = gathaBreakdown.find(g => g._id === 'new')?.total || 0;
    const revisionGatha = gathaBreakdown.find(g => g._id === 'revision')?.total || 0;

    return {
      totalStudents,
      totalAttendance,
      uniqueStudentsAttended,
      attendanceRate: totalStudents > 0
        ? parseFloat(((uniqueStudentsAttended / totalStudents) * 100).toFixed(1))
        : 0,
      newGatha,
      revisionGatha,
      totalGatha: newGatha + revisionGatha,
      topByAttendance,
      topByGatha
    };
  }

  /**
   * Get user analytics stats for a custom date range (User)
   */
  async getUserAnalytics(userId, query = {}) {
    const { startDate, endDate } = query;

    let dateFilter;
    if (startDate && endDate) {
      const { start, end } = getDateRange(startDate, endDate);
      dateFilter = { date: { $gte: start, $lte: end } };
    } else {
      const { start, end } = getCurrentMonthRange();
      dateFilter = { date: { $gte: start, $lte: end } };
    }

    const baseFilter = { userId, status: STATUS.APPROVED, ...dateFilter };

    const [
      attendanceRecords,
      gathaRecords,
      allAttendanceEver
    ] = await Promise.all([
      Attendance.find(baseFilter).sort({ date: 1 }).lean(),
      Gatha.find(baseFilter).sort({ date: -1 }).lean(),
      Attendance.find({ userId, status: STATUS.APPROVED }).sort({ date: 1 }).select('date').lean()
    ]);

    const newGathaTotal = gathaRecords
      .filter(g => g.gathaType === 'new')
      .reduce((sum, g) => sum + (g.gathaCount || 0), 0);
    const revisionGathaTotal = gathaRecords
      .filter(g => g.gathaType === 'revision')
      .reduce((sum, g) => sum + (g.gathaCount || 0), 0);

    // Compute streak from all-time attendance records
    const dateStrings = allAttendanceEver.map(a => {
      const d = new Date(a.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const uniqueDates = [...new Set(dateStrings)].sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }

    // Check if current streak is ongoing (last date is today or yesterday)
    if (uniqueDates.length > 0) {
      const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const diffFromToday = (today - lastDate) / (1000 * 60 * 60 * 24);
      if (diffFromToday <= 1) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    // Group attendance by date for the selected range
    const attendanceDates = attendanceRecords.map(a => {
      const d = new Date(a.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    // Calculate days in range
    let totalDaysInRange = 0;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      totalDaysInRange = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      attendanceCount: attendanceRecords.length,
      totalDaysInRange,
      attendanceRate: totalDaysInRange > 0
        ? parseFloat(((attendanceRecords.length / totalDaysInRange) * 100).toFixed(1))
        : 0,
      newGathaTotal,
      revisionGathaTotal,
      totalGathaCount: newGathaTotal + revisionGathaTotal,
      currentStreak,
      longestStreak,
      attendanceDates,
      gathaRecords
    };
  }
}

module.exports = new ReportService();