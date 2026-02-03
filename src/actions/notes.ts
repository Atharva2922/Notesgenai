'use server';

import connectDB from '@/lib/db';
import Note, { INote } from '@/models/Note';
import { revalidatePath } from 'next/cache';
import { getOrCreateProfile, updateCredits } from '@/actions/userProfile';

const normalizeNote = (note: any) => ({
    ...note,
    _id: note._id.toString(),
    id: note._id.toString(),
    createdAt: (note.createdAt instanceof Date ? note.createdAt.getTime() : note.createdAt),
    updatedAt: (note.updatedAt instanceof Date ? note.updatedAt.getTime() : note.updatedAt),
    attachments: (note.attachments ?? []).map((att: any) => ({
        name: att.name,
        type: att.type,
        size: att.size,
        data: att.data,
    })),
});

/**
 * Fetch all notes for a specific user.
 */
export async function getNotes(userSlug?: string) {
    try {
        await connectDB();

        // If no userSlug is provided, we return an empty array (or handle as guest access if intended, but strict isolation is requested)
        if (!userSlug) {
            return [];
        }

        const notes = await Note.find({ userSlug }).sort({ isPinned: -1, createdAt: -1 }).lean();

        // Serialize Date objects to strings/numbers for Client Component
        return notes.map((note: any) => normalizeNote(note));
    } catch (error) {
        console.error("Failed to fetch notes:", error);
        return [];
    }
}

/**
 * Create a new note.
 */
export async function createNote(data: Partial<INote> & { userSlug?: string }) {
    try {
        await connectDB();

        if (!data.userSlug) {
            throw new Error("User must be logged in to create notes.");
        }

        const profile = await getOrCreateProfile(data.userSlug);
        if (profile.status === "Blocked") {
            throw new Error("BLOCKED_USER");
        }

        const creditsTotal = typeof profile.creditsTotal === "number" ? profile.creditsTotal : null;
        const creditsUsed = typeof profile.creditsUsed === "number" ? profile.creditsUsed : 0;
        const hasCreditCap = creditsTotal !== null && creditsTotal >= 0;
        if (hasCreditCap && creditsUsed >= creditsTotal) {
            throw new Error("NO_CREDITS");
        }
        const notePayload = {
            ...data,
            userSlug: data.userSlug ?? profile.slug,
            userName: data.userName ?? profile.name,
            userEmail: data.userEmail ?? profile.email,
        };

        const newNote = await Note.create(notePayload);

        await updateCredits(notePayload.userSlug!, 1);
        revalidatePath('/'); // Refresh home page

        return normalizeNote(newNote.toObject());
    } catch (error) {
        console.error("Failed to create note:", error);
        if (error instanceof Error && (error.message === "BLOCKED_USER" || error.message === "NO_CREDITS")) {
            throw error;
        }
        throw new Error("Failed to create note");
    }
}

/**
 * Update a note.
 */
export async function updateNote(id: string, data: Partial<INote>, userSlug?: string) {
    try {
        await connectDB();

        const query: any = { _id: id };
        if (userSlug) {
            query.userSlug = userSlug;
        }

        console.log("Updating Note:", id, data, "User:", userSlug);

        const updatedNote = await Note.findOneAndUpdate(
            query,
            data,
            { new: true } // Return updated document
        ).lean();

        if (!updatedNote) throw new Error("Note not found or unauthorized");

        revalidatePath('/');

        return normalizeNote(updatedNote);
    } catch (error) {
        console.error("Failed to update note:", error);
        throw new Error("Failed to update note");
    }
}

/**
 * Delete a note.
 */
export async function deleteNote(id: string, userSlug?: string) {
    try {
        await connectDB();
        const query: any = { _id: id };
        if (userSlug) {
            query.userSlug = userSlug;
        }
        const result = await Note.findOneAndDelete(query);
        if (!result) throw new Error("Note not found or unauthorized");

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete note:", error);
        throw new Error("Failed to delete note");
    }
}
