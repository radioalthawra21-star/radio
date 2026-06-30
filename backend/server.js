/**
 * Employee Task Management System - Backend Server
 * Main entry point for the API
 * Modified for cloud deployment (Render)
 */

// Import required packages
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const { User } = require('./models/User');
const { Settings } = require('./models/Settings');
const { Prompt } = require('./models/Prompt');
const { seedDefaultDepartments } = require('./controllers/departmentController');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const bonusRoutes = require('./routes/bonusRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const managerEvaluationRoutes = require('./routes/managerEvaluationRoutes');
const wellBeingRoutes = require('./routes/wellBeingRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const editorialPipelineRoutes = require('./routes/editorialPipelineRoutes');
const coupletPipelineRoutes = require('./routes/coupletPipelineRoutes');
const promptRoutes = require('./routes/promptRoutes');
const documentRoutes = require('./routes/documentRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const recruitmentPerformanceRoutes = require('./routes/recruitmentPerformanceRoutes');
const financialMiscRoutes = require('./routes/financialMiscRoutes');
const coupletPromptRoutes = require('./routes/coupletPromptRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const zktecoRoutes = require('./routes/zktecoRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const workflowTaskRoutes = require('./routes/workflowTaskRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const taskHistoryRoutes = require('./routes/taskHistoryRoutes');
const dailyReportRoutes = require('./routes/dailyReportRoutes');

const holidayRoutes = require('./routes/holidayRoutes');
const chatRoutes = require('./routes/chatRoutes');
const setupChatSocket = require('./services/chatSocket');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// === ط¥ط¹ط¯ط§ط¯ط§طھ CORS ظ„ظ„ط³ط­ط§ط¨ط© ===
// âœ… Fixed: CORS configuration for Netlify domain and localhost development
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'https://radioalthawra.netlify.app',
      'http://127.0.0.1:5173',
      'http://localhost:5173'
    ];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin.endsWith('.netlify.app') || origin.endsWith('.ngrok-free.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type',
    'Accept', 'Authorization'
  ],
  exposedHeaders: [
    'Content-Length', 'X-Request-Id', 'X-Total-Count'
  ],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO for real-time notifications
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = ['https://radioalthawra.netlify.app', 'http://127.0.0.1:5173', 'http://localhost:5173'];
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.netlify.app') || origin.endsWith('.ngrok-free.dev')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      return next(new Error('JWT_SECRET not configured'));
    }
    const decoded = jwt.verify(token, secret || 'dev-secret-key-2024');
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(socket.userId);
  socket.on('disconnect', () => {});
});

global.io = io;

setupChatSocket(io);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to database (must complete before server starts accepting requests)
const dbReady = connectDB();

// Serve static fonts from frontend/dist/fonts with correct MIME types and CORS headers
app.use('/fonts', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
}, express.static(path.join(__dirname, '..', 'frontend', 'dist', 'fonts'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.ttf')) {
      res.setHeader('Content-Type', 'font/ttf');
    } else if (filePath.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    } else if (filePath.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    } else if (filePath.endsWith('.otf')) {
      res.setHeader('Content-Type', 'font/otf');
    }
  }
}));

