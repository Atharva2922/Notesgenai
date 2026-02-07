"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { signInWithPopup } from "firebase/auth";

import { auth, googleProvider } from "@/lib/firebaseClient";

type AuthMode = "login" | "signup";
type LoginMethod = "password" | "otp";

type Feedback = {
    type: "success" | "error" | "info";
    message: string;
};

const PANEL_METRICS = [
    { label: "Teams onboarded", value: "2.4k+" },
    { label: "Avg. response", value: "32s" },
    { label: "Weekly notes", value: "58k" },
];

const highlightGradient =
    "bg-gradient-to-r from-[#c084fc]/80 via-[#818cf8]/90 to-[#38bdf8]/90 text-transparent bg-clip-text";

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>("login");
    const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
    const [loginForm, setLoginForm] = useState({ email: "", password: "", otp: "" });
    const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [otpPending, setOtpPending] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const isLoginDisabled = useMemo(() => {
        if (!loginForm.email.trim()) return true;
        if (loginMethod === "password") {
            return !loginForm.password.trim();
        }
        return !loginForm.otp.trim();
    }, [loginForm, loginMethod]);

    const isSignupDisabled = useMemo(() => {
        return !signupForm.email.trim() || !signupForm.name.trim() || signupForm.password.length < 6;
    }, [signupForm]);

    const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLoginDisabled) return;

        setIsSubmitting(true);
        setFeedback(null);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loginForm.email.trim(),
                    method: loginMethod,
                    password: loginMethod === "password" ? loginForm.password : undefined,
                    otp: loginMethod === "otp" ? loginForm.otp : undefined,
                }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error ?? "Unable to sign in.");
            }

            setFeedback({
                type: "success",
                message: payload?.message ?? "Signed in! Redirecting…",
            });

            if (payload?.profile) {
                try {
                    localStorage.setItem("notesgenProfile", JSON.stringify(payload.profile));
                } catch {
                    // ignore storage issues
                }
            }

            setTimeout(() => {
                void router.push("/dashboard");
            }, 800);
        } catch (error) {
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Unexpected error while signing in.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSignupDisabled) return;

        setIsSubmitting(true);
        setFeedback(null);

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: signupForm.name.trim(),
                    email: signupForm.email.trim(),
                    password: signupForm.password,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error ?? "Unable to create account.");
            }

            setFeedback({
                type: "success",
                message: payload?.message ?? "Account created! You can sign in now.",
            });
            setMode("login");
        } catch (error) {
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Unexpected error while creating account.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOtpRequest = async () => {
        if (!loginForm.email.trim()) {
            setFeedback({ type: "error", message: "Enter your Gmail address first." });
            return;
        }
        setOtpPending(true);
        setFeedback(null);
        try {
            const response = await fetch("/api/auth/request-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginForm.email.trim() }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error ?? "Failed to send OTP.");
            }
            setFeedback({
                type: "info",
                message: payload?.message ?? "OTP sent to your Gmail inbox.",
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Could not send OTP.",
            });
        } finally {
            setOtpPending(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setFeedback(null);
        setIsGoogleLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error ?? "Google sign-in failed");
            }

            setFeedback({ type: "success", message: payload?.message ?? "Signed in with Google." });

            if (payload?.profile) {
                try {
                    localStorage.setItem("notesgenProfile", JSON.stringify(payload.profile));
                } catch {
                    // ignore storage errors
                }
            }

            setTimeout(() => {
                void router.push("/dashboard");
            }, 600);
        } catch (error) {
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Unable to sign in with Google right now.",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
            <div className="mx-auto flex min-h-screen max-w-7xl flex-col overflow-hidden rounded-[40px] border border-[var(--border-strong)] bg-[var(--panel-bg)] shadow-[var(--shadow-soft)] lg:flex-row">
                <aside className="relative flex flex-1 flex-col gap-10 bg-[var(--panel-solid)] px-10 py-16">
                    <div className="rounded-full border border-[var(--border-soft)] px-4 py-1 text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">
                        Welcome back
                    </div>
                    <div>
                        <p className={`text-sm font-semibold uppercase tracking-[0.5em] text-[var(--text-muted)]`}>NotesGen OS</p>
                        <h1 className="mt-5 text-5xl font-semibold leading-tight text-[var(--text-primary)]">
                            Keep your ideas flowing with{" "}
                            <span className={highlightGradient}>password, Google, or Gmail OTP</span> sign-in.
                        </h1>
                        <p className="mt-4 max-w-lg text-lg text-[var(--text-muted)]">
                            Resume where you left off, sync every note across devices, and unlock Pro automations the second
                            you sign in. New creators can join in less than a minute.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {PANEL_METRICS.map((metric) => (
                            <div key={metric.label} className="rounded-3xl border border-[var(--border-soft)] bg-[var(--input-bg)] p-4">
                                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]/70">{metric.label}</p>
                                <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{metric.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto rounded-3xl border border-[var(--border-soft)] bg-[var(--input-bg)] p-6">
                        <p className="text-sm text-[var(--text-muted)]">
                            “Passwords, OTPs, or both—we just needed something flexible for enterprise rollouts. NotesGen’s new
                            sign-in flow cut our onboarding time by 47%.”
                        </p>
                        <div className="mt-4 text-sm font-semibold text-[var(--text-primary)]">Camila Reyes · Product Ops at LinearSpace</div>
                    </div>
                </aside>

                <main className="flex flex-1 items-center justify-center bg-[var(--page-bg)] px-6 py-16 backdrop-blur">
                    <div className="w-full max-w-md rounded-[32px] border border-[var(--border-soft)] bg-[var(--panel-solid)] p-8 text-[var(--text-primary)] shadow-2xl">
                        <div className="flex rounded-full bg-[var(--input-bg)] p-1 text-sm font-semibold">
                            <button
                                className={`flex-1 rounded-full px-4 py-2 transition ${mode === "login" ? "bg-[var(--panel-solid)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"
                                    }`}
                                onClick={() => setMode("login")}
                            >
                                I have an account
                            </button>
                            <button
                                className={`flex-1 rounded-full px-4 py-2 transition ${mode === "signup" ? "bg-[var(--panel-solid)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"
                                    }`}
                                onClick={() => setMode("signup")}
                            >
                                I’m new here
                            </button>
                        </div>

                        <div className="mt-8 space-y-6">
                            {feedback && (
                                <div
                                    className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : feedback.type === "error"
                                            ? "border-rose-200 bg-rose-50 text-rose-700"
                                            : "border-indigo-200 bg-indigo-50 text-indigo-700"
                                        }`}
                                >
                                    {feedback.message}
                                </div>
                            )}

                            {mode === "login" ? (
                                <form className="space-y-5" onSubmit={handleLoginSubmit}>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-[var(--text-muted)]">Email</label>
                                        <input
                                            type="email"
                                            value={loginForm.email}
                                            onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                                            className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--accent)]/10"
                                            placeholder="you@gmail.com"
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-2 rounded-full bg-[var(--input-bg)] p-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                        <button
                                            type="button"
                                            className={`flex-1 rounded-full px-3 py-1.5 ${loginMethod === "password" ? "bg-[var(--panel-solid)] text-[var(--text-primary)] shadow" : ""
                                                }`}
                                            onClick={() => setLoginMethod("password")}
                                        >
                                            Password
                                        </button>
                                        <button
                                            type="button"
                                            className={`flex-1 rounded-full px-3 py-1.5 ${loginMethod === "otp" ? "bg-[var(--panel-solid)] text-[var(--text-primary)] shadow" : ""
                                                }`}
                                            onClick={() => setLoginMethod("otp")}
                                        >
                                            Gmail OTP
                                        </button>
                                    </div>

                                    {loginMethod === "password" ? (
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-[var(--text-muted)]">Password</label>
                                            <input
                                                type="password"
                                                value={loginForm.password}
                                                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                                                className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--accent)]/10"
                                                placeholder="••••••••"
                                                required
                                            />
                                            <div className="text-right text-xs font-semibold text-[var(--text-muted)]">
                                                <Link href="#" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
                                                    Forgot password?
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-muted)]">
                                                <span>One-time code</span>
                                                <button
                                                    type="button"
                                                    onClick={handleOtpRequest}
                                                    className="text-[var(--accent)] hover:text-[var(--accent-strong)]"
                                                    disabled={otpPending}
                                                >
                                                    {otpPending ? "Sending…" : "Send Gmail OTP"}
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={loginForm.otp}
                                                onChange={(event) => setLoginForm({ ...loginForm, otp: event.target.value })}
                                                className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] tracking-[0.6em] shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--accent)]/10"
                                                placeholder="000000"
                                                required
                                            />
                                        </div>
                                    )}

                                    <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-strong)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]" />
                                        Keep me signed in on this browser
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isLoginDisabled}
                                        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Signing in…" : loginMethod === "password" ? "Sign in securely" : "Verify OTP & sign in"}
                                    </button>

                                    <div className="relative py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                                        <span className="bg-[var(--panel-solid)] px-3">or</span>
                                        <div className="pointer-events-none absolute inset-y-1/2 left-0 right-0 border-t border-dashed border-[var(--border-soft)]" />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGoogleSignIn}
                                        disabled={isGoogleLoading}
                                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isGoogleLoading ? (
                                            "Connecting…"
                                        ) : (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 5.5c1.49 0 2.53.64 3.11 1.18l2.27-2.21C15.85 3.52 14.1 2.75 12 2.75 8.69 2.75 5.88 4.64 4.51 7.5l2.86 2.22C7.88 7.65 9.68 5.5 12 5.5Z" fill="#EA4335" />
                                                    <path d="M21.34 12.2c0-.73-.07-1.43-.2-2.1H12v3.98h5.24c-.23 1.2-.94 2.22-2 2.9l3.2 2.48c1.87-1.73 2.9-4.29 2.9-7.26Z" fill="#4285F4" />
                                                    <path d="M7.37 13.72c-.24-.7-.38-1.45-.38-2.22 0-.77.13-1.52.37-2.22L4.5 7.06C3.82 8.47 3.44 10.16 3.44 11.5s.38 3.03 1.06 4.44l2.87-2.22Z" fill="#34A853" />
                                                    <path d="M12 21.25c2.1 0 3.87-.69 5.17-1.88l-3.2-2.48c-.54.36-1.24.58-1.97.58-2.32 0-4.12-2.15-4.63-3.98l-2.87 2.22C5.88 19.36 8.69 21.25 12 21.25Z" fill="#FBBC05" />
                                                </svg>
                                                Continue with Google
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form className="space-y-5" onSubmit={handleSignupSubmit}>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-[var(--text-muted)]">Full name</label>
                                        <input
                                            type="text"
                                            value={signupForm.name}
                                            onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })}
                                            className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--accent)]/10"
                                            placeholder="Isa Reyes"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-[var(--text-muted)]">Work email</label>
                                        <input
                                            type="email"
                                            value={signupForm.email}
                                            onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
                                            className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--accent)]/10"
                                            placeholder="you@company.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-[var(--text-muted)]">Create password</label>
                                        <input
                                            type="password"
                                            value={signupForm.password}
                                            onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })}
                                            className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--accent)]/10"
                                            placeholder="Minimum 6 characters"
                                            required
                                        />
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Passwords are encrypted and you can enable OTP-only sign-in later.
                                        </p>
                                    </div>
                                    <label className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                        <input type="checkbox" required className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]" />
                                        I agree to the{" "}
                                        <Link href="#" className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                                            terms & privacy
                                        </Link>
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isSignupDisabled}
                                        className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? "Creating account…" : "Create free account"}
                                    </button>
                                </form>
                            )}

                            {mode === "login" ? (
                                <p className="text-center text-sm text-slate-500">
                                    New to NotesGen?{" "}
                                    <button className="font-semibold text-[var(--text-primary)]" onClick={() => setMode("signup")}>
                                        Create an account
                                    </button>
                                </p>
                            ) : (
                                <p className="text-center text-sm text-slate-500">
                                    Already have an account?{" "}
                                    <button className="font-semibold text-[var(--text-primary)]" onClick={() => setMode("login")}>
                                        Sign in
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
