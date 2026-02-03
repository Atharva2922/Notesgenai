import { UserProfile } from "@/types";

export const DEFAULT_SLUG = "default-user";

export const slugFromEmail = (email: string): string => {
    return (
        email
            ?.trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || DEFAULT_SLUG
    );
};

export const DEFAULT_PROFILE = {
    slug: DEFAULT_SLUG,
    name: "NotesGen Demo User",
    email: "demo@notesgen.ai",
    plan: "Pro" as UserProfile["plan"],
    creditsTotal: 1500,
    creditsUsed: 420,
    status: "Active" as UserProfile["status"],
    joinedAt: Date.now(),
    lastActive: Date.now(),
    facts: [] as UserProfile["facts"],
};
