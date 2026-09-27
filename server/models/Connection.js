import mongoose from "mongoose";

/**
 *  [Hinglish Explanation]:
 * Connection Schema:
 * [Compound Index Strategy]:
 * 1. { to_user_id: 1, status: 1 }:
 *    Jab user pending connection requests check karta hai:
 *    Connection.find({ to_user_id: userId, status: 'pending' })
 *    Is index se sirf targeted pending requests fast fetch hoti hain.
 *
 * 2. { from_user_id: 1, to_user_id: 1 } with { unique: true }:
 *    Database level par guarantee karta hai ki User A, User B ko duplicate connection request na bhej sake.
 *    Agar frontend se galti se do clicks chale jayein, to MongoDB duplicate key error throw karke data integrity protect karega.
 */
const connectionSchema = new mongoose.Schema({
    from_user_id: { type: String, ref: 'User', required: true, index: true },
    to_user_id: { type: String, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' }
}, { timestamps: true });

//  Fast Pending Requests Lookup
connectionSchema.index({ to_user_id: 1, status: 1 });
//  Unique Compound Index to prevent duplicate connection spam
connectionSchema.index({ from_user_id: 1, to_user_id: 1 }, { unique: true });

const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;