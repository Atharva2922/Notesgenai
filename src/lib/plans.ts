export type PlanTier = "Free" | "Pro" | "Enterprise";

export interface PlanDefinition {
    id: PlanTier;
    name: string;
    badge?: string;
    price: string;
    priceSuffix: string;
    description: string;
    creditLimit: number;
    features: string[];
    highlight?: boolean;
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
    Free: {
        id: "Free",
        name: "Free",
        badge: "Starter",
        price: "$0",
        priceSuffix: "/ forever",
        description: "Kick off with essential AI note generation tooling.",
        creditLimit: 100,
        features: ["100 credits / month", "3 active collections", "Community support"],
    },
    Pro: {
        id: "Pro",
        name: "Pro",
        badge: "Popular",
        price: "$29",
        priceSuffix: "/ month",
        description: "Serious productivity for teams shipping AI-first notes.",
        creditLimit: 1500,
        features: ["1,500 credits / month", "Unlimited collections", "Priority support", "PDF + audio exports"],
        highlight: true,
    },
    Enterprise: {
        id: "Enterprise",
        name: "Enterprise",
        badge: "Custom",
        price: "Let's talk",
        priceSuffix: "",
        description: "Dedicated capacity, SLAs, and on-prem controls.",
        creditLimit: 10000,
        features: ["10,000+ credits / month", "Custom SLAs", "Workspace analytics", "Dedicated success manager"],
    },
};

export const PLAN_LIST: PlanDefinition[] = Object.values(PLAN_DEFINITIONS);

export const isPlanTier = (value: unknown): value is PlanTier =>
    typeof value === "string" && (value === "Free" || value === "Pro" || value === "Enterprise");

export const DEFAULT_PLAN_LIMITS: Record<PlanTier, number> = {
    Free: PLAN_DEFINITIONS.Free.creditLimit,
    Pro: PLAN_DEFINITIONS.Pro.creditLimit,
    Enterprise: PLAN_DEFINITIONS.Enterprise.creditLimit,
};

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
