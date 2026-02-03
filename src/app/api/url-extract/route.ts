import { NextResponse } from "next/server";
import { extract } from "@extractus/article-extractor";
import { convert } from "html-to-text";

interface TextSelector {
  selector: string;
  options?: Record<string, unknown>;
  format?: string;
}

interface ArticleExtractResponse {
  title?: string;
  content?: string;
  description?: string;
  author?: string;
  published?: string;
}

const formatArticle = (html: string) => {
  if (!html) return "";

  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      { selector: "code", format: "inline" }
    ] as TextSelector[],
    uppercaseHeadings: false,
    preserveNewlines: true
  })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  return paragraphs.slice(0, 25).join("\n\n");
};

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith("http")) {
        return NextResponse.json({ error: "Only HTTP(s) URLs are supported" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const article = (await extract(url)) as ArticleExtractResponse | null;

    if (!article) {
      return NextResponse.json({ error: "Unable to extract article" }, { status: 422 });
    }

    const rawContent = article.content || article.description || "";
    const content = rawContent ? formatArticle(rawContent) : "";

    if (!content) {
      return NextResponse.json({ error: "Article did not contain readable text" }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      article: {
        title: article.title?.trim() || "Untitled article",
        content,
        preview: (article.description && formatArticle(article.description)) || content.split("\n\n")[0]?.slice(0, 280),
        author: article.author || null,
        published: article.published || null,
      },
    });
  } catch (error) {
    console.error("URL extraction failed", error);
    return NextResponse.json({ error: "Failed to extract article" }, { status: 500 });
  }
}
