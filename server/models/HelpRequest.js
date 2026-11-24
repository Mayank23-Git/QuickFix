import mongoose from 'mongoose';

const helpRequestSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [6, 'Title must be at least 6 characters'],
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [15, 'Description must be at least 15 characters'],
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: [true, 'Skill category is required'],
    },
    urgency: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    bountyPoints: {
      type: Number,
      default: 0,
      min: [0, 'Bounty points cannot be negative'],
      max: [100, 'Bounty points cannot exceed 100'],
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Open',
        'Pending Acceptance',
        'Accepted',
        'Claimed',
        'Ready to Join',
        'In Progress',
        'Resolved',
        'Cancelled',
      ],
      default: 'Open',
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

helpRequestSchema.index({ status: 1, createdAt: -1 });
helpRequestSchema.index({ skillId: 1, status: 1 });
helpRequestSchema.index({ urgency: 1, status: 1 });
helpRequestSchema.index({ authorId: 1, createdAt: -1 });

export const HelpRequest = mongoose.models.HelpRequest || mongoose.model('HelpRequest', helpRequestSchema);
