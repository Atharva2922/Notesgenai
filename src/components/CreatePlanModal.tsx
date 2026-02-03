"use client";

import React, { useState } from "react";

interface CreatePlanModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ onClose, onSuccess }) => {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [credits, setCredits] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/admin/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, price, credits }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to create plan");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Failed to create plan", err);
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-10 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#fcf8ff] via-white to-[#f1f7ff] shadow-2xl border border-white/70">
                <div className="p-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Create New Plan</h2>
                    <p className="text-slate-500 mb-6">Define a new billing tier for your users.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Mega Pro"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Price</label>
                            <input
                                type="text"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="e.g. $99"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Credits / Month</label>
                            <input
                                type="text"
                                value={credits}
                                onChange={(e) => setCredits(e.target.value)}
                                placeholder="e.g. 50,000 / mo"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                required
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
                                {isSubmitting ? "Creating..." : "Create Plan"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePlanModal;
