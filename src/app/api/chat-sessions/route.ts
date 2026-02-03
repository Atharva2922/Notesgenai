import { NextResponse } from 'next/server';
import { createChatSession, listChatSessions } from '@/actions/chatSessions';

export async function GET() {
    try {
        const sessions = await listChatSessions();
        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('[chat-sessions][GET]', error);
        return NextResponse.json({ error: 'Failed to load chat sessions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const session = await createChatSession(body?.title);
        return NextResponse.json({ session }, { status: 201 });
    } catch (error) {
        console.error('[chat-sessions][POST]', error);
        return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
    }
}
