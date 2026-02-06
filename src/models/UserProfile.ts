import mongoose, { Schema, model, models } from 'mongoose';

export type UserPlan = string;
export type UserStatus = 'Active' | 'Blocked';

export interface IUserFact {
    key: string;
    value: string;
    source?: string;
    updatedAt?: Date;
}

export interface IUserProfile extends mongoose.Document {
    slug: string;
    name: string;
    email: string;
    plan: UserPlan;
    planId?: string;
    creditsTotal: number;
    creditsUsed: number;
    status: UserStatus;
    password?: string;
    joinedAt: Date;
    lastActive: Date;
    facts: IUserFact[];
    createdAt: Date;
    updatedAt: Date;
}

const UserFactSchema = new Schema<IUserFact>(
    {
        key: { type: String, required: true },
        value: { type: String, required: true },
        source: { type: String },
    },
    { timestamps: { createdAt: false, updatedAt: true }, _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
    {
        slug: { type: String, required: true, unique: true },
        name: { type: String, default: 'NotesGen User' },
        email: { type: String, default: 'user@example.com' },
        plan: { type: String, default: 'Free' },
        planId: { type: String }, // Added planId string field
        creditsTotal: { type: Number, default: 100 },
        creditsUsed: { type: Number, default: 0 },
        status: { type: String, enum: ['Active', 'Blocked'], default: 'Active' },
        password: { type: String, select: false }, // Don't return password by default
        joinedAt: { type: Date, default: () => new Date() },
        lastActive: { type: Date, default: () => new Date() },
        facts: { type: [UserFactSchema], default: [] },
    },
    { timestamps: true }
);

const UserProfileModel = models.UserProfile || model<IUserProfile>('UserProfile', UserProfileSchema);

export default UserProfileModel;
