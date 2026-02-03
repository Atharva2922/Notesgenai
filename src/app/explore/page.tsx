"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

type TrendStory = {
    id: string;
    title: string;
    url: string;
    points: number;
    author: string;
    comments: number;
    source: string;
    publishedAt: string;
};

type CommunityDrop = {
    id: string;
    title: string;
    curator: string;
    description: string;
    tags: string[];
    color: string;
};

type CuratedStream = {
    title: string;
    summary: string;
    tags: string[];
};

type LocaleConfig = {
    hl: string;
    gl: string;
    ceid: string;
};

type CityPreset = {
    code: string;
    label: string;
    query?: string;
    keywords?: string[];
    locale?: LocaleConfig;
};

type CountryPreset = {
    code: string;
    label: string;
    query?: string;
    keywords?: string[];
    locale: LocaleConfig;
    cities?: CityPreset[];
};

type RegionPreset = {
    label: string;
    query: string;
    blurb: string;
    countries: CountryPreset[];
};

type RegionKey = keyof typeof REGION_PRESETS;
type CategoryKey = (typeof CATEGORY_FILTERS)[number]["id"];

type SelectOption = {
    value: string;
    label: string;
};

const FALLBACK_TRENDS: TrendStory[] = [
    {
        id: "fallback-1",
        title: "Meta releases open dataset for multimodal copilots",
        url: "https://ai.facebook.com/blog/",
        points: 284,
        author: "meta-research",
        comments: 72,
        source: "ai.facebook.com",
        publishedAt: new Date().toISOString(),
    },
    {
        id: "fallback-2",
        title: "European Parliament drafts new AI accountability rules",
        url: "https://europa.eu/press-release",
        points: 198,
        author: "policywatch",
        comments: 41,
        source: "europa.eu",
        publishedAt: new Date().toISOString(),
    },
    {
        id: "fallback-3",
        title: "Operator playbooks for realtime copilots",
        url: "https://blog.latent.space",
        points: 153,
        author: "latent-space",
        comments: 28,
        source: "blog.latent.space",
        publishedAt: new Date().toISOString(),
    },
];

const COMMUNITY_SHOWCASE: CommunityDrop[] = [
    {
        id: "spotlight-1",
        title: "Founders Morning Brief",
        curator: "Nia Gomez",
        description: "7-minute scan of funding rounds, breakout startups, and operator wisdom.",
        tags: ["startups", "operators", "strategy"],
        color: "from-blue-500/70 to-indigo-500/70",
    },
    {
        id: "spotlight-2",
        title: "Design Practicum",
        curator: "Aiden Takahashi",
        description: "Weekly teardown of standout UX patterns and the prompts behind them.",
        tags: ["ux", "design", "prompting"],
        color: "from-violet-500/70 to-pink-500/70",
    },
    {
        id: "spotlight-3",
        title: "Campus Research Radar",
        curator: "Maya D.",
        description: "AI research digest focused on agentic workflows and applied science.",
        tags: ["research", "agents", "academia"],
        color: "from-emerald-500/70 to-teal-500/70",
    },
];

const CURATED_STREAMS: CuratedStream[] = [
    {
        title: "Realtime Copilots",
        summary: "How teams redesign rituals around second-to-second copilots and latency budgets.",
        tags: ["voice", "latency", "ops"],
    },
    {
        title: "Creative Systems",
        summary: "Studios layering custom models for illustration, motion, and sonic palettes.",
        tags: ["art", "multimodal", "workflow"],
    },
    {
        title: "Learning Labs",
        summary: "Cohorts building AI-native coursework, peer review, and spaced repetition.",
        tags: ["edtech", "founders", "habit"],
    },
];

const DEFAULT_LOCALE: LocaleConfig = { hl: "en-US", gl: "US", ceid: "US:en" };

