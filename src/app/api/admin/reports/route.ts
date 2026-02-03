import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import Note from "@/models/Note";
import UserProfileModel from "@/models/UserProfile";

const toIso = (value: any) => {
    if (!value) return new Date().toISOString();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export async function GET() {
    try {
        await connectDB();
        const [notes, profiles] = await Promise.all([
            Note.find({}).sort({ createdAt: -1 }).limit(25).lean(),
            UserProfileModel.find({}).lean(),
        ]);

        const errorLogs = notes.slice(0, 10).map((note) => ({
            time: toIso(note.createdAt),
            user: note.userName ?? "NotesGen User",
            type: note.type ?? "note",
            message: `Generated note "${note.title ?? "Untitled"}" (${(note.tags ?? []).join(", ") || "no tags"})`,
        }));

        const uploadsBySlug = notes.reduce<Record<string, number>>((acc, note) => {
            const slug = note.userSlug ?? "default-user";
            acc[slug] = (acc[slug] ?? 0) + 1;
            return acc;
        }, {});

        const abuseAlerts = Object.entries(uploadsBySlug)
            .filter(([, count]) => count >= 5)
            .map(([slug, count]) => {
                const profile = profiles.find((p) => p.slug === slug);
                return {
                    label: profile?.name ?? slug,
                    detail: `${count} uploads in the last ${notes.length} notes`,
                    severity: count >= 10 ? "critical" : "warning",
                };
            })
            .slice(0, 10);

        return NextResponse.json({ errorLogs, abuseAlerts });
    } catch (error) {
        console.error("[admin/reports] GET failed", error);
        return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
    }
}
