import express from 'express';
import { getChatMessages, sendMessage, sseController } from '../controllers/messageController.js';
import { upload } from '../configs/multer.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendMessageSchema } from '../validators/schemas.js';

const messageRouter = express.Router();

/**
 * Message Routes:
 * - /send: Ensure karta hai ki recipient ID ('to_user_id') present ho aur text length limit me ho.
 */
messageRouter.get('/:userId', sseController);
messageRouter.post('/send', upload.single('image'), protect, validate(sendMessageSchema), sendMessage);
messageRouter.post('/get', protect, getChatMessages);

export default messageRouter;