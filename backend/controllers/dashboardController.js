const { Task, TaskStatus, WorkflowStatus, TaskKanbanStatus } = require('../models/Task');
const Workflow = require('../models/Workflow');
const TaskTimeline = require('../models/TaskTimeline');
const { User } = require('../models/User');

const getDashboardStats = async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const openTasks = await Task.countDocuments({
      status: { $nin: [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] }
    });
    const completedTasks = await Task.countDocuments({
      status: { $in: [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] }
    });
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $nin: [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] }
    });
    const workflowTasks = await Task.countDocuments({ workflowId: { $ne: null } });
    const rejectedTasks = await Task.countDocuments({ workflowStatus: WorkflowStatus.REJECTED });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const todayCreated = await Task.countDocuments({ createdAt: { $gte: todayStart, $lt: todayEnd } });
    res.json({
      success: true, data: {
        totalTasks, openTasks, completedTasks, overdueTasks,
        workflowTasks, rejectedTasks, todayCreated,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getEmployeePerformance = async (req, res) => {
  try {
    const filter = { role: 'employee' };
    if (req.user.role === 'manager' && req.user.department) {
      filter.department = req.user.department;
    } else if (req.query.department) {
      filter.department = req.query.department;
    }
    const employees = await User.find(filter).select('name department role position avatar');

    const taskStats = await Task.aggregate([
      { $match: { assignedTo: { $in: employees.map(e => e._id) } } },
      { $group: {
        _id: '$assignedTo',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $in: ['$status', [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED]] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [{ $lt: ['$dueDate', new Date()] }, { $nin: ['$status', [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED]] }] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] } }
      } }
    ]);
    const statsMap = new Map(taskStats.map(s => [s._id.toString(), s]));

    const performance = employees.map(emp => {
      const stats = statsMap.get(emp._id.toString()) || { total: 0, completed: 0, overdue: 0, inProgress: 0 };
      return {
        user: { _id: emp._id, name: emp.name, department: emp.department, role: emp.role, position: emp.position, avatar: emp.avatar },
        total: stats.total, completed: stats.completed, overdue: stats.overdue, inProgress: stats.inProgress,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      };
    });
    performance.sort((a, b) => b.completionRate - a.completionRate);
    res.json({ success: true, data: { performance } });
  } catch (error) {
    console.error('Error fetching employee performance:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getDepartmentPerformance = async (req, res) => {
  try {
    const departments = await require('../models/Department').find();
    const departmentData = await Promise.all(departments.map(async (dept) => {
      const usersInDept = await User.find({ department: dept.name }).select('_id');
      const userIds = usersInDept.map(u => u._id);
      const total = await Task.countDocuments({ assignedTo: { $in: userIds } });
      const completed = await Task.countDocuments({
        assignedTo: { $in: userIds },
        status: { $in: [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] }
      });
      const overdue = await Task.countDocuments({
        assignedTo: { $in: userIds }, dueDate: { $lt: new Date() },
        status: { $nin: [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] }
      });
      return {
        department: dept.name, color: dept.color,
        employeeCount: userIds.length,
        total, completed, overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }));
    res.json({ success: true, data: { departments: departmentData } });
  } catch (error) {
    console.error('Error fetching department performance:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getBottleneckStages = async (req, res) => {
  try {
    const workflowTasks = await Task.find({ workflowId: { $ne: null } }).populate('workflowId', 'name stages');
    const stageStats = {};
    workflowTasks.forEach(task => {
      if (!task.workflowId) return;
      const stages = task.workflowId.stages || [];
      stages.forEach((stage, index) => {
        const key = `${task.workflowId.name}_${index}`;
        if (!stageStats[key]) {
          stageStats[key] = {
            workflowName: task.workflowId.name,
            stageName: stage.name,
            stageOrder: stage.order,
            totalTasks: 0, completedTasks: 0, rejectedTasks: 0, activeTasks: 0
          };
        }
        stageStats[key].totalTasks++;
        if (task.currentStage > index) stageStats[key].completedTasks++;
        else if (task.currentStage === index) stageStats[key].activeTasks++;
        if (task.workflowStatus === 'rejected') stageStats[key].rejectedTasks++;
      });
    });
    const bottlenecks = Object.values(stageStats)
      .filter(s => s.activeTasks > 0)
      .sort((a, b) => b.activeTasks - a.activeTasks);
    res.json({ success: true, data: { bottlenecks } });
  } catch (error) {
    console.error('Error analyzing bottlenecks:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getAvgCompletionTime = async (req, res) => {
  try {
    const pipeline = [
      { $match: { completedAt: { $ne: null }, createdAt: { $ne: null } } },
      { $project: {
          completionTime: { $subtract: ['$completedAt', '$createdAt'] }
      } },
      { $group: {
          _id: null,
          avgMs: { $avg: '$completionTime' },
          count: { $sum: 1 }
      } }
    ];
    const result = await Task.aggregate(pipeline);
    const avgHours = result.length > 0 ? Math.round(result[0].avgMs / 3600000) : 0;
    res.json({ success: true, data: { avgCompletionHours: avgHours, totalCompleted: result[0]?.count || 0 } });
  } catch (error) {
    console.error('Error calculating avg completion time:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

module.exports = { getDashboardStats, getEmployeePerformance, getDepartmentPerformance, getBottleneckStages, getAvgCompletionTime };
