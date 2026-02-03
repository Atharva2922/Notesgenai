import { NextRequest, NextResponse } from "next/server";

import { chatWithAI } from "@/services/geminiService";
import { createNote, deleteNote, getNotes } from "@/actions/notes";

interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages as ChatMessagePayload[] : [];
    const userSlug = typeof body?.userSlug === "string" ? body.userSlug : undefined;

    if (!messages.length) {
      return NextResponse.json({ error: "At least one message is required" }, { status: 400 });
    }

    const trimmed = messages.map((msg) => ({
      role: msg.role,
      content: String(msg.content ?? "").trim(),
    })).filter((msg) => msg.content.length > 0);

    if (!trimmed.length) {
      return NextResponse.json({ error: "Messages cannot be empty" }, { status: 400 });
    }

    const userNotes = userSlug ? await getNotes(userSlug) : [];
    let noteContext = "";
    if (userNotes.length) {
      noteContext = userNotes.slice(0, 5).map((note: any, index: number) => {
        const tags = (note.tags ?? []).slice(0, 5).map((tag: string) => `#${tag}`).join(" ");
        return `Note ${index + 1}:\nID: ${note.id}\nTitle: ${note.title}\nSummary: ${note.summary}\nTags: ${tags || 'none'}`;
      }).join("\n\n");
    }

    const schemaPrompt =
      `Respond ONLY with compact JSON matching this schema:
{"reply": string,
 "action": "none" | "create_note" | "delete_note",
 "note": {"title": string, "summary": string, "content": string} | null,
 "noteId": string}
If action is "none" set note to null and noteId to "".
Example create: {"reply":"Summarizing sprint demo.","action":"create_note","note":{"title":"Sprint Demo Recap","summary":"Key wins.","content":"Detailed note."},"noteId":""}
Example delete: {"reply":"Removing note 123.","action":"delete_note","note":null,"noteId":"123"}`;

    const systemMessage = noteContext
      ? `${schemaPrompt}\nUse the following existing notes when deciding actions and referencing IDs:\n${noteContext}`
      : `${schemaPrompt}\nIf unsure, ask clarifying questions but still respond with JSON (action:"none").`;

    const formattedMessages: ChatMessagePayload[] = [
      { role: "system", content: systemMessage },
      ...trimmed,
    ];

    const responseText = await chatWithAI(formattedMessages);

    const cleaned = responseText.trim().replace(/```json|```/gi, '').trim();
    let parsed: { reply: string; action?: string; note?: { title: string; summary: string; content: string }; noteId?: string } | null = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = null;
    }

    let createdNote: any = null;
    let deletedNoteId: string | null = null;

    if (parsed && parsed.action === 'create_note' && parsed.note && userSlug) {
      try {
        const payload = await createNote({
          title: parsed.note.title?.slice(0, 140) || 'Untitled',
          summary: parsed.note.summary || parsed.note.content?.slice(0, 160) || 'AI generated note',
          content: parsed.note.content || parsed.note.summary || 'AI created note.',
          tags: ['chatbot'],
          type: 'text',
          userSlug,
          userName: typeof body?.userName === 'string' ? body.userName : undefined,
          userEmail: typeof body?.userEmail === 'string' ? body.userEmail : undefined,
        });
        createdNote = payload;
      } catch (error) {
        console.error('[api/chatbot] note creation failed', error);
      }
    }

    if (parsed && parsed.action === 'delete_note' && userSlug) {
      try {
        let targetNoteId = (parsed.noteId ?? '').trim();

        if (!targetNoteId && parsed.note?.title && userNotes.length) {
          const normalizedTitle = parsed.note.title.trim().toLowerCase();
          const matchedByTitle = userNotes.find((note: any) => note.title?.trim().toLowerCase() === normalizedTitle);
          if (matchedByTitle) {
            targetNoteId = matchedByTitle.id;
          }
        }

        if (!targetNoteId && parsed.note?.summary && userNotes.length) {
          const normalizedSummary = parsed.note.summary.trim().toLowerCase();
          const matchedBySummary = userNotes.find((note: any) => note.summary?.trim().toLowerCase() === normalizedSummary);
          if (matchedBySummary) {
            targetNoteId = matchedBySummary.id;
          }
        }

        if (!targetNoteId) {
          console.warn('[api/chatbot] delete requested but no valid noteId resolved');
        } else {
          await deleteNote(targetNoteId, userSlug);
          deletedNoteId = targetNoteId;
        }
      } catch (error) {
        console.error('[api/chatbot] note deletion failed', error);
      }
    }

    return NextResponse.json({
      success: true,
      reply: parsed?.reply ?? responseText,
      createdNote,
      deletedNoteId,
    });
  } catch (error) {
    console.error("[api/chatbot] POST failed", error);
    return NextResponse.json({ error: "Unable to contact AI service right now" }, { status: 500 });
  }
}
