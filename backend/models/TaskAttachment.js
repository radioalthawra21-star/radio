const mongoose = require('mongoose');

const taskAttachmentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/octet-stream' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

taskAttachmentSchema.index({ task: 1 });
taskAttachmentSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('TaskAttachment', taskAttachmentSchema);
