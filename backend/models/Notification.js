/**
 * Notification Model
 * Stores user notifications
 */

const mongoose = require('mongoose');

// Notification type enum
const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_EVALUATED: 'task_evaluated',
  TASK_APPROVED: 'task_approved',
  TASK_REJECTED: 'task_rejected',
  NEW_USER_REGISTERED: 'new_user_registered',
  ROLE_CHANGE: 'role_change',
  REWARD: 'reward',
  NEW_MESSAGE: 'new_message',
  LEAVE_REQUESTED: 'leave_requested',
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  LEAVE_CANCELLED: 'leave_cancelled',
  LEAVE_PENDING_GM: 'leave_pending_gm',
  LEAVE_NEEDS_GM: 'leave_needs_gm',
  PAYROLL: 'payroll',
  RECRUITMENT: 'recruitment',
  PERFORMANCE: 'performance',
  PROMOTION: 'promotion',
  WORKFLOW_STAGE_ASSIGNED: 'workflow_stage_assigned',
  WORKFLOW_APPROVAL_REQUESTED: 'workflow_approval_requested',
  WORKFLOW_STAGE_APPROVED: 'workflow_stage_approved',
  WORKFLOW_STAGE_REJECTED: 'workflow_stage_rejected',
  WORKFLOW_TASK_COMPLETED: 'workflow_task_completed',
  TASK_PROPOSAL: 'task_proposal',
  TASK_PROPOSAL_APPROVED: 'task_proposal_approved',
  TASK_PROPOSAL_REJECTED: 'task_proposal_rejected',
  CHAT_MESSAGE: 'chat_message',
  CHAT_MENTION: 'chat_mention',
  CHAT_ADDED: 'chat_added',
  CHAT_TASK_UPDATED: 'chat_task_updated',
  TASK_UPDATED: 'task_updated'
};

// Notification Schema
const notificationSchema = new mongoose.Schema({
  // User who receives the notification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  
  // Notification title
  title: {
    type: String,
    required: true
  },
  
  // Notification message
  message: {
    type: String,
    required: true
  },
  
  // Related chat (optional)
  relatedChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: null
  },

  // Related task (optional)
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  
  // Is notification read
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Read timestamp
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for queries
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(userId, type, title, message, taskId = null) {
  if (!type) throw new Error('نوع الإشعار مطلوب');
  if (!title) throw new Error('عنوان الإشعار مطلوب');
  if (!message) throw new Error('نص الإشعار مطلوب');
  return this.create({
    user: userId,
    type,
    title,
    message,
    relatedTask: taskId
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NotificationType };