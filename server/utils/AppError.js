/**
 * AppError Class:
 * Ye humara custom operational error class hai jo standard JavaScript Error ko extend karta hai.
 *
 * Kyu zaroori hai?
 * 1. Har error ke sath ek standard HTTP status code (400, 401, 403, 404, 500) attach ho jata hai.
 * 2. 'isOperational: true' mark karta hai ki ye ek expected application error hai (jaise Invalid Input ya Unauthorized access),
 *    koi unhandled programming bug ya memory leak nahi hai.
 * 3. Centralized error handling middleware is class ko dekh kar client ko clean, professional message bhejta hai.
 */
class AppError extends Error {
  /**
   * @param {string} message - User-friendly error message
   * @param {number} statusCode - HTTP Status Code (e.g. 400 for Bad Request, 404 for Not Found)
   */
  constructor(message, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    // 4xx status codes 'fail' hote hain (client fault), 5xx status codes 'error' hote hain (server issue)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Stack trace capture karo taaki debugging me pata chale error kis file aur line se initiate hua
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
