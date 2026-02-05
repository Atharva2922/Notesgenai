import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
    title: string;
    content: string;
    summary: string;
    tags: string[];
    type: 'text' | 'voice' | 'link' | 'media';
    createdAt: Date;
    updatedAt: Date;
    isPinned?: boolean;
    userSlug?: string;
    userName?: string;
    userEmail?: string;
    attachments?: {
        name: string;
        type: string;
        size: number;
        data: string;
    }[];
}

const NoteSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        summary: { type: String, required: true },
        tags: { type: [String], default: [] },
        isPinned: { type: Boolean, default: false },
        type: {
            type: String,
            enum: ['text', 'voice', 'link', 'media'],
            default: 'text'
        },
        userSlug: { type: String, default: 'default-user' },
        userName: { type: String, default: 'NotesGen User' },
        userEmail: { type: String, default: 'user@example.com' },
        attachments: [
            {
                name: { type: String, required: true },
                type: { type: String, required: true },
                size: { type: Number, required: true },
                data: { type: String, required: true },
            }
        ],
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Index for efficient sorting and fetching by user
NoteSchema.index({ userSlug: 1, isPinned: -1, createdAt: -1 });

// Prevent overwriting model during hot reload
const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
