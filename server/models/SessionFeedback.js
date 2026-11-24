import mongoose from 'mongoose';

const sessionFeedbackSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HelpSession',
      required: true,
      unique: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    helpful: {
      type: Boolean,
      required: true,
      default: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    xpAwarded: {
      type: Boolean,
      default: false,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);

sessionFeedbackSchema.index({ helperId: 1, createdAt: -1 });
sessionFeedbackSchema.index({ requesterId: 1, helperId: 1, createdAt: -1 });
sessionFeedbackSchema.index({ flagged: 1, createdAt: -1 });

export const SessionFeedback =
  mongoose.models.SessionFeedback || mongoose.model('SessionFeedback', sessionFeedbackSchema);
