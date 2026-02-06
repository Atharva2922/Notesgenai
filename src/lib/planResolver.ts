import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/db";
import PlanModel from "@/models/Plan";
import { PLAN_DEFINITIONS, PlanDefinition, parseNumericLimit } from "@/lib/plans";

const normalizePlanId = (plan: any): string => {
    return (
        plan?.planId?.trim() ||
        (typeof plan?._id?.toString === "function" ? plan._id.toString() : plan?._id) ||
        plan?.name ||
        "custom"
    );
};

export const mapDbPlanToDefinition = (plan: any): PlanDefinition => {
    const normalizedCredits = parseNumericLimit(plan?.credits);
    return {
        id: normalizePlanId(plan),
        name: plan?.name ?? plan?.planId ?? "Custom Plan",
        dbId: typeof plan?._id?.toString === "function" ? plan._id.toString() : plan?._id,
        planId: plan?.planId,
        badge: plan?.badge ?? undefined,
        price: plan?.price ?? undefined,
        priceSuffix: plan?.priceSuffix ?? "",
        description: plan?.description ?? "",
        credits: plan?.credits ?? (normalizedCredits ? `${normalizedCredits.toLocaleString()} credits` : undefined),
        creditLimit:
            typeof plan?.creditLimit === "number"
                ? plan.creditLimit
                : normalizedCredits != null
                    ? normalizedCredits
                    : undefined,
        features: Array.isArray(plan?.features) ? plan.features : [],
        highlight: Boolean(plan?.highlight),
        currency: plan?.currency ?? "INR",
        amountInPaise: typeof plan?.amountInPaise === "number" ? plan.amountInPaise : undefined,
    };
};

export const resolvePlanDefinition = async (identifier: string): Promise<PlanDefinition | null> => {
    if (!identifier || typeof identifier !== "string") {
        return null;
    }

    const builtin = PLAN_DEFINITIONS[identifier];
    if (builtin) {
        return builtin;
    }

    await connectDB();
    const orConditions: Record<string, string>[] = [{ planId: identifier }, { name: identifier }];
    if (isValidObjectId(identifier)) {
        orConditions.push({ _id: identifier });
    }

    const dbPlan = await PlanModel.findOne({ $or: orConditions }).lean();
    if (!dbPlan) {
        return null;
    }

    return mapDbPlanToDefinition(dbPlan);
};
