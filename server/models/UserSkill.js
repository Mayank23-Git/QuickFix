import mongoose from 'mongoose';

const userSkillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    proficiency: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
  },
  {
    timestamps: true,
  }
);

userSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });
userSkillSchema.index({ skillId: 1, proficiency: 1 });

export const UserSkill = mongoose.models.UserSkill || mongoose.model('UserSkill', userSkillSchema);
