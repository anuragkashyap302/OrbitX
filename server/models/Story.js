import mongoose from "mongoose";

/**
 * Story Schema:
 * [Compound Index Strategy]:
 * { user: 1, createdAt: -1 }:
 * User aur uske connections ke recent 24-hr stories fetch karne ke liye.
 * Query: Story.find({ user: { $in: userIds } }).sort({ createdAt: -1 })
 * Index query execution time ko 100x optimize karta hai.
 */
const storySchema = new mongoose.Schema({
    user: { type: String, ref: 'User', required: true, index: true },
    content: { type: String },
    media_url: [{ type: String }],
    media_type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    views_count: [{ type: String, ref: 'User' }],
    background_color: { type: String, default: '#4F46E5' }
}, { timestamps: true, minimize: false });

//  Compound Index for User Story Timelines
storySchema.index({ user: 1, createdAt: -1 });

const Story = mongoose.model('Story', storySchema);

export default Story;