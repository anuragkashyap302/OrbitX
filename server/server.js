import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { inngest, functions } from './inngest/index.js';
import { serve } from "inngest/express";
import { clerkMiddleware } from '@clerk/express';
import userRouter from './routes/userRoutes.js';
import postRouter from './routes/postRoutes.js';
import storyRouter from './routes/storyRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import AppError from './utils/AppError.js';

const app = express();
await connectDB();

/**
 * 1. Helmet Security Middleware:
 * HTTP headers ko secure karta hai:
 * - 'X-Frame-Options: SAMEORIGIN': Clickjacking attacks ko block karta hai (koi doosri site humari app ko iframe me embed nahi kar sakti).
 * - 'X-Content-Type-Options: nosniff': MIME-type sniffing ko block karta hai.
 * - 'Strict-Transport-Security': Browser ko enforce karta hai ki HTTPS hi use kare.
 * - crossOriginResourcePolicy: false rakha hai taaki ImageKit images smoothly load hon bina browser block ke.
 */
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

/**
 * 2. Tightened CORS Configuration:
 * Pehle wild-open 'cors()' tha jisse koi bhi malicious domain API access kar sakti thi.
 * Ab humne whitelist banayi hai: Sirf Frontend (localhost:5173 ya production domain) ko allow kiya hai.
 */
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Mobile apps, server-to-server calls, whitelisted origins, ya Vercel domains (*.vercel.app) allow karo
    const isVercelDeployment = origin && (origin.endsWith('.vercel.app') || origin.includes('vercel.app'));

    if (!origin || allowedOrigins.includes(origin) || isVercelDeployment) {
      callback(null, true);
    } else {
      callback(new AppError('CORS block: Request origin not allowed', 403));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 3. Rate Limiting Middleware:
 * API ko DDoS attacks, spam bots, aur brute force attacks se bachane ke liye.
 * Global Limiter: Ek IP se 15 minute me maximum 300 requests allowed hain.
 * Agar limit cross hoti hai to standard HTTP 429 Too Many Requests return hota hai.
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 300, // Har IP ko max 300 requests
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable legacy `X-RateLimit-*` headers
  message: {
    success: false,
    status: 'fail',
    message: 'Too many requests from this IP address! Please try again after 15 minutes.'
  }
});

// Sensitive action limiter (Post creation, connect requests)
const actionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // Max 60 write actions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many action requests! Please wait a few moments before trying again.'
  }
});

// Apply global rate limiter to all API endpoints
app.use('/api', globalRateLimiter);
// Apply strict action limiter to write-heavy routes
app.use('/api/post/add', actionRateLimiter);
app.use('/api/user/connect', actionRateLimiter);

// Body parser with size limits to prevent payload bombs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(clerkMiddleware());

// Health Check Endpoint
app.get('/', (req, res) => 
  res.json({ success: true, message: 'OrbitX API Server is running fine!' })
);

// Inngest background event processing
app.use('/api/inngest', serve({ client: inngest, functions }));

// Application Routes
app.use('/api/user', userRouter);
app.use('/api/post', postRouter);
app.use('/api/story', storyRouter);
app.use('/api/message', messageRouter);

/**
 * Express 5 Catch-All 404 Handler:
 * Unhandled routes ko catch karta hai aur clean 404 AppError throw karta hai.
 */
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () =>
  console.log(`OrbitX Server is running on port ${PORT}`)
);