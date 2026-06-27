const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['department', 'shared', 'task'],
    required: true
  },
  name: {
    type: String,
    trim: true,
    default: null
  },
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    senderName: String,
    createdAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

chatSchema.index({ type: 1, isActive: 1 });
chatSchema.index({ departments: 1 });
chatSchema.index({ taskId: 1 }, { sparse: true });

chatSchema.statics.findOrCreateDepartmentChat = async function(departmentId, createdBy) {
  let chat = await this.findOne({ type: 'department', departments: departmentId, isActive: true });
  if (!chat) {
    const Department = mongoose.model('Department');
    const dept = await Department.findById(departmentId);
    chat = await this.create({
      type: 'department',
      name: dept ? dept.name : 'قسم',
      departments: [departmentId],
      createdBy
    });
  }
  return chat;
};

chatSchema.statics.findOrCreateTaskChat = async function(taskId, taskTitle, createdBy) {
  let chat = await this.findOne({ type: 'task', taskId, isActive: true });
  if (!chat) {
    chat = await this.create({
      type: 'task',
      name: taskTitle || `Task #${taskId}`,
      taskId,
      createdBy
    });
  }
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
