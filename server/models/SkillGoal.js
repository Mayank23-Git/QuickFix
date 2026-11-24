import mongoose from 'mongoose';

const roadmapTopicSchema = new mongoose.Schema(
  {
    topicId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    estimatedMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 600,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    targetPercent: {
      type: Number,
      default: 50,
      min: 1,
      max: 100,
    },
    reached: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const skillGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
      minlength: 1,
      maxlength: 80,
    },
    skillNameLower: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'General',
    },
    initialLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 1,
    },
    currentLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 1,
    },
    targetLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 4,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    goalType: {
      type: String,
      enum: ['learn', 'improve', 'master'],
      default: 'improve',
    },
    syncToProfileSkills: {
      type: Boolean,
      default: true,
    },
    roadmapTopics: {
      type: [roadmapTopicSchema],
      default: [],
    },
    recommendedNextSteps: {
      type: [String],
      default: [],
    },
    relatedTopics: {
      type: [String],
      default: [],
    },
    recommendedActivities: {
      type: [String],
      default: [],
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalMinutesLogged: {
      type: Number,
      default: 0,
      min: 0,
    },
    improvedCounted: {
      type: Boolean,
      default: false,
    },
    completedAwarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

skillGoalSchema.index({ userId: 1, skillNameLower: 1 }, { unique: true });
skillGoalSchema.index({ userId: 1, updatedAt: -1 });

export const SkillGoal =
  mongoose.models.SkillGoal || mongoose.model('SkillGoal', skillGoalSchema);
