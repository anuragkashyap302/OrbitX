import express from "express";
import { 
  acceptConnectionRequest, 
  discoverUsers, 
  followUser, 
  getUserConnections, 
  getUserData, 
  getUserProfile, 
  sendConnectionRequest, 
  unfollowUser, 
  updateUserData 
} from "../controllers/userControllers.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../configs/multer.js";
import { getUserRecentMessages } from "../controllers/messageController.js";
import { validate } from "../middleware/validate.js";
import { 
  updateProfileSchema, 
  targetUserSchema, 
  discoverUsersSchema 
} from "../validators/schemas.js";

const userRouter = express.Router();

/**
 * User Routes: Har endpoint par protect middleware aur Zod validation laga hai.
 * Kisi bhi invalid ID ya malformed payload par controller execute hone se pehle hi 400 Bad Request return ho jata hai.
 */
userRouter.get('/data', protect, getUserData);

userRouter.post(
  '/update',
  upload.fields([
    { name: 'profile', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  protect,
  validate(updateProfileSchema),
  updateUserData
);

userRouter.post('/discover', protect, validate(discoverUsersSchema), discoverUsers);
userRouter.post('/follow', protect, validate(targetUserSchema), followUser);
userRouter.post('/unfollow', protect, validate(targetUserSchema), unfollowUser);
userRouter.post('/connect', protect, validate(targetUserSchema), sendConnectionRequest);
userRouter.post('/accept', protect, validate(targetUserSchema), acceptConnectionRequest);
userRouter.get('/connections', protect, getUserConnections);
userRouter.post('/profiles', getUserProfile);
userRouter.get('/recent-messages', protect, getUserRecentMessages);

export default userRouter;