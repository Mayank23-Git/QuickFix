import mongoose from 'mongoose';

const adminConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'primary',
    },
    passcodeHash: {
      type: String,
      required: true,
      select: false,
    },
    claimedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AdminConfig =
  mongoose.models.AdminConfig || mongoose.model('AdminConfig', adminConfigSchema);
