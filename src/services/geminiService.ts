"use server";

import { GenerationConfig, PurposeActionDefinition, PurposeActionValue } from "@/types";

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

interface OpenRouterResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export const generateNote = async (
    rawContent: string,
    config: GenerationConfig,
    options?: GenerateNoteOptions
): Promise<{ title: string; summary: string; formattedContent: string; tags: string[] }> => {
    const apiKey = process.env.TEXT_AI_API_KEY;

    if (!apiKey) {
        throw new Error("TEXT_AI_API_KEY is not set");
    }

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
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Notes Generator",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: userContent }
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
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data: OpenRouterResponse = await response.json();
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
    const apiKey = process.env.TEXT_AI_API_KEY;

    if (!apiKey) {
        throw new Error("TEXT_AI_API_KEY is not set");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Notes Generator",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: "You are a helpful AI assistant for a note-taking app. Answer questions clearly and concisely." },
                    ...messages
                ]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data: OpenRouterResponse = await response.json();
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

const classifyImageIntent = (input: string) => {
    const normalized = input.toLowerCase();

    // Only classify as color_analysis if ONLY asking about colors (not combined with other questions)
    if (/^(what|which|tell me)?\s*(color|colour|palette|shade|hue)s?\s*(is|are|of)?/i.test(normalized)
        && !/name|who|what is|identify|describe|character/.test(normalized)) {
        return 'color_analysis';
    }

    if (/text|ocr|read|extract|written/.test(normalized)) return 'ocr';
    if (/count|how many|number of/.test(normalized)) return 'counting';
    if (/weight|size|distance|age|estimate/.test(normalized)) return 'estimation';
    if (/identify|what is this|which object|who is|character|person/.test(normalized)) return 'object_identification';
    if (/describe|what's happening|scene/.test(normalized)) return 'description';

    return 'general_analysis';
};

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

    const imagePayload = dataUrl.startsWith("data:")
        ? dataUrl
        : `data:${mimeType || "image/png"};base64,${dataUrl}`;

    const intent = classifyImageIntent(prompt);
    const baseUrl = resolveApiBase();

    const intentSystemPrompts: Record<string, string> = {
        color_analysis: `
You are a color analysis AI.
The user is asking about colors in the image.
Identify the colors accurately and describe them clearly.
If the user asks for additional context (like names or objects), provide that too.
Be accurate and thorough.
`.trim(),

        estimation: `
You are an image-based estimation AI.
Provide accurate numeric estimates based on what you see.
Explain your reasoning briefly.
Be as precise as possible.
`.trim(),

        ocr: `
You are an OCR assistant.
Extract all visible text from the image accurately.
Preserve formatting where relevant.
If no text is visible, say so clearly.
`.trim(),

        counting: `
You are a visual counting assistant.
Count what the user asked for accurately.
Provide the number and a brief clarification.
Be precise and thorough.
`.trim(),

        object_identification: `
You are an object and character identification AI.
Identify what you see in the image accurately.
Provide names, descriptions, and relevant details.
Be specific and accurate. If you recognize characters, brands, or objects, name them.
`.trim(),

        description: `
You are an image description AI.
Describe what you see in detail.
Be accurate, thorough, and helpful.
Include relevant context and details.
`.trim(),

        general_analysis: `
You are a helpful image analysis AI.
Answer the user's question accurately based on what you see.
Be thorough, accurate, and provide relevant details.
If you're unsure, say so rather than guessing.
`.trim(),
    };

    const systemPrompt =
        intentSystemPrompts[intent] ?? intentSystemPrompts.general_analysis;

    const response = await fetch(`${baseUrl}/api/image-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            imageDataUrl: imagePayload,
            prompt,
            systemPrompt,
        }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();
    const answer = String(data.answer ?? "").trim();

    if (!answer) {
        throw new Error("Empty AI response");
    }

    return {
        title:
            intent === "estimation"
                ? "Estimated Result"
                : intent === "ocr"
                    ? "Extracted Text"
                    : "Image Insight",
        summary: answer.length > 200 ? answer.slice(0, 200) + "…" : answer,
        formattedContent: `Question: ${prompt}\n\n${answer}`,
        tags: ["image", intent],
        raw: data,
    };
};
