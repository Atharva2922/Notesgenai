"use client";

import React, { useEffect, useMemo, useState } from "react";

interface PlanDraft {
    planId?: string;
    dbId?: string;
    name?: string;
    price?: string;
    priceSuffix?: string;
    currency?: string;
    amountInPaise?: number | null;
    credits?: string;
    creditLimit?: number | null;
    badge?: string;
    description?: string;
    features?: string[];
    highlight?: boolean;
}

interface CreatePlanModalProps {
    onClose: () => void;
    onSuccess: (message?: string) => void;
    mode?: "create" | "edit";
    initialPlan?: PlanDraft;
}

const defaultForm = {
    planId: "",
    name: "",
    price: "",
    priceSuffix: "/ month",
    currency: "INR",
    amount: "",
    credits: "",
    creditLimit: "",
    badge: "",
    description: "",
    features: "",
    highlight: false,
};

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ onClose, onSuccess, mode = "create", initialPlan }) => {
    const [form, setForm] = useState(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!initialPlan) {
            setForm(defaultForm);
            return;
        }
        setForm({
            planId: initialPlan.planId ?? "",
            name: initialPlan.name ?? "",
            price: initialPlan.price ?? "",
            priceSuffix: initialPlan.priceSuffix ?? "",
            currency: initialPlan.currency ?? "INR",
            amount: initialPlan.amountInPaise != null ? String(initialPlan.amountInPaise / 100) : "",
            credits: initialPlan.credits ?? "",
            creditLimit: initialPlan.creditLimit != null ? String(initialPlan.creditLimit) : "",
            badge: initialPlan.badge ?? "",
            description: initialPlan.description ?? "",
            features: Array.isArray(initialPlan.features) ? initialPlan.features.join("\n") : "",
            highlight: Boolean(initialPlan.highlight),
        });
    }, [initialPlan]);

    const actionLabel = mode === "edit" ? "Save changes" : "Create plan";
    const modalTitle = mode === "edit" ? "Edit plan" : "Create new plan";

    const numericCharge = useMemo(() => {
        const parsed = Number(form.amount);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [form.amount]);

    const handleChange = (key: keyof typeof form, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const payload: Record<string, unknown> = {
            planId: form.planId.trim() ? form.planId.trim() : undefined,
            name: form.name.trim(),
            price: form.price.trim(),
            priceSuffix: form.priceSuffix.trim(),
            currency: form.currency.trim() || "INR",
            credits: form.credits.trim(),
            badge: form.badge.trim(),
            description: form.description.trim(),
            features: form.features,
            highlight: form.highlight,
        };

        if (form.creditLimit.trim()) {
            payload.creditLimit = Number(form.creditLimit);
        }

        if (numericCharge) {
            payload.chargeAmountInInr = numericCharge;
        }

        const endpoint = "/api/admin/plans";
        const method = mode === "edit" ? "PATCH" : "POST";
        if (mode === "edit" && initialPlan?.dbId) {
            payload.id = initialPlan.dbId;
        }

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to save plan");
            }

            onSuccess(mode === "edit" ? "Plan updated." : "Plan created.");
            onClose();
        } catch (err: any) {
            console.error("Failed to save plan", err);
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-10 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#fcf8ff] via-white to-[#f1f7ff] shadow-2xl border border-white/70">
                <div className="p-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">{modalTitle}</h2>
                    <p className="text-slate-500 mb-6">{mode === "edit" ? "Update the details of this plan." : "Define a new billing tier for your users."}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    placeholder="e.g. Mega Pro"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Identifier (optional)</label>
                                <input
                                    type="text"
                                    value={form.planId}
                                    onChange={(e) => handleChange("planId", e.target.value)}
                                    placeholder="e.g. mega-pro"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Display Price</label>
                                <input
                                    type="text"
                                    value={form.price}
                                    onChange={(e) => handleChange("price", e.target.value)}
                                    placeholder="e.g. $99"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Price suffix</label>
                                <input
                                    type="text"
                                    value={form.priceSuffix}
                                    onChange={(e) => handleChange("priceSuffix", e.target.value)}
                                    placeholder="e.g. / month"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Charge currency</label>
                                <input
                                    type="text"
                                    value={form.currency}
                                    onChange={(e) => handleChange("currency", e.target.value.toUpperCase())}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Charge amount ({form.currency || "INR"})</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => handleChange("amount", e.target.value)}
                                    placeholder="e.g. 2499"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Credits description</label>
                                <input
                                    type="text"
                                    value={form.credits}
                                    onChange={(e) => handleChange("credits", e.target.value)}
                                    placeholder="e.g. 50,000 / mo"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Credit limit (numeric)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.creditLimit}
                                    onChange={(e) => handleChange("creditLimit", e.target.value)}
                                    placeholder="e.g. 50000"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Badge (optional)</label>
                                <input
                                    type="text"
                                    value={form.badge}
                                    onChange={(e) => handleChange("badge", e.target.value)}
                                    placeholder="e.g. Popular"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={form.highlight}
                                    onChange={(e) => handleChange("highlight", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300"
                                />
                                Highlight this plan
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleChange("description", e.target.value)}
                                rows={3}
                                placeholder="Explain what this plan unlocks."
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Features (one per line)</label>
                            <textarea
                                value={form.features}
                                onChange={(e) => handleChange("features", e.target.value)}
                                rows={4}
                                placeholder={`Unlimited collections\nPriority support\nExport to PDF`}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        {error && <p className="text-sm text-rose-500">{error}</p>}

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2 rounded-full text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 rounded-full text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-70"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : actionLabel}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePlanModal;
