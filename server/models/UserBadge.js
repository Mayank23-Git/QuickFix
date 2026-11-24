import mongoose from 'mongoose';

const userBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    badgeDefinitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BadgeDefinition',
      required: true,
    },
    badgeId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    achievementId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    badgeName: {
      type: String,
      required: true,
      trim: true,
    },
    badgeDescription: {
      type: String,
      required: true,
      trim: true,
    },
    achievementCriteria: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Mentoring', 'DSA', 'Community', 'Learning'],
    },
    icon: {
      type: String,
      default: 'award',
      trim: true,
    },
    xpThresholdAtIssue: {
      type: Number,
      required: true,
      min: 0,
    },
    xpAtIssue: {
      type: Number,
      required: true,
      min: 0,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: ['valid', 'revoked'],
      default: 'valid',
    },
  },
  {
    timestamps: true,
  }
);

userBadgeSchema.index({ userId: 1, badgeDefinitionId: 1 }, { unique: true });
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
userBadgeSchema.index({ userId: 1, issuedAt: -1 });

export const UserBadge =
  mongoose.models.UserBadge || mongoose.model('UserBadge', userBadgeSchema);