const REGION_PRESETS: Record<string, RegionPreset> = {
    global: {
        label: "Global Pulse",
        query: '"artificial intelligence" OR genAI',
        blurb: "Cross-continental breakthroughs and platform updates.",
        countries: [
            {
                code: "worldwide",
                label: "Worldwide",
                locale: { hl: "en-US", gl: "US", ceid: "US:en" },
                cities: [
                    { code: "nyc", label: "New York City", query: '"New York" tech', keywords: ["new york", "nyc"] },
                    { code: "sf", label: "San Francisco", query: '"San Francisco" AI startups', keywords: ["san francisco", "silicon valley"] },
                ],
            },
            {
                code: "africa",
                label: "Africa",
                query: "Africa technology AI",
                keywords: ["africa", "kenya", "nigeria", "south africa"],
                locale: { hl: "en-ZA", gl: "ZA", ceid: "ZA:en" },
                cities: [
                    { code: "nairobi", label: "Nairobi", query: "Nairobi innovation hub", keywords: ["nairobi"] },
                    { code: "lagos", label: "Lagos", query: "Lagos startup ecosystem", keywords: ["lagos"] },
                ],
            },
            {
                code: "latam",
                label: "Latin America",
                query: '"Latin America" tecnologia IA',
                keywords: ["latam", "argentina", "brazil", "mexico"],
                locale: { hl: "es-419", gl: "MX", ceid: "MX:es" },
                cities: [
                    { code: "sao-paulo", label: "São Paulo", query: '"São Paulo" tecnologia', keywords: ["sao paulo"] },
                    { code: "mexico-city", label: "Mexico City", query: '"Ciudad de México" innovación', keywords: ["cdmx", "mexico city"] },
                ],
            },
        ],
    },
    americas: {
        label: "Americas",
        query: '"artificial intelligence" AND (Americas OR USA OR Canada)',
        blurb: "North & South American policy, funding, and operator playbooks.",
        countries: [
            {
                code: "us",
                label: "United States",
                query: '"United States" innovation policy',
                keywords: ["united states", "us", "silicon valley", "nyc"],
                locale: { hl: "en-US", gl: "US", ceid: "US:en" },
                cities: [
                    { code: "bay-area", label: "Bay Area", query: '"Bay Area" AI funding', keywords: ["bay area", "silicon valley"] },
                    { code: "austin", label: "Austin", query: "Austin tech scene", keywords: ["austin"] },
                ],
            },
            {
                code: "canada",
                label: "Canada",
                query: "Canada AI research",
                keywords: ["canada", "toronto", "montreal", "vancouver"],
                locale: { hl: "en-CA", gl: "CA", ceid: "CA:en" },
                cities: [
                    { code: "toronto", label: "Toronto", query: "Toronto AI lab", keywords: ["toronto"] },
                    { code: "montreal", label: "Montreal", query: "Montreal Mila research", keywords: ["montreal"] },
                ],
            },
            {
                code: "mexico",
                label: "Mexico",
                query: "México inteligencia artificial",
                keywords: ["mexico", "cdmx", "guadalajara"],
                locale: { hl: "es-419", gl: "MX", ceid: "MX:es" },
                cities: [
                    { code: "guadalajara", label: "Guadalajara", query: "Guadalajara tecnología", keywords: ["guadalajara"] },
                ],
            },
        ],
    },
    europe: {
        label: "Europe",
        query: '"European Union" AI policy',
        blurb: "EU regulations, UK labs, and continental research coalitions.",
        countries: [
            {
                code: "uk",
                label: "United Kingdom",
                query: '"United Kingdom" AI labs',
                keywords: ["united kingdom", "london", "oxford", "cambridge"],
                locale: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
                cities: [
                    { code: "london", label: "London", query: "London AI lab", keywords: ["london"] },
                    { code: "manchester", label: "Manchester", query: "Manchester innovation district", keywords: ["manchester"] },
                ],
            },
            {
                code: "germany",
                label: "Germany",
                query: "Deutschland künstliche intelligenz",
                keywords: ["germany", "berlin", "munich"],
                locale: { hl: "de-DE", gl: "DE", ceid: "DE:de" },
                cities: [
                    { code: "berlin", label: "Berlin", query: "Berlin KI startup", keywords: ["berlin"] },
                ],
            },
            {
                code: "france",
                label: "France",
                query: "France intelligence artificielle",
                keywords: ["france", "paris"],
                locale: { hl: "fr-FR", gl: "FR", ceid: "FR:fr" },
                cities: [
                    { code: "paris", label: "Paris", query: "Paris IA recherche", keywords: ["paris"] },
                ],
            },
            {
                code: "nordic",
                label: "Nordic",
                query: "Sweden Norway Finland Denmark AI",
                keywords: ["sweden", "norway", "finland", "denmark"],
                locale: { hl: "en-SE", gl: "SE", ceid: "SE:en" },
                cities: [
                    { code: "stockholm", label: "Stockholm", query: "Stockholm tech scene", keywords: ["stockholm"] },
                ],
            },
        ],
    },
    apac: {
        label: "APAC",
        query: "Asia Pacific AI industry",
        blurb: "APAC model launches, scale-ups, and developer ecosystems.",
        countries: [
            {
                code: "india",
                label: "India",
                query: "India AI policy Bharat",
                keywords: ["india", "delhi", "bengaluru", "mumbai"],
                locale: { hl: "en-IN", gl: "IN", ceid: "IN:en" },
                cities: [
                    { code: "bengaluru", label: "Bengaluru", query: "Bengaluru AI startup", keywords: ["bengaluru", "bangalore"] },
                    { code: "delhi", label: "Delhi NCR", query: "Delhi tech policy", keywords: ["delhi"] },
                    { code: "mumbai", label: "Mumbai", query: "Mumbai AI innovation", keywords: ["mumbai", "bombay"] },
                    {
                        code: "pune",
                        label: "Pune",
                        query: "\"Pune\" AI site:lokmat.com",
                        keywords: ["pune", "lokmat"],
                    },
                    {
                        code: "pcmc",
                        label: "Pimpri-Chinchwad",
                        query: "\"Pimpri Chinchwad\" AI site:lokmat.com",
                        keywords: ["pimpri", "chinchwad", "pcmc", "lokmat"],
                    },
                ],
            },
            {
                code: "japan",
                label: "Japan",
                query: "日本 生成AI",
                keywords: ["japan", "tokyo", "osaka"],
                locale: { hl: "ja-JP", gl: "JP", ceid: "JP:ja" },
                cities: [
                    { code: "tokyo", label: "Tokyo", query: "東京 AI 研究", keywords: ["tokyo"] },
                ],
            },
            {
                code: "korea",
                label: "Korea",
                query: "대한민국 인공지능",
                keywords: ["korea", "seoul"],
                locale: { hl: "ko-KR", gl: "KR", ceid: "KR:ko" },
                cities: [
                    { code: "seoul", label: "Seoul", query: "서울 인공지능", keywords: ["seoul"] },
                ],
            },
            {
                code: "australia",
                label: "Australia",
                query: "Australia AI research",
                keywords: ["australia", "sydney", "melbourne"],
                locale: { hl: "en-AU", gl: "AU", ceid: "AU:en" },
                cities: [
                    { code: "sydney", label: "Sydney", query: "Sydney AI cluster", keywords: ["sydney"] },
                    { code: "melbourne", label: "Melbourne", query: "Melbourne research center", keywords: ["melbourne"] },
                ],
            },
        ],
    },
};

