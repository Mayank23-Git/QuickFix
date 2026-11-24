import mongoose from 'mongoose';

const credentialVerificationSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    achievementId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userBadgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserBadge',
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientDisplayName: {
      type: String,
      required: true,
      trim: true,
    },
    badgeId: {
      type: String,
      required: true,
      trim: true,
    },
    credentialName: {
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
    issuingPlatform: {
      type: String,
      default: 'PeerUp',
      trim: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['valid', 'revoked'],
      default: 'valid',
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revocationReason: {
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

credentialVerificationSchema.index({ status: 1, issuedAt: -1 });

export const CredentialVerification =
  mongoose.models.CredentialVerification ||
  mongoose.model('CredentialVerification', credentialVerificationSchema);
