import mongoose from "mongoose";

/**
 * Post Schema:
 * [Compound Index Strategy]:
 * 1. { user: 1, createdAt: -1 }:
 *    Jab user ki profile open hoti hai, to query chalti hai: Post.find({ user: userId }).sort({ createdAt: -1 }).
 *    Bina compound index ke MongoDB pehle saare user ke posts dhoondhta hai aur fir unhe RAM me in-memory sort karta hai.
 *    Is compound index se MongoDB B-Tree me pehle hi 'user' ke hisaab se grouped aur 'createdAt' descending order me sorted hota hai,
 *    jisse profile feed 1ms me return ho jati hai (Zero In-Memory Sort overhead).
 *
 * 2. { createdAt: -1 }:
 *    Global recent feeds aur cursor pagination ke liye fast timeline traversal provide karta hai.
 */
const postSchema = new mongoose.Schema({
    user: { type: String, ref: 'User', required: true, index: true },
    content: { type: String, trim: true },
    image_urls: [{ type: String }],
    post_type: { type: String, enum: ['text', 'image', 'text_with_image'], required: true },
    likes_count: [{ type: String, ref: 'User' }],
    comments_count: { type: Number, default: 0 },
    shares_count: { type: Number, default: 0 }
}, { timestamps: true, minimize: false });

//  Compound Index for User Timeline & Profile Queries
postSchema.index({ user: 1, createdAt: -1 });
//  Index for Global Chronological Feed
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;