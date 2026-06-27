const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'task-attachments');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ext);
  }
});

const {
  createWorkflowTask, transitionTask, approveStage, rejectStage,
  getTaskTimeline, addComment, getComments,
  uploadAttachment, getAttachments, deleteAttachment,
  getKanbanBoard, updateKanbanStatus
} = require('../controllers/workflowTaskController');
const { protect, workflowAccess, adminOrHR } = require('../middleware/authMiddleware');

router.post('/workflow', protect, createWorkflowTask);
router.get('/kanban', protect, getKanbanBoard);
router.put('/:id/transition', protect, workflowAccess, transitionTask);
router.put('/:id/approve-stage', protect, workflowAccess, approveStage);
router.put('/:id/reject-stage', protect, workflowAccess, rejectStage);
router.put('/:id/kanban-status', protect, workflowAccess, updateKanbanStatus);
router.get('/:id/timeline', protect, workflowAccess, getTaskTimeline);
router.post('/:id/comments', protect, workflowAccess, addComment);
router.get('/:id/comments', protect, workflowAccess, getComments);
router.post('/:id/attachments', protect, workflowAccess, upload.single('file'), uploadAttachment);
router.get('/:id/attachments', protect, workflowAccess, getAttachments);
router.delete('/:id/attachments/:attachId', protect, workflowAccess, deleteAttachment);

module.exports = router;
