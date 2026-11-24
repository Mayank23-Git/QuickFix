import mongoose from 'mongoose';

const specialAchievementRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      required: true,
      enum: ['approved_resource', 'approved_workshop'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 15,
      maxlength: 1200,
    },
    category: {
      type: String,
      required: true,
      enum: ['Mentoring', 'DSA', 'Community', 'Learning'],
      default: 'Learning',
    },
    evidenceUrl: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    xpAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

specialAchievementRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const SpecialAchievementRequest =
  mongoose.models.SpecialAchievementRequest ||
  mongoose.model('SpecialAchievementRequest', specialAchievementRequestSchema);
