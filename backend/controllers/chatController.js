const Chat = require('../models/chat/Chat');
const ChatMember = require('../models/chat/ChatMember');
const ChatMessage = require('../models/chat/ChatMessage');
const ChatMention = require('../models/chat/ChatMention');
const MessageRead = require('../models/chat/MessageRead');
const UserPresence = require('../models/chat/UserPresence');
const { Notification, NotificationType } = require('../models/Notification');
const Department = require('../models/Department');
const { User } = require('../models/User');
const { AuditLog, AuditAction } = require('../models/AuditLog');

const ensureDepartmentChat = async (user) => {
  const escapedDept = user.department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dept = await Department.findOne({
    name: { $regex: new RegExp(`^${escapedDept}$`, 'i') }
  }).lean();
  if (!dept) return null;

  let chat = await Chat.findOne({ type: 'department', departments: dept._id, isActive: true });
  if (!chat) {
    chat = await Chat.create({
      type: 'department',
      name: dept.name,
      departments: [dept._id],
      createdBy: user._id
    });
  }

  const deptUsers = await User.find({
    $or: [
      { department: { $regex: new RegExp(`^${escapedDept}$`, 'i') } },
      { role: { $in: ['admin', 'hr'] } }
    ],
    isActive: true
  }).select('_id role').lean();

  const existing = await ChatMember.find({ chat: chat._id }).select('user').lean();
  const existingIds = new Set(existing.map(e => e.user.toString()));

  const newMembers = deptUsers.filter(u => !existingIds.has(u._id.toString()));
  if (newMembers.length > 0) {
    await ChatMember.insertMany(
      newMembers.map(u => ({
        chat: chat._id,
        user: u._id,
        role: (u.role === 'admin' || u.role === 'hr') ? 'admin' : 'member'
      }))
    );
  }

  return chat._id;
};

const getMyChats = async (req, res) => {
  try {
    let memberships = await ChatMember.find({
      user: req.user._id,
      isArchived: false
    }).select('chat unreadCount lastReadAt').lean();

    if (memberships.length === 0 && req.user.department) {
      await ensureDepartmentChat(req.user);
      memberships = await ChatMember.find({
        user: req.user._id,
        isArchived: false
      }).select('chat unreadCount lastReadAt').lean();
    }

    const chatIds = memberships.map(m => m.chat);
    const unreadMap = {};
    memberships.forEach(m => { unreadMap[m.chat.toString()] = m.unreadCount || 0; });

    const chats = await Chat.find({ _id: { $in: chatIds }, isActive: true })
      .populate('departments', 'name color')
      .populate('participants', 'name email profileImage role department')
      .populate('lastMessage.sender', 'name')
      .populate('taskId', 'title status')
      .sort({ 'lastMessage.createdAt': -1, createdAt: -1 })
      .lean();

    const enriched = chats.map(chat => ({
      ...chat,
      unreadCount: unreadMap[chat._id.toString()] || 0
    }));

    res.json({ success: true, data: { chats: enriched } });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المحادثات' });
  }
};