// Initialize default data
const initializeData = async () => {
  try {
    // Create admin account if not exists
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@radio.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        name: 'ط§ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ…',
        role: 'admin',
        department: null,
        isActive: true
      });
      console.log('âœ… طھظ… ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ ط§ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ… (admin)');
    }
    console.log('âœ… ط­ط³ط§ط¨ ط§ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ… ظ…ظˆط¬ظˆط¯');
    // ظ…ظ†ط­ ظ…طµط·ظپظ‰ ط§ظ„ط®ط´ظ† طµظ„ط§ط­ظٹط§طھ ظƒط§ظ…ظ„ط© ظƒط§ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ…
    const mustafaUser = await User.findOne({ username: 'mostafa' });
    if (mustafaUser) {
      mustafaUser.role = 'hr';
      mustafaUser.department = 'ط§ظ„ظ…ظˆط§ط±ط¯ ط§ظ„ط¨ط´ط±ظٹط©';
      mustafaUser.isActive = true;
      await mustafaUser.save();
      console.log('âœ… طھظ… ظ…ظ†ط­ ظ…طµط·ظپظ‰ ط§ظ„ط®ط´ظ† طµظ„ط§ط­ظٹط§طھ ظƒط§ظ…ظ„ط© (mostafa)');
    } else {
      console.log('âڑ ï¸ڈ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط­ط³ط§ط¨ ظ…طµط·ظپظ‰ ط§ظ„ط®ط´ظ† (mostafa)');
    }

    // Initialize default settings
    await Settings.initializeDefaults();

    // Seed default departments
    await seedDefaultDepartments();

    // Seed default editorial prompts
    await Prompt.seedDefaults();
  } catch (error) {
    console.error('ط®ط·ط£ ظپظٹ طھظ‡ظٹط¦ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ:', error.message);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', workflowTaskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bonuses', bonusRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/manager-evaluation', managerEvaluationRoutes);
app.use('/api/well-being', wellBeingRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/editorial-pipeline', editorialPipelineRoutes);
app.use('/api/couplet-pipeline', coupletPipelineRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/couplet-prompts', coupletPromptRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/recruitment', recruitmentPerformanceRoutes);
app.use('/api/financial-misc', financialMiscRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/zkteco', zktecoRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks', taskHistoryRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/holidays', holidayRoutes);
app.use('/api/daily-report', dailyReportRoutes);

// Serve the Temp-Supervisor page
app.use('/supervisor', express.static(path.join(__dirname, 'public')));

// Serve built frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Health check endpoint (ظ…ظ‡ظ… ظ„ظ€ Render)
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbName = mongoose.connection?.db?.databaseName || 'not connected';
  res.json({ 
    status: 'success', 
    message: 'ط§ظ„ط®ط§ط¯ظ… ظٹط¹ظ…ظ„ ط¨ط´ظƒظ„ طµط­ظٹط­',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbName
  });
});

// Swagger/OpenAPI documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json(require('./swagger.json'));
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ًںڑ€ Employee Task Management API is running',
    version: '1.0.0',
    docs: '/api/health',
    swagger: '/api/docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('ط®ط·ط£ ظپظٹ ط§ظ„ط®ط§ط¯ظ…:', err.message || err);
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط®ط§ط¯ظ…',
    error: err.message || 'Unknown error'
  });
});

// SPA fallback â€” serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'ط§ظ„ظ…ط³ط§ط± ط؛ظٹط± ظ…ظˆط¬ظˆط¯'
  });
});

// === ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„طھط´ط؛ظٹظ„ ظ„ظ„ط³ط­ط§ط¨ط© ===
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // ظ…ظ‡ظ… ظ„ظٹط¹ظ…ظ„ ط¹ظ„ظ‰ Render

// ط¯ط§ظ„ط© ط¨ط¯ط، ط§ظ„طھط´ط؛ظٹظ„
const startServer = () => {
  server.listen(PORT, HOST, () => {
    console.log(`âœ… ط§ظ„ط®ط§ط¯ظ… ظٹط¹ظ…ظ„ ط¹ظ„ظ‰ ${HOST}:${PORT}`);
    console.log(`ًںŒگ Environment: ${process.env.NODE_ENV || 'development'}`);
    initializeData();
  });
};

// ط§ظ„طھط¹ط§ظ…ظ„ ظ…ط¹ ط¥ط´ط§ط±ط§طھ ط§ظ„ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط¢ظ…ظ†
const gracefulShutdown = (signal) => {
  console.log(`ًں”„ ${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log('âœ… HTTP server closed');
    mongoose.connection.close(false).then(() => {
      console.log('âœ… MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('â‌Œ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ط¨ط¯ط، ط§ظ„ط³ظٹط±ظپط± (ط¨ط¹ط¯ ط§ظ„طھط£ظƒط¯ ظ…ظ† ط§طھطµط§ظ„ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ)
dbReady.then(() => startServer()).catch(err => { console.error('â‌Œ ظپط´ظ„ ط¨ط¯ط، ط§ظ„ط®ط§ط¯ظ…:', err.message); process.exit(1); });

// طھطµط¯ظٹط± ط§ظ„طھط·ط¨ظٹظ‚ ظ„ظ„ط§ط³طھط®ط¯ط§ظ… ظپظٹ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط£ظˆ ط§ظ„ظ€ serverless
module.exports = app;
