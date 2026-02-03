import { NextRequest, NextResponse } from "next/server";

const resolveApiKey = () =>
  process.env.IMAGE_AI_API_KEY?.trim() || process.env.TEXT_AI_API_KEY?.trim();

export async function POST(req: NextRequest) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "IMAGE_AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { imageDataUrl, imageUrl, prompt, systemPrompt } = await req.json();
    const imageInput = imageUrl || imageDataUrl;

    if (!imageInput || !prompt || !systemPrompt) {
      return NextResponse.json(
        { error: "image + prompt + systemPrompt required" },
        { status: 400 }
      );
    }

    const refererHeader = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://notesgenai.vercel.app";

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
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageInput },
              },
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

    if (!answer) {
      return NextResponse.json(
        { error: "No AI response" },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Image analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
