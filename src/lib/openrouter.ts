const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    maxHistory: number;
    siteUrl: string;
    appName: string;
}

export interface AttachmentPayload {
    id: string;
    name: string;
    type?: string;
    size?: number;
    preview?: string | null;
    data: string | null;
}

export interface ConversationMessage {
    role: "user" | "assistant";
    content: string;
}

const toNumber = (value: unknown, fallback: number) => {
    const numeric = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(numeric) ? Number(numeric) : fallback;
};

export const getOpenRouterConfig = (): OpenRouterConfig => {
    const apiKey = process.env.TEXT_AI_API_KEY;
    if (!apiKey) {
        throw new Error("TEXT_AI_API_KEY is not set");
    }

    return {
        apiKey,
        model: process.env.TEXT_AI_MODEL ?? "google/gemini-2.0-flash-001",
        maxTokens: toNumber(process.env.TEXT_AI_MAX_TOKENS ?? 1200, 1200),
        maxHistory: toNumber(process.env.TEXT_AI_MAX_HISTORY ?? 6, 6),
        siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        appName: process.env.TEXT_AI_APP_NAME ?? "AI Notes Generator",
    };
};

export const normalizeHistory = (conversation: ConversationMessage[] = [], limit = 6) =>
    conversation
        .slice(-limit)
        .map((message) => ({
            role: message.role,
            content: message.content,
        }))
        .filter((entry) => entry.content.trim().length > 0);

export const mapAttachmentsForApi = (attachments: AttachmentPayload[] = []) =>
    attachments
        .filter((item) => item?.data)
        .map((file) => ({
            type: "image_url",
            image_url: {
                url: `data:${file.type || "application/octet-stream"};base64,${file.data}`,
            },
        }));

export const fileToBase64 = (blob: File | Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === "string") {
                const [, base64] = result.split(",");
                resolve(base64 ?? "");
            } else {
                resolve("");
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

type MessagePart = string | { type?: string; text?: string };

const isPartObject = (part: MessagePart): part is { type?: string; text?: string } =>
    typeof part === "object" && part !== null;

export const extractTextFromMessage = (message?: { content?: string | MessagePart[] }) => {
    if (!message?.content) return "";
    const content = message.content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === "string") return part;
                if (isPartObject(part) && typeof part.text === "string") return part.text;
                return "";
            })
            .filter(Boolean)
            .join("\n\n");
    }

    if (typeof content === "string") return content;
    if (typeof content === "object") {
        const maybeText = (content as { text?: unknown }).text;
        if (typeof maybeText === "string") {
            return maybeText;
        }
    }
    return "";
};

interface BuildPayloadOptions {
    prompt: string;
    attachments?: AttachmentPayload[];
    conversation?: ConversationMessage[];
}

export const buildOpenRouterPayload = (
    { prompt, attachments = [], conversation = [] }: BuildPayloadOptions,
    config = getOpenRouterConfig()
) => {
    const userContent: unknown[] = [];
    if (prompt.trim()) {
        userContent.push({ type: "text", text: prompt.trim() });
    }
    userContent.push(...mapAttachmentsForApi(attachments));

    if (userContent.length === 0) {
        throw new Error("Prompt or attachments required");
    }

    return {
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
            ...normalizeHistory(conversation, config.maxHistory),
            { role: "user", content: userContent },
        ],
    };
};

export const callOpenRouter = async (
    payload: ReturnType<typeof buildOpenRouterPayload>,
    config = getOpenRouterConfig()
) => {
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            "HTTP-Referer": config.siteUrl,
            "X-Title": config.appName,
        },
        body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
        const errorMessage = json?.error?.message || json?.error || "OpenRouter request failed";
        throw new Error(errorMessage);
    }

    return extractTextFromMessage(json?.choices?.[0]?.message) || "No response generated.";
};

export const requestOpenRouter = async <T = unknown>(
    body: Record<string, unknown>,
    config = getOpenRouterConfig()
): Promise<T> => {
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            "HTTP-Referer": config.siteUrl,
            "X-Title": config.appName,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
};
