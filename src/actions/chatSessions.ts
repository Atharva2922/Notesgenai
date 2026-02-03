"use server";

import connectDB from '@/lib/db';
import ChatSessionModel, { IChatSession } from '@/models/ChatSession';
import { ChatMessage, ChatSession } from '@/types';
import { DEFAULT_CHAT_GREETING, DEFAULT_CHAT_TITLE } from '@/constants/chat';

const normalizeSession = (session: IChatSession | (Omit<IChatSession, never> & { _id: any })) : ChatSession => ({
    id: session._id.toString(),
    title: session.title,
    messages: session.messages as ChatMessage[],
    createdAt: session.createdAt instanceof Date ? session.createdAt.getTime() : session.createdAt,
    updatedAt: session.updatedAt instanceof Date ? session.updatedAt.getTime() : session.updatedAt,
    isPinned: Boolean((session as IChatSession).isPinned),
    contextPrompt: (session as IChatSession).contextPrompt ?? '',
});

export async function listChatSessions(): Promise<ChatSession[]> {
    await connectDB();
    const sessions = await ChatSessionModel.find({}).sort({ isPinned: -1, updatedAt: -1 }).lean();
    if (!sessions.length) return [];
    return sessions.map(normalizeSession);
}

export async function createChatSession(title: string = DEFAULT_CHAT_TITLE): Promise<ChatSession> {
    await connectDB();
    const session = await ChatSessionModel.create({
        title: title.trim() || DEFAULT_CHAT_TITLE,
        messages: [DEFAULT_CHAT_GREETING],
    });
    return normalizeSession(session);
}

export async function updateChatSession(sessionId: string, payload: { title?: string; messages?: ChatMessage[]; isPinned?: boolean; contextPrompt?: string }): Promise<ChatSession | null> {
    await connectDB();
    const update: Partial<IChatSession> = {};

    if (payload.title !== undefined) {
        update.title = payload.title.trim() || DEFAULT_CHAT_TITLE;
    }

    if (payload.messages !== undefined) {
        update.messages = payload.messages;
    }

    if (payload.isPinned !== undefined) {
        update.isPinned = payload.isPinned;
    }

    if (payload.contextPrompt !== undefined) {
        update.contextPrompt = payload.contextPrompt;
    }

    const updated = await ChatSessionModel.findByIdAndUpdate(
        sessionId,
        {
            $set: update,
        },
        { new: true }
    );

    if (!updated) return null;
    return normalizeSession(updated);
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
    await connectDB();
    const res = await ChatSessionModel.findByIdAndDelete(sessionId);
    return Boolean(res);
}
