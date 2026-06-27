const { Task, TaskStatus, TaskKanbanStatus } = require('../models/Task');
const TaskHistory = require('../models/TaskHistory');
const TaskTimeline = require('../models/TaskTimeline');
const { Notification, NotificationType } = require('../models/Notification');
const Department = require('../models/Department');
const { User } = require('../models/User');

const getTaskJourney = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const history = await TaskHistory.find({ task: req.params.id })
      .populate('performedBy', 'name role')
      .populate('fromDepartment', 'name color')
      .populate('toDepartment', 'name color')
      .populate('fromUser', 'name department')
      .populate('toUser', 'name department')
      .sort({ createdAt: 1 });

    const journeyTree = [];
    const visited = new Set();

    for (const entry of history) {
      const key = entry.toDepartment
        ? entry.toDepartment._id.toString()
        : entry.actionType;
      if (!visited.has(key)) {
        visited.add(key);
        journeyTree.push({
          _id: entry._id,
          actionType: entry.actionType,
          department: entry.toDepartment,
          user: entry.toUser,
          performedBy: entry.performedBy,
          timestamp: entry.createdAt,
          notes: entry.notes
        });
      }
    }

    res.json({
      success: true,
      data: {
        journey: journeyTree,
        history,
        taskId: task._id
      }
    });
  } catch (error) {
    console.error('Error fetching task journey:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getTaskHistory = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const history = await TaskHistory.find({ task: req.params.id })
      .populate('performedBy', 'name role')
      .populate('fromDepartment', 'name color')
      .populate('toDepartment', 'name color')
      .populate('fromUser', 'name department')
      .populate('toUser', 'name department')
      .sort({ createdAt: -1 });

    const timeline = await TaskTimeline.find({ task: req.params.id })
      .populate('user', 'name role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        history,
        timeline,
        count: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching task history:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getTaskCurrentState = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('currentDepartment', 'name color')
      .populate('assignedTo', 'name department role')
      .populate('createdBy', 'name role')
      .populate('workflowId', 'name stages');

    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const lastHistory = await TaskHistory.findOne({ task: req.params.id })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name role')
      .populate('toDepartment', 'name color')
      .populate('toUser', 'name department');

    res.json({
      success: true,
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          workflowStatus: task.workflowStatus,
          kanbanStatus: task.kanbanStatus,
          priority: task.priority,
          currentStage: task.currentStage,
          lastAction: task.lastAction,
          lastActionAt: task.lastActionAt,
          journeyStartedAt: task.journeyStartedAt,
          createdAt: task.createdAt,
          completedAt: task.completedAt
        },
        currentDepartment: task.currentDepartment,
        currentUsers: task.assignedTo,
        lastAction: lastHistory,
        workflow: task.workflowId
      }
    });
  } catch (error) {
    console.error('Error fetching task current state:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getTaskDuration = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const history = await TaskHistory.find({ task: req.params.id })
      .populate('toDepartment', 'name color')
      .populate('toUser', 'name department')
      .sort({ createdAt: 1 });

    const departmentDurations = [];
    const userDurations = [];
    const deptMap = {};
    const userMap = {};

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const nextEntry = history[i + 1];
      const entryTime = new Date(entry.createdAt).getTime();
      const exitTime = nextEntry
        ? new Date(nextEntry.createdAt).getTime()
        : Date.now();
      const durationMs = Math.max(0, exitTime - entryTime);

      if (entry.toDepartment) {
        const deptId = entry.toDepartment._id.toString();
        if (!deptMap[deptId]) {
          deptMap[deptId] = {
            department: entry.toDepartment,
            totalMs: 0,
            entryCount: 0,
            firstEntry: entry.createdAt,
            lastEntry: entry.createdAt
          };
        }
        deptMap[deptId].totalMs += durationMs;
        deptMap[deptId].entryCount++;
        deptMap[deptId].lastEntry = entry.createdAt;
      }

      if (entry.toUser) {
        const userId = entry.toUser._id.toString();
        if (!userMap[userId]) {
          userMap[userId] = {
            user: entry.toUser,
            totalMs: 0,
            entryCount: 0,
            firstEntry: entry.createdAt,
            lastEntry: entry.createdAt
          };
        }
        userMap[userId].totalMs += durationMs;
        userMap[userId].entryCount++;
        userMap[userId].lastEntry = entry.createdAt;
      }
    }

    for (const deptId of Object.keys(deptMap)) {
      const d = deptMap[deptId];
      departmentDurations.push({
        department: d.department,
        totalHours: Math.round(d.totalMs / 3600000 * 100) / 100,
        totalMinutes: Math.round(d.totalMs / 60000),
        entryCount: d.entryCount,
        firstEntry: d.firstEntry,
        lastEntry: d.lastEntry
      });
    }

    for (const userId of Object.keys(userMap)) {
      const u = userMap[userId];
      userDurations.push({
        user: u.user,
        totalHours: Math.round(u.totalMs / 3600000 * 100) / 100,
        totalMinutes: Math.round(u.totalMs / 60000),
        entryCount: u.entryCount,
        firstEntry: u.firstEntry,
        lastEntry: u.lastEntry
      });
    }

    const totalAgeMs = task.journeyStartedAt
      ? Date.now() - new Date(task.journeyStartedAt).getTime()
      : task.createdAt
        ? Date.now() - new Date(task.createdAt).getTime()
        : 0;

    res.json({
      success: true,
      data: {
        departmentDurations,
        userDurations,
        totalJourneyHours: Math.round(totalAgeMs / 3600000 * 100) / 100,
        totalJourneyMinutes: Math.round(totalAgeMs / 60000),
        isCompleted: !!task.completedAt,
        completedAt: task.completedAt
      }
    });
  } catch (error) {
    console.error('Error calculating task duration:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const transferTask = async (req, res) => {
  try {
    const { departmentId, userId, notes } = req.body;
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name department');

    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const fromDepartment = task.currentDepartment || null;
    const fromUsers = task.assignedTo.map(u => u._id);

    let newAssignedTo = task.assignedTo.map(u => u._id);

    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({ success: false, message: 'القسم غير موجود' });
      }
      task.currentDepartment = dept._id;
    }

    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json({ success: false, message: 'المستخدم غير موجود' });
      }
      newAssignedTo = [user._id];
    }

    task.assignedTo = newAssignedTo;
    task.lastAction = 'transferred';
    task.lastActionAt = new Date();
    if (!task.journeyStartedAt) {
      task.journeyStartedAt = new Date();
    }

    await task.save();
    await task.populate('assignedTo', 'name department role');
    await task.populate('currentDepartment', 'name color');

    let actionType = 'transferred';
    if (departmentId && userId) actionType = 'department_changed';
    else if (departmentId && !userId) actionType = 'department_changed';
    else if (!departmentId && userId) actionType = 'reassigned';

    await TaskHistory.record({
      task: task._id,
      actionType,
      performedBy: req.user._id,
      fromDepartment,
      toDepartment: task.currentDepartment,
      fromUser: fromUsers.length > 0 ? fromUsers[0] : null,
      toUser: newAssignedTo.length > 0 ? newAssignedTo[0] : null,
      fromStatus: task.status,
      toStatus: task.status,
      notes: notes || ''
    });

    await TaskTimeline.log({
      task: task._id,
      action: 'reassigned',
      user: req.user._id,
      description: notes
        ? `تم تحويل المهمة: ${notes}`
        : 'تم تحويل المهمة إلى قسم/موظف آخر'
    });

    for (const userId of newAssignedTo) {
      const uid = userId._id ? userId._id.toString() : userId.toString();
      if (uid !== req.user._id.toString()) {
        await Notification.createNotification(
          userId,
          NotificationType.TASK_ASSIGNED,
          'تم تحويل مهمة إليك',
          `تم تحويل مهمة "${task.title}" إليك`,
          task._id
        );
      }
    }

    res.json({
      success: true,
      message: 'تم تحويل المهمة بنجاح',
      data: { task }
    });
  } catch (error) {
    console.error('Error transferring task:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

module.exports = {
  getTaskJourney,
  getTaskHistory,
  getTaskCurrentState,
  getTaskDuration,
  transferTask
};
