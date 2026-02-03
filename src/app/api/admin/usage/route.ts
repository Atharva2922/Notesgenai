import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import UserProfileModel from "@/models/UserProfile";
import Note from "@/models/Note";

const toDate = (value: any): Date => {
    if (value instanceof Date) return value;
    return new Date(value);
};

export async function GET() {
    try {
        await connectDB();
        const [profiles, notes] = await Promise.all([
            UserProfileModel.find({}).lean(),
            Note.find({}).lean(),
        ]);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(startOfDay);
        startOfMonth.setDate(1);

        const isAfter = (input: any, date: Date) => {
            const parsed = toDate(input);
            return parsed >= date;
        };

        const notesToday = notes.filter((note) => isAfter(note.createdAt, startOfDay)).length;
        const notesThisMonth = notes.filter((note) => isAfter(note.createdAt, startOfMonth)).length;

        const averageCredits = profiles.length
            ? profiles.reduce((sum, profile) => sum + (profile.creditsUsed ?? 0), 0) / profiles.length
            : 0;

        const uploadsBySlug = notes.reduce<Record<string, number>>((acc, note) => {
            const slug = note.userSlug ?? "default-user";
            acc[slug] = (acc[slug] ?? 0) + 1;
            return acc;
        }, {});

        const perUser = profiles.map((profile) => {
            const uploads = uploadsBySlug[profile.slug] ?? 0;
            const creditsTotal = profile.creditsTotal ?? 0;
            const creditsUsed = profile.creditsUsed ?? 0;
            return {
                user: profile.name ?? profile.slug,
                uploads,
                used: creditsUsed,
                remaining: Math.max(0, creditsTotal - creditsUsed),
            };
        });

        return NextResponse.json({
            metrics: {
                today: notesToday,
                month: notesThisMonth,
                average: Number(averageCredits.toFixed(1)),
            },
            perUser,
        });
    } catch (error) {
        console.error("[admin/usage] GET failed", error);
        return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
    }
}
