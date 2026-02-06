import { NextResponse } from "next/server";

import { getOrCreateProfile } from "@/actions/userProfile";
import connectDB from "@/lib/db";
import PlanModel from "@/models/Plan";
import { PLAN_LIST, PlanDefinition } from "@/lib/plans";
import { parseNumericLimit } from "@/lib/plans";

const mapPlanDocument = (plan: any): PlanDefinition => {
    const fallbackCredits = parseNumericLimit(plan?.credits) ?? 0;
    return {
        id: plan.planId ?? plan.name ?? "custom",
        planId: plan.planId ?? undefined,
        name: plan.name ?? "Custom Plan",
        dbId: plan._id?.toString?.() ?? plan._id,
        badge: plan.badge ?? undefined,
        price: plan.price ?? "—",
        priceSuffix: plan.priceSuffix ?? "",
        description: plan.description ?? "",
        credits: plan.credits ?? (fallbackCredits ? `${fallbackCredits.toLocaleString()} credits` : undefined),
        creditLimit: typeof plan.creditLimit === "number" ? plan.creditLimit : fallbackCredits,
        features: Array.isArray(plan.features) ? plan.features : [],
        highlight: Boolean(plan.highlight),
        currency: plan.currency ?? "INR",
        amountInPaise: typeof plan.amountInPaise === "number" ? plan.amountInPaise : undefined,
    };
};

export async function GET() {
    try {
        const [profile, dbPlans] = await Promise.all([
            getOrCreateProfile(),
            (async () => {
                await connectDB();
                return PlanModel.find({}).sort({ createdAt: 1 }).lean();
            })(),
        ]);

        const plans: PlanDefinition[] = dbPlans.length ? dbPlans.map(mapPlanDocument) : PLAN_LIST;

        return NextResponse.json({
            plans,
            currentPlan: profile.plan,
            currentPlanId: profile.planId ?? null,
        });
    } catch (error) {
        console.error("[plans] GET failed", error);
        return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
    }
}
