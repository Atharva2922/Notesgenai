import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import UserProfileModel from "@/models/UserProfile";
import AdminSettingModel from "@/models/AdminSetting";
import { getOrCreateProfile } from "@/actions/userProfile";
import { getPlanCreditLimit, isPlanTier, parseNumericLimit, PlanTier } from "@/lib/plans";

const serializeProfile = (profile: any) => {
    const toDateString = (value?: Date | string | number) => {
        if (!value) return undefined;
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    };

    return {
        slug: profile.slug,
        name: profile.name,
        email: profile.email,
        plan: profile.plan,
        creditsTotal: profile.creditsTotal,
        creditsUsed: profile.creditsUsed,
        status: profile.status,
        joinedAt: toDateString(profile.joinedAt),
        lastActive: toDateString(profile.lastActive),
        createdAt: toDateString(profile.createdAt),
        updatedAt: toDateString(profile.updatedAt),
    };
};

const resolveCreditLimit = async (plan: PlanTier) => {
    const settings = await AdminSettingModel.findOne({}).lean();
    const freeOverride = parseNumericLimit(settings?.freeLimit);
    return getPlanCreditLimit(plan, freeOverride ?? undefined);
};

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json().catch(() => ({}));
        const desiredPlan = body?.plan;

        if (!isPlanTier(desiredPlan)) {
            return NextResponse.json({ error: "Invalid plan selection" }, { status: 400 });
        }

        const profile = await getOrCreateProfile(body?.slug);
        const creditLimit = await resolveCreditLimit(desiredPlan);

        const updatedProfile = await UserProfileModel.findOneAndUpdate(
            { slug: profile.slug },
            {
                $set: {
                    plan: desiredPlan,
                    creditsTotal: creditLimit,
                    creditsUsed: 0,
                    status: "Active",
                },
                $currentDate: { lastActive: true },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );

        return NextResponse.json({ profile: serializeProfile(updatedProfile) });
    } catch (error) {
        console.error("[subscribe] POST failed", error);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }
}
