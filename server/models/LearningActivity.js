import mongoose from 'mongoose';

const learningActivitySchema = new mongoose.Schema(
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
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      default: null,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 600,
    },
    completed: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    activityType: {
      type: String,
      enum: ['study_session', 'roadmap_topic', 'mentoring_helped', 'verified_task'],
      default: 'study_session',
    },
    dayKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dayKey must use YYYY-MM-DD format'],
      index: true,
    },
    timezone: {
      type: String,
      trim: true,
      default: 'UTC',
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: undefined,
    },
    sourceRef: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

learningActivitySchema.index({ userId: 1, dayKey: -1 });
learningActivitySchema.index({ userId: 1, createdAt: -1 });
learningActivitySchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } },
  }
);
learningActivitySchema.index(
  { userId: 1, sourceRef: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceRef: { $type: 'string', $gt: '' } },
  }
);

export const LearningActivity =
  mongoose.models.LearningActivity ||
  mongoose.model('LearningActivity', learningActivitySchema);
