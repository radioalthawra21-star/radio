const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

const chatMemberSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastReadAt: {
    type: Date,
    default: null
  },
  lastReadMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  unreadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

chatMemberSchema.index({ chat: 1, user: 1 }, { unique: true });
chatMemberSchema.index({ user: 1, lastReadAt: -1 });
chatMemberSchema.index({ user: 1, unreadCount: -1 });
chatMemberSchema.index({ chat: 1, role: 1 });

chatMemberSchema.statics.addMember = async function(chatId, userId, role = 'member') {
  const existing = await this.findOne({ chat: chatId, user: userId });
  if (existing) {
    if (existing.isArchived) {
      existing.isArchived = false;
      existing.unreadCount = 0;
      await existing.save();
    }
    return existing;
  }
  return this.create({ chat: chatId, user: userId, role });
};

chatMemberSchema.statics.getUnreadCountForUser = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: new ObjectId(userId), isArchived: false } },
    { $group: { _id: null, total: { $sum: '$unreadCount' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model('ChatMember', chatMemberSchema);
