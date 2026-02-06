import { parseNumericLimit } from "@/lib/plans";
import type { IPlan } from "@/models/Plan";

export const parseFeaturesInput = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
            .filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n|,/)
            .map((line) => line.trim())
            .filter(Boolean);
    }

    return [];
};

export const normalizePlanPayload = (body: any) => {
    const payload: Record<string, any> = {};

    if (typeof body?.name === "string" && body.name.trim()) {
        payload.name = body.name.trim();
    }

    if (typeof body?.price === "string" && body.price.trim()) {
        payload.price = body.price.trim();
    }

    if (typeof body?.priceSuffix === "string") {
        payload.priceSuffix = body.priceSuffix.trim();
    }

    if (typeof body?.credits === "string" && body.credits.trim()) {
        payload.credits = body.credits.trim();
    }

    const creditLimitCandidate =
        typeof body?.creditLimit === "number"
            ? body.creditLimit
            : parseNumericLimit(body?.creditLimit);
    if (typeof creditLimitCandidate === "number" && Number.isFinite(creditLimitCandidate)) {
        payload.creditLimit = Math.max(0, Math.floor(creditLimitCandidate));
    }

    if (typeof body?.badge === "string") {
        payload.badge = body.badge.trim();
    }

    if (typeof body?.description === "string") {
        payload.description = body.description.trim();
    }

    const features = parseFeaturesInput(body?.features);
    if (features.length) {
        payload.features = features;
    } else if (Array.isArray(body?.features) && !features.length) {
        payload.features = [];
    }

    if (typeof body?.highlight === "boolean") {
        payload.highlight = body.highlight;
    }

    if (typeof body?.currency === "string" && body.currency.trim()) {
        payload.currency = body.currency.trim().toUpperCase();
    }

    const rawAmount =
        typeof body?.amountInPaise === "number"
            ? body.amountInPaise
            : typeof body?.amountInPaise === "string"
                ? Number(body.amountInPaise)
                : undefined;
    if (typeof rawAmount === "number" && Number.isFinite(rawAmount)) {
        payload.amountInPaise = Math.max(0, Math.round(rawAmount));
    }

    const chargeInInr =
        typeof body?.chargeAmountInInr === "number"
            ? body.chargeAmountInInr
            : typeof body?.chargeAmountInInr === "string"
                ? Number(body.chargeAmountInInr)
                : undefined;
    if (typeof chargeInInr === "number" && Number.isFinite(chargeInInr)) {
        payload.amountInPaise = Math.max(0, Math.round(chargeInInr * 100));
    }

    if (typeof body?.planId === "string" && body.planId.trim()) {
        payload.planId = body.planId.trim();
    }

    return payload;
};

export const formatCurrency = (amount?: number | null, currency?: string | null) => {
    if (typeof amount !== "number" || Number.isNaN(amount)) {
        return "—";
    }
    const upperCurrency = currency?.toUpperCase() ?? "INR";
    const symbol = upperCurrency === "INR" ? "₹" : upperCurrency === "USD" ? "$" : `${upperCurrency} `;
    const normalized = amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${symbol}${normalized}`;
};

export const serializePlan = (
    plan: Partial<IPlan> & { _id?: string | { toString: () => string } },
    options: { activeUsers?: Record<string, number> } = {}
) => {
    const { activeUsers = {} } = options;
    const key = plan.name ?? plan.planId ?? "";
    return {
        dbId: typeof plan._id === "object" && plan._id ? plan._id.toString() : (plan._id as string) ?? undefined,
        planId: plan.planId,
        name: plan.name,
        price: plan.price,
        priceSuffix: plan.priceSuffix ?? "",
        credits: plan.credits,
        creditLimit: plan.creditLimit ?? null,
        badge: plan.badge ?? "",
        description: plan.description ?? "",
        features: Array.isArray(plan.features) ? plan.features : [],
        highlight: Boolean(plan.highlight),
        currency: plan.currency ?? "INR",
        amountInPaise: plan.amountInPaise ?? null,
        activeUsers: activeUsers[key] ?? 0,
    };
};
