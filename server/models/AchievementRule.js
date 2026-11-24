import mongoose from 'mongoose';

const achievementRuleSchema = new mongoose.Schema(
  {
    ruleKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    xpAmount: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
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
  },
  {
    timestamps: true,
  }
);

achievementRuleSchema.index({ active: 1, category: 1 });

export const AchievementRule =
  mongoose.models.AchievementRule || mongoose.model('AchievementRule', achievementRuleSchema);
