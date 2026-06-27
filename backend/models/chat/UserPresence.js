const mongoose = require('mongoose');

const userPresenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  socketId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

userPresenceSchema.index({ status: 1 });
userPresenceSchema.index({ lastSeen: -1 });

userPresenceSchema.statics.setOnline = async function(userId, socketId) {
  return this.findOneAndUpdate(
    { user: userId },
    { user: userId, status: 'online', socketId, lastSeen: new Date(), lastActivity: new Date() },
    { upsert: true, new: true }
  );
};

userPresenceSchema.statics.setOffline = async function(socketId) {
  return this.findOneAndUpdate(
    { socketId },
    { status: 'offline', lastSeen: new Date(), socketId: null },
    { new: true }
  );
};

userPresenceSchema.statics.setAway = async function(userId) {
  return this.findOneAndUpdate(
    { user: userId },
    { status: 'away', lastSeen: new Date() },
    { new: true }
  );
};

userPresenceSchema.statics.getUserStatus = async function(userId) {
  const presence = await this.findOne({ user: userId });
  if (!presence) {
    return { status: 'offline', lastSeen: null };
  }
  const now = new Date();
  const inactiveDuration = now - new Date(presence.lastActivity);
  if (presence.status === 'online' && inactiveDuration > 300000) {
    presence.status = 'away';
    await presence.save();
  }
  return { status: presence.status, lastSeen: presence.lastSeen };
};

module.exports = mongoose.model('UserPresence', userPresenceSchema);
