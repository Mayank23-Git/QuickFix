import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [80, 'Full name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    college: {
      type: String,
      trim: true,
      maxlength: [120, 'College name cannot exceed 120 characters'],
      default: '',
    },
    branch: {
      type: String,
      trim: true,
      maxlength: [80, 'Branch/department cannot exceed 80 characters'],
      default: '',
    },
    academicYear: {
      type: String,
      enum: ['', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'],
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [400, 'Bio cannot exceed 400 characters'],
      default: '',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    contributionPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    achievementXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    careerGoal: {
      type: String,
      trim: true,
      maxlength: [160, 'Career goal cannot exceed 160 characters'],
      default: '',
    },
    learningInterests: {
      type: [String],
      default: [],
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: [80, 'Timezone cannot exceed 80 characters'],
      default: 'UTC',
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLearningDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLearningDayKey: {
      type: String,
      trim: true,
      default: '',
    },
    latestAiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

userSchema.index({ contributionPoints: -1, completedSessions: -1 });
userSchema.index({ achievementXp: -1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
