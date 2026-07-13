const { Task, TaskStatus, TaskPriority, TaskKanbanStatus, WorkflowStatus } = require('../models/Task');
const Workflow = require('../models/Workflow');
const TaskTimeline = require('../models/TaskTimeline');
const TaskHistory = require('../models/TaskHistory');
const TaskComment = require('../models/TaskComment');
const TaskAttachment = require('../models/TaskAttachment');
const { Notification, NotificationType } = require('../models/Notification');
const { AuditLog, AuditAction } = require('../models/AuditLog');
const { User } = require('../models/User');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'task-attachments');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const createWorkflowTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate, workflowId } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'عنوان المهمة مطلوب' });
    }
    const taskData = {
      title, description: description || '',
      createdBy: req.user._id,
      assignedTo: assignedTo || [req.user._id],
      status: TaskStatus.PENDING,
      priority: priority || TaskPriority.MEDIUM,
      dueDate: dueDate || null,
      kanbanStatus: TaskKanbanStatus.NEW
    };
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
    await task.populate('assignedTo', 'name email department');
    await task.populate('createdBy', 'name');

    task.lastAction = 'created';
    task.lastActionAt = new Date();
    task.journeyStartedAt = new Date();
    if (assignedTo && assignedTo.length > 0) {
      const firstUser = await User.findById(assignedTo[0]);
      if (firstUser && firstUser.department) {
        const dept = await require('../models/Department').findOne({ name: firstUser.department });
        if (dept) task.currentDepartment = dept._id;
      }
    }
    await task.save();

    await TaskHistory.record({
      task: task._id, actionType: 'created',
      performedBy: req.user._id,
      toStage: workflowId ? 0 : null,
      toStatus: TaskStatus.PENDING,
      notes: `تم إنشاء المهمة: ${title}`
    });

    await TaskTimeline.log({
      task: task._id, action: 'created', user: req.user._id,
      description: `تم إنشاء المهمة: ${title}`
    });
    if (workflowId) {
      await TaskTimeline.log({
        task: task._id, action: 'stage_transitioned', user: req.user._id,
        toStage: 0, description: 'بدأت المرحلة الأولى من سير العمل'
      });
    }
    for (const userId of (assignedTo || [req.user._id])) {
      const uid = userId._id ? userId._id.toString() : userId.toString();
      if (uid !== req.user._id.toString()) {
        await Notification.createNotification(
          userId, NotificationType.TASK_ASSIGNED,
          'مهمة جديدة', `تم إسناد مهمة "${title}" إليك`, task._id
        );
      }
    }
    // Note: notifications here are small (1-2 typically), keeping sequential for simplicity
    await AuditLog.logAction({
      user: req.user._id, userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.CREATE, entity: 'Task',
      entityId: task._id,
      details: { title, hasWorkflow: !!workflowId }
    });
    res.status(201).json({ success: true, message: 'تم إنشاء المهمة', data: { task } });
  } catch (error) {
    console.error('Error creating workflow task:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const transitionTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    if (!task.workflowId) return res.status(400).json({ success: false, message: 'المهمة لا تستخدم سير عمل' });
    const workflow = await Workflow.findById(task.workflowId);
    if (!workflow) return res.status(400).json({ success: false, message: 'سير العمل غير موجود' });
    const nextStage = task.currentStage + 1;
    if (nextStage >= workflow.stages.length) {
      return res.status(400).json({ success: false, message: 'لا توجد مراحل أخرى - المهمة مكتملة' });
    }
    const fromStage = task.currentStage;
    task.currentStage = nextStage;
    task.stageEvaluations.push({
      stage: fromStage, user: req.user._id,
      action: 'completed', note: req.body.note || '',
      createdAt: new Date()
    });
    await task.save();

    task.lastAction = 'stage_transitioned';
    task.lastActionAt = new Date();
    await task.save();

    await TaskHistory.record({
      task: task._id, actionType: 'stage_transitioned',
      performedBy: req.user._id,
      fromStage, toStage: nextStage,
      fromStatus: task.status, toStatus: task.status,
      notes: req.body.note || `انتقلت من المرحلة ${fromStage + 1} إلى ${nextStage + 1}`
    });

    await TaskTimeline.log({
      task: task._id, action: 'stage_transitioned', user: req.user._id,
      fromStage, toStage: nextStage,
      description: `انتقلت المهمة من المرحلة ${fromStage + 1} إلى المرحلة ${nextStage + 1}`
    });
    for (const userId of (task.assignedTo || [])) {
      await Notification.createNotification(
        userId, NotificationType.WORKFLOW_STAGE_ASSIGNED,
        'مرحلة جديدة في سير العمل',
        `انتقلت مهمة "${task.title}" إلى المرحلة ${nextStage + 1}`,
        task._id
      );
    }
    // Note: notifications here are typically 1-2 users, keeping sequential
    res.json({ success: true, message: 'تم تحويل المهمة', data: { task } });
  } catch (error) {
    console.error('Error transitioning task:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const approveStage = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    if (!task.workflowId) return res.status(400).json({ success: false, message: 'المهمة لا تستخدم سير عمل' });
    const workflow = await Workflow.findById(task.workflowId);
    if (!workflow) return res.status(400).json({ success: false, message: 'سير العمل غير موجود' });
    const currentStage = workflow.stages[task.currentStage];
    if (!currentStage) return res.status(400).json({ success: false, message: 'المرحلة غير موجودة' });
    task.stageEvaluations.push({
      stage: task.currentStage, user: req.user._id,
      action: 'approved', note: req.body.note || '',
      createdAt: new Date()
    });
    const nextStage = task.currentStage + 1;
    if (nextStage >= workflow.stages.length) {
      task.workflowStatus = WorkflowStatus.APPROVED;
      task.kanbanStatus = TaskKanbanStatus.COMPLETED;
      task.status = TaskStatus.COMPLETED;
      task.completedBy = req.user._id;
      task.completedAt = new Date();
    } else {
      task.currentStage = nextStage;
    }
    await task.save();

    task.lastAction = 'stage_approved';
    task.lastActionAt = new Date();
    await task.save();

    const approvedStage = task.currentStage - 1;

    await TaskHistory.record({
      task: task._id, actionType: 'stage_approved',
      performedBy: req.user._id,
      fromStage: approvedStage, toStage: task.currentStage,
      notes: req.body.note || 'تمت الموافقة على المرحلة'
    });

    await TaskTimeline.log({
      task: task._id, action: 'stage_approved', user: req.user._id,
      fromStage: approvedStage, toStage: task.currentStage,
      description: req.body.note || 'تمت الموافقة على المرحلة'
    });
    for (const userId of (task.assignedTo || [])) {
      const nType = task.workflowStatus === 'approved' ? NotificationType.WORKFLOW_TASK_COMPLETED : NotificationType.WORKFLOW_STAGE_APPROVED;
      const nTitle = task.workflowStatus === 'approved' ? 'اكتملت مهمة سير العمل' : 'تمت الموافقة على المرحلة';
      const nMsg = task.workflowStatus === 'approved'
        ? `تمت الموافقة النهائية على مهمة "${task.title}"`
        : `تمت الموافقة على المرحلة ${task.currentStage} من مهمة "${task.title}"`;
      await Notification.createNotification(userId, nType, nTitle, nMsg, task._id);
    }
    res.json({ success: true, message: 'تمت الموافقة', data: { task } });
  } catch (error) {
    console.error('Error approving stage:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const rejectStage = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    if (!task.workflowId) return res.status(400).json({ success: false, message: 'المهمة لا تستخدم سير عمل' });
    task.stageEvaluations.push({
      stage: task.currentStage, user: req.user._id,
      action: 'rejected', note: req.body.note || '',
      createdAt: new Date()
    });
    task.workflowStatus = WorkflowStatus.REJECTED;
    task.kanbanStatus = TaskKanbanStatus.REJECTED;
    await task.save();

    task.lastAction = 'stage_rejected';
    task.lastActionAt = new Date();
    await task.save();

    await TaskHistory.record({
      task: task._id, actionType: 'stage_rejected',
      performedBy: req.user._id,
      fromStage: task.currentStage,
      notes: req.body.note || 'تم رفض المرحلة'
    });

    await TaskTimeline.log({
      task: task._id, action: 'stage_rejected', user: req.user._id,
      fromStage: task.currentStage,
      description: req.body.note || 'تم رفض المرحلة'
    });
    for (const userId of (task.assignedTo || [])) {
      await Notification.createNotification(
        userId, NotificationType.WORKFLOW_STAGE_REJECTED,
        'تم رفض المرحلة',
        `تم رفض المرحلة ${task.currentStage + 1} من مهمة "${task.title}"`,
        task._id
      );
    }
    res.json({ success: true, message: 'تم رفض المرحلة', data: { task } });
  } catch (error) {
    console.error('Error rejecting stage:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getTaskTimeline = async (req, res) => {
  try {
    const timeline = await TaskTimeline.find({ task: req.params.id })
      .populate('user', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { timeline } });
  } catch (error) {
    console.error('Error fetching timeline:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'نص التعليق مطلوب' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    const comment = await TaskComment.create({
      task: req.params.id, user: req.user._id, content
    });
    await comment.populate('user', 'name role');
    await TaskTimeline.log({
      task: task._id, action: 'commented', user: req.user._id,
      description: `أضاف تعليقاً: ${content.substring(0, 100)}`
    });

    // Notify assigned employees when manager/admin adds a comment
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    if (isManager) {
      for (const userId of task.assignedTo) {
        const uid = userId.toString();
        if (uid !== req.user._id.toString()) {
          const notif = await Notification.createNotification(
            uid,
            NotificationType.TASK_UPDATED,
            'تعليق جديد على مهمتك',
            `أضاف ${req.user.name} تعليقاً على المهمة "${task.title}"`,
            task._id
          );
          if (global.io) {
            global.io.to(uid).emit('notification', notif);
          }
        }
      }
    }

    res.status(201).json({ success: true, data: { comment } });
  } catch (error) {
    console.error('Error adding comment:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getComments = async (req, res) => {
  try {
    const comments = await TaskComment.find({ task: req.params.id })
      .populate('user', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { comments } });
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const uploadAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    if (!req.file) return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    const attachment = await TaskAttachment.create({
      task: req.params.id, fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size, mimeType: req.file.mimetype,
      uploadedBy: req.user._id
    });
    await TaskTimeline.log({
      task: task._id, action: 'attachment_added', user: req.user._id,
      description: `أضاف مرفقاً: ${req.file.originalname}`,
      metadata: { fileName: req.file.filename, fileSize: req.file.size }
    });
    res.status(201).json({ success: true, data: { attachment } });
  } catch (error) {
    console.error('Error uploading attachment:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getAttachments = async (req, res) => {
  try {
    const attachments = await TaskAttachment.find({ task: req.params.id })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { attachments } });
  } catch (error) {
    console.error('Error fetching attachments:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const attachment = await TaskAttachment.findById(req.params.attachId);
    if (!attachment) return res.status(404).json({ success: false, message: 'المرفق غير موجود' });
    const filePath = path.join(UPLOAD_DIR, attachment.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await TaskTimeline.log({
      task: attachment.task, action: 'attachment_removed', user: req.user._id,
      description: `حذف مرفقاً: ${attachment.originalName}`
    });
    await attachment.deleteOne();
    res.json({ success: true, message: 'تم حذف المرفق' });
  } catch (error) {
    console.error('Error deleting attachment:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const getKanbanBoard = async (req, res) => {
  try {
    const { department } = req.query;
    const query = {};
    if (department) {
      const usersInDept = await User.find({ department }).select('_id');
      query.assignedTo = { $in: usersInDept.map(u => u._id) };
    }
    if (req.user.role === 'employee') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'manager' && !department) {
      const deptEmployees = await User.find({ department: req.user.department }).select('_id');
      query.assignedTo = { $in: deptEmployees.map(e => e._id).concat(req.user._id) };
    }
    let tasks;
    try {
      tasks = await Task.find(query)
        .populate('assignedTo', 'name department')
        .populate('createdBy', 'name')
        .populate('workflowId', 'name stages')
        .sort({ priority: -1, createdAt: -1 })
        .lean();
    } catch (populateErr) {
      console.error('Kanban populate failed:', populateErr);
      tasks = await Task.find(query)
        .populate('assignedTo', 'name department')
        .populate('createdBy', 'name')
        .sort({ priority: -1, createdAt: -1 })
        .lean();
    }
    const columns = {
      new: [],
      in_progress: [],
      pending_review: [],
      pending_approval: [],
      completed: [],
      rejected: []
    };
    tasks.forEach(task => {
      const status = task.kanbanStatus || 'new';
      if (columns[status]) columns[status].push(task);
      else columns.new.push(task);
    });
    res.json({ success: true, data: { columns } });
  } catch (error) {
    console.error('Error fetching kanban:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

const updateKanbanStatus = async (req, res) => {
  try {
    const { kanbanStatus } = req.body;
    const validStatuses = Object.values(TaskKanbanStatus);
    if (!validStatuses.includes(kanbanStatus)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    const oldStatus = task.kanbanStatus;
    task.kanbanStatus = kanbanStatus;
    if (kanbanStatus === 'completed') {
      task.status = TaskStatus.COMPLETED;
      task.completedBy = req.user._id;
      task.completedAt = new Date();
    }
    await task.save();

    task.lastAction = 'kanban_updated';
    task.lastActionAt = new Date();
    await task.save();

    await TaskHistory.record({
      task: task._id, actionType: 'status_changed',
      performedBy: req.user._id,
      fromStatus: oldStatus, toStatus: kanbanStatus,
      notes: `تغيرت حالة كانبان من ${oldStatus} إلى ${kanbanStatus}`
    });

    await TaskTimeline.log({
      task: task._id, action: 'task_updated', user: req.user._id,
      description: `تغيرت الحالة من ${oldStatus} إلى ${kanbanStatus}`
    });
    res.json({ success: true, message: 'تم تحديث الحالة', data: { task } });
  } catch (error) {
    console.error('Error updating kanban status:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

module.exports = {
  createWorkflowTask, transitionTask, approveStage, rejectStage,
  getTaskTimeline, addComment, getComments,
  uploadAttachment, getAttachments, deleteAttachment,
  getKanbanBoard, updateKanbanStatus
};
