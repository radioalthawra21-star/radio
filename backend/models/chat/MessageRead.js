const mongoose = require('mongoose');

const messageReadSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

messageReadSchema.index({ message: 1, user: 1 }, { unique: true });
messageReadSchema.index({ user: 1, readAt: -1 });

messageReadSchema.statics.markAsRead = async function(messageId, userId) {
  return this.findOneAndUpdate(
    { message: messageId, user: userId },
    { message: messageId, user: userId, readAt: new Date() },
    { upsert: true, new: true }
  );
};

messageReadSchema.statics.getReadReceipts = async function(messageId) {
  return this.find({ message: messageId })
    .populate('user', 'name email profileImage')
    .sort({ readAt: 1 })
    .lean();
};

messageReadSchema.statics.getUnreadCount = async function(messageId) {
  const message = await mongoose.model('ChatMessage').findById(messageId).select('chat');
  if (!message) return 0;
  const totalMembers = await mongoose.model('ChatMember').countDocuments({
    chat: message.chat,
    isArchived: false
  });
  const readCount = await this.countDocuments({ message: messageId });
  return Math.max(0, totalMembers - readCount);
};

module.exports = mongoose.model('MessageRead', messageReadSchema);
