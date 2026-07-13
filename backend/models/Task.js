/**
 * Task Model
 * Represents tasks assigned to employees
 */

const mongoose = require('mongoose');

// Task status enum
const TaskStatus = {
  PENDING: 'pending',           // Pending assignment
  IN_PROGRESS: 'in_progress',   // In progress
  COMPLETED: 'completed',       // Completed
  APPROVED: 'approved',         // Approved by manager
  FINAL_APPROVED: 'final_approved',  // Approved by admin
  REJECTED: 'rejected'          // Rejected by employee
};

const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

const TaskKanbanStatus = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  PENDING_APPROVAL: 'pending_approval',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  TASK_REJECTED: 'task_rejected'
};

const WorkflowStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
};

// Task difficulty percentages
const TaskDifficulty = {
  EASY: 20,
  MEDIUM: 50,
  HARD: 100
};

// Task Schema
const taskSchema = new mongoose.Schema({
  // Task name
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // Task description
  description: {
    type: String,
    default: ''
  },
  
  // Who created the task (manager or employee themselves)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Assigned employees
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Task status
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING
  },
  
  // Task difficulty percentage (20, 50, or 100)
  difficulty: {
    type: Number,
    enum: [TaskDifficulty.EASY, TaskDifficulty.MEDIUM, TaskDifficulty.HARD],
    default: TaskDifficulty.MEDIUM
  },
  
  // Is this an unusual task
  isUnusual: {
    type: Boolean,
    default: false
  },

  // Is this a proposal awaiting manager approval
  isProposal: {
    type: Boolean,
    default: false
  },
  
  // Work duration in hours
  duration: {
    type: Number,
    default: 0
  },
  
  // Start time (HH:mm format)
  startTime: {
    type: String,
    default: null
  },
  
  // End time (HH:mm format)
  endTime: {
    type: String,
    default: null
  },
  
  // Manager evaluation score (0-100)
  managerScore: {
    type: Number,
    default: null
  },
  
  // Manager notes
  managerNotes: {
    type: String,
    default: ''
  },

  // Employee notes (on assigned task)
  employeeNotes: {
    type: String,
    default: ''
  },

  // Rejection reason
  rejectionReason: {
    type: String,
    default: ''
  },
  
  // Is approved by manager
  isApprovedByManager: {
    type: Boolean,
    default: false
  },
  
  // Approval date by manager
  managerApprovalDate: {
    type: Date,
    default: null
  },
  
  // Task date (for daily tasks)
  taskDate: {
    type: Date,
    default: Date.now
  },
  
  // Due date
  dueDate: {
    type: Date,
    default: null
  },

  // ---- Workflow Engine Fields ----
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    default: null
  },
  currentStage: {
    type: Number,
    default: -1
  },
  workflowStatus: {
    type: String,
    enum: Object.values(WorkflowStatus),
    default: WorkflowStatus.NOT_STARTED
  },
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM
  },
  kanbanStatus: {
    type: String,
    enum: Object.values(TaskKanbanStatus),
    default: TaskKanbanStatus.NEW
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  stageEvaluations: [{
    stage: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['approved', 'rejected', 'completed'] },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],

  // ---- Journey Tracking Fields ----
  currentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  lastAction: {
    type: String,
    default: null
  },
  lastActionAt: {
    type: Date,
    default: null
  },
  journeyStartedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ taskDate: 1 });
taskSchema.index({ workflowId: 1 });
taskSchema.index({ kanbanStatus: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ workflowStatus: 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return this.status !== TaskStatus.COMPLETED && new Date() > this.dueDate;
});

// Method to mark as completed
taskSchema.methods.markCompleted = function() {
  this.status = TaskStatus.COMPLETED;
  this.endTime = new Date();
  return this.save();
};

// Method to approve by manager
taskSchema.methods.approveByManager = function(score, notes) {
  this.isApprovedByManager = true;
  this.managerScore = score;
  this.managerNotes = notes;
  this.status = TaskStatus.APPROVED;
  this.managerApprovalDate = new Date();
  return this.save();
};

const Task = mongoose.model('Task', taskSchema);

module.exports = { Task, TaskStatus, TaskDifficulty, TaskPriority, TaskKanbanStatus, WorkflowStatus };
