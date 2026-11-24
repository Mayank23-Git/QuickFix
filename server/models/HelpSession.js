import mongoose from 'mongoose';

const helpSessionSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HelpRequest',
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
    roomName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Pending Acceptance',
        'Accepted',
        'Claimed',
        'Ready to Join',
        'In Progress',
        'Completed',
        'Cancelled',
      ],
      default: 'Accepted',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    requesterJoinedAt: {
      type: Date,
      default: null,
    },
    helperJoinedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    duration: {
      type: Number,
      default: 15,
      min: 1,
      max: 60,
    },
    rewarded: {
      type: Boolean,
      default: false,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

helpSessionSchema.index({ requesterId: 1, status: 1 });
helpSessionSchema.index({ helperId: 1, status: 1 });

export const HelpSession = mongoose.models.HelpSession || mongoose.model('HelpSession', helpSessionSchema);
