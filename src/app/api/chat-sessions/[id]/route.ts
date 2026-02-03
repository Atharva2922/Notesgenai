import { NextRequest, NextResponse } from 'next/server';
import { deleteChatSession, updateChatSession } from '@/actions/chatSessions';

type RouteParams = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, ctx: RouteParams) {
    const { id } = await ctx.params;
    try {
        const body = await request.json().catch(() => ({}));
        const session = await updateChatSession(id, {
            title: body?.title,
            messages: body?.messages,
        });

        if (!session) {
            return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
        }

        return NextResponse.json({ session });
    } catch (error) {
        console.error(`[chat-sessions][PATCH] ${id}`, error);
        return NextResponse.json({ error: 'Failed to update chat session' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, ctx: RouteParams) {
    const { id } = await ctx.params;
    try {
        const deleted = await deleteChatSession(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`[chat-sessions][DELETE] ${id}`, error);
        return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
    }
}
