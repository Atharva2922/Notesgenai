import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile, upsertFacts } from '@/actions/userProfile';
import { UserFact } from '@/types';

export async function GET() {
    try {
        const profile = await getOrCreateProfile();
        return NextResponse.json({ profile });
    } catch (error) {
        console.error('[user-profile][GET]', error);
        return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const facts = Array.isArray(body?.facts) ? body.facts.filter(Boolean) as UserFact[] : [];
        const profile = await upsertFacts(facts);
        return NextResponse.json({ profile });
    } catch (error) {
        console.error('[user-profile][POST]', error);
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }
}
