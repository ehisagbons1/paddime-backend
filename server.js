import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRouter from './routes/index.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import morgan from 'morgan';
import logger from './utils/logger.js';
import fetch from 'node-fetch';
import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });
app.set('io', io);
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Welcome to the Paddime Gift Card API!');
});

app.use('/api', apiRouter);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 