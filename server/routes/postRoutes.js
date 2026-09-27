import express from 'express';
import { upload } from '../configs/multer.js';
import { protect } from '../middleware/auth.js';
import { addPost, getFeedPosts, likePost } from '../controllers/postController.js';
import { validate } from '../middleware/validate.js';
import { createPostSchema, likePostSchema } from '../validators/schemas.js';

const postRouter = express.Router();

/**
 * Post Routes:
 * - /add: Images upload hone ke baad text content ko validate karta hai.
 * - /like: Ensure karta hai ki valid postId pass ki gayi ho.
 */
postRouter.post('/add', upload.array('images', 4), protect, validate(createPostSchema), addPost);
postRouter.get('/feed', protect, getFeedPosts);
postRouter.post('/like', protect, validate(likePostSchema), likePost);

export default postRouter;