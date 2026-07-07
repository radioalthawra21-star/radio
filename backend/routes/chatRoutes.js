const express = require('express');
const router = express.Router();
const { protect, adminOrHR } = require('../middleware/authMiddleware');
const chatUpload = require('../middleware/chatUpload');
const {
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
} = require('../controllers/chatController');

router.get('/', protect, getMyChats);
router.get('/unread', protect, getUnreadCount);
router.get('/search', protect, searchChats);
router.get('/:id', protect, getChatById);
router.get('/:id/messages', protect, getChatMessages);
router.get('/:id/members', protect, getChatMembers);

router.post('/shared', protect, createSharedChat);
router.post('/private', protect, createPrivateChat);
router.post('/upload', protect, chatUpload.single('file'), uploadAttachment);
router.post('/add-member', protect, addMember);
router.post('/remove-member', protect, removeMember);

router.put('/:id/archive', protect, archiveChat);
router.put('/:id/read', protect, markAsRead);
router.put('/:id/toggle-mute', protect, toggleMute);
router.put('/:id/toggle-lock', protect, toggleLockChat);
router.delete('/:id', protect, deleteChat);

module.exports = router;
