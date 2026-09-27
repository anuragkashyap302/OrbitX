import { z } from 'zod';

/**
 * User Profile Update Validation:
 * Bio, location, full_name, username ko length aur format check karta hai.
 * Trimming automatically hoti hai taaki leading/trailing extra spaces database me na save hon.
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(30, { message: 'Username cannot exceed 30 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
    .optional(),
  full_name: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters long' })
    .max(50, { message: 'Full name cannot exceed 50 characters' })
    .optional(),
  bio: z
    .string()
    .trim()
    .max(250, { message: 'Bio cannot exceed 250 characters' })
    .optional(),
  location: z
    .string()
    .trim()
    .max(100, { message: 'Location cannot exceed 100 characters' })
    .optional()
});

/**
 * Target User Action Validation:
 * Follow, unfollow, ya connection request bhejte waqt target user ki 'id' compulsory honi chahiye.
 */
export const targetUserSchema = z.object({
  id: z
    .string({ required_error: 'Target user ID is required' })
    .trim()
    .min(1, { message: 'Target user ID cannot be empty' })
});

/**
 * User Discovery / Search Query Validation:
 * Input query optional hai, par agar ho to string honi chahiye aur length reasonable ho.
 */
export const discoverUsersSchema = z.object({
  input: z.string().trim().max(100).optional().default('')
});

/**
 * Post Creation Validation:
 * Post content optional hai agar image hai, lekin agar sirf text hai to empty string nahi honi chahiye.
 */
export const createPostSchema = z.object({
  content: z.string().trim().max(3000, { message: 'Post content cannot exceed 3000 characters' }).optional()
});

/**
 * Post Like / Interaction Validation:
 * postId valid non-empty string honi zaroori hai.
 */
export const likePostSchema = z.object({
  postId: z
    .string({ required_error: 'Post ID is required to like/unlike' })
    .trim()
    .min(1, { message: 'Post ID cannot be empty' })
});

/**
 * Story Creation Validation:
 * Story text length 500 characters se zyada nahi ho sakti.
 */
export const createStorySchema = z.object({
  content: z.string().trim().max(500, { message: 'Story content cannot exceed 500 characters' }).optional(),
  media_type: z.enum(['image', 'video', 'text']).optional().default('text'),
  background_color: z.string().trim().max(30).optional().default('#4F46E5')
});

/**
 * Direct Message Validation:
 * Recipient ID ('to_user_id') compulsory hai.
 */
export const sendMessageSchema = z.object({
  to_user_id: z
    .string({ required_error: 'Recipient user ID (to_user_id) is required' })
    .trim()
    .min(1, { message: 'Recipient user ID cannot be empty' }),
  text: z.string().trim().max(2000, { message: 'Message text cannot exceed 2000 characters' }).optional()
});
