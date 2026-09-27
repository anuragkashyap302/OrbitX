import { ZodError } from 'zod';
import AppError from '../utils/AppError.js';

/**
 * 💡 [Hinglish Explanation]:
 * Zod validation errors ko format karne ka helper.
 * Agar user ne invalid form data bheja (jaise blank username ya invalid email),
 * to Zod ke complex error tree ko clean, human-readable string me convert karta hai.
 */
const handleZodError = (err) => {
  const errors = err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  const message = `Validation Error: ${errors.join(', ')}`;
  return new AppError(message, 400);
};

/**
 * 💡 [Hinglish Explanation]:
 * MongoDB CastError: Jab user URL me invalid ObjectId bhej deta hai (e.g. /api/post/invalid123).
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * 💡 [Hinglish Explanation]:
 * MongoDB Duplicate Key Error (Code 11000):
 * Jab user already registered username ya email ke sath account ya resource update karne ki koshish kare.
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate field value: '${value}' for field '${field}'. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Centralized Global Error Handler Middleware:
 * Express me 4 arguments (err, req, res, next) wala middleware automatically Error Middleware ban jata hai.
 * Kisi bhi controller me 'next(error)' call karne par execution seedhe yahan redirect hoti hai.
 * Isse pure project me repetitive try/catch boilerplate aur inconsistent error responses khatam ho jate hain.
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = err;

  // Specific database and validation error handling
  if (err instanceof ZodError) error = handleZodError(err);
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);

  // Development environment response (Detailed stack trace for fast debugging)
  if (process.env.NODE_ENV === 'development') {
    return res.status(error.statusCode).json({
      success: false,
      status: error.status,
      message: error.message,
      stack: error.stack,
      error: error
    });
  }

  // Production environment response (Clean, user-safe message without leaking server internals)
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      status: error.status,
      message: error.message
    });
  }

  // Unknown / Programming bug (Log to server console and send generic 500)
  console.error('UNEXPECTED SERVER ERROR:', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong on the server! Please try again later.'
  });
};

export default errorHandler;
