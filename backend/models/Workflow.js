const mongoose = require('mongoose');

const WorkflowStageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  role: { type: String, enum: ['admin', 'hr', 'manager', 'employee', 'financial', 'observer'], default: null },
  canApprove: { type: Boolean, default: true },
  canReject: { type: Boolean, default: true },
  color: { type: String, default: '#3B82F6' },
  notifyOnArrival: { type: Boolean, default: true }
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  stages: { type: [WorkflowStageSchema], validate: [v => v.length > 0, 'must have at least one stage'] },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

workflowSchema.index({ isActive: 1 });
workflowSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
