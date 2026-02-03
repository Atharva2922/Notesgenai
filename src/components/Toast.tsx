"use client";

export type ToastAction = {
    label: string;
    onClick: () => void | Promise<void>;
};

export type ToastProps = {
    message: string;
    type?: "info" | "error" | "success";
    actions?: ToastAction[];
    onDismiss: () => void;
};

const typeStyles: Record<string, string> = {
    error: "bg-rose-600 border-rose-500",
    success: "bg-emerald-600 border-emerald-500",
    info: "bg-slate-900 border-slate-800",
};

export default function Toast({ message, type = "info", actions = [], onDismiss }: ToastProps) {
    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
            <div
                className={`rounded-2xl shadow-xl border px-5 py-4 text-sm font-semibold text-white flex flex-col gap-3 ${
                    typeStyles[type] ?? typeStyles.info
                }`}
            >
                <div className="flex items-start justify-between gap-4">
                    <p className="flex-1 leading-relaxed text-white/90">{message}</p>
                    <button
                        onClick={onDismiss}
                        className="text-white/80 hover:text-white focus:outline-none"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                {actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {actions.map((action) => (
                            <button
                                key={action.label}
                                onClick={action.onClick}
                                className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white/90 hover:bg-white/10"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
