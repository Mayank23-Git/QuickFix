import mongoose from 'mongoose';

const skillProgressSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    skillGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillGoal',
      default: null,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    currentLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    targetLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    currentScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    targetScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    minutesAdded: {
      type: Number,
      default: 0,
      min: 0,
    },
    dayKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dayKey must use YYYY-MM-DD format'],
      index: true,
    },
    eventType: {
      type: String,
      enum: ['initial', 'level_update', 'topic_completed', 'activity_logged', 'mentoring_helped'],
      default: 'activity_logged',
    },
  },
  {
    timestamps: true,
  }
);

skillProgressSnapshotSchema.index({ userId: 1, createdAt: 1 });
skillProgressSnapshotSchema.index({ userId: 1, dayKey: 1 });

export const SkillProgressSnapshot =
  mongoose.models.SkillProgressSnapshot ||
  mongoose.model('SkillProgressSnapshot', skillProgressSnapshotSchema);