const CATEGORY_FILTERS = [
    { id: "top", label: "Top stories", query: "", keywords: [] },
    { id: "politics", label: "Politics", query: "politics parliament policy regulation", keywords: ["policy", "minister", "campaign"] },
    { id: "education", label: "Education", query: "education university campus research", keywords: ["university", "school", "campus"] },
    { id: "economy", label: "Business & Economy", query: "economy funding investment venture capital", keywords: ["funding", "investment", "budget"] },
    { id: "technology", label: "Technology", query: "technology startup product launch", keywords: ["startup", "tech", "product"] },
] as const;

const heroStats = [
    { label: "Signals tracked", value: "482", delta: "+36 this week" },
    { label: "Communities featured", value: "28", delta: "6 new curators" },
    { label: "Realtime prompts", value: "3.1K", delta: "Updated hourly" },
];

export default function ExplorePage() {
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);
    const [trending, setTrending] = useState<TrendStory[]>([]);
    const [isLoadingTrends, setIsLoadingTrends] = useState(true);
    const [trendError, setTrendError] = useState<string | null>(null);
    const [region, setRegion] = useState<RegionKey>("global");
    const [country, setCountry] = useState<string>(REGION_PRESETS.global.countries[0].code);
    const [city, setCity] = useState<string | null>(REGION_PRESETS.global.countries[0].cities?.[0]?.code ?? null);
    const [category, setCategory] = useState<CategoryKey>("top");
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const fetchTrends = useCallback(
        async (
            targetRegion: RegionKey,
            targetCountry: string,
            targetCity: string | null,
            targetCategory: CategoryKey,
        ) => {
            setIsLoadingTrends(true);
            try {
                const regionPreset = REGION_PRESETS[targetRegion];
                const countryPreset =
                    regionPreset.countries.find((entry) => entry.code === targetCountry) ?? regionPreset.countries[0];
                const cityPreset = countryPreset.cities?.find((entry) => entry.code === targetCity);
                const categoryPreset = CATEGORY_FILTERS.find((entry) => entry.id === targetCategory) ?? CATEGORY_FILTERS[0];

                const cityQuery =
                    cityPreset?.query ??
                    (cityPreset ? `"${cityPreset.label}" artificial intelligence` : "");
                const composedQuery = [
                    regionPreset.query,
                    countryPreset.query,
                    categoryPreset.query,
                    cityQuery,
                ]
                    .filter(Boolean)
                    .join(" AND ")
                    .trim();

                const locale: LocaleConfig = {
                    hl: cityPreset?.locale?.hl ?? countryPreset.locale.hl ?? DEFAULT_LOCALE.hl,
                    gl: cityPreset?.locale?.gl ?? countryPreset.locale.gl ?? DEFAULT_LOCALE.gl,
                    ceid: cityPreset?.locale?.ceid ?? countryPreset.locale.ceid ?? DEFAULT_LOCALE.ceid,
                };

                const response = await fetch(
                    `/api/trends?${new URLSearchParams({
                        q: composedQuery || regionPreset.query,
                        page: Math.floor(Math.random() * 3).toString(),
                        hitsPerPage: "8",
                        hl: locale.hl,
                        gl: locale.gl,
                        ceid: locale.ceid,
                    }).toString()}`,
                    { cache: "no-store" },
                );

                if (!response.ok) {
                    throw new Error(`Trend request failed (${response.status})`);
                }

                const data = await response.json();
                if (!Array.isArray(data.hits)) {
                    throw new Error("Malformed trend payload");
                }

                const mapped: TrendStory[] = data.hits
                    .filter((hit: any) => hit.title && hit.url)
                    .map((hit: any) => {
                        const url = hit.url as string;
                        let hostname = "news.ycombinator.com";
                        try {
                            hostname = new URL(url).hostname.replace(/^www\./, "");
                        } catch {
                            // ignore malformed URLs
                        }
                        return {
                            id: hit.objectID ?? `${url}-${Math.random()}`,
                            title: hit.title,
                            url,
                            points: hit.points ?? 0,
                            author: hit.author ?? "anon",
                            comments: hit.num_comments ?? 0,
                            source: hit.source ?? hostname,
                            publishedAt: hit.created_at ?? new Date().toISOString(),
                        };
                    });

                const keywordPool = [
                    ...(countryPreset.keywords ?? []),
                    ...(cityPreset?.keywords ?? []),
                    cityPreset?.label,
                    ...(categoryPreset.keywords ?? []),
                ].reduce<string[]>((acc, token) => {
                    if (typeof token === "string" && token.trim().length > 0) {
                        acc.push(token.toLowerCase());
                    }
                    return acc;
                }, []);

                const filtered =
                    keywordPool.length > 0
                        ? mapped.filter((story) =>
                              keywordPool.some((token) =>
                                  `${story.title} ${story.source}`.toLowerCase().includes(token),
                              ),
                          )
                        : mapped;

                const curated = keywordPool.length > 0 && filtered.length === 0 ? mapped : filtered;

                const deduped = curated.filter(
                    (story, index, array) =>
                        array.findIndex((candidate) => candidate.title === story.title && candidate.url === story.url) ===
                        index,
                );

                const shuffled = [...deduped].sort(() => Math.random() - 0.5);
                setTrending(shuffled.length ? shuffled : FALLBACK_TRENDS);
                setTrendError(null);
                setLastUpdated(new Date().toISOString());
            } catch (error) {
                console.error("Explore trends failed", error);
                setTrendError("Live trends are temporarily unavailable. Showing editor picks.");
                setTrending(FALLBACK_TRENDS);
                setLastUpdated(null);
            } finally {
                setIsLoadingTrends(false);
            }
        },
        [],
    );

    useEffect(() => {
        const defaultCountry = REGION_PRESETS[region].countries[0];
        setCountry(defaultCountry.code);
        setCity(defaultCountry.cities?.[0]?.code ?? null);
    }, [region]);

    useEffect(() => {
        const nextCity = REGION_PRESETS[region].countries.find((entry) => entry.code === country)?.cities?.[0];
        setCity(nextCity?.code ?? null);
    }, [region, country]);

    useEffect(() => {
        fetchTrends(region, country, city, category);
    }, [fetchTrends, region, country, city, category]);

    const currentRegion = REGION_PRESETS[region];
    const currentCountry = currentRegion.countries.find((entry) => entry.code === country) ?? currentRegion.countries[0];
    const currentCity = currentCountry.cities?.find((entry) => entry.code === city) ?? null;
    const currentCategory = CATEGORY_FILTERS.find((entry) => entry.id === category) ?? CATEGORY_FILTERS[0];

    const activeHeroStats = useMemo(() => heroStats, []);

    return (
        <div className="min-h-screen bg-[#f6f7fb] pt-14">
            <Navbar onSearch={() => {}} />

            <div className="flex max-w-[1400px] mx-auto min-h-[calc(100vh-3.5rem)]">
                <Sidebar onWidthChange={setSidebarWidth} onIsResizing={setIsResizing} />

                <main
                    className={`flex-1 p-6 space-y-6 ${isResizing ? "" : "transition-all duration-300 ease-in-out"}`}
                    style={{ marginLeft: `${sidebarWidth}px` }}
                >
                    <section className="rounded-[32px] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white px-8 py-10 shadow-xl border border-white/10">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-4 max-w-2xl">
                                <p className="uppercase tracking-[0.4em] text-xs text-white/60">Global discovery</p>
                                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
                                    See what the AI world is talking about right now.
                                </h1>
                                <p className="text-white/80 text-base">{currentRegion.blurb}</p>
                                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                                    Focus: {currentCountry.label}
                                    {currentCity ? ` · ${currentCity.label}` : ""} · {currentCategory.label}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        className="rounded-full bg-white text-slate-900 px-5 py-2 text-sm font-semibold hover:bg-slate-100 transition"
                                        onClick={() => fetchTrends(region, country, city, category)}
                                        disabled={isLoadingTrends}
                                    >
                                        {isLoadingTrends ? "Refreshing…" : "Refresh live feed"}
                                    </button>
                                    <Link
                                        href="/create"
                                        className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                                    >
                                        Launch new note
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <FilterSelect
                                        label="Region"
                                        value={region}
                                        onChange={(value) => setRegion(value as RegionKey)}
                                        options={(Object.keys(REGION_PRESETS) as RegionKey[]).map((key) => ({
                                            value: key,
                                            label: REGION_PRESETS[key].label,
                                        }))}
                                    />
                                    <FilterSelect
                                        label="Country"
                                        value={currentCountry.code}
                                        onChange={(value) => setCountry(value)}
                                        options={currentRegion.countries.map((entry) => ({
                                            value: entry.code,
                                            label: entry.label,
                                        }))}
                                    />
                                    {currentCountry.cities?.length ? (
                                        <FilterSelect
                                            label="City"
                                            value={currentCity?.code ?? ""}
                                            onChange={(value) => setCity(value || null)}
                                            options={currentCountry.cities.map((entry) => ({
                                                value: entry.code,
                                                label: entry.label,
                                            }))}
                                        />
                                    ) : null}
                                    <FilterSelect
                                        label="Category"
                                        value={category}
                                        onChange={(value) => setCategory(value as CategoryKey)}
                                        options={CATEGORY_FILTERS.map((entry) => ({ value: entry.id, label: entry.label }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
                                {activeHeroStats.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur"
                                    >
                                        <p className="text-sm uppercase tracking-wide text-white/50">{stat.label}</p>
                                        <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                                        <p className="text-xs text-emerald-300 mt-1">{stat.delta}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 flex flex-col">
                            <header className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Live feed</p>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        AI Trend Radar · {currentRegion.label} · {currentCountry.label}
                                        {currentCity ? ` · ${currentCity.label}` : ""} · {currentCategory.label}
                                    </h2>
                                </div>
                                <span className="text-xs text-gray-500">
                                    Updated {isLoadingTrends ? "…" : lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "editor picks"}
                                </span>
                            </header>

                            {trendError ? (
                                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    {trendError}
                                </div>
                            ) : null}

                            <div className="flex-1 space-y-4">
                                {isLoadingTrends
                                    ? Array.from({ length: 4 }).map((_, index) => (
                                          <div
                                              key={`skeleton-${index}`}
                                              className="animate-pulse rounded-2xl border border-gray-100 p-4 bg-gray-50"
                                          >
                                              <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                                              <div className="h-3 w-1/3 bg-gray-200 rounded" />
                                          </div>
                                      ))
                                    : trending.map((story) => (
                                          <a
                                              key={story.id}
                                              href={story.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block rounded-2xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-md transition bg-white"
                                          >
                                              <div className="flex items-start justify-between gap-4">
                                                  <div className="space-y-1">
                                                      <p className="text-xs uppercase tracking-[0.35em] text-indigo-500">
                                                          {story.source}
                                                      </p>
                                                      <h3 className="text-base font-semibold text-gray-900">{story.title}</h3>
                                                  </div>
                                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                                      {new Date(story.publishedAt).toLocaleDateString()}
                                                  </span>
                                              </div>
                                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                                  <span>▲ {story.points.toLocaleString()} points</span>
                                                  <span>💬 {story.comments.toLocaleString()} comments</span>
                                                  <span>@{story.author}</span>
                                              </div>
                                          </a>
                                      ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
                                <header className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Spotlights</p>
                                        <h2 className="text-xl font-semibold text-gray-900">Community Channels</h2>
                                    </div>
                                    <span className="text-xs text-gray-500">Handpicked curators</span>
                                </header>
                                <div className="space-y-4">
                                    {COMMUNITY_SHOWCASE.map((drop) => (
                                        <div
                                            key={drop.id}
                                            className={`rounded-3xl border border-gray-100 bg-gradient-to-r ${drop.color} text-white p-5 shadow-sm`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm uppercase tracking-[0.35em] text-white/70">{drop.curator}</p>
                                                <div className="flex gap-2 text-xs">
                                                    {drop.tags.map((tag) => (
                                                        <span key={tag} className="rounded-full bg-white/20 px-3 py-1">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-semibold mt-3">{drop.title}</h3>
                                            <p className="text-sm text-white/80 mt-2">{drop.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
                                <header className="mb-4">
                                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Curated streams</p>
                                    <h2 className="text-xl font-semibold text-gray-900">Operator playlists</h2>
                                </header>
                                <div className="space-y-4">
                                    {CURATED_STREAMS.map((stream) => (
                                        <div
                                            key={stream.title}
                                            className="rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-semibold text-gray-900">{stream.title}</h3>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                    {stream.tags.map((tag) => (
                                                        <span key={tag} className="rounded-full bg-gray-100 px-3 py-1">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">{stream.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
}) {
    return (
        <label className="text-xs uppercase tracking-[0.35em] text-white/60 flex flex-col gap-1">
            {label}
            <div className="relative">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="appearance-none rounded-2xl bg-white/10 border border-white/30 text-white text-sm font-semibold px-4 py-2 pr-9 backdrop-blur focus:outline-none focus:border-white/80"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value} className="text-slate-900">
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70">▾</span>
            </div>
        </label>
    );
}
