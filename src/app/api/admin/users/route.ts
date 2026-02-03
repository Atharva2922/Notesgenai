import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import UserProfileModel from "@/models/UserProfile";
import AdminSettingModel from "@/models/AdminSetting";
import { getPlanCreditLimit, isPlanTier, parseNumericLimit, PlanTier } from "@/lib/plans";

const normalizePlanTier = (plan?: string): PlanTier => (plan && isPlanTier(plan) ? plan : "Free");

const resolvePlanCredits = async (plan: string | undefined) => {
    const settings = await AdminSettingModel.findOne({}).lean();
    const freeOverride = parseNumericLimit(settings?.freeLimit);
    return getPlanCreditLimit(normalizePlanTier(plan), freeOverride ?? undefined);
};

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

export async function GET() {
    try {
        await connectDB();
        const profiles = await UserProfileModel.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json(profiles.map(serializeProfile));
    } catch (error) {
        console.error("[admin/users] GET failed", error);
        return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { slug, action } = body;

        if (!slug) {
            return NextResponse.json({ error: "Missing slug" }, { status: 400 });
        }

        const existingProfile = await UserProfileModel.findOne({ slug });
        if (!existingProfile) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const update: Record<string, any> = {};
        switch (action) {
            case "block":
                update.status = "Blocked";
                break;
            case "unblock":
                update.status = "Active";
                break;
            case "resetCredits":
                update.creditsUsed = 0;
                update.creditsTotal = await resolvePlanCredits(existingProfile.plan);
                break;
            case "updatePlan":
                if (!body.plan) {
                    return NextResponse.json({ error: "Missing plan" }, { status: 400 });
                }
                update.plan = body.plan;
                break;
            case "setCreditLimit": {
                const rawLimit = body.creditsTotal;
                const parsedLimit =
                    typeof rawLimit === "number"
                        ? rawLimit
                        : typeof rawLimit === "string"
                            ? Number(rawLimit)
                            : NaN;
                if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
                    return NextResponse.json({ error: "Invalid credit limit" }, { status: 400 });
                }
                update.creditsTotal = Math.floor(parsedLimit);
                break;
            }
            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }

        const updatedProfile = await UserProfileModel.findOneAndUpdate(
            { slug },
            { $set: update, $currentDate: { lastActive: true } },
            { new: true }
        );

        return NextResponse.json(serializeProfile(updatedProfile));
    } catch (error) {
        console.error("[admin/users] PATCH failed", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