const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('departments', 'name color')
      .populate('participants', 'name email profileImage role department')
      .populate('taskId', 'title status description')
      .populate('createdBy', 'name')
      .lean();

    if (!chat) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    if (!canAccessPrivateChat(chat, req.user)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول لهذه المحادثة' });
    }

    const members = await ChatMember.find({ chat: chat._id })
      .populate('user', 'name email profileImage role department')
      .sort({ role: 1, joinedAt: 1 })
      .lean();

    const memberIds = members.map(m => m.user?._id).filter(Boolean);
    const presences = await UserPresence.find({ user: { $in: memberIds } }).lean();
    const presenceMap = {};
    presences.forEach(p => { presenceMap[p.user.toString()] = { status: p.status, lastSeen: p.lastSeen }; });

    const enrichedMembers = members.map(m => ({
      ...m,
      presence: m.user ? presenceMap[m.user._id.toString()] || { status: 'offline', lastSeen: null } : null
    }));

    const myMembership = members.find(m => m.user?._id?.toString() === req.user._id.toString());

    res.json({
      success: true,
      data: {
        chat,
        members: enrichedMembers,
        myMembership
      }
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المحادثة' });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    const chat = await Chat.findById(id).select('type participants').lean();
    if (!chat) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    if (!canAccessPrivateChat(chat, req.user)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول لهذه المحادثة' });
    }

    const result = await ChatMessage.getMessages(id, {
      limit: parseInt(limit),
      before: before || null
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الرسائل' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const total = await ChatMember.getUnreadCountForUser(req.user._id);
    const mentions = await ChatMention.getUnreadMentions(req.user._id);
    res.json({ success: true, data: { total, mentions } });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب عدد الرسائل غير المقروءة' });
  }
};

const createSharedChat = async (req, res) => {
  try {
    const { name, departmentIds } = req.body;

    if (!departmentIds || departmentIds.length < 1) {
      return res.status(400).json({ success: false, message: 'يجب اختيار قسم واحد على الأقل' });
    }

    const chat = await Chat.create({
      type: 'shared',
      name: name || 'محادثة مشتركة',
      departments: departmentIds,
      createdBy: req.user._id
    });

    const users = await User.find({
      $or: [
        { department: { $in: await Department.find({ _id: { $in: departmentIds } }).select('name').then(d => d.map(dd => dd.name)) } },
        { role: { $in: ['admin', 'hr'] } }
      ],
      isActive: true
    }).select('_id').lean();

    const memberPromises = users.map(u =>
      ChatMember.addMember(chat._id, u._id, u.role === 'admin' ? 'admin' : 'member')
    );
    await Promise.all(memberPromises);

    await AuditLog.logAction({
      user: req.user._id,
      userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.CREATE,
      entity: 'Chat',
      entityId: chat._id,
      details: { type: 'shared', name, departmentIds }
    });

    res.status(201).json({ success: true, data: { chat } });
  } catch (error) {
    console.error('Error creating shared chat:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المحادثة المشتركة' });
  }
};

const createPrivateChat = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'يجب تحديد المستخدم الآخر' });
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكن إنشاء محادثة خاصة مع نفسك' });
    }

    const existing = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user._id, userId], $size: 2 },
      isActive: true
    });
    if (existing) {
      return res.json({ success: true, data: { chat: existing } });
    }

    const chat = await Chat.create({
      type: 'private',
      name: null,
      participants: [req.user._id, userId],
      createdBy: req.user._id
    });

    await Promise.all([
      ChatMember.addMember(chat._id, req.user._id, 'admin'),
      ChatMember.addMember(chat._id, userId, 'member')
    ]);

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'name email profileImage role department')
      .lean();

    res.status(201).json({ success: true, data: { chat: populated } });
  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المحادثة الخاصة' });
  }
};

const addMember = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });

    const isAdmin = await ChatMember.findOne({ chat: chatId, user: req.user._id, role: 'admin' });
    if (!isAdmin && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    const member = await ChatMember.addMember(chatId, userId);

    const notification = await Notification.create({
      user: userId,
      type: NotificationType.CHAT_ADDED,
      title: 'تمت إضافتك إلى محادثة',
      message: `تمت إضافتك إلى ${chat.name || 'محادثة'}`,
      relatedChat: chatId,
      relatedTask: chat.taskId || null
    });

    req.app.get('io')?.to(`user:${userId}`)?.emit?.('notification', notification.toObject());

    const user = await User.findById(userId).select('name email profileImage role department').lean();
    res.json({ success: true, data: { member, user } });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة العضو' });
  }
};

const removeMember = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const isAdmin = await ChatMember.findOne({ chat: chatId, user: req.user._id, role: 'admin' });
    if (!isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    await ChatMember.deleteOne({ chat: chatId, user: userId });

    res.json({ success: true, message: 'تم حذف العضو' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف العضو' });
  }
};

const archiveChat = async (req, res) => {
  try {
    await ChatMember.findOneAndUpdate(
      { chat: req.params.id, user: req.user._id },
      { isArchived: true }
    );
    res.json({ success: true, message: 'تم أرشفة المحادثة' });
  } catch (error) {
    console.error('Error archiving chat:', error);
    res.status(500).json({ success: false, message: 'خطأ في أرشفة المحادثة' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    const lastMessage = await ChatMessage.findOne({ chat: chatId })
      .sort({ createdAt: -1 })
      .select('_id');

    await ChatMember.findOneAndUpdate(
      { chat: chatId, user: req.user._id },
      { lastReadAt: new Date(), lastReadMessageId: lastMessage?._id || null, unreadCount: 0 }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking chat as read:', error);
    res.status(500).json({ success: false, message: 'خطأ' });
  }
};

const searchChats = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { chats: [], messages: [], users: [] } });
    }

    const memberships = await ChatMember.find({
      user: req.user._id,
      isArchived: false
    }).select('chat').lean();
    const chatIds = memberships.map(m => m.chat);

    const chats = await Chat.find({
      _id: { $in: chatIds },
      name: { $regex: q, $options: 'i' }
    }).lean();

    const messages = await ChatMessage.find({
      chat: { $in: chatIds },
      content: { $regex: q, $options: 'i' },
      isDeleted: false
    })
      .populate('sender', 'name')
      .limit(20)
      .lean();

    const deptChatIds = chatIds;
    const deptUsers = await User.find({
      name: { $regex: q, $options: 'i' },
      isActive: true
    })
      .select('name email department profileImage role')
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: { chats, messages, users: deptUsers }
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ success: false, message: 'خطأ في البحث' });
  }
};

