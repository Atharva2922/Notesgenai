import mongoose, { Schema, model, models } from "mongoose";

export interface IOtpToken extends mongoose.Document {
    email: string;
    code: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const OtpTokenSchema = new Schema<IOtpToken>(
    {
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        code: { type: String, required: true },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    { timestamps: true },
);

OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpTokenSchema.index({ email: 1 }, { unique: true });

const OtpToken = models.OtpToken || model<IOtpToken>("OtpToken", OtpTokenSchema);

export default OtpToken;
