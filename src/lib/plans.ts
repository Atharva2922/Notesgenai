export type PlanTier = string;

export interface PlanDefinition {
    id: PlanTier;
    name: string;
    dbId?: string;
    planId?: string;
    badge?: string;
    price?: string;
    priceSuffix?: string;
    description?: string;
    credits?: string;
    creditLimit?: number;
    features?: string[];
    highlight?: boolean;
    currency?: string;
    amountInPaise?: number | null;
}

const builtinPlan = (
    id: PlanTier,
    name: string,
    options: Omit<PlanDefinition, "id" | "name">
): PlanDefinition => {
    const { features = [], planId, ...rest } = options;
    return {
        id,
        name,
        planId: planId ?? id,
        features,
        ...rest,
    };
};

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
    Free: builtinPlan("Free", "Free", {
        badge: "Starter",
        price: "$0",
        priceSuffix: "/ forever",
        description: "Kick off with essential AI note generation tooling.",
        credits: "100 / month",
        creditLimit: 100,
        features: ["100 credits / month", "3 active collections", "Community support"],
        currency: "INR",
        amountInPaise: 0,
    }),
    Pro: builtinPlan("Pro", "Pro", {
        badge: "Popular",
        price: "$29",
        priceSuffix: "/ month",
        description: "Serious productivity for teams shipping AI-first notes.",
        credits: "1,500 / month",
        creditLimit: 1500,
        features: ["1,500 credits / month", "Unlimited collections", "Priority support", "PDF + audio exports"],
        highlight: true,
        currency: "INR",
        amountInPaise: 29 * 100 * 100, // approx conversion
    }),
    Enterprise: builtinPlan("Enterprise", "Enterprise", {
        badge: "Custom",
        price: "Let's talk",
        description: "Dedicated capacity, SLAs, and on-prem controls.",
        credits: "10,000+ / month",
        creditLimit: 10000,
        features: ["10,000+ credits / month", "Custom SLAs", "Workspace analytics", "Dedicated success manager"],
        currency: "INR",
        amountInPaise: 0,
    }),
};

export const PLAN_LIST: PlanDefinition[] = Object.values(PLAN_DEFINITIONS);

export const DEFAULT_PLAN_LIMITS: Record<string, number> = {
    Free: PLAN_DEFINITIONS.Free.creditLimit ?? 0,
    Pro: PLAN_DEFINITIONS.Pro.creditLimit ?? 0,
    Enterprise: PLAN_DEFINITIONS.Enterprise.creditLimit ?? 0,
};

export const isPlanTier = (value: unknown): value is PlanTier => typeof value === "string" && value.trim().length > 0;

export const parseNumericLimit = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const match = value.match(/[\d,.]+/);
        if (match) {
            const cleaned = match[0].replace(/,/g, "");
            const parsed = Number(cleaned);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return null;
};

export const getPlanCreditLimit = (plan: PlanTier, freeOverride?: number | null) => {
    if (plan === "Free" && typeof freeOverride === "number" && freeOverride >= 0) {
        return Math.floor(freeOverride);
    }
    return DEFAULT_PLAN_LIMITS[plan];
};
