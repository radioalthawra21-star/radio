const mongoose = require('mongoose');

const TaskHistorySchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: [
      'created',
      'transferred',
      'reassigned',
      'department_changed',
      'employee_changed',
      'status_changed',
      'stage_transitioned',
      'stage_approved',
      'stage_rejected',
      'commented',
      'attachment_added',
      'attachment_removed',
      'task_updated',
      'task_completed',
      'task_evaluated',
      'task_approved',
      'task_final_approved',
      'returned',
      'archived'
    ],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  toDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fromStage: {
    type: Number,
    default: null
  },
  toStage: {
    type: Number,
    default: null
  },
  fromStatus: {
    type: String,
    default: null
  },
  toStatus: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

TaskHistorySchema.index({ task: 1, createdAt: -1 });
TaskHistorySchema.index({ task: 1, actionType: 1 });
TaskHistorySchema.index({ toDepartment: 1, createdAt: -1 });
TaskHistorySchema.index({ toUser: 1, createdAt: -1 });

TaskHistorySchema.statics.record = async function({
  task, actionType, performedBy,
  fromDepartment = null, toDepartment = null,
  fromUser = null, toUser = null,
  fromStage = null, toStage = null,
  fromStatus = null, toStatus = null,
  notes = '', metadata = {}
}) {
  return this.create({
    task, actionType, performedBy,
    fromDepartment, toDepartment,
    fromUser, toUser,
    fromStage, toStage,
    fromStatus, toStatus,
    notes, metadata
  });
};

module.exports = mongoose.model('TaskHistory', TaskHistorySchema);
