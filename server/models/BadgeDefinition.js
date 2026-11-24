import mongoose from 'mongoose';

const badgeDefinitionSchema = new mongoose.Schema(
  {
    badgeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Badge ID must use lowercase letters, numbers, and hyphens'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 300,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      default: 'award',
    },
    xpThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100000,
    },
    unlockType: {
      type: String,
      enum: ['xp', 'milestone'],
      default: 'xp',
    },
    milestoneKey: {
      type: String,
      trim: true,
      default: '',
    },
    achievementCriteria: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 300,
    },
    category: {
      type: String,
      required: true,
      enum: ['Mentoring', 'DSA', 'Community', 'Learning'],
      default: 'Mentoring',
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

badgeDefinitionSchema.index({ active: 1, xpThreshold: 1 });
badgeDefinitionSchema.index({ category: 1, xpThreshold: 1 });

export const BadgeDefinition =
  mongoose.models.BadgeDefinition || mongoose.model('BadgeDefinition', badgeDefinitionSchema);
