import { NextRequest, NextResponse } from "next/server";

const resolveApiKey = () =>
  process.env.IMAGE_AI_API_KEY?.trim() || process.env.TEXT_AI_API_KEY?.trim();

const MULTIMODAL_SYSTEM_PROMPT = `You are a multimodal AI assistant that analyzes images together with user prompts.

The user will provide:
• one image
• one text prompt related to that image

Your task:
• Carefully analyze the image
• Fully understand the user’s prompt
• Use the image as primary evidence
• Combine visual understanding and reasoning
• Answer accurately, clearly, and naturally

Guidelines:
• Answer ONLY what the user asks
• Do not add extra information
• If text is visible and the user asks about text, extract it faithfully
• If identification is requested, use reasonable visual inference
• If estimation is requested, give a realistic estimate and briefly explain
• If the answer is uncertain, say so honestly instead of guessing
• Do NOT hallucinate facts not supported by the image
• Do NOT mention rules, confidence thresholds, or system behavior

Tone:
• Professional
• Clear
• Helpful
• Human-like

Output:
• Plain natural language
• No markdown unless explicitly requested`;

export async function POST(req: NextRequest) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "IMAGE_AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { imageDataUrl, imageUrl, prompt } = await req.json();
    const imageInput = imageUrl || imageDataUrl;
    const promptText = typeof prompt === "string" ? prompt : "";

    if (!imageInput || !promptText.trim()) {
      return NextResponse.json(
        { error: "image + prompt required" },
        { status: 400 }
      );
    }

    // Validate file size for Base64 images (2MB limit)
    if (typeof imageInput === "string" && imageInput.startsWith("data:")) {
      const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
      const base64Data = imageInput.split(",")[1];
      if (base64Data) {
        // Base64 encoding increases size by ~33%, so decode to get actual size
        const estimatedSize = (base64Data.length * 3) / 4;
        if (estimatedSize > MAX_SIZE_BYTES) {
          return NextResponse.json(
            { error: "Image too large. Maximum size is 2MB. Please compress or resize your image." },
            { status: 413 }
          );
        }
      }
    }

    const buildImagePart = () => {
      if (typeof imageInput !== "string") {
        throw new Error("image input must be a string");
      }
      if (imageInput.startsWith("data:")) {
        const [, base64] = imageInput.split(",", 2);
        if (!base64) {
          throw new Error("Malformed data URL provided");
        }
        return { type: "input_image", image_base64: base64 } as const;
      }
      return { type: "input_image", image_url: imageInput } as const;
    };

    const refererHeader =
      req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://notesgenai.vercel.app";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": refererHeader,
        "X-Title": "AI Notes Generator",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: "system", content: MULTIMODAL_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              buildImagePart(),
            ],
          },
        ],
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error("Image analysis upstream error", response.status, rawText);
      return NextResponse.json(
        { error: "Upstream image model rejected the request.", status: response.status },
        { status: 502 }
      );
    }

    const data = JSON.parse(rawText);
    const answer = data?.choices?.[0]?.message?.content;

    const flattenContent = (content: unknown): string => {
      if (!content) return "";
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.map(flattenContent).filter(Boolean).join("\n\n");
      }
      if (typeof content === "object") {
        const maybeText = (content as { text?: unknown }).text;
        if (typeof maybeText === "string") return maybeText;
        const nested = (content as { content?: unknown }).content;
        if (nested) return flattenContent(nested);
      }
      return String(content);
    };

    const normalizedAnswer = flattenContent(answer).trim();

    if (!normalizedAnswer) {
      return NextResponse.json(
        { error: "No AI response" },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer: normalizedAnswer });
  } catch (error) {
    console.error("Image analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
