import express from 'express';
import { upload } from '../configs/multer.js';
import { protect } from '../middleware/auth.js';
import { addUserStory, getStories } from '../controllers/storyController.js';
import { validate } from '../middleware/validate.js';
import { createStorySchema } from '../validators/schemas.js';

const storyRouter = express.Router();

/**
 * Story Routes:
 * - /create: Story text length (max 500 chars) aur background color validate karta hai.
 */
storyRouter.post('/create', upload.single('media'), protect, validate(createStorySchema), addUserStory);
storyRouter.get('/get', protect, getStories);

export default storyRouter;