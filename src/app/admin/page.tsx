"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Toast, { ToastAction } from "@/components/Toast";
import useSWR from "swr";
import AdminNavbar from "@/components/AdminNavbar";
import AdminSidebar from "@/components/AdminSidebar";
import CreatePlanModal from "@/components/CreatePlanModal";

type ModerationItem = {
    id: string;
    author: string;
    region: string;
    category: string;
    flag: string;
    submittedAt: string;
};

type ControlToggle = {
    id: string;
    label: string;
    description: string;
};

type AdminSection = {
    id: string;
    label: string;
    summary: string;
};

type StatCard = {
    label: string;
    value: string;
    delta: string;
};

type ChartPoint = {
    label: string;
    value: number;
};

type UserRow = {
    slug: string;
    name: string;
    email: string;
    plan: "Free" | "Pro" | "Enterprise";
    creditsLeft: number;
    creditsTotal: number;
    creditsUsed: number;
    joined?: string;
    lastActive?: string;
    status: "Active" | "Blocked";
};

type FileAttachment = {
    name: string;
    type: string;
    size: number;
    data: string;
};

type FileRow = {
    id: string;
    fileName: string;
    user: string;
    userEmail: string;
    userSlug: string;
    type: string;
    uploaded: string;
    status: "Processed" | "Failed";
    summary: string;
    content: string;
    tags: string[];
    attachments: FileAttachment[];
};

type UsageRow = {
    user: string;
    uploads: number;
    used: number;
    remaining: number;
};

type PlanRow = {
    name: string;
    price: string;
    credits: string;
    activeUsers: number;
};

type PaymentRow = {
    user: string;
    plan: string;
    amount: string;
    status: "Paid" | "Pending" | "Failed";
    date: string;
};

type ErrorLog = {
    time: string;
    user: string;
    type: string;
    message: string;
};

type AbuseAlert = {
    label: string;
    detail: string;
    severity: "warning" | "critical";
};

const ADMIN_SECTIONS: AdminSection[] = [
    { id: "dashboard", label: "Dashboard", summary: "Monitor live signals, launches, and moderation load in one view." },
    { id: "users", label: "Users", summary: "Manage curator access, assign moderators, and audit invites." },
    { id: "notes", label: "Notes / Files", summary: "Track generated notes, file uploads, and attachment policies." },
    { id: "usage", label: "Usage & Credits", summary: "Review token consumption, proxy quotas, and boost budgets." },
    { id: "plans", label: "Plans & Payments", summary: "Configure billing tiers, AI seat pricing, and experimental grants." },
    { id: "reports", label: "Reports", summary: "Export performance packets for weekly leadership briefings." },
    { id: "settings", label: "Settings", summary: "Tune security, integrations, compliance, and automation hooks." },
];

const MODERATION_QUEUE: ModerationItem[] = [
    { id: "note-4821", author: "Aditi Rao", region: "APAC / India", category: "Politics", flag: "Keyword spike", submittedAt: "08:45" },
    { id: "note-4817", author: "Diego Morales", region: "Americas / Mexico", category: "Economy", flag: "Source mismatch", submittedAt: "08:22" },
    { id: "note-4809", author: "Lena Fischer", region: "Europe / Germany", category: "Technology", flag: "Image review", submittedAt: "07:58" },
];

const CONTROL_TOGGLES: ControlToggle[] = [
    { id: "lokmat_bias", label: "Boost Lokmat sources", description: "Prioritize Lokmat.com when Pune metros are selected." },
    { id: "hn_fallback", label: "Hacker News fallback", description: "Keep Algolia AI feed in rotation if Google throttles." },
    { id: "fact_check", label: "Require fact-check", description: "Hold publication until a fact-check comment lands." },
];

const SIGNALS = [
    { label: "Active curators", value: "92", delta: "+8 this week" },
    { label: "Flagged notes", value: "14", delta: "−5 vs avg" },
    { label: "Experiments", value: "6", delta: "2 launching today" },
];

const COHORTS = [
    { label: "Policy", completion: 82 },
    { label: "Education", completion: 65 },
    { label: "Cities", completion: 54 },
    { label: "Labs", completion: 41 },
];

const DASHBOARD_STATS: StatCard[] = [
    { label: "Total users", value: "12,418", delta: "+312 vs last week" },
    { label: "Active users (7d)", value: "3,905", delta: "+4.6% change" },
    { label: "Notes generated", value: "48,920", delta: "+1,208 today" },
    { label: "Files uploaded", value: "8,134", delta: "+396 this week" },
];

const NEW_USERS_SERIES: ChartPoint[] = [
    { label: "Mon", value: 120 },
    { label: "Tue", value: 150 },
    { label: "Wed", value: 180 },
    { label: "Thu", value: 200 },
    { label: "Fri", value: 170 },
    { label: "Sat", value: 140 },
    { label: "Sun", value: 160 },
];

const NOTES_SERIES: ChartPoint[] = [
    { label: "Mon", value: 820 },
    { label: "Tue", value: 940 },
    { label: "Wed", value: 1010 },
    { label: "Thu", value: 970 },
    { label: "Fri", value: 1100 },
    { label: "Sat", value: 760 },
    { label: "Sun", value: 880 },
];

const SYSTEM_HEALTH = [
    { label: "AI usage today", value: "18,420 requests", trend: "+6.2%" },
    { label: "Storage used", value: "312 GB / 1 TB", trend: "31% capacity" },
    { label: "Failed jobs", value: "7 errors", trend: "2 retried" },
];

const toDisplayDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function AdminPage() {
    const [activeSection, setActiveSection] = useState<string>("dashboard");
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);
    const [controlStates, setControlStates] = useState<Record<string, boolean>>({
        lokmat_bias: true,
        hn_fallback: true,
        fact_check: false,
    });
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

    const moderationLoad = useMemo(
        () => ({ total: MODERATION_QUEUE.length, urgent: MODERATION_QUEUE.filter((item) => item.flag !== "Image review").length }),
        [],
    );

    const toggleControl = (id: string) => {
        setControlStates((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };



    const fetcher = (url: string) => fetch(url).then((res) => res.json());

    // SWR Hook for Users
    const {
        data: usersData,
        error: usersErrorRaw,
        isLoading: usersLoading,
        mutate: mutateUsers,
    } = useSWR("/api/admin/users", fetcher, { refreshInterval: 2000 });

    const users: UserRow[] = useMemo(() => {
        return (usersData ?? []).map((user: any) => ({
            slug: user.slug,
            name: user.name ?? "Unnamed User",
            email: user.email ?? "unknown@example.com",
            plan: user.plan ?? "Free",
            creditsTotal: user.creditsTotal ?? 0,
            creditsUsed: user.creditsUsed ?? 0,
            creditsLeft: Math.max(0, (user.creditsTotal ?? 0) - (user.creditsUsed ?? 0)),
            joined: user.joinedAt,
            lastActive: user.lastActive,
            status: user.status ?? "Active",
        }));
    }, [usersData]);

    const usersError = usersErrorRaw ? "Unable to load users right now." : null;
    const refreshUsers = useCallback(() => mutateUsers(), [mutateUsers]);

    // SWR Hook for Notes
    const {
        data: notesData,
        error: notesErrorRaw,
        isLoading: notesLoading,
        mutate: mutateNotes,
    } = useSWR("/api/admin/notes", fetcher, { refreshInterval: 2000 });

    const notes: FileRow[] = useMemo(() => {
        return (notesData ?? []).map((item: any) => ({
            id: item.id,
            fileName: item.title ?? "Generated note",
            user: item.user ?? "NotesGen User",
            userEmail: item.userEmail ?? "user@example.com",
            userSlug: item.userSlug ?? "default-user",
            type: item.type ?? "text",
            uploaded: item.uploadedAt,
            status: item.status ?? "Processed",
            summary: item.summary ?? "",
            content: item.content ?? "",
            tags: Array.isArray(item.tags) ? item.tags : [],
            attachments: Array.isArray(item.attachments) ? item.attachments : [],
        }));
    }, [notesData]);

    const notesError = notesErrorRaw ? "Unable to load notes right now." : null;
    const refreshNotes = useCallback(() => mutateNotes(), [mutateNotes]);



    // SWR Hook for Usage
    const {
        data: usageData,
        error: usageErrorRaw,
        isLoading: usageLoading,
        mutate: mutateUsage,
    } = useSWR("/api/admin/usage", fetcher, { refreshInterval: 2000 });

    const usageMetrics = useMemo(() => ({
        today: usageData?.metrics?.today ?? 0,
        month: usageData?.metrics?.month ?? 0,
        average: usageData?.metrics?.average ?? 0,
    }), [usageData]);

    const usageRows: UsageRow[] = useMemo(() => usageData?.perUser ?? [], [usageData]);
    const usageError = usageErrorRaw ? "Unable to load usage metrics." : null;
    const refreshUsage = useCallback(() => mutateUsage(), [mutateUsage]);

    // SWR Hook for Plans
    const {
        data: plansData,
        error: planErrorRaw,
        isLoading: planLoading,
        mutate: mutatePlans,
    } = useSWR("/api/admin/plans", fetcher, { refreshInterval: 2000 });

    const planRows: PlanRow[] = useMemo(() => plansData?.plans ?? [], [plansData]);
    const paymentRows: PaymentRow[] = useMemo(() => plansData?.payments ?? [], [plansData]);
    const planError = planErrorRaw ? "Unable to load plans right now." : null;
    const refreshPlans = useCallback(() => mutatePlans(), [mutatePlans]);

    // SWR Hook for Reports
    const {
        data: reportsData,
        error: reportsErrorRaw,
        isLoading: reportsLoading,
        mutate: mutateReports,
    } = useSWR("/api/admin/reports", fetcher, { refreshInterval: 2000 });

    const errorLogs: ErrorLog[] = useMemo(() => reportsData?.errorLogs ?? [], [reportsData]);
    const abuseAlerts: AbuseAlert[] = useMemo(() => reportsData?.abuseAlerts ?? [], [reportsData]);
    const reportsError = reportsErrorRaw ? "Unable to load reports right now." : null;
    const refreshReports = useCallback(() => mutateReports(), [mutateReports]);

    // SWR Hook for Settings
    const {
        data: settingsData,
        error: settingsErrorRaw,
        isLoading: settingsLoading,
        mutate: mutateSettings,
    } = useSWR("/api/admin/settings", fetcher, { refreshInterval: 2000 });

    // Local state for settings form to allow editing without jitter from revalidations
    const [localSettings, setLocalSettings] = useState({
        appName: "",
        logo: "",
        maxPdf: "",
        freeLimit: "",
        maxTokens: "",
        modelName: "",
        costCap: "",
    });

    // Sync local settings with server data only when not editing or first load
    // Simple approach: Update local if server data changes and we aren't saving
    useEffect(() => {
        if (settingsData) {
            setLocalSettings({
                appName: settingsData.appName ?? "",
                logo: settingsData.logo ?? "",
                maxPdf: settingsData.maxPdf ?? "",
                freeLimit: settingsData.freeLimit ?? "",
                maxTokens: settingsData.maxTokens ?? "",
                modelName: settingsData.modelName ?? "",
                costCap: settingsData.costCap ?? "",
            });
        }
    }, [settingsData]);

    // Use localSettings for the UI
    const settings = localSettings;
    const setSettings = setLocalSettings; // Map generic setter to local one

    const [saveSettingsError, setSettingsError] = useState<string | null>(null);
    const settingsError = saveSettingsError || (settingsErrorRaw ? "Unable to load settings right now." : null);
    const refreshSettings = useCallback(() => mutateSettings(), [mutateSettings]);
    const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
    const [toastState, setToastState] = useState<{ message: string; type: "info" | "error" | "success"; actions?: ToastAction[] } | null>(null);
    const creditInputRef = useRef<HTMLInputElement | null>(null);
    const [previewNote, setPreviewNote] = useState<FileRow | null>(null);
    const [reprocessInFlight, setReprocessInFlight] = useState<string | null>(null);
    const [downloadInFlight, setDownloadInFlight] = useState<string | null>(null);
    const [activeNotesUser, setActiveNotesUser] = useState<string | null>(null);
    const [noteSelectionMode, setNoteSelectionMode] = useState<boolean>(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
    const [isBulkActionRunning, setIsBulkActionRunning] = useState<boolean>(false);
    const [creditEditSlug, setCreditEditSlug] = useState<string | null>(null);
    const [creditLimitInput, setCreditLimitInput] = useState<string>("");
    const [creditSaving, setCreditSaving] = useState<boolean>(false);

    const notesByUser = useMemo(() => {
        const map = new Map<string, { user: string; email: string; notes: FileRow[] }>();
        notes.forEach((note) => {
            const slug = note.userSlug ?? note.user ?? note.userEmail ?? note.id;
            if (!map.has(slug)) {
                map.set(slug, {
                    user: note.user ?? "NotesGen User",
                    email: note.userEmail ?? "user@example.com",
                    notes: [],
                });
            }
            map.get(slug)!.notes.push(note);
        });
        return map;
    }, [notes]);

    const groupedNoteUsers = useMemo(() => {
        return Array.from(notesByUser.entries()).sort((a, b) => a[1].user.localeCompare(b[1].user));
    }, [notesByUser]);

    const activeUserNotes = useMemo(() => {
        if (!activeNotesUser) return [];
        return notesByUser.get(activeNotesUser)?.notes ?? [];
    }, [activeNotesUser, notesByUser]);

    const selectedNoteCount = selectedNoteIds.size;

    const active = ADMIN_SECTIONS.find((section) => section.id === activeSection) ?? ADMIN_SECTIONS[0];

    const showToast = useCallback((message: string, type: "info" | "error" | "success" = "info", actions: ToastAction[] = []) => {
        setToastState({ message, type, actions });
    }, []);

    const dismissToast = useCallback(() => setToastState(null), []);

    const formatDate = useCallback((value?: string) => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }, []);

    const handleUserAction = useCallback(
        async (slug: string, action: "block" | "unblock" | "resetCredits") => {
            try {
                const res = await fetch("/api/admin/users", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ slug, action }),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                showToast(
                    `User ${action === "resetCredits" ? "credits reset" : action === "block" ? "blocked" : "unblocked"}.`,
                    "success",
                );
                void refreshUsers();
            } catch (error) {
                console.error("Failed to update user", error);
                showToast("Failed to update user.", "error");
            }
        },
        [refreshUsers, showToast],
    );

    const handleNoteDelete = useCallback(
        (id: string) => {
            showToast("Delete this note?", "info", [
                {
                    label: "Cancel",
                    onClick: dismissToast,
                },
                {
                    label: "Delete",
                    onClick: async () => {
                        dismissToast();
                        try {
                            const res = await fetch(`/api/admin/notes?id=${id}`, { method: "DELETE" });
                            if (!res.ok) {
                                throw new Error(await res.text());
                            }
                            showToast("Note deleted.", "success");
                            void refreshNotes();
                        } catch (error) {
                            console.error("Failed to delete note", error);
                            showToast("Failed to delete note.", "error");
                        }
                    },
                },
            ]);
        },
        [dismissToast, refreshNotes, showToast],
    );

    const startCreditEdit = useCallback((user: UserRow) => {
        setCreditEditSlug(user.slug);
        setCreditLimitInput(String(user.creditsLeft));
    }, []);

    const cancelCreditEdit = useCallback(() => {
        setCreditEditSlug(null);
        setCreditLimitInput("");
    }, []);

    const handleCreditLimitSave = useCallback(
        async (user: UserRow) => {
            const parsed = Number(creditLimitInput);
            if (!Number.isFinite(parsed) || parsed < 0) {
                showToast("Enter a valid non-negative credit amount.", "error");
                return;
            }
            setCreditSaving(true);
            try {
                const desiredRemaining = Math.floor(parsed);
                const nextTotal = desiredRemaining + (user.creditsUsed ?? 0);
                const res = await fetch("/api/admin/users", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ slug: user.slug, action: "setCreditLimit", creditsTotal: nextTotal }),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                showToast("Credits updated.", "success");
                setCreditEditSlug(null);
                setCreditLimitInput("");
                void refreshUsers();
            } catch (error) {
                console.error("Failed to update credit limit", error);
                showToast("Failed to update credits.", "error");
            } finally {
                setCreditSaving(false);
            }
        },
        [creditLimitInput, refreshUsers, showToast],
    );

    const handleSettingsChange = useCallback((field: string, value: string) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
        setSettingsSuccess(null);
    }, []);

    const handleSettingsSave = useCallback(async () => {
        setSettingsSaving(true);
        setSettingsError(null);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!res.ok) {
                throw new Error(await res.text());
            }
            setSettingsSuccess("Settings saved.");
            showToast("Settings saved.", "success");
        } catch (error) {
            console.error("Failed to save settings", error);
            setSettingsError("Failed to save settings.");
            showToast("Failed to save settings.", "error");
        } finally {
            setSettingsSaving(false);
        }
    }, [settings, showToast]);

    const handleViewNote = useCallback((file: FileRow) => {
        setPreviewNote(file);
    }, []);

    const handleClosePreview = useCallback(() => setPreviewNote(null), []);

    const handleReprocessNote = useCallback(
        async (file: FileRow) => {
            setReprocessInFlight(file.id);
            try {
                const res = await fetch("/api/admin/notes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: file.id, action: "reprocess" }),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                showToast("Note reprocessed.", "success");
                void refreshNotes();
            } catch (error) {
                console.error("Failed to reprocess note", error);
                showToast("Failed to reprocess note.", "error");
            } finally {
                setReprocessInFlight(null);
            }
        },
        [refreshNotes, showToast],
    );

    const handleDownloadNote = useCallback(
        async (file: FileRow) => {
            setDownloadInFlight(file.id);
            try {
                const payload = {
                    title: file.fileName,
                    summary: file.summary,
                    content: file.content,
                    tags: file.tags,
                    user: file.user,
                    userEmail: file.userEmail,
                    uploadedAt: file.uploaded,
                    type: file.type,
                    attachments: file.attachments,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: "application/json;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${file.fileName.replace(/\s+/g, "_") || "note"}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showToast("Note downloaded.", "success");
            } catch (error) {
                console.error("Failed to download note", error);
                showToast("Failed to download note.", "error");
            } finally {
                setDownloadInFlight(null);
            }
        },
        [showToast],
    );

    const handleCopyPreview = useCallback(async () => {
        if (!previewNote) return;
        const text = `Title: ${previewNote.fileName}\nSummary: ${previewNote.summary}\n\n${previewNote.content}`;
        try {
            await navigator.clipboard.writeText(text);
            showToast("Note content copied.", "success");
        } catch (error) {
            console.error("Failed to copy preview content", error);
            showToast("Clipboard copy failed.", "error");
        }
    }, [previewNote, showToast]);

    const toggleNoteSelection = useCallback(
        (noteId: string) => {
            setSelectedNoteIds((prev) => {
                const next = new Set(prev);
                if (next.has(noteId)) {
                    next.delete(noteId);
                } else {
                    next.add(noteId);
                }
                return next;
            });
        },
        [],
    );

    const exitSelectionMode = useCallback(() => {
        setNoteSelectionMode(false);
        setSelectedNoteIds(new Set());
    }, []);

    const handleBulkDelete = useCallback(async () => {
        if (!selectedNoteIds.size) return;
        setIsBulkActionRunning(true);
        try {
            await Promise.all(
                Array.from(selectedNoteIds).map((id) =>
                    fetch(`/api/admin/notes?id=${id}`, { method: "DELETE" }).then((res) => {
                        if (!res.ok) {
                            return res.text().then((text) => {
                                throw new Error(text);
                            });
                        }
                    }),
                ),
            );
            showToast(`Deleted ${selectedNoteIds.size} note(s).`, "success");
            exitSelectionMode();
            void refreshNotes();
        } catch (error) {
            console.error("Bulk delete failed", error);
            showToast("Failed to delete selected notes.", "error");
        } finally {
            setIsBulkActionRunning(false);
        }
    }, [selectedNoteIds, exitSelectionMode, refreshNotes, showToast]);

    const handleBulkReprocess = useCallback(async () => {
        if (!selectedNoteIds.size) return;
        setIsBulkActionRunning(true);
        try {
            await Promise.all(
                Array.from(selectedNoteIds).map((id) =>
                    fetch("/api/admin/notes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, action: "reprocess" }),
                    }).then((res) => {
                        if (!res.ok) {
                            return res.text().then((text) => {
                                throw new Error(text);
                            });
                        }
                    }),
                ),
            );
            showToast(`Reprocessed ${selectedNoteIds.size} note(s).`, "success");
            exitSelectionMode();
            void refreshNotes();
        } catch (error) {
            console.error("Bulk reprocess failed", error);
            showToast("Failed to reprocess selected notes.", "error");
        } finally {
            setIsBulkActionRunning(false);
        }
    }, [selectedNoteIds, exitSelectionMode, refreshNotes, showToast]);

    const renderSectionContent = () => {
        switch (activeSection) {
            case "dashboard":
                return (
                    <div className="space-y-6">
                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                                <header className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">New users</p>
                                        <h4 className="text-xl font-semibold text-[var(--text-primary)]">7-day trend</h4>
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)]">per day</span>
                                </header>
                                <div className="h-40 flex items-end gap-3">
                                    {NEW_USERS_SERIES.map((point) => (
                                        <div key={point.label} className="flex-1 flex flex-col items-center text-xs text-[var(--text-muted)]">
                                            <div
                                                className="w-10 rounded-t-2xl bg-gradient-to-t from-slate-900 to-indigo-500"
                                                style={{ height: `${(point.value / 220) * 100}%` }}
                                            />
                                            <span className="mt-2 font-semibold text-[var(--text-primary)]">{point.value}</span>
                                            <span>{point.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                                <header className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Notes generated</p>
                                        <h4 className="text-xl font-semibold text-[var(--text-primary)]">Daily output</h4>
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)]">per day</span>
                                </header>
                                <div className="space-y-3">
                                    {NOTES_SERIES.map((point) => (
                                        <div key={point.label}>
                                            <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                                                <span>{point.label}</span>
                                                <span>{point.value}</span>
                                            </div>
                                            <div className="mt-1 h-2 rounded-full bg-[var(--input-bg)]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-slate-900"
                                                    style={{ width: `${(point.value / 1200) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6 xl:col-span-2">
                                <header className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">System health</p>
                                        <h4 className="text-xl font-semibold text-[var(--text-primary)]">Realtime status</h4>
                                    </div>
                                    <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">View logs</button>
                                </header>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {SYSTEM_HEALTH.map((item) => (
                                        <div key={item.label} className="rounded-2xl border border-[var(--border-soft)] p-4">
                                            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{item.label}</p>
                                            <p className="text-2xl font-semibold mt-2 text-[var(--text-primary)]">{item.value}</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">{item.trend}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6 flex flex-col">
                                <header className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Moderation queue</p>
                                        <h4 className="text-xl font-semibold text-[var(--text-primary)]">Flagged community notes</h4>
                                    </div>
                                    <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Assign all</button>
                                </header>
                                <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)]">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-[var(--input-bg)] text-left uppercase tracking-[0.25em] text-[var(--text-muted)] text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Note</th>
                                                <th className="px-4 py-3">Author</th>
                                                <th className="px-4 py-3">Region</th>
                                                <th className="px-4 py-3">Flag</th>
                                                <th className="px-4 py-3">Submitted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {MODERATION_QUEUE.map((item) => (
                                                <tr key={item.id} className="hover:bg-[var(--input-bg)]">
                                                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{item.id}</td>
                                                    <td className="px-4 py-3 text-gray-700">{item.author}</td>
                                                    <td className="px-4 py-3 text-gray-700">{item.region}</td>
                                                    <td className="px-4 py-3 text-gray-700">{item.flag}</td>
                                                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.submittedAt}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                                    <header className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Feed controls</p>
                                            <h4 className="text-xl font-semibold text-[var(--text-primary)]">Realtime knobs</h4>
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)]">Autosave enabled</span>
                                    </header>
                                    <div className="space-y-4">
                                        {CONTROL_TOGGLES.map((control) => (
                                            <label key={control.id} className="flex items-start gap-3 rounded-2xl border border-[var(--border-soft)] p-4 hover:border-[var(--border-soft)] transition">
                                                <input
                                                    type="checkbox"
                                                    checked={!!controlStates[control.id]}
                                                    onChange={() => toggleControl(control.id)}
                                                    className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>
                                                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{control.label}</span>
                                                    <span className="block text-sm text-[var(--text-muted)]">{control.description}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                                    <header className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Curation cohorts</p>
                                            <h4 className="text-xl font-semibold text-[var(--text-primary)]">Program health</h4>
                                        </div>
                                        <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Open CRM</button>
                                    </header>
                                    <div className="space-y-4">
                                        {COHORTS.map((cohort) => (
                                            <div key={cohort.label}>
                                                <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                                                    <span>{cohort.label}</span>
                                                    <span>{cohort.completion}%</span>
                                                </div>
                                                <div className="mt-2 h-2 rounded-full bg-[var(--input-bg)]">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-slate-900 to-indigo-500"
                                                        style={{ width: `${cohort.completion}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case "users":
                return (
                    <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Users</p>
                                <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Account roster</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-2">Monitor plans, credits, and recent activity.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                    Export CSV
                                </button>
                                <button className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                                    Invite admin
                                </button>
                            </div>
                        </header>
                        <div className="mt-6 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] border-b">
                                        <th className="py-3 pr-4">Name</th>
                                        <th className="py-3 pr-4">Email</th>
                                        <th className="py-3 pr-4">Plan</th>
                                        <th className="py-3 pr-4">Credits left</th>
                                        <th className="py-3 pr-4">Joined</th>
                                        <th className="py-3 pr-4">Last active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {usersLoading && (
                                        <tr>
                                            <td colSpan={8} className="py-10 text-center text-[var(--text-muted)]">
                                                Loading users…
                                            </td>
                                        </tr>
                                    )}
                                    {!usersLoading && usersError && (
                                        <tr>
                                            <td colSpan={8} className="py-10 text-center text-rose-500">
                                                {usersError}
                                            </td>
                                        </tr>
                                    )}
                                    {!usersLoading && !usersError && users.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-10 text-center text-[var(--text-muted)]">
                                                No users found yet.
                                            </td>
                                        </tr>
                                    )}
                                    {!usersLoading &&
                                        !usersError &&
                                        users.map((user: UserRow) => (
                                            <tr key={user.slug} className="hover:bg-[var(--input-bg)]">
                                                <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">{user.name}</td>
                                                <td className="py-3 pr-4 text-[var(--text-muted)]">{user.email}</td>
                                                <td className="py-3 pr-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.plan === "Pro"
                                                            ? "bg-indigo-50 text-indigo-600"
                                                            : user.plan === "Enterprise"
                                                                ? "bg-purple-50 text-purple-600"
                                                                : "bg-[var(--input-bg)] text-[var(--text-muted)]"
                                                            }`}
                                                    >
                                                        {user.plan}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-[var(--text-primary)]">
                                                    {creditEditSlug === user.slug ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <input
                                                                ref={creditInputRef}
                                                                type="number"
                                                                min={0}
                                                                value={creditLimitInput}
                                                                onChange={(event) => setCreditLimitInput(event.target.value)}
                                                                className="w-24 rounded-full border border-indigo-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                disabled={creditSaving}
                                                            />
                                                            <button
                                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 disabled:opacity-60"
                                                                onClick={() => {
                                                                    if (!creditSaving) {
                                                                        void handleCreditLimitSave(user);
                                                                    }
                                                                }}
                                                                disabled={creditSaving}
                                                            >
                                                                {creditSaving ? "Saving…" : "Save"}
                                                            </button>
                                                            <button
                                                                className="text-xs font-semibold text-[var(--text-muted)] hover:text-gray-700 disabled:opacity-60"
                                                                onClick={cancelCreditEdit}
                                                                disabled={creditSaving}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>{user.creditsLeft}</span>
                                                            <button
                                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                                                onClick={() => startCreditEdit(user)}
                                                            >
                                                                Adjust
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 pr-4 text-[var(--text-muted)]">{formatDate(user.joined)}</td>
                                                <td className="py-3 pr-4 text-[var(--text-muted)]">{formatDate(user.lastActive)}</td>
                                                <td className="py-3 pr-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.status === "Active"
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : "bg-rose-50 text-rose-600"
                                                            }`}
                                                    >
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-0">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                                            View
                                                        </button>
                                                        <button
                                                            className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)]"
                                                            onClick={() => handleUserAction(user.slug, user.status === "Active" ? "block" : "unblock")}
                                                        >
                                                            {user.status === "Active" ? "Block" : "Unblock"}
                                                        </button>
                                                        <button
                                                            className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)]"
                                                            onClick={() => handleUserAction(user.slug, "resetCredits")}
                                                        >
                                                            Reset credits
                                                        </button>
                                                        <button className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            case "notes":
                return (
                    <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Notes / Files</p>
                                <h3 className="text-2xl font-semibold text-[var(--text-primary)]">File processing</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-2">Audit uploads, reprocess failures, and download originals.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                    Upload file
                                </button>
                                <button className="rounded-full border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                                    New note
                                </button>
                            </div>
                        </header>
                        <div className="mt-6 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] border-b">
                                        <th className="py-3 pr-4">File name</th>
                                        <th className="py-3 pr-4">User</th>
                                        <th className="py-3 pr-4">Type</th>
                                        <th className="py-3 pr-4">Uploaded</th>
                                        <th className="py-3 pr-4">Status</th>
                                        <th className="py-3 pr-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {notesLoading && (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                                                Loading files…
                                            </td>
                                        </tr>
                                    )}
                                    {!notesLoading && notesError && (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-rose-500">
                                                {notesError}
                                            </td>
                                        </tr>
                                    )}
                                    {!notesLoading && !notesError && notes.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                                                No generated notes/files yet.
                                            </td>
                                        </tr>
                                    )}
                                    {!notesLoading &&
                                        !notesError &&
                                        groupedNoteUsers.map(([slug, info]) => (
                                            <React.Fragment key={slug}>
                                                <tr className="hover:bg-[var(--input-bg)]">
                                                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">{info.user}</td>
                                                    <td className="py-3 pr-4 text-[var(--text-muted)]">{info.email}</td>
                                                    <td className="py-3 pr-4 text-[var(--text-muted)]">{info.notes.length} notes</td>
                                                    <td className="py-3 pr-4"></td>
                                                    <td className="py-3 pr-4"></td>
                                                    <td className="py-3 pr-0">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <button
                                                                className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)]"
                                                                onClick={() => {
                                                                    const nextActive = slug === activeNotesUser ? null : slug;
                                                                    setActiveNotesUser(nextActive);
                                                                    setNoteSelectionMode(false);
                                                                    setSelectedNoteIds(new Set());
                                                                }}
                                                            >
                                                                {activeNotesUser === slug ? "Hide notes" : "View notes"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {activeNotesUser === slug && (
                                                    <tr>
                                                        <td colSpan={6} className="bg-[var(--input-bg)]">
                                                            <div className="p-4 space-y-4">
                                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Notes for {info.user}</p>
                                                                        <p className="text-sm text-[var(--text-muted)]">{info.notes.length} total</p>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button
                                                                            className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${noteSelectionMode ? "border-rose-400 text-rose-600" : "border-gray-300 text-[var(--text-muted)]"}`}
                                                                            onClick={() => {
                                                                                if (noteSelectionMode) {
                                                                                    exitSelectionMode();
                                                                                } else {
                                                                                    setNoteSelectionMode(true);
                                                                                    setSelectedNoteIds(new Set());
                                                                                }
                                                                            }}
                                                                        >
                                                                            {noteSelectionMode ? "Exit selection" : "Select notes"}
                                                                        </button>
                                                                        {noteSelectionMode && (
                                                                            <>
                                                                                <button
                                                                                    className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-[var(--panel-solid)] disabled:opacity-50"
                                                                                    onClick={handleBulkReprocess}
                                                                                    disabled={!selectedNoteIds.size || isBulkActionRunning}
                                                                                >
                                                                                    {isBulkActionRunning ? "Working…" : "Reprocess selected"}
                                                                                </button>
                                                                                <button
                                                                                    className="rounded-full border border-rose-400 px-4 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                                                                    onClick={handleBulkDelete}
                                                                                    disabled={!selectedNoteIds.size || isBulkActionRunning}
                                                                                >
                                                                                    Delete selected
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full text-sm border border-[var(--border-soft)] rounded-2xl overflow-hidden">
                                                                        <thead className="bg-[var(--panel-solid)]">
                                                                            <tr className="text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] border-b">
                                                                                {noteSelectionMode && <th className="py-3 px-4">Select</th>}
                                                                                <th className="py-3 px-4">Title</th>
                                                                                <th className="py-3 px-4">Uploaded</th>
                                                                                <th className="py-3 px-4">Status</th>
                                                                                <th className="py-3 px-4 text-right">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100 bg-[var(--panel-solid)]">
                                                                            {activeUserNotes.map((file) => (
                                                                                <tr key={file.id} className="hover:bg-[var(--input-bg)]">
                                                                                    {noteSelectionMode && (
                                                                                        <td className="py-3 px-4">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={selectedNoteIds.has(file.id)}
                                                                                                onChange={() => toggleNoteSelection(file.id)}
                                                                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                                            />
                                                                                        </td>
                                                                                    )}
                                                                                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{file.fileName}</td>
                                                                                    <td className="py-3 px-4 text-[var(--text-muted)]">{formatDate(file.uploaded)}</td>
                                                                                    <td className="py-3 px-4">
                                                                                        <span
                                                                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${file.status === "Processed"
                                                                                                ? "bg-emerald-50 text-emerald-600"
                                                                                                : "bg-rose-50 text-rose-600"
                                                                                                }`}
                                                                                        >
                                                                                            {file.status}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-3 px-4">
                                                                                        <div className="flex flex-wrap justify-end gap-2">
                                                                                            <button
                                                                                                className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)] disabled:opacity-60"
                                                                                                onClick={() => handleViewNote(file)}
                                                                                                disabled={!!previewNote && previewNote.id === file.id}
                                                                                            >
                                                                                                View note
                                                                                            </button>
                                                                                            <button
                                                                                                className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)] disabled:opacity-60"
                                                                                                onClick={() => handleReprocessNote(file)}
                                                                                                disabled={reprocessInFlight === file.id}
                                                                                            >
                                                                                                {reprocessInFlight === file.id ? "Reprocessing…" : "Reprocess"}
                                                                                            </button>
                                                                                            <button
                                                                                                className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-[var(--input-bg)] disabled:opacity-60"
                                                                                                onClick={() => handleDownloadNote(file)}
                                                                                                disabled={downloadInFlight === file.id}
                                                                                            >
                                                                                                {downloadInFlight === file.id ? "Preparing…" : "Download"}
                                                                                            </button>
                                                                                            <button
                                                                                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                                                                onClick={() => handleNoteDelete(file.id)}
                                                                                            >
                                                                                                Delete
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            case "usage":
                return (
                    <div className="grid grid-cols-1 gap-6">
                        <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                            <header className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Usage & credits</p>
                                    <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Consumption overview</h3>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">Updated 2 min ago</span>
                            </header>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-[var(--border-soft)] p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Credits today</p>
                                    <p className="text-3xl font-semibold text-[var(--text-primary)] mt-2">{usageMetrics.today.toLocaleString()}</p>
                                </div>
                                <div className="rounded-2xl border border-[var(--border-soft)] p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Credits this month</p>
                                    <p className="text-3xl font-semibold text-[var(--text-primary)] mt-2">{usageMetrics.month.toLocaleString()}</p>
                                </div>
                                <div className="rounded-2xl border border-[var(--border-soft)] p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Avg / user</p>
                                    <p className="text-3xl font-semibold text-[var(--text-primary)] mt-2">{usageMetrics.average}</p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                            <header className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Per-user usage</p>
                                    <h4 className="text-xl font-semibold text-[var(--text-primary)]">Activity ledger</h4>
                                </div>
                                <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                    Download CSV
                                </button>
                            </header>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] border-b">
                                            <th className="py-3 pr-4">User</th>
                                            <th className="py-3 pr-4">Uploads</th>
                                            <th className="py-3 pr-4">Credits used</th>
                                            <th className="py-3 pr-4">Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {usageLoading && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">
                                                    Loading usage…
                                                </td>
                                            </tr>
                                        )}
                                        {!usageLoading && usageError && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-rose-500">
                                                    {usageError}
                                                </td>
                                            </tr>
                                        )}
                                        {!usageLoading && !usageError && usageRows.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">
                                                    No usage data yet.
                                                </td>
                                            </tr>
                                        )}
                                        {!usageLoading &&
                                            !usageError &&
                                            usageRows.map((row: UsageRow) => (
                                                <tr key={row.user}>
                                                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">{row.user}</td>
                                                    <td className="py-3 pr-4 text-gray-700">{row.uploads}</td>
                                                    <td className="py-3 pr-4 text-[var(--text-primary)]">{row.used}</td>
                                                    <td className="py-3 pr-4 text-gray-700">{row.remaining}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                );
            case "plans":
                return (
                    <div className="grid grid-cols-1 gap-6">
                        <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                            <header className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Plans</p>
                                    <h4 className="text-xl font-semibold text-[var(--text-primary)]">Billing tiers</h4>
                                </div>
                                <button
                                    onClick={() => setIsCreatePlanOpen(true)}
                                    className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]"
                                >
                                    Create plan
                                </button>
                                {isCreatePlanOpen && (
                                    <CreatePlanModal
                                        onClose={() => setIsCreatePlanOpen(false)}
                                        onSuccess={() => {
                                            refreshPlans();
                                            showToast("Plan created successfully.", "success");
                                        }}
                                    />
                                )}
                            </header>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] border-b">
                                            <th className="py-3 pr-4">Plan</th>
                                            <th className="py-3 pr-4">Price</th>
                                            <th className="py-3 pr-4">Credits / month</th>
                                            <th className="py-3 pr-4">Active users</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {planLoading && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">
                                                    Loading plans…
                                                </td>
                                            </tr>
                                        )}
                                        {!planLoading && planError && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-rose-500">
                                                    {planError}
                                                </td>
                                            </tr>
                                        )}
                                        {!planLoading && !planError && planRows.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">
                                                    No plans available yet.
                                                </td>
                                            </tr>
                                        )}
                                        {!planLoading &&
                                            !planError &&
                                            planRows.map((plan) => (
                                                <tr key={plan.name}>
                                                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">{plan.name}</td>
                                                    <td className="py-3 pr-4 text-gray-700">{plan.price}</td>
                                                    <td className="py-3 pr-4 text-gray-700">{plan.credits}</td>
                                                    <td className="py-3 pr-4 text-[var(--text-primary)]">{plan.activeUsers.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                            <header className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Payments</p>
                                    <h4 className="text-xl font-semibold text-[var(--text-primary)]">Recent invoices</h4>
                                </div>
                                <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                    Export receipts
                                </button>
                            </header>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] border-b">
                                            <th className="py-3 pr-4">User</th>
                                            <th className="py-3 pr-4">Plan</th>
                                            <th className="py-3 pr-4">Amount</th>
                                            <th className="py-3 pr-4">Status</th>
                                            <th className="py-3 pr-4">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {planLoading && (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-[var(--text-muted)]">
                                                    Loading payments…
                                                </td>
                                            </tr>
                                        )}
                                        {!planLoading && planError && (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-rose-500">
                                                    {planError}
                                                </td>
                                            </tr>
                                        )}
                                        {!planLoading && !planError && paymentRows.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-[var(--text-muted)]">
                                                    No payments recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                        {!planLoading &&
                                            !planError &&
                                            paymentRows.map((payment) => (
                                                <tr key={`${payment.user}-${payment.date}`}>
                                                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">{payment.user}</td>
                                                    <td className="py-3 pr-4 text-gray-700">{payment.plan}</td>
                                                    <td className="py-3 pr-4 text-[var(--text-primary)]">{payment.amount}</td>
                                                    <td className="py-3 pr-4">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${payment.status === "Paid"
                                                                ? "bg-emerald-50 text-emerald-600"
                                                                : payment.status === "Pending"
                                                                    ? "bg-amber-50 text-amber-600"
                                                                    : "bg-rose-50 text-rose-600"
                                                                }`}
                                                        >
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-4 text-gray-700">{toDisplayDate(payment.date)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                );
            case "reports":
                return (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                            <header className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Error logs</p>
                                    <h4 className="text-xl font-semibold text-[var(--text-primary)]">System incidents</h4>
                                </div>
                                <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                    View all logs
                                </button>
                            </header>
                            <div className="space-y-4">
                                {reportsLoading && (
                                    <div className="text-center text-[var(--text-muted)] py-10">Loading logs…</div>
                                )}
                                {!reportsLoading && reportsError && (
                                    <div className="text-center text-rose-500 py-10">{reportsError}</div>
                                )}
                                {!reportsLoading && !reportsError && errorLogs.length === 0 && (
                                    <div className="text-center text-[var(--text-muted)] py-10">No incidents recorded yet.</div>
                                )}
                                {!reportsLoading &&
                                    !reportsError &&
                                    errorLogs.map((log: ErrorLog) => (
                                        <div key={`${log.time}-${log.user}`} className="rounded-2xl border border-[var(--border-soft)] p-4">
                                            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                                                <span>{toDisplayDate(log.time)}</span>
                                                <span>{log.type}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)] mt-2">{log.user}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{log.message}</p>
                                        </div>
                                    ))}
                            </div>
                        </section>

                        <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                            <header className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Abuse detection</p>
                                    <h4 className="text-xl font-semibold text-[var(--text-primary)]">Policy alerts</h4>
                                </div>
                                <button className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                    Download report
                                </button>
                            </header>
                            <div className="space-y-4">
                                {reportsLoading && (
                                    <div className="text-center text-[var(--text-muted)] py-10">Loading alerts…</div>
                                )}
                                {!reportsLoading && reportsError && (
                                    <div className="text-center text-rose-500 py-10">{reportsError}</div>
                                )}
                                {!reportsLoading && !reportsError && abuseAlerts.length === 0 && (
                                    <div className="text-center text-[var(--text-muted)] py-10">No abuse patterns detected.</div>
                                )}
                                {!reportsLoading &&
                                    !reportsError &&
                                    abuseAlerts.map((alert: AbuseAlert) => (
                                        <div key={alert.label} className="rounded-2xl border border-[var(--border-soft)] p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.label}</p>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${alert.severity === "critical" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"
                                                        }`}
                                                >
                                                    {alert.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">{alert.detail}</p>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    </div>
                );
            case "settings":
                return (
                    <section className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6">
                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Settings</p>
                        <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Console preferences</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-2">Tweak branding, limits, and AI guardrails.</p>

                        <form className="mt-6 grid gap-6 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleSettingsSave(); }}>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                App name
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.appName}
                                    onChange={(e) => handleSettingsChange("appName", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                Logo URL
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.logo}
                                    onChange={(e) => handleSettingsChange("logo", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                Max PDF size
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.maxPdf}
                                    onChange={(e) => handleSettingsChange("maxPdf", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                Free plan limit
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.freeLimit}
                                    onChange={(e) => handleSettingsChange("freeLimit", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                Max tokens
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.maxTokens}
                                    onChange={(e) => handleSettingsChange("maxTokens", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                Model selection
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.modelName}
                                    onChange={(e) => handleSettingsChange("modelName", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                            <label className="space-y-2 text-sm font-semibold text-[var(--text-primary)]">
                                Cost limits
                                <input
                                    className="w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-[var(--text-primary)] focus:border-slate-900 focus:outline-none"
                                    value={settings.costCap}
                                    onChange={(e) => handleSettingsChange("costCap", e.target.value)}
                                    disabled={settingsLoading}
                                />
                            </label>
                        </form>
                        {settingsError && <p className="text-sm text-rose-500 mt-4">{settingsError}</p>}
                        {settingsSuccess && <p className="text-sm text-emerald-600 mt-4">{settingsSuccess}</p>}
                        <div className="mt-8 flex flex-wrap gap-3">
                            <button className="rounded-full border border-[var(--border-soft)] px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--input-bg)]">
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSettingsSave}
                                className="rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                                disabled={settingsSaving}
                            >
                                Save changes
                            </button>
                        </div>
                    </section>
                );
            default:
                return (
                    <section className="rounded-3xl border border-dashed border-[var(--border-soft)] bg-[var(--panel-solid)]/60 p-8 text-center text-[var(--text-muted)]">
                        Coming soon.
                    </section>
                );
        }
    };

    return (
        <>
            <div className="min-h-screen bg-[var(--page-bg)] pt-14 font-sans">
                <AdminNavbar onSearch={(q) => console.log(q)} />

                <div className="flex max-w-[1500px] mx-auto min-h-[calc(100vh-3.5rem)]">
                    <AdminSidebar
                        sections={ADMIN_SECTIONS}
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                        onWidthChange={setSidebarWidth}
                        onIsResizing={setIsResizing}
                    />

                    <main className={`flex-1 p-6 space-y-6 ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`} style={{ marginLeft: `${sidebarWidth}px` }}>
                        <div className="flex flex-col gap-6 xl:flex-row">
                            <aside className="rounded-3xl bg-[var(--panel-solid)] border border-[var(--border-soft)] shadow-sm p-6 xl:w-72 h-fit block lg:hidden">
                                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] mb-4">Admin menu</p>
                                <div className="space-y-2">
                                    {ADMIN_SECTIONS.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full text-left rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeSection === section.id ? "bg-slate-900 text-white" : "bg-[var(--input-bg)] text-gray-700 hover:bg-[var(--input-bg)]"
                                                }`}
                                        >
                                            {section.label}
                                        </button>
                                    ))}
                                </div>
                            </aside>

                            <section className="flex-1 rounded-[32px] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white px-8 py-10 shadow-xl border border-white/10">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="space-y-4 max-w-2xl">
                                        <p className="uppercase tracking-[0.4em] text-xs text-white/60">{active.label}</p>
                                        <h2 className="text-3xl sm:text-4xl font-semibold leading-tight">
                                            {active.label === "Dashboard" ? "Command center" : active.label}
                                        </h2>
                                        <p className="text-white/80 text-base">{active.summary}</p>
                                        <div className="flex flex-wrap gap-3">
                                            <button className="rounded-full bg-[var(--panel-solid)] text-slate-900 px-5 py-2 text-sm font-semibold hover:bg-slate-100 transition">
                                                Publish update
                                            </button>
                                            <Link
                                                href="/explore"
                                                className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white/90 hover:bg-[var(--panel-solid)]/10 transition"
                                            >
                                                View public feed
                                            </Link>
                                        </div>
                                        {activeSection === "dashboard" ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                                                {DASHBOARD_STATS.map((stat) => (
                                                    <div key={stat.label} className="rounded-2xl bg-[var(--panel-solid)]/5 border border-white/10 px-4 py-3 backdrop-blur">
                                                        <p className="text-sm uppercase tracking-wide text-white/50">{stat.label}</p>
                                                        <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                                                        <p className="text-xs text-emerald-300 mt-1">{stat.delta}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                                {SIGNALS.map((stat) => (
                                                    <div key={stat.label} className="rounded-2xl bg-[var(--panel-solid)]/5 border border-white/10 px-4 py-3 backdrop-blur">
                                                        <p className="text-sm uppercase tracking-wide text-white/50">{stat.label}</p>
                                                        <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                                                        <p className="text-xs text-emerald-300 mt-1">{stat.delta}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-full lg:w-72 space-y-4">
                                        <div className="rounded-2xl bg-[var(--panel-solid)]/5 border border-white/10 px-4 py-4">
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Moderation load</p>
                                            <p className="text-4xl font-semibold mt-2">{moderationLoad.total}</p>
                                            <p className="text-sm text-white/70">{moderationLoad.urgent} require manual review</p>
                                        </div>
                                        <div className="rounded-2xl bg-[var(--panel-solid)]/5 border border-white/10 px-4 py-4">
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Latest launch</p>
                                            <p className="text-base font-semibold mt-2">City-grade Lokmat feeds</p>
                                            <p className="text-sm text-white/70">Rolled out 12:20 — monitoring uptake</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {renderSectionContent()}
                    </main>
                </div>
            </div>
            {toastState && (
                <Toast message={toastState.message} type={toastState.type} actions={toastState.actions} onDismiss={dismissToast} />
            )}
            {previewNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8">
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-[var(--panel-solid)] shadow-2xl border border-[var(--border-soft)] flex flex-col">
                        <button
                            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                            onClick={handleClosePreview}
                            aria-label="Close preview"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="p-6 border-b border-[var(--border-soft)]">
                            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] mb-2">Previewing note</p>
                            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{previewNote.fileName}</h2>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                                <span>By {previewNote.user}</span>
                                <span>({previewNote.userEmail})</span>
                                <span>{formatDate(previewNote.uploaded)}</span>
                                <span className="capitalize">{previewNote.type}</span>
                            </div>
                            {previewNote.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {previewNote.tags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--input-bg)] text-[var(--text-muted)]">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {previewNote.summary && (
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 mb-2">Summary</p>
                                    <p className="text-sm text-gray-700">{previewNote.summary}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">Content</p>
                                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--input-bg)] p-4 text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                                    {previewNote.content || "No content available."}
                                </div>
                            </div>
                            {previewNote.attachments.length > 0 && (
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">Attachments</p>
                                    <div className="flex flex-wrap gap-2">
                                        {previewNote.attachments.map((att, idx) => (
                                            <a
                                                key={`${att.name}-${idx}`}
                                                href={att.data?.startsWith("data:") ? att.data : undefined}
                                                download={att.name || `attachment-${idx + 1}`}
                                                className="px-3 py-1.5 text-xs font-semibold border border-[var(--border-soft)] rounded-full text-gray-700 bg-[var(--panel-solid)] hover:bg-[var(--input-bg)]"
                                            >
                                                {att.name || `Attachment ${idx + 1}`}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-[var(--border-soft)] bg-[var(--input-bg)] px-6 py-4 flex flex-wrap gap-3 justify-end">
                            <button
                                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--panel-solid)]"
                                onClick={handleClosePreview}
                            >
                                Close
                            </button>
                            <button
                                className="rounded-full border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                                onClick={handleCopyPreview}
                            >
                                Copy content
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
