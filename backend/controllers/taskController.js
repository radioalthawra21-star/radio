/**
 * Task Controller
 * Handles all task-related operations
 */

const { Task, TaskStatus, TaskDifficulty, TaskPriority, TaskKanbanStatus, WorkflowStatus } = require('../models/Task');
const { User, UserRole } = require('../models/User');
const Workflow = require('../models/Workflow');
const TaskTimeline = require('../models/TaskTimeline');
const TaskHistory = require('../models/TaskHistory');
const Department = require('../models/Department');
const { Notification, NotificationType } = require('../models/Notification');

/**
 * Create new task (manager or employee)
 * POST /api/tasks
 */
const createTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      assignedTo, 
      difficulty, 
      duration,
      startTime,
      endTime,
      isUnusual,
      taskDate,
      dueDate,
      priority,
      workflowId,
      isProposal
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال عنوان المهمة'
      });
    }

    // Build task data — only include optional fields that have values
    const taskData = {
      title,
      description,
      createdBy: req.user._id,
      assignedTo: assignedTo || [req.user._id],
      difficulty: difficulty || TaskDifficulty.MEDIUM,
      duration,
      isUnusual: isUnusual || false,
      isProposal: isProposal || false,
      taskDate: taskDate || new Date(),
      status: TaskStatus.PENDING,
      priority: priority || TaskPriority.MEDIUM,
      kanbanStatus: TaskKanbanStatus.NEW
    };
    if (startTime) taskData.startTime = startTime;
    if (endTime) taskData.endTime = endTime;
    if (dueDate) taskData.dueDate = dueDate;

    // Link to workflow template if provided
    if (workflowId) {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow || !workflow.isActive) {
        return res.status(400).json({ success: false, message: 'سير العمل غير موجود أو غير نشط' });
      }
      taskData.workflowId = workflow._id;
      taskData.currentStage = 0;
      taskData.workflowStatus = WorkflowStatus.IN_PROGRESS;
    }

    const task = await Task.create(taskData);

    // Populate assigned users
    await task.populate('assignedTo', 'name email department');
    await task.populate('createdBy', 'name');

    // Office Manager: validate all assigned users are in their team
    if (req.user.role === 'office_manager' && assignedTo && assignedTo.length > 0) {
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id.toString());
      const allInTeam = assignedTo.every(id => teamIds.includes(id.toString()));
      if (!allInTeam) {
        await task.deleteOne();
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بإسناد مهام لموظفين خارج فريقك'
        });
      }
    }

    // Set journey tracking fields
    task.lastAction = 'created';
    task.lastActionAt = new Date();
    task.journeyStartedAt = new Date();
    if (assignedTo && assignedTo.length > 0) {
      const firstUser = await User.findById(assignedTo[0]);
      if (firstUser && firstUser.department) {
        const dept = await Department.findOne({ name: firstUser.department });
        if (dept) task.currentDepartment = dept._id;
      }
    }
    await task.save();

    // Record journey history
    await TaskHistory.record({
      task: task._id, actionType: 'created',
      performedBy: req.user._id,
      toStatus: TaskStatus.PENDING,
      notes: `تم إنشاء المهمة: ${title}`
    });

    // Log timeline entry for workflow-linked tasks
    if (workflowId) {
      await TaskTimeline.log({
        task: task._id, action: 'created', user: req.user._id,
        description: `تم إنشاء المهمة: ${title}`
      });
      await TaskTimeline.log({
        task: task._id, action: 'stage_transitioned', user: req.user._id,
        toStage: 0, description: 'بدأت المرحلة الأولى من سير العمل'
      });
    }

    // Create notifications
    let notificationCreated = false;
    if (isProposal) {
      // Proposal: notify the direct manager instead of the employee
      const manager = await User.findOne({ role: UserRole.MANAGER, department: req.user.department });
      if (manager) {
        await Notification.createNotification(
          manager._id,
          NotificationType.TASK_PROPOSAL,
          'اقتراح مهمة جديد',
          `قدم ${req.user.name} اقتراح مهمة "${title}" للموافقة`,
          task._id
        );
        notificationCreated = true;
      }
    } else {
      // Normal task: notify assigned employees (parallel instead of sequential)
      const notifyPromises = task.assignedTo
        .filter(userId => {
          const uid = userId._id ? userId._id.toString() : userId.toString();
          return uid !== req.user._id.toString();
        })
        .map(userId =>
          Notification.createNotification(
            userId,
            NotificationType.TASK_ASSIGNED,
            'مهمة جديدة',
            `تم إسناد مهمة "${title}" إليك`,
            task._id
          )
        );
      if (notifyPromises.length > 0) {
        await Promise.all(notifyPromises);
        notificationCreated = true;
      }
      // Notify department manager when employee creates/assigns a task to themselves
      if (req.user.role === UserRole.EMPLOYEE) {
        const manager = await User.findOne({ role: UserRole.MANAGER, department: req.user.department });
        if (manager) {
          const notif = await Notification.createNotification(
            manager._id,
            NotificationType.TASK_ASSIGNED,
            'مهمة جديدة من موظف',
            `أسند ${req.user.name} مهمة "${title}" إلى نفسه`,
            task._id
          );
          if (global.io) {
            global.io.to(manager._id.toString()).emit('notification', notif);
          }
          notificationCreated = true;
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المهمة بنجاح',
      data: {
        task,
        playNotificationSound: notificationCreated
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get tasks for current user
 * GET /api/tasks/my-tasks
 */
const getMyTasks = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // Build query
    const query = {
      assignedTo: req.user._id
    };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.taskDate = {};
      if (startDate) query.taskDate.$gte = new Date(startDate);
      if (endDate) query.taskDate.$lte = new Date(endDate);
    }

    const tasks = await Task.find(query)
      .populate('createdBy', 'name _id')
      .sort({ taskDate: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        tasks
      }
    });
  } catch (error) {
    console.error('خطأ في جلب المهام:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get tasks created by current user
 * GET /api/tasks/created
 */
const getCreatedTasks = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {
      createdBy: req.user._id
    };

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        tasks
      }
    });
  } catch (error) {
    console.error('خطأ في جلب المهام:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get tasks for manager to evaluate
 * GET /api/tasks/to-evaluate
 */
const getTasksToEvaluate = async (req, res) => {
  try {
    let employeeQuery = { role: UserRole.EMPLOYEE };

    if (req.user.role === 'office_manager') {
      // Office manager sees only their team's tasks
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id);
      employeeQuery = { _id: { $in: teamIds } };
    } else if (req.user.role === 'manager') {
      employeeQuery.department = req.user.department;
    }

    const employees = await User.find(employeeQuery);
    const employeeIds = employees.map(e => e._id);

    // Get completed tasks awaiting evaluation
    const tasks = await Task.find({
      assignedTo: { $in: employeeIds },
      status: TaskStatus.COMPLETED,
      isApprovedByManager: false
    })
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name')
      .sort({ endTime: -1 });

    res.json({
      success: true,
      data: {
        tasks
      }
    });
  } catch (error) {
    console.error('خطأ في جلب المهام للتقييم:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get tasks for admin approval
 * GET /api/tasks/to-approve
 */
const getTasksToApprove = async (req, res) => {
  try {
    // Get manager-approved tasks
    const tasks = await Task.find({
      status: TaskStatus.APPROVED,
      isApprovedByManager: true
    })
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name')
      .sort({ managerApprovalDate: -1 });

    res.json({
      success: true,
      data: {
        tasks
      }
    });
  } catch (error) {
    console.error('خطأ في جلب المهام للapproval:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Update task status
 * PUT /api/tasks/:id/status
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { status, rejectionReason, employeeNotes } = req.body;
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // Check if user is assigned to this task or is manager
    const isAssigned = task.assignedTo.some(a => a.toString() === req.user._id.toString());
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    
    if (!isAssigned && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذه المهمة'
      });
    }

    const oldStatus = task.status;

    // Update status
    task.status = status;
    
    // If completing, set end time
    if (status === TaskStatus.COMPLETED) {
      task.endTime = new Date();
    }

    // If rejecting, store reason
    if (status === TaskStatus.REJECTED) {
      task.rejectionReason = rejectionReason || '';
    }

    // Store employee notes if provided
    if (employeeNotes !== undefined) {
      task.employeeNotes = employeeNotes;
    }

    task.lastAction = `status_${status}`;
    task.lastActionAt = new Date();

    // Sync kanbanStatus with task status
    const statusToKanban = {
      [TaskStatus.PENDING]: TaskKanbanStatus.NEW,
      [TaskStatus.IN_PROGRESS]: TaskKanbanStatus.IN_PROGRESS,
      [TaskStatus.COMPLETED]: TaskKanbanStatus.PENDING_REVIEW,
      [TaskStatus.REJECTED]: TaskKanbanStatus.REJECTED
    };
    if (statusToKanban[status]) {
      task.kanbanStatus = statusToKanban[status];
    }

    await task.save();

    // Record journey history
    await TaskHistory.record({
      task: task._id, actionType: 'status_changed',
      performedBy: req.user._id,
      fromStatus: oldStatus, toStatus: status,
      notes: `تغيرت حالة المهمة من ${oldStatus} إلى ${status}`
    });

    // Notify manager when task is completed or rejected
    if (status === TaskStatus.COMPLETED || status === TaskStatus.REJECTED) {
      const employee = await User.findById(req.user._id);
      if (employee) {
        const manager = await User.findOne({ role: UserRole.MANAGER, department: employee.department });
        if (manager) {
          const title = status === TaskStatus.COMPLETED ? 'تم إكمال مهمة' : 'تم رفض مهمة';
          const msg = status === TaskStatus.COMPLETED
            ? `أكمل ${employee.name} المهمة "${task.title}"`
            : `رفض ${employee.name} المهمة "${task.title}"${rejectionReason ? `: ${rejectionReason}` : ''}`;
          await Notification.createNotification(
            manager._id,
            NotificationType.TASK_REJECTED,
            title,
            msg,
            task._id
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة المهمة بنجاح',
      data: {
        task
      }
    });
  } catch (error) {
    console.error('خطأ في تحديث المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Evaluate task (manager only)
 * POST /api/tasks/:id/evaluate
 */
const evaluateTask = async (req, res) => {
  try {
    const { score, notes } = req.body;

    // Validate score
    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال تقييم صحيح (0-100)'
      });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // Check if task is completed
    if (task.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تقييم مهمة غير مكتملة'
      });
    }

    // Update evaluation
    task.managerScore = score;
    task.managerNotes = notes || '';
    task.isApprovedByManager = true;
    task.status = TaskStatus.APPROVED;
    task.managerApprovalDate = new Date();

    await task.save();

    task.lastAction = 'evaluated';
    task.lastActionAt = new Date();
    await task.save();

    // Record journey history
    await TaskHistory.record({
      task: task._id, actionType: 'task_evaluated',
      performedBy: req.user._id,
      fromStatus: TaskStatus.COMPLETED, toStatus: TaskStatus.APPROVED,
      notes: notes || `تم التقييم بـ ${score} درجة`
    });

    // Create notifications for assigned employees (parallel instead of sequential)
    const notifPromises = task.assignedTo.map(userId =>
      Notification.createNotification(
        userId,
        NotificationType.TASK_EVALUATED,
        'تم تقييم مهمتك',
        `تم تقييم مهمتك "${task.title}" بـ ${score} درجة`,
        task._id
      )
    );
    await Promise.all(notifPromises);

    // Recalculate performance score for all assignees (parallel instead of sequential)
    const recalcPromises = task.assignedTo.map(async (userId) => {
      const user = await User.findById(userId).lean();
      if (user) {
        const tasks = await Task.find({
          assignedTo: user._id,
          status: { $in: [TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] },
          managerScore: { $ne: null }
        }).lean();

        const totalScore = tasks.reduce((sum, t) => sum + t.managerScore, 0);
        const avgScore = tasks.length > 0 ? totalScore / tasks.length : 0;
        await User.findByIdAndUpdate(userId, { performanceScore: Math.round(avgScore * 100) / 100 });
      }
    });
    await Promise.all(recalcPromises);

    res.json({
      success: true,
      message: 'تم تقييم المهمة بنجاح',
      data: {
        task
      }
    });
  } catch (error) {
    console.error('خطأ في تقييم المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Approve task (admin only)
 * POST /api/tasks/:id/final-approve
 */
const finalApproveTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // Check if task is approved by manager
    if (!task.isApprovedByManager) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن تتم الموافقة على المهمة من المدير أولاً'
      });
    }

    // Update status
    task.status = TaskStatus.FINAL_APPROVED;
    task.lastAction = 'final_approved';
    task.lastActionAt = new Date();
    await task.save();

    // Record journey history
    await TaskHistory.record({
      task: task._id, actionType: 'task_final_approved',
      performedBy: req.user._id,
      fromStatus: TaskStatus.APPROVED, toStatus: TaskStatus.FINAL_APPROVED,
      notes: 'تمت الموافقة النهائية على المهمة'
    });

    // Create notifications
    for (const userId of task.assignedTo) {
      await Notification.createNotification(
        userId,
        NotificationType.TASK_APPROVED,
        'تمت الموافقة على مهمتك',
        `تمت الموافقة النهائية على المهمة "${task.title}"`,
        task._id
      );
    }

    res.json({
      success: true,
      message: 'تمت الموافقة على المهمة بنجاح',
      data: {
        task
      }
    });
  } catch (error) {
    console.error('خطأ في الموافقة على المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get task by ID
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email')
      .populate('workflowId', 'name stages');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    console.error('خطأ في جلب المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Update task
 * PUT /api/tasks/:id
 */
const updateTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      assignedTo, 
      difficulty, 
      duration,
      startTime,
      endTime,
      isUnusual,
      dueDate,
      priority
    } = req.body;

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // Check permission
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    
    if (!isCreator && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذه المهمة'
      });
    }

    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo) task.assignedTo = assignedTo;
    if (difficulty) task.difficulty = difficulty;
    if (duration !== undefined) task.duration = duration;
    if (startTime) task.startTime = startTime;
    if (endTime) task.endTime = endTime;
    if (isUnusual !== undefined) task.isUnusual = isUnusual;
    if (dueDate) task.dueDate = dueDate;
    if (priority) task.priority = priority;

    await task.save();
    await task.populate('assignedTo', 'name email department');

    // Notify assigned employees when manager modifies the task (parallel)
    const isManagerAction = req.user.role === 'manager' || req.user.role === 'admin';
    if (isManagerAction) {
      const notifPromises = task.assignedTo
        .filter(userId => {
          const uid = userId._id ? userId._id.toString() : userId.toString();
          return uid !== req.user._id.toString();
        })
        .map(async (userId) => {
          const uid = userId._id ? userId._id.toString() : userId.toString();
          const notif = await Notification.createNotification(
            uid,
            NotificationType.TASK_UPDATED,
            'تم تعديل مهمة',
            `تم تعديل المهمة "${task.title}" بواسطة ${req.user.name}`,
            task._id
          );
          if (global.io) {
            global.io.to(uid.toString()).emit('notification', notif);
          }
        });
      await Promise.all(notifPromises);
    }

    res.json({
      success: true,
      message: 'تم تحديث المهمة بنجاح',
      data: {
        task
      }
    });
  } catch (error) {
    console.error('خطأ في تحديث المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // Check permission (creator, assigned employee, or manager/admin)
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(a => a.toString() === req.user._id.toString());
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    
    if (!isCreator && !isAssigned && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذه المهمة'
      });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'تم حذف المهمة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف المهمة:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get total tasks count (all time)
 * GET /api/tasks/total
 */
const getTotalTasks = async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ 
      status: { $in: [TaskStatus.COMPLETED, TaskStatus.APPROVED, TaskStatus.FINAL_APPROVED] }
    });
    
    res.json({
      success: true,
      data: {
        total: totalTasks,
        completed: completedTasks
      }
    });
  } catch (error) {
    console.error('خطأ في جلب总数 المهام:', error.message);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب总数 المهام'
    });
  }
};

