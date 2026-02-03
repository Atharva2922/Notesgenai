import { NextResponse } from "next/server";

const DEFAULT_LOCALE = {
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
};

const cleanText = (value?: string | null) => {
    if (!value) return "";
    return value
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
};

const extractTag = (block: string, tag: string) => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = block.match(regex);
    return cleanText(match?.[1] ?? "");
};

const extractLink = (raw: string) => {
    const cleaned = cleanText(raw);
    if (!cleaned) return "";
    try {
        const url = new URL(cleaned);
        const redirected = url.searchParams.get("url");
        if (redirected) {
            return decodeURIComponent(redirected);
        }
    } catch {
        // ignore parsing issues
    }
    return cleaned;
};

const parseRss = (xml: string) => {
    const items: {
        title: string;
        link: string;
        source: string;
        pubDate: string;
    }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml))) {
        const block = match[1];
        const title = extractTag(block, "title");
        const link = extractLink(extractTag(block, "link"));
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        const source = cleanText(sourceMatch?.[1] ?? "");
        const pubDate = extractTag(block, "pubDate");
        if (title && link) {
            items.push({
                title,
                link,
                source,
                pubDate,
            });
        }
    }
    return items;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || '"artificial intelligence"';
    const hl = searchParams.get("hl") ?? DEFAULT_LOCALE.hl;
    const gl = searchParams.get("gl") ?? DEFAULT_LOCALE.gl;
    const ceid = searchParams.get("ceid") ?? DEFAULT_LOCALE.ceid;

    const rssUrl = `https://news.google.com/rss/search?${new URLSearchParams({
        q: query,
        hl,
        gl,
        ceid,
    }).toString()}`;

    try {
        const upstream = await fetch(rssUrl, {
            cache: "no-store",
            headers: {
                "User-Agent": "NotesGen-TrendProxy/1.0",
            },
        });

        if (!upstream.ok) {
            return NextResponse.json({ error: "Upstream request failed" }, { status: upstream.status });
        }

        const xml = await upstream.text();
        const parsed = parseRss(xml).slice(0, 12);
        const hits = parsed.map((item, index) => ({
            id: `${item.link}-${index}`,
            title: item.title,
            url: item.link,
            points: 0,
            author: item.source || "Newswire",
            comments: 0,
            source: item.source || "Newswire",
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json({ hits });
    } catch (error) {
        console.error("Trend proxy failed", error);
        return NextResponse.json({ error: "Failed to fetch live trends" }, { status: 500 });
    }
}
