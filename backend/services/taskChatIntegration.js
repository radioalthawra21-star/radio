const Chat = require('../models/chat/Chat');
const ChatMember = require('../models/chat/ChatMember');
const { User } = require('../models/User');
const Department = require('../models/Department');

const ensureTaskChat = async (taskId, taskTitle, createdBy) => {
  const chat = await Chat.findOrCreateTaskChat(taskId, taskTitle, createdBy);
  return chat;
};

const syncTaskChatMembers = async (taskId, assignedUserIds, departmentId) => {
  const chat = await Chat.findOne({ type: 'task', taskId, isActive: true });
  if (!chat) return;

  const userIds = [...new Set(assignedUserIds.map(id => id.toString()))];

  const deptUsers = departmentId
    ? await getUsersByDepartment(departmentId)
    : [];

  const adminUsers = await User.find({
    role: { $in: ['admin', 'hr'] },
    isActive: true
  }).select('_id').lean();

  const allUserIds = [...userIds, ...deptUsers, ...adminUsers.map(u => u._id.toString())];
  const uniqueUserIds = [...new Set(allUserIds)];

  const memberPromises = uniqueUserIds.map(userId =>
    ChatMember.addMember(chat._id, userId)
  );

  await Promise.all(memberPromises);

  if (global.io) {
    const chatNamespace = global.io.of('/chat');
    uniqueUserIds.forEach(userId => {
      chatNamespace.to(`user:${userId}`).emit('chat:added', {
        chatId: chat._id,
        chatName: chat.name
      });
    });
  }

  return chat;
};

const addTaskChatMembers = async (taskId, userIds) => {
  const chat = await Chat.findOne({ type: 'task', taskId, isActive: true });
  if (!chat) return;

  const promises = userIds.map(uid => ChatMember.addMember(chat._id, uid));
  await Promise.all(promises);

  if (global.io) {
    const chatNamespace = global.io.of('/chat');
    userIds.forEach(userId => {
      chatNamespace.to(`user:${userId}`).emit('chat:added', {
        chatId: chat._id,
        chatName: chat.name
      });
    });
  }
};

const getUsersByDepartment = async (departmentId) => {
  const dept = await Department.findById(departmentId);
  if (!dept) return [];

  const users = await User.find({
    department: dept.name,
    isActive: true
  }).select('_id').lean();

  return users.map(u => u._id.toString());
};

module.exports = {
  ensureTaskChat,
  syncTaskChatMembers,
  addTaskChatMembers,
  getUsersByDepartment
};
