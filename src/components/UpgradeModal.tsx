"use client";

import React from "react";
import { PlanDefinition, PlanTier } from "@/lib/plans";

interface UpgradeModalProps {
  plans: PlanDefinition[];
  currentPlan: PlanTier | null;
  selectedPlan: PlanTier | null;
  onSelect: (plan: PlanTier) => void;
  onClose: () => void;
  onConfirm: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isSubmitting: boolean;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  plans,
  currentPlan,
  selectedPlan,
  onSelect,
  onClose,
  onConfirm,
  onRefresh,
  isLoading,
  isSubmitting,
}) => {
  const actionDisabled = !selectedPlan || isLoading || isSubmitting;
  const actionLabel = !selectedPlan
    ? "Select a plan"
    : selectedPlan === currentPlan
      ? "Refresh current plan"
      : `Switch to ${selectedPlan}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-10 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-[var(--panel-solid)] shadow-2xl border border-[var(--border-soft)]">
        <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: "radial-gradient(circle at 10% 20%, rgba(168,85,247,0.15), transparent 45%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.2), transparent 40%)" }} />

        <div className="relative flex flex-col overflow-hidden max-h-[calc(100vh-5rem)]">
          <div className="p-8 pb-6 border-b border-[var(--border-soft)] flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.3em] text-[var(--text-muted)] uppercase">Subscription</p>
                <h2 className="text-3xl font-black text-[var(--text-primary)] mt-2">Choose the right plan for your flow</h2>
                <p className="text-[var(--text-muted)] mt-3 max-w-2xl">
                  Unlock higher credit limits, faster AI generations, and premium export workflows. Switch plans anytime - we'll handle the credit resets and account status for you.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-4 py-2 rounded-full text-sm font-semibold border border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--input-bg)]"
                  disabled={isLoading}
                >
                  Refresh plans
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-sm font-semibold border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)]"
                >
                  Close
                </button>
              </div>
            </div>
            {currentPlan && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-semibold w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Current plan: {currentPlan}
              </div>
            )}
          </div>

          <div className="relative p-8 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                <div className="w-12 h-12 border-4 border-[var(--border-soft)] border-t-[var(--accent)] rounded-full animate-spin mb-4"></div>
                Loading plans...
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isCurrent = currentPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => onSelect(plan.id)}
                      disabled={isSubmitting}
                      className={`relative flex flex-col items-start gap-4 rounded-2xl border p-6 text-left transition-all ${
                        plan.highlight
                          ? "bg-gradient-to-br from-violet-600 via-indigo-500 to-blue-500 text-white border-transparent shadow-xl"
                          : "bg-[var(--input-bg)] border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                      } ${isSelected ? "ring-2 ring-offset-2 ring-[var(--accent)]" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">{plan.name}</span>
                        {plan.badge && (
                          <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full ${plan.highlight ? "bg-white/30 text-white" : "bg-[var(--accent)]/10 text-[var(--accent)]"}`}>
                            {plan.badge}
                          </span>
                        )}
                        {isCurrent && (
                          <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full ${plan.highlight ? "bg-white/20" : "bg-emerald-500/20 text-emerald-600"}`}>
                            Current
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black">{plan.price}</span>
                          <span className={`text-sm font-semibold ${plan.highlight ? "text-white/80" : "text-[var(--text-muted)]"}`}>{plan.priceSuffix}</span>
                        </div>
                        <p className={`text-sm mt-1 ${plan.highlight ? "text-white/80" : "text-[var(--text-muted)]"}`}>{plan.description}</p>
                      </div>
                      <div className={`w-full rounded-2xl border px-4 py-3 ${plan.highlight ? "border-white/30 bg-white/10 text-white" : "border-[var(--border-soft)] bg-[var(--panel-solid)]"}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1">Monthly credits</p>
                        <p className="text-xl font-black">{plan.creditLimit.toLocaleString()}</p>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${plan.highlight ? "bg-white" : "bg-[var(--accent)]"}`}></span>
                            <span className={plan.highlight ? "text-white" : "text-[var(--text-muted)]"}>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <span className={`absolute top-4 right-4 text-[10px] font-black tracking-[0.3em] uppercase ${plan.highlight ? "text-white/70" : "text-[var(--accent)]"}`}>
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
                {!plans.length && (
                  <div className="text-center text-[var(--text-muted)] col-span-full py-10">
                    No plans available. Try refreshing.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-soft)] bg-[var(--input-bg)] px-8 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text-primary)]">Need bespoke credits?</p>
              <p>Enterprise teams can contact us for tailored capacity and SLAs.</p>
            </div>
            <button
              type="button"
              className={`px-6 py-3 rounded-full text-sm font-black tracking-wide uppercase shadow-lg transition-all ${actionDisabled ? "bg-[var(--border-soft)] text-[var(--text-muted)] cursor-not-allowed" : "bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white"}`}
              onClick={onConfirm}
              disabled={actionDisabled}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></span>
                  Updating...
                </span>
              ) : (
                actionLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