const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const fileUrl = `/uploads/chat/${req.file.path.split('uploads\\chat\\')[1] || req.file.path.split('uploads/chat/')[1]}`;

    res.json({
      success: true,
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: fileUrl.replace(/\\/g, '/'),
        fileType: req.file.mimetype.startsWith('image') ? 'image' : 'document',
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: 'خطأ في رفع الملف' });
  }
};

const getChatMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const isMember = await ChatMember.findOne({ chat: id, user: req.user._id });
    if (!isMember && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    const members = await ChatMember.find({ chat: id })
      .populate('user', 'name email profileImage role department')
      .sort({ role: 1, joinedAt: 1 })
      .lean();

    const memberIds = members.map(m => m.user?._id).filter(Boolean);
    const presences = await UserPresence.find({ user: { $in: memberIds } }).lean();
    const presenceMap = {};
    presences.forEach(p => { presenceMap[p.user.toString()] = { status: p.status, lastSeen: p.lastSeen }; });

    const enriched = members.map(m => ({
      ...m,
      presence: m.user ? presenceMap[m.user._id.toString()] || { status: 'offline', lastSeen: null } : null
    }));

    res.json({ success: true, data: { members: enriched } });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الأعضاء' });
  }
};

const toggleMute = async (req, res) => {
  try {
    const member = await ChatMember.findOne({ chat: req.params.id, user: req.user._id });
    if (!member) return res.status(404).json({ success: false, message: 'غير موجود' });

    member.isMuted = !member.isMuted;
    await member.save();

    res.json({ success: true, data: { isMuted: member.isMuted } });
  } catch (error) {
    console.error('Error toggling mute:', error);
    res.status(500).json({ success: false, message: 'خطأ' });
  }
};

const canAccessPrivateChat = (chat, user) => {
  if (user.role === 'developer') return true;
  if (chat.type !== 'private') return true;
  const pids = (chat.participants || []).map(p => p.toString ? p.toString() : p);
  return pids.includes(user._id.toString());
};

const canManageChat = async (chatId, user) => {
  if (user.role === 'admin' || user.role === 'developer') return true;
  const chat = await Chat.findById(chatId).select('createdBy').lean();
  if (chat && chat.createdBy.toString() === user._id.toString()) return true;
  const member = await ChatMember.findOne({ chat: chatId, user: user._id });
  if (!member) return false;
  if (member.role === 'admin') return true;
  if (user.role === 'manager' || user.role === 'hr') return true;
  return false;
};

const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });

    const allowed = await canManageChat(chat._id, req.user);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف المحادثة' });
    }

    await Promise.all([
      ChatMessage.deleteMany({ chat: chat._id }),
      ChatMember.deleteMany({ chat: chat._id }),
      ChatMention.deleteMany({ chat: chat._id }),
      MessageRead.deleteMany({ chat: chat._id }),
      Notification.deleteMany({ relatedChat: chat._id }),
      Chat.findByIdAndDelete(chat._id)
    ]);

    await AuditLog.logAction({
      user: req.user._id,
      userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.DELETE,
      entity: 'Chat',
      entityId: chat._id,
      details: { type: chat.type, name: chat.name }
    });

    res.json({ success: true, message: 'تم حذف المحادثة' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف المحادثة' });
  }
};

const toggleLockChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });

    const allowed = await canManageChat(chat._id, req.user);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    chat.isLocked = !chat.isLocked;
    await chat.save();

    await AuditLog.logAction({
      user: req.user._id,
      userRole: req.user.role,
      userDepartment: req.user.department,
      action: AuditAction.UPDATE,
      entity: 'Chat',
      entityId: chat._id,
      details: { type: chat.type, name: chat.name, isLocked: chat.isLocked }
    });

    const io = req.app.get('io');
    io?.of('/chat')?.to(`chat:${chat._id}`)?.emit?.('chat:lockToggled', { chatId: chat._id, isLocked: chat.isLocked });

    res.json({ success: true, data: { isLocked: chat.isLocked } });
  } catch (error) {
    console.error('Error toggling lock:', error);
    res.status(500).json({ success: false, message: 'خطأ' });
  }
};

module.exports = {
  getMyChats,
  getChatById,
  getChatMessages,
  getUnreadCount,
  createSharedChat,
  createPrivateChat,
  addMember,
  removeMember,
  archiveChat,
  markAsRead,
  searchChats,
  uploadAttachment,
  getChatMembers,
  toggleMute,
  deleteChat,
  toggleLockChat
};
