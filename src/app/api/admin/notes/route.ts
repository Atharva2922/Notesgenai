import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/db";
import Note from "@/models/Note";

const serializeNote = (note: any) => {
    const uploadedAt =
        note.createdAt instanceof Date
            ? note.createdAt.toISOString()
            : new Date(note.createdAt).toISOString();

    return {
        id: note._id.toString(),
        title: note.title,
        user: note.userName ?? "NotesGen User",
        userSlug: note.userSlug ?? "default-user",
        userEmail: note.userEmail ?? "user@example.com",
        type: note.type ?? "text",
        uploadedAt,
        status: "Processed",
        summary: note.summary ?? "",
        content: note.content ?? "",
        tags: Array.isArray(note.tags) ? note.tags : [],
        attachments: (note.attachments ?? []).map((att: any) => ({
            name: att.name,
            type: att.type,
            size: att.size,
            data: att.data,
        })),
    };
};

export async function GET() {
    try {
        await connectDB();
        const notes = await Note.find({}).sort({ createdAt: -1 }).limit(200).lean();
        return NextResponse.json(notes.map(serializeNote));
    } catch (error) {
        console.error("[admin/notes] GET failed", error);
        return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json().catch(() => ({}));
        const id = body?.id;
        const action = body?.action;
        if (!id || action !== "reprocess") {
            return NextResponse.json({ error: "Invalid reprocess request" }, { status: 400 });
        }

        const note = await Note.findById(id);
        if (!note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        // Simulate a reprocess by bumping the updated timestamp.
        note.updatedAt = new Date();
        await note.save();

        return NextResponse.json({ success: true, note: serializeNote(note.toObject()) });
    } catch (error) {
        console.error("[admin/notes] POST failed", error);
        return NextResponse.json({ error: "Failed to reprocess note" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing note id" }, { status: 400 });
        }
        await Note.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[admin/notes] DELETE failed", error);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
