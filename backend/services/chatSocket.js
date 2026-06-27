const Chat = require('../models/chat/Chat');
const ChatMessage = require('../models/chat/ChatMessage');
const ChatMember = require('../models/chat/ChatMember');
const ChatMention = require('../models/chat/ChatMention');
const MessageRead = require('../models/chat/MessageRead');
const UserPresence = require('../models/chat/UserPresence');
const { Notification, NotificationType } = require('../models/Notification');

const setupChatSocket = (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  chatNamespace.on('connection', async (socket) => {
    const userId = socket.userId;

    await UserPresence.setOnline(userId, socket.id);
    chatNamespace.emit('presence:update', { userId, status: 'online' });

    const memberships = await ChatMember.find({ user: userId, isArchived: false }).select('chat').lean();
    memberships.forEach(m => {
      socket.join(`chat:${m.chat.toString()}`);
    });
    socket.join(`user:${userId}`);

    socket.on('chat:join', async (chatId) => {
      const member = await ChatMember.findOne({ chat: chatId, user: userId });
      if (member) {
        socket.join(`chat:${chatId}`);
      }
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('chat:typing', ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        chatId,
        userId,
        isTyping
      });
    });

    socket.on('chat:markRead', async ({ chatId, messageId }) => {
      try {
        await MessageRead.markAsRead(messageId, userId);
        await ChatMember.findOneAndUpdate(
          { chat: chatId, user: userId },
          { lastReadAt: new Date(), lastReadMessageId: messageId, unreadCount: 0 }
        );
        await Notification.updateMany(
          { user: userId, relatedChat: chatId, type: { $in: [NotificationType.CHAT_MESSAGE, NotificationType.CHAT_MENTION, NotificationType.CHAT_TASK_UPDATED] }, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        socket.to(`chat:${chatId}`).emit('chat:readReceipt', {
          chatId,
          messageId,
          userId,
          readAt: new Date()
        });
      } catch (err) {
        console.error('Error marking read:', err);
      }
    });

    socket.on('chat:send', async ({ chatId, content, attachments, replyTo, mentions }, callback) => {
      try {
        const member = await ChatMember.findOne({ chat: chatId, user: userId, isArchived: false });
        if (!member) {
          return callback?.({ error: 'غير مصرح لك بالإرسال في هذه المحادثة' });
        }

        const chat = await Chat.findById(chatId).lean();
        if (chat?.isLocked) {
          const User = require('../models/User').User;
          const sender = await User.findById(userId).select('role').lean();
          const canSend = member.role === 'admin' || sender?.role === 'admin' || sender?.role === 'manager' || sender?.role === 'hr';
          if (!canSend) {
            return callback?.({ error: 'المحادثة مقفلة، فقط المشرف يمكنه الإرسال' });
          }
        }

        const messageData = {
          chat: chatId,
          sender: userId,
          content: content || '',
          attachments: attachments || [],
          replyTo: replyTo || null,
          mentions: mentions || []
        };

        const message = await ChatMessage.create(messageData);
        await message.populate('sender', 'name email profileImage role department');

        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: {
            content: content?.substring(0, 100) || (attachments?.length ? '[مرفق]' : ''),
            sender: userId,
            senderName: message.sender?.name || 'مستخدم',
            createdAt: new Date()
          }
        });

        chatNamespace.to(`chat:${chatId}`).emit('chat:message', message.toObject());
        const allMembers = await ChatMember.find({ chat: chatId, user: { $ne: userId }, isArchived: false }).lean();

        for (const m of allMembers) {
          await ChatMember.findByIdAndUpdate(m._id, { $inc: { unreadCount: 1 } });
        }

        for (const m of allMembers) {
          const notification = await Notification.create({
            user: m.user,
            type: NotificationType.CHAT_MESSAGE,
            title: `رسالة جديدة في ${chat.name || 'محادثة'}`,
            message: `${message.sender?.name || 'مستخدم'}: ${(content || '').substring(0, 100)}`,
            relatedChat: chatId,
            relatedTask: chat?.taskId || null
          });
          chatNamespace.to(`user:${m.user}`).emit('notification', notification.toObject());
          global.io?.to(`user:${m.user}`)?.emit?.('notification', notification.toObject());
        }

        if (mentions && mentions.length > 0) {
          const mentionPromises = mentions.map(mentionUserId =>
            ChatMention.create({
              message: message._id,
              chat: chatId,
              mentionedUser: mentionUserId,
              mentionedBy: userId
            })
          );
          const mentionDocs = await Promise.all(mentionPromises);

          for (const mentionUserId of mentions) {
            const mentionNotif = await Notification.create({
              user: mentionUserId,
              type: NotificationType.CHAT_MENTION,
              title: 'تمت الإشارة إليك',
              message: `قام ${message.sender?.name || 'مستخدم'} بالإشارة إليك في ${chat.name || 'محادثة'}`,
              relatedChat: chatId,
              relatedTask: chat?.taskId || null
            });
            chatNamespace.to(`user:${mentionUserId}`).emit('notification', mentionNotif.toObject());
            global.io?.to(`user:${mentionUserId}`)?.emit?.('notification', mentionNotif.toObject());
          }
        }

        callback?.({ success: true, message: message.toObject() });
      } catch (err) {
        console.error('Error sending message:', err);
        callback?.({ error: 'حدث خطأ في إرسال الرسالة' });
      }
    });

    socket.on('chat:edit', async ({ messageId, content }, callback) => {
      try {
        const message = await ChatMessage.findOne({ _id: messageId, sender: userId });
        if (!message) return callback?.({ error: 'لا يمكن تعديل هذه الرسالة' });

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        chatNamespace.to(`chat:${message.chat}`).emit('chat:edited', {
          messageId,
          content,
          editedAt: message.editedAt
        });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: 'حدث خطأ في تعديل الرسالة' });
      }
    });

    socket.on('chat:delete', async ({ messageId }, callback) => {
      try {
        const message = await ChatMessage.findOne({ _id: messageId, sender: userId });
        if (!message) return callback?.({ error: 'لا يمكن حذف هذه الرسالة' });

        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        chatNamespace.to(`chat:${message.chat}`).emit('chat:deleted', {
          messageId,
          chatId: message.chat
        });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: 'حدث خطأ في حذف الرسالة' });
      }
    });

    socket.on('disconnect', async () => {
      await UserPresence.setOffline(socket.id);
      chatNamespace.emit('presence:update', { userId, status: 'offline' });
    });
  });
};

module.exports = setupChatSocket;
