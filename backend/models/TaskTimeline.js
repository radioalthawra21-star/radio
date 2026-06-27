const mongoose = require('mongoose');

const taskTimelineSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  action: {
    type: String,
    enum: [
      'created', 'stage_completed', 'stage_approved', 'stage_rejected',
      'stage_transitioned', 'commented', 'attachment_added', 'attachment_removed',
      'task_updated', 'task_completed', 'task_approved', 'task_rejected',
      'priority_changed', 'reassigned', 'archived'
    ],
    required: true
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromStage: { type: Number, default: null },
  toStage: { type: Number, default: null },
  description: { type: String, default: '' },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

taskTimelineSchema.index({ task: 1, createdAt: -1 });

taskTimelineSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Timeline is immutable - updates not allowed'));
});
taskTimelineSchema.pre('deleteOne', function(next) {
  next(new Error('Timeline is immutable - deletion not allowed'));
});
taskTimelineSchema.pre('deleteMany', function(next) {
  next(new Error('Timeline is immutable - deletion not allowed'));
});

taskTimelineSchema.statics.log = async function({ task, action, user, fromStage = null, toStage = null, description = '', metadata = {} }) {
  return this.create({ task, action, user, fromStage, toStage, description, metadata });
};

module.exports = mongoose.model('TaskTimeline', taskTimelineSchema);
