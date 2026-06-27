const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  attachments: [attachmentSchema],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ chat: 1, createdAt: -1 });
chatMessageSchema.index({ chat: 1, _id: -1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ mentions: 1 });
chatMessageSchema.index({ chat: 1, isDeleted: 1 });
chatMessageSchema.index({ content: 'text' });

chatMessageSchema.statics.getMessages = async function(chatId, options = {}) {
  const {
    limit = 50,
    before = null,
    after = null
  } = options;

  const query = { chat: new ObjectId(chatId), isDeleted: false };

  if (before) {
    query._id = { $lt: new ObjectId(before) };
  }
  if (after) {
    query._id = { $gt: new ObjectId(after) };
  }

  let messages = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'name email profileImage role department')
    .populate('replyTo', 'content sender')
    .lean();

  const hasMore = messages.length === limit;

  return {
    messages: messages.reverse(),
    hasMore,
    total: messages.length
  };
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
