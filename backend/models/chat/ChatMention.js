const mongoose = require('mongoose');

const chatMentionSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  mentionedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

chatMentionSchema.index({ mentionedUser: 1, isRead: 1 });
chatMentionSchema.index({ message: 1, mentionedUser: 1 }, { unique: true });
chatMentionSchema.index({ chat: 1 });

chatMentionSchema.statics.getUnreadMentions = async function(userId) {
  return this.countDocuments({ mentionedUser: userId, isRead: false });
};

chatMentionSchema.statics.markAsRead = async function(messageId, userId) {
  return this.updateMany(
    { message: messageId, mentionedUser: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('ChatMention', chatMentionSchema);
