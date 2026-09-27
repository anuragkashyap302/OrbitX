import mongoose from 'mongoose';

/**
 * User Schema:
 * [Compound Index Strategy]:
 * { username: 1, full_name: 1 }:
 * Discover / Search bar me user search karte waqt query chalti hai:
 * User.find({ $or: [{ username: regex }, { full_name: regex }] })
 * Ye compound index autocomplete aur profile search ko instant response time deta hai.
 */
const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  full_name: { type: String, required: true },
  username: { type: String, unique: true, index: true },
  bio: { type: String, default: 'Hey there! I am using OrbitX.' },
  profile_picture: { type: String, default: '' },
  cover_photo: { type: String, default: '' },
  location: { type: String, default: '', index: true },
  followers: [{ type: String, ref: 'User' }],
  following: [{ type: String, ref: 'User' }],
  connections: [{ type: String, ref: 'User' }],
}, { timestamps: true, minimize: false });

// 🚀 Fast User Search & Discover Index
userSchema.index({ username: 1, full_name: 1 });

const User = mongoose.model('User', userSchema);

export default User;
