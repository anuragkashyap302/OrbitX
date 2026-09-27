import mongoose from "mongoose";

/**
 * Message Schema:
 * [Compound Index Strategy]:
 * 1. { from_user_id: 1, to_user_id: 1, createdAt: 1 }:
 *    Jab do users ke beech chat history load hoti hai:
 *    Message.find({ from_user_id: userA, to_user_id: userB }).sort({ createdAt: 1 })
 *    Is compound index se do users ke beech ke messages chronological order me B-Tree se directly read hote hain.
 *
 * 2. { to_user_id: 1, seen: 1 }:
 *    Jab Inngest cron job ya unread badge calculate hota hai:
 *    Message.find({ to_user_id: userId, seen: false })
 *    Is index se MongoDB ko poore messages collection scan karne ki zaroorat nahi padti,
 *    unseen messages instant count ho jate hain ($O(\log N)$).
 */
const messageSchema = new mongoose.Schema({
    from_user_id: { type: String, ref: 'User', required: true, index: true },
    to_user_id: { type: String, ref: 'User', required: true, index: true },
    text: { type: String, trim: true },
    message_type: { type: String, enum: ['text', 'image'], default: 'text' },
    media_url: { type: String, default: '' },
    seen: { type: Boolean, default: false }
}, { timestamps: true, minimize: false });

// Compound Index for 1-on-1 Chat Conversation History
messageSchema.index({ from_user_id: 1, to_user_id: 1, createdAt: 1 });
//  Compound Index for Unseen / Unread Message Queries
messageSchema.index({ to_user_id: 1, seen: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;