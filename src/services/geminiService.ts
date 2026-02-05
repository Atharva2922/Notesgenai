"use server";

import { GenerationConfig, PurposeActionDefinition, PurposeActionValue } from "@/types";
import {
    AttachmentPayload,
    buildOpenRouterPayload,
    callOpenRouter,
    getOpenRouterConfig,
    requestOpenRouter,
} from "@/lib/openrouter";

type PurposeFallback = PurposeActionValue | "default";

interface GenerateNoteOptions {
    purpose?: PurposeActionDefinition;
}

const ACTION_MARKER = "Action Requested:";

const extractActionContext = (raw: string) => {
    const markerIndex = raw.lastIndexOf(ACTION_MARKER);
    if (markerIndex === -1) {
        return { content: raw.trim(), actionInstruction: null as string | null };
    }

    const content = raw.slice(0, markerIndex).trim();
    const instruction = raw.slice(markerIndex + ACTION_MARKER.length).trim();
    return { content, actionInstruction: instruction || null };
};

const detectPurpose = (instruction: string | null): PurposeFallback => {
    if (!instruction) return "default";
    const normalized = instruction.toLowerCase();

    const pairs: [PurposeFallback, RegExp][] = [
        ["smart_notes", /(smart|structured|sections)/],
        ["summary", /(summary|summarize|concise)/],
        ["key_points", /(key points|bullets|highlights)/],
        ["qa", /(q&a|question|answer)/],
        ["flashcards", /(flashcard|prompt and answer)/],
        ["rewrite_social", /(rewrite|linkedin|blog|first-person)/],
        ["faqs", /(faq|frequently asked|insight)/],
        ["meeting_notes", /(meeting|agenda|decisions|next steps)/],
    ];

    for (const [type, pattern] of pairs) {
        if (pattern.test(normalized)) {
            return type;
        }
    }

    return "default";
};

const sliceSentences = (content: string, max = 6) =>
    content
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, max);

const makeTitleFromContent = (content: string, fallback = "Untitled Note") => {
    const firstSentence = sliceSentences(content, 1)[0];
    if (!firstSentence) return fallback;
    return firstSentence.replace(/[.!?]/g, "").slice(0, 90) || fallback;
};

