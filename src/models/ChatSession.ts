import mongoose, { Schema, models, model } from 'mongoose';
import { ChatMessage } from '@/types';
import { DEFAULT_CHAT_GREETING, DEFAULT_CHAT_TITLE } from '@/constants/chat';

export interface IChatSession extends mongoose.Document {
    title: string;
    messages: ChatMessage[];
    isPinned: boolean;
    contextPrompt?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AttachmentSchema = new Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number },
        data: { type: String, required: true },
    },
    { _id: false }
);

const ChatMessageSchema = new Schema<ChatMessage>(
    {
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        attachments: {
            type: [AttachmentSchema],
            default: [],
        },
    },
    { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
    {
        title: {
            type: String,
            required: true,
            default: DEFAULT_CHAT_TITLE,
            trim: true,
        },
        messages: {
            type: [ChatMessageSchema],
            default: [DEFAULT_CHAT_GREETING],
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        contextPrompt: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

const ChatSessionModel = models.ChatSession || model<IChatSession>('ChatSession', ChatSessionSchema);

export default ChatSessionModel;
