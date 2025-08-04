import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRouter from './routes/index.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import morgan from 'morgan';
import logger from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurations
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// Critical Fix 1: Enhanced CORS for APK connectivity
const allowedOrigins = [
  'http://localhost:8081',         // Expo dev server
  'exp://192.168.1.122:8081',              // Allow all local network Expo connections
  '192.168.1.122',             // Allow local network IPs
  'https://paddime-backend.onrender.com' // Your Render URL
];

// Socket.IO Configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin.replace('*', '')))
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('dev')); // More concise logging for debugging

// Static files - Critical Fix 2: Absolute path for Render
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection - Critical Fix 3: Added connection options
mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority'
})
  .then(() => logger.info('✅ MongoDB connected successfully'))
  .catch(err => {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails
  });

// Enhanced Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Paddime Gift Card API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/healthcheck', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// API Routes
app.use('/api', apiRouter);

// Enhanced Error Handling
app.use((err, req, res, next) => {
  logger.error('⚠️ Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : err.message
  });
});

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Connect your APK to: http://localhost:${PORT}`);
});