const buildFallbackResult = (
    content: string,
    config: GenerationConfig,
    actionInstruction: string | null,
    purpose: PurposeFallback,
) => {
    const summarySentences = sliceSentences(content, 2);
    const summary = summarySentences.length
        ? summarySentences.join(" ")
        : "Summary unavailable (content too short).";

    const baseTitle = makeTitleFromContent(content, "AI Draft");
    const sentences = sliceSentences(content, 6);
    const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const keyPoints = sentences.map((sentence) => `- ${sentence}`);

    const formatSections = (sections: { heading: string; body: string[] }[]) =>
        sections
            .map((section) => `### ${section.heading}\n${section.body.join("\n")}`)
            .join("\n\n");

    const qaPairs = sentences.slice(0, 3).map((sentence, index) => (
        `**Q${index + 1}:** What is the main idea ${index === 0 ? "here" : "next"}?\n**A${index + 1}:** ${sentence}`
    ));

    const flashcardPairs = sentences.slice(0, 3).map((sentence, index) => (
        `**Card ${index + 1}**\n**Prompt:** ${sentence.split(/[:-]/)[0] || "Key idea"}\n**Answer:** ${sentence}`
    ));

    const faqPairs = sentences.slice(0, 4).map((sentence, index) => (
        `**Q${index + 1}:** ${sentence.split(/[:.-]/)[0] || "Key takeaway"}?\n**A:** ${sentence}`
    ));

    const meetingSections = formatSections([
        { heading: "Agenda Highlights", body: keyPoints.slice(0, 3) },
        { heading: "Discussion Notes", body: paragraphs.slice(0, 2) },
        { heading: "Decisions & Next Steps", body: keyPoints.slice(3, 6) },
    ]);

    switch (purpose) {
        case "smart_notes":
            return {
                title: `${baseTitle} — Smart Notes`,
                summary,
                formattedContent: formatSections([
                    { heading: "Overview", body: [summary] },
                    { heading: "Highlights", body: keyPoints.slice(0, 4) },
                    { heading: "Next Steps", body: keyPoints.slice(4) },
                ]),
                tags: ["smart-notes", config.tone, config.format],
            };
        case "summary":
            return {
                title: `${baseTitle} — Summary`,
                summary,
                formattedContent: `### Executive Summary\n${summary}\n\n**Key Insights**\n${keyPoints.join("\n")}`,
                tags: ["summary", config.tone],
            };
        case "key_points":
            return {
                title: `${baseTitle} — Key Points`,
                summary,
                formattedContent: `### Key Points\n${keyPoints.join("\n")}`,
                tags: ["key-points", config.format],
            };
        case "qa":
            return {
                title: `${baseTitle} — Q&A`,
                summary,
                formattedContent: `### Generated Q&A\n${qaPairs.join("\n\n")}`,
                tags: ["qa", "insights"],
            };
        case "flashcards":
            return {
                title: `${baseTitle} — Flashcards`,
                summary,
                formattedContent: `### Flashcards\n${flashcardPairs.join("\n\n")}`,
                tags: ["flashcards", "study"],
            };
        case "rewrite_social":
            return {
                title: `${baseTitle} — Social Rewrite`,
                summary,
                formattedContent: `Hey everyone — ${summary}\n\n${paragraphs.join("\n\n")}`,
                tags: ["rewrite", "social"],
            };
        case "faqs":
            return {
                title: `${baseTitle} — FAQs`,
                summary,
                formattedContent: `### FAQs & Insights\n${faqPairs.join("\n\n")}`,
                tags: ["faqs", "insights"],
            };
        case "meeting_notes":
            return {
                title: `${baseTitle} — Meeting Notes`,
                summary,
                formattedContent: meetingSections,
                tags: ["meeting-notes", "recap"],
            };
        default:
            return {
                title: baseTitle,
                summary,
                formattedContent: `${config.format === "paragraph" ? paragraphs.join("\n\n") : keyPoints.join("\n")}\n\n_${actionInstruction ?? "AI fallback output."}_`,
                tags: ["ai-fallback", config.tone, config.format],
            };
    }
};

export const generateNote = async (
    rawContent: string,
    config: GenerationConfig,
    options?: GenerateNoteOptions
): Promise<{ title: string; summary: string; formattedContent: string; tags: string[] }> => {
    const actionInstruction = options?.purpose?.instructions ?? null;
    const systemInstruction = `
    You are an expert personal assistant and note-taker.
    Convert the provided raw input into a structured, highly organized note.
    Tone: ${config.tone}
    Preferred Format: ${config.format}
    ${options?.purpose ? `
    Current Action Mode: ${options.purpose.label}
    Objective: ${options.purpose.instructions}
    ` : ""}
    Always follow the current action mode if provided.

    You must respond with a valid JSON object containing exactly these fields:
    - title: A catchy but descriptive title (string)
    - summary: A 2-sentence executive summary (string)
    - formattedContent: The full note formatted in Markdown (string)
    - tags: 3-5 relevant category tags (array of strings)

    Respond ONLY with valid JSON, no markdown code blocks or other text.
  `;

    const userContent = actionInstruction
        ? `${rawContent}\n\nAction Requested: ${actionInstruction}`
        : rawContent;

    try {
        const configOverrides = getOpenRouterConfig();
        const data = await requestOpenRouter<{ choices: { message: { content: string } }[] }>({
            model: configOverrides.model,
            max_tokens: configOverrides.maxTokens,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userContent },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "StructuredNote",
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["title", "summary", "formattedContent", "tags"],
                        properties: {
                            title: { type: "string", description: "Catchy note title" },
                            summary: { type: "string", description: "Two sentence summary" },
                            formattedContent: { type: "string", description: "Markdown note body" },
                            tags: {
                                type: "array",
                                minItems: 3,
                                maxItems: 5,
                                items: { type: "string" }
                            }
                        }
                    }
                }
            }
        }, configOverrides);

        const text = data.choices[0]?.message?.content;

        if (!text) {
            throw new Error("Failed to generate content");
        }

        return JSON.parse(text);

    } catch (error) {
        console.error("AI Generation Failed, using Mock Backup:", error);

        const { content, actionInstruction: extractedInstruction } = extractActionContext(userContent);
        const fallbackInstruction = actionInstruction ?? extractedInstruction;
        const purpose = (options?.purpose?.value ?? detectPurpose(fallbackInstruction)) as PurposeFallback;

        return buildFallbackResult(content || rawContent, config, fallbackInstruction, purpose);
    }
};

