import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
      maxlength: [60, 'Skill name cannot exceed 60 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Programming', 'Core CS', 'Web & Systems', 'Data & AI', 'Mathematics', 'Career & Aptitude'],
      default: 'Programming',
    },
    keywords: {
      type: [String],
      default: [],
    },
    relatedSlugs: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

skillSchema.index({ category: 1, name: 1 });

export const Skill = mongoose.models.Skill || mongoose.model('Skill', skillSchema);