/**
 * Get daily tasks summary
 * GET /api/tasks/summary/daily
 */
const getDailySummary = async (req, res) => {
  try {
    const { date, scope } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const dateFilter = scope === 'all' ? {} : {
      taskDate: {
        $gte: targetDate,
        $lt: nextDate
      }
    };

    const tasks = await Task.find(dateFilter).populate('assignedTo', 'name');

    let filteredTasks = tasks;
    if (req.user.role === 'employee') {
      filteredTasks = tasks.filter(t => 
        t.assignedTo.some(a => a._id.toString() === req.user._id.toString())
      );
    } else if (req.user.role === 'manager') {
      const deptEmployees = await User.find({
        role: 'employee',
        department: req.user.department
      }).select('_id');
      const deptEmployeeIds = deptEmployees.map(e => e._id.toString());
      filteredTasks = tasks.filter(t => 
        t.assignedTo.some(a => deptEmployeeIds.includes(a._id.toString()))
      );
    } else if (req.user.role === 'office_manager') {
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id.toString());
      filteredTasks = tasks.filter(t => 
        t.assignedTo.some(a => teamIds.includes(a._id.toString()))
      );
    }

    const summary = {
      total: filteredTasks.length,
      completed: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED || t.status === TaskStatus.FINAL_APPROVED).length,
      inProgress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      pending: filteredTasks.filter(t => t.status === TaskStatus.PENDING).length,
      unusual: filteredTasks.filter(t => t.isUnusual).length,
      totalHours: filteredTasks.reduce((sum, t) => sum + (t.duration || 0), 0)
    };

    res.json({
      success: true,
      data: {
        summary,
        date: targetDate
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الملخص:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get weekly tasks summary
 * GET /api/tasks/summary/weekly
 */
const getWeeklySummary = async (req, res) => {
  try {
    const { startDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const tasks = await Task.find({
      taskDate: {
        $gte: start,
        $lt: end
      }
    }).populate('assignedTo', 'name');

    // Filter based on user role
    let filteredTasks = tasks;
    if (req.user.role === 'employee') {
      filteredTasks = tasks.filter(t => 
        t.assignedTo.some(a => a._id.toString() === req.user._id.toString())
      );
    } else if (req.user.role === 'manager') {
      const deptEmployees = await User.find({
        role: 'employee',
        department: req.user.department
      }).select('_id');
      const deptEmployeeIds = deptEmployees.map(e => e._id);
      filteredTasks = tasks.filter(t => 
        t.assignedTo.some(a => deptEmployeeIds.includes(a._id.toString()))
      );
    } else if (req.user.role === 'office_manager') {
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id);
      filteredTasks = tasks.filter(t => 
        t.assignedTo.some(a => teamIds.includes(a._id.toString()))
      );
    }

    const summary = {
      total: filteredTasks.length,
      completed: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED || t.status === TaskStatus.FINAL_APPROVED).length,
      inProgress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      pending: filteredTasks.filter(t => t.status === TaskStatus.PENDING).length,
      unusual: filteredTasks.filter(t => t.isUnusual).length,
      totalHours: filteredTasks.reduce((sum, t) => sum + (t.duration || 0), 0)
    };

    res.json({
      success: true,
      data: {
        summary,
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الملخص:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get task reports for export
 * GET /api/tasks/reports
 */
const getTaskReports = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    // Build query
    const query = {};
    
    if (startDate || endDate) {
      query.taskDate = {};
      if (startDate) query.taskDate.$gte = new Date(startDate);
      if (endDate) query.taskDate.$lte = new Date(endDate);
    }

    // Get tasks
    let tasks = await Task.find(query)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name')
      .sort({ taskDate: -1 });

    // Filter based on user role
    if (req.user.role === 'employee') {
      tasks = tasks.filter(t => 
        t.assignedTo.some(a => a._id.toString() === req.user._id.toString())
      );
    } else if (req.user.role === 'manager') {
      const deptEmployees = await User.find({
        role: 'employee',
        department: req.user.department
      }).select('_id');
      const deptEmployeeIds = deptEmployees.map(e => e._id);
      tasks = tasks.filter(t => 
        t.assignedTo.some(a => deptEmployeeIds.includes(a._id.toString()))
      );
    } else if (req.user.role === 'office_manager') {
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id);
      tasks = tasks.filter(t => 
        t.assignedTo.some(a => teamIds.includes(a._id.toString()))
      );
    }

    // Filter by department if specified
    if (department) {
      tasks = tasks.filter(t => 
        t.assignedTo.some(a => a.department === department)
      );
    }

    res.json({
      success: true,
      data: {
        tasks,
        count: tasks.length
      }
    });
  } catch (error) {
    console.error('خطأ في جلب التقارير:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Add employee notes to a task
 * PUT /api/tasks/:id/notes
 */
const addEmployeeNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const isAssigned = task.assignedTo.some(a => a.toString() === req.user._id.toString());
    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذه المهمة' });
    }

    task.employeeNotes = notes || '';
    await task.save();

    res.json({ success: true, message: 'تم حفظ الملاحظة', data: { task } });
  } catch (error) {
    console.error('خطأ في حفظ الملاحظة:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

/**
 * Get pending proposals for manager
 * GET /api/tasks/proposals
 */
const getProposals = async (req, res) => {
  try {
    const proposals = await Task.find({
      isProposal: true,
      status: TaskStatus.PENDING
    })
      .populate('createdBy', 'name email department')
      .populate('assignedTo', 'name email department')
      .sort({ createdAt: -1 });

    // For managers: filter by their department
    let filtered = proposals;
    if (req.user.role === 'manager') {
      filtered = proposals.filter(p =>
        p.createdBy?.department === req.user.department
      );
    } else if (req.user.role === 'office_manager') {
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id.toString());
      filtered = proposals.filter(p =>
        teamIds.includes(p.createdBy?._id?.toString())
      );
    }

    res.json({
      success: true,
      data: { proposals: filtered }
    });
  } catch (error) {
    console.error('خطأ في جلب الاقتراحات:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Approve a proposal (manager)
 * POST /api/tasks/:id/approve-proposal
 */
const approveProposal = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('createdBy', 'department');
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }
    if (!task.isProposal) {
      return res.status(400).json({ success: false, message: 'هذه المهمة ليست مقترحاً' });
    }
    if (task.status !== TaskStatus.PENDING) {
      return res.status(400).json({ success: false, message: 'تم التعامل مع هذا المقترح مسبقاً' });
    }

    // Only manager of same department can approve
    if (req.user.role === 'manager' && req.user.department !== task.createdBy?.department) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالموافقة على هذا المقترح' });
    }

    task.isProposal = false;
    task.lastAction = 'proposal_approved';
    task.lastActionAt = new Date();
    await task.save();

    // Record journey history
    await TaskHistory.record({
      task: task._id, actionType: 'proposal_approved',
      performedBy: req.user._id,
      toStatus: TaskStatus.PENDING,
      notes: 'تمت الموافقة على الاقتراح وأصبح مهمة رسمية'
    });

    // Notify the proposer
    await Notification.createNotification(
      task.createdBy,
      NotificationType.TASK_PROPOSAL_APPROVED,
      'تمت الموافقة على اقتراحك',
      `تمت الموافقة على اقتراح المهمة "${task.title}"`,
      task._id
    );

    res.json({
      success: true,
      message: 'تمت الموافقة على الاقتراح بنجاح',
      data: { task }
    });
  } catch (error) {
    console.error('خطأ في الموافقة على الاقتراح:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Reject a proposal (manager)
 * POST /api/tasks/:id/reject-proposal
 */
const rejectProposal = async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }
    if (!task.isProposal) {
      return res.status(400).json({ success: false, message: 'هذه المهمة ليست مقترحاً' });
    }

    // Only manager of same department can reject
    if (req.user.role === 'manager' && req.user.department !== task.createdBy?.department) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برفض هذا المقترح' });
    }

    // Record journey history before deleting
    await TaskHistory.record({
      task: task._id, actionType: 'proposal_rejected',
      performedBy: req.user._id,
      fromStatus: TaskStatus.PENDING,
      toStatus: 'rejected',
      notes: reason || 'تم رفض الاقتراح'
    });

    // Notify the proposer
    await Notification.createNotification(
      task.createdBy,
      NotificationType.TASK_PROPOSAL_REJECTED,
      'تم رفض اقتراحك',
      `تم رفض اقتراح المهمة "${task.title}"${reason ? `: ${reason}` : ''}`,
      task._id
    );

    // Delete the proposal
    await task.deleteOne();

    res.json({
      success: true,
      message: 'تم رفض الاقتراح وحذفه',
      data: { reason }
    });
  } catch (error) {
    console.error('خطأ في رفض الاقتراح:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get all tasks from department employees (manager view)
 * GET /api/tasks/department
 */
const getDepartmentTasks = async (req, res) => {
  try {
    const { status, department } = req.query;

    // Build employee query
    const employeeQuery = { role: UserRole.EMPLOYEE };
    if (req.user.role === 'admin') {
      // GM can monitor any department via the `department` param (name or _id)
      if (department && department !== 'all') {
        // Resolve department name from _id if needed
        let deptName = department;
        if (/^[0-9a-fA-F]{24}$/.test(department)) {
          const deptDoc = await Department.findById(department).lean();
          if (deptDoc) deptName = deptDoc.name;
        }
        employeeQuery.department = deptName;
      }
      // admin without department or 'all' => all employees
    } else if (req.user.role === 'office_manager') {
      // Office manager sees only their team's tasks
      const teamMembers = await User.find({ supervisedBy: req.user._id }).select('_id');
      const teamIds = teamMembers.map(m => m._id);
      employeeQuery._id = { $in: teamIds };
    } else {
      // Managers are limited to their own department
      employeeQuery.department = req.user.department;
    }

    const employees = await User.find(employeeQuery).lean();
    const employeeIds = employees.map(e => e._id);

    const query = {
      assignedTo: { $in: employeeIds },
      isProposal: false
    };
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email department role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        tasks,
        employees: employees.map(e => ({ _id: e._id, name: e.name, department: e.department }))
      }
    });
  } catch (error) {
    console.error('خطأ في جلب مهام القسم:', error.message);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Add manager note to a task
 * PUT /api/tasks/:id/manager-note
 */
const addManagerNote = async (req, res) => {
  try {
    const { note } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (!isManager) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإضافة ملاحظات' });
    }

    task.managerNotes = note || '';
    task.lastAction = 'manager_note_added';
    task.lastActionAt = new Date();
    await task.save();

    await TaskHistory.record({
      task: task._id, actionType: 'manager_note_added',
      performedBy: req.user._id,
      notes: note || ''
    });

    // Notify assigned employees that manager added a note
    for (const userId of task.assignedTo) {
      const uid = userId.toString();
      if (uid !== req.user._id.toString()) {
        const notif = await Notification.createNotification(
          uid,
          NotificationType.TASK_UPDATED,
          'ملاحظة جديدة على مهمتك',
          `أضاف المدير ملاحظة على المهمة "${task.title}"`,
          task._id
        );
        if (global.io) {
          global.io.to(uid).emit('notification', notif);
        }
      }
    }

    res.json({ success: true, message: 'تم حفظ الملاحظة', data: { task } });
  } catch (error) {
    console.error('خطأ في حفظ ملاحظة المدير:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

/**
 * Department manager approves a pending task created by an employee
 * PUT /api/tasks/:id/department-approve
 */
const approveDepartmentTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    // Only pending tasks can be approved
    if (task.status !== TaskStatus.PENDING) {
      return res.status(400).json({ success: false, message: 'يمكن الموافقة فقط على المهام المنتظرة' });
    }

    // Verify the task creator is an employee in the manager's department
    const creator = await User.findById(task.createdBy);
    if (!creator) {
      return res.status(400).json({ success: false, message: 'منشئ المهمة غير موجود' });
    }
    const isManager = req.user.role === UserRole.MANAGER || req.user.role === 'admin';
    if (!isManager) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالموافقة على هذه المهمة' });
    }
    // Manager can only approve tasks from their own department (admin can approve any)
    if (req.user.role === UserRole.MANAGER && creator.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'لا يمكنك الموافقة على مهام قسم آخر' });
    }

    // Approve: change status to approved — employee can then start the task
    task.status = TaskStatus.APPROVED;
    task.kanbanStatus = TaskKanbanStatus.NEW;
    task.lastAction = 'department_approved';
    task.lastActionAt = new Date();
    await task.save();

    // Record journey history
    await TaskHistory.record({
      task: task._id, actionType: 'department_approved',
      performedBy: req.user._id,
      fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.APPROVED,
      notes: `وافق مسؤول القسم "${req.user.name}" على المهمة`
    });

    // Notify all assigned employees
    for (const userId of task.assignedTo) {
      const uid = userId.toString();
      if (uid !== req.user._id.toString()) {
        const notif = await Notification.createNotification(
          uid,
          NotificationType.TASK_APPROVED,
          'تمت الموافقة على مهمتك',
          `وافق مسؤول القسم على المهمة "${task.title}" يمكنك البدء في العمل`,
          task._id
        );
        if (global.io) {
          global.io.to(uid).emit('notification', notif);
        }
      }
    }

    // Also notify the creator if different from assigned users
    if (task.createdBy.toString() !== req.user._id.toString()) {
      const isAlreadyNotified = task.assignedTo.some(u => u.toString() === task.createdBy.toString());
      if (!isAlreadyNotified) {
        const notif = await Notification.createNotification(
          task.createdBy,
          NotificationType.TASK_APPROVED,
          'تمت الموافقة على مهمتك',
          `وافق مسؤول القسم على المهمة "${task.title}" يمكنك البدء في العمل`,
          task._id
        );
        if (global.io) {
          global.io.to(task.createdBy.toString()).emit('notification', notif);
        }
      }
    }

    await task.populate('assignedTo', 'name email department');
    res.json({ success: true, message: 'تمت الموافقة على المهمة', data: { task } });
  } catch (error) {
    console.error('خطأ في موافقة المهمة:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم', error: error.message });
  }
};

/**
 * Department manager rejects a pending task created by an employee
 * PUT /api/tasks/:id/department-reject
 */
const rejectDepartmentTask = async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    if (task.status !== TaskStatus.PENDING) {
      return res.status(400).json({ success: false, message: 'يمكن رفض المهام المنتظرة فقط' });
    }

    const creator = await User.findById(task.createdBy);
    if (!creator) {
      return res.status(400).json({ success: false, message: 'منشئ المهمة غير موجود' });
    }
    const isManager = req.user.role === UserRole.MANAGER || req.user.role === 'admin';
    if (!isManager) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برفض هذه المهمة' });
    }
    if (req.user.role === UserRole.MANAGER && creator.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'لا يمكنك رفض مهام قسم آخر' });
    }

    // Reject: change status to rejected
    task.status = TaskStatus.REJECTED;
    task.kanbanStatus = TaskKanbanStatus.REJECTED;
    task.rejectionReason = reason || '';
    task.lastAction = 'department_rejected';
    task.lastActionAt = new Date();
    await task.save();

    await TaskHistory.record({
      task: task._id, actionType: 'department_rejected',
      performedBy: req.user._id,
      fromStatus: TaskStatus.PENDING, toStatus: TaskStatus.REJECTED,
      notes: `رفض مسؤول القسم "${req.user.name}" المهمة${reason ? `: ${reason}` : ''}`
    });

    // Notify all assigned employees
    for (const userId of task.assignedTo) {
      const uid = userId.toString();
      if (uid !== req.user._id.toString()) {
        const notif = await Notification.createNotification(
          uid,
          NotificationType.TASK_REJECTED,
          'تم رفض مهمتك',
          `رفض مسؤول القسم المهمة "${task.title}"${reason ? `: ${reason}` : ''}`,
          task._id
        );
        if (global.io) {
          global.io.to(uid).emit('notification', notif);
        }
      }
    }

    // Also notify the creator if different from assigned users
    if (task.createdBy.toString() !== req.user._id.toString()) {
      const isAlreadyNotified = task.assignedTo.some(u => u.toString() === task.createdBy.toString());
      if (!isAlreadyNotified) {
        const notif = await Notification.createNotification(
          task.createdBy,
          NotificationType.TASK_REJECTED,
          'تم رفض مهمتك',
          `رفض مسؤول القسم المهمة "${task.title}"${reason ? `: ${reason}` : ''}`,
          task._id
        );
        if (global.io) {
          global.io.to(task.createdBy.toString()).emit('notification', notif);
        }
      }
    }

    await task.populate('assignedTo', 'name email department');
    res.json({ success: true, message: 'تم رفض المهمة', data: { task } });
  } catch (error) {
    console.error('خطأ في رفض المهمة:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

module.exports = {
  createTask,
  getMyTasks,
  getCreatedTasks,
  getTasksToEvaluate,
  getTasksToApprove,
  updateTaskStatus,
  evaluateTask,
  finalApproveTask,
  getTaskById,
  updateTask,
  deleteTask,
  getDailySummary,
  getWeeklySummary,
  getTaskReports,
  getTotalTasks,
  getProposals,
  approveProposal,
  rejectProposal,
  addEmployeeNotes,
  addManagerNote,
  approveDepartmentTask,
  rejectDepartmentTask,
  getDepartmentTasks
};