export const chatWithAI = async (messages: { role: 'user' | 'assistant' | 'system', content: string }[]): Promise<string> => {
    try {
        const configOverrides = getOpenRouterConfig();
        const data = await requestOpenRouter<{ choices: { message: { content: string } }[] }>({
            model: configOverrides.model,
            max_tokens: configOverrides.maxTokens,
            messages: [
                { role: "system", content: "You are a helpful AI assistant for a note-taking app. Answer questions clearly and concisely." },
                ...messages
            ]
        }, configOverrides);

        return data.choices[0]?.message?.content || "No response generated.";

    } catch (error) {
        console.error("Chat Error:", error);
        // Mock Fallback for Chat
        return "I'm having trouble connecting to the internet right now (Check API Key). But I'm here to help!";
    }
};

interface ImageAnalysisResult {
    title: string;
    summary: string;
    formattedContent: string;
    tags: string[];
    raw?: unknown;
}

const resolveApiBase = () => {
    // Client-side: use relative URLs
    if (typeof window !== 'undefined') {
        return '';
    }

    // Server-side: determine the base URL
    // Priority 1: Explicit NEXT_PUBLIC_APP_URL
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }

    // Priority 2: Vercel automatic URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // Priority 3: Local development
    return 'http://localhost:3000';
};

export const analyzeImageNote = async (
    dataUrl: string,
    mimeType: string,
    prompt: string
): Promise<ImageAnalysisResult> => {

    if (!prompt || !prompt.trim()) {
        throw new Error("Prompt is required for image analysis");
    }

    const normalizedMime = mimeType || "image/png";
    const base64Data = dataUrl.startsWith("data:") ? dataUrl.split(",")[1] ?? "" : dataUrl;

    if (!base64Data) {
        throw new Error("Invalid image data provided");
    }

    const attachment: AttachmentPayload = {
        id: `inline-image-${Date.now()}`,
        name: "uploaded-image",
        type: normalizedMime,
        data: base64Data,
        preview: dataUrl.startsWith("data:") ? dataUrl : null,
    };

    const analysisPrompt = `You are an expert vision note-taker. Analyze the attached image and respond to the following request. Provide structured, concise insights, reference any visible text, and call out notable details.\n\nUser request: ${prompt.trim()}`;

    const configOverrides = getOpenRouterConfig();
    const payload = buildOpenRouterPayload(
        {
            prompt: analysisPrompt,
            attachments: [attachment],
            conversation: [],
        },
        configOverrides
    );

    const answer = (await callOpenRouter(payload, configOverrides)).trim();

    if (!answer) {
        throw new Error("Empty AI response");
    }

    return {
        title: "Image Insight",
        summary: answer.length > 200 ? `${answer.slice(0, 200)}…` : answer,
        formattedContent: `Question: ${prompt}\n\n${answer}`,
        tags: ["image"],
        raw: answer,
    };
};
