import mongoose from 'mongoose';

const userXPTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ruleKey: {
      type: String,
      required: true,
      trim: true,
    },
    xpDelta: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: ['session', 'feedback', 'milestone', 'resource', 'workshop', 'admin'],
    },
    sourceId: {
      type: String,
      default: '',
      trim: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ['verified', 'flagged', 'reversed'],
      default: 'verified',
    },
    suspiciousReason: {
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

userXPTransactionSchema.index({ userId: 1, createdAt: -1 });
userXPTransactionSchema.index({ status: 1, createdAt: -1 });

export const UserXPTransaction =
  mongoose.models.UserXPTransaction ||
  mongoose.model('UserXPTransaction', userXPTransactionSchema);
