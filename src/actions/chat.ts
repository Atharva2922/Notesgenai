'use server';

import { analyzeImageNote, chatWithAI, generateNote } from "@/services/geminiService";
import { ChatMessage } from "@/types";
import { createNote } from "./notes";

export async function sendMessage(history: ChatMessage[]) {
    return await chatWithAI(history);
}

export async function convertChatToNote(messages: ChatMessage[]) {
    // 1. Convert chat history to a single transcript string
    const transcript = messages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

    // 2. Use existing AI service to structure it (Title, Summary, Tags)
    // We treat the transcript as "raw content"
    const structuredNote = await generateNote(transcript, {
        tone: 'professional',
        format: 'bullet_points'
    });

    // 3. Save to Database
    const newNote = await createNote({
        title: structuredNote.title,
        content: structuredNote.formattedContent,
        summary: structuredNote.summary,
        tags: structuredNote.tags,
        type: 'text' // Saved as a text note
    });

    return newNote;
}

export async function analyzeImagePrompt(dataUrl: string, mimeType: string, prompt: string) {
    const result = await analyzeImageNote(dataUrl, mimeType, prompt);

    const tagsText = result.tags?.length ? `\n\n_Tags: ${result.tags.join(", ")}_` : "";

    return `### ${result.title}\n\n${result.summary}\n\n${result.formattedContent}${tagsText}`;
}
