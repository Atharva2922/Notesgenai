import { NextResponse } from "next/server";

import { PLAN_LIST } from "@/lib/plans";
import { getOrCreateProfile } from "@/actions/userProfile";

export async function GET() {
    try {
        const profile = await getOrCreateProfile();
        return NextResponse.json({ plans: PLAN_LIST, currentPlan: profile.plan });
    } catch (error) {
        console.error("[plans] GET failed", error);
        return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
    }
}
