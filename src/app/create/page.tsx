"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { GenerationConfig, PurposeActionDefinition, PurposeActionValue } from '@/types';
import { generateNote } from '@/services/geminiService';
import { createNote } from '@/actions/notes';
import Toast, { ToastAction } from '@/components/Toast';

const PURPOSE_ACTIONS: PurposeActionDefinition[] = [
    { value: 'smart_notes', label: 'Generate smart notes', instructions: 'Transform the content into well-structured smart notes with sections, highlights, and actionable takeaways.' },
    { value: 'summary', label: 'Create summary', instructions: 'Provide a concise executive summary capturing the main thesis and supporting ideas.' },
    { value: 'key_points', label: 'Extract key points', instructions: 'List the most important bullet points or insights from the content.' },
    { value: 'qa', label: 'Generate Q&A', instructions: 'Create thoughtful question and answer pairs based on the article.' },
    { value: 'flashcards', label: 'Convert to flashcards', instructions: 'Turn the content into concise flashcards with prompts and answers.' },
    { value: 'rewrite_social', label: 'Rewrite as blog / LinkedIn post', instructions: 'Rewrite the content in a polished, first-person voice suitable for a LinkedIn or blog post.' },
    { value: 'faqs', label: 'Extract FAQs / insights', instructions: 'Surface frequently asked questions and insights with answers.' },
    { value: 'meeting_notes', label: 'Create meeting notes', instructions: 'Convert the content into a meeting-style note with agenda, discussion points, decisions, and next steps.' }
] as const;

export default function CreateNotePage() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);
    const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');
    const [isRecording, setIsRecording] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: "info" | "error" | "success"; actions?: ToastAction[] } | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [isUrlLoading, setIsUrlLoading] = useState(false);
    const [urlMetadata, setUrlMetadata] = useState<{ title: string; preview?: string | null; author?: string | null; published?: string | null } | null>(null);
    const [selectedPurpose, setSelectedPurpose] = useState<PurposeActionValue | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    const [config, setConfig] = useState<GenerationConfig>({
        tone: 'professional',
        format: 'bullet_points'
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem("notesgenProfile");
            if (stored) {
                setUserProfile(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to parse profile", e);
        }
    }, []);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in (window as any)) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            setRecognition(recognition);
        }
    }, []);

    const toggleRecording = () => {
        if (!recognition) {
            showToast("Speech recognition is not supported in this browser. Please use Chrome or Edge.", "error");
            return;
        }

        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
        } else {
            recognition.start();
            setIsRecording(true);
        }
    };

    const handleUrlExtract = async () => {
        if (!userProfile?.slug) {
            showToast("Please log in to import content.", "error");
            return;
        }
        if (!urlInput.trim()) {
            showToast("Enter a URL to import.", "error");
            return;
        }
        setIsUrlLoading(true);
        setUrlMetadata(null);
        try {
            const response = await fetch('/api/url-extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlInput.trim() })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to extract content');
            }
            setInput(data.article?.content || '');
            setUrlMetadata({
                title: data.article?.title,
                preview: data.article?.preview,
                author: data.article?.author,
                published: data.article?.published,
            });
            setSelectedPurpose(null);
            showToast('Article content imported. Review before posting.', 'success');
        } catch (error) {
            console.error('URL extraction failed', error);
            showToast(error instanceof Error ? error.message : 'Failed to import URL', 'error');
        } finally {
            setIsUrlLoading(false);
        }
    };

    const showToast = useCallback((message: string, type: "info" | "error" | "success" = "info", actions: ToastAction[] = []) => {
        setToast({ message, type, actions });
    }, []);

    const dismissToast = useCallback(() => setToast(null), []);

    const saveRawDraft = useCallback(async (content: string) => {
        try {
            await createNote({
                title: "Draft Note",
                content,
                summary: "Raw draft (AI generation failed)",
                tags: ["draft"],
                type: 'text'
            });
            showToast("Draft saved to your notes.", "success");
            router.push('/');
        } catch (dbError) {
            if (dbError instanceof Error) {
                if (dbError.message === "BLOCKED_USER") {
                    showToast("This account is blocked. Please contact an administrator for access.", "error");
                    return;
                }
                if (dbError.message === "NO_CREDITS") {
                    showToast("You're out of credits. Please upgrade your plan or ask an admin for more.", "error");
                    return;
                }
            }
            showToast("Failed to save draft to database.", "error");
        }
    }, [router, showToast]);

    const handleGenerate = async () => {
        if (!input.trim()) return;
        if (!userProfile?.slug) {
            showToast("Please log in to create notes.", "error");
            return;
        }
        setIsGenerating(true);
        try {
            const purpose = selectedPurpose
                ? PURPOSE_ACTIONS.find(action => action.value === selectedPurpose)
                : undefined;

            const result = await generateNote(input, config, { purpose });

            // Create new note in DB via Server Action
            await createNote({
                title: result.title,
                content: result.formattedContent,
                summary: result.summary,
                tags: result.tags,
                type: 'text',
                userSlug: userProfile.slug,
                userName: userProfile.name,
                userEmail: userProfile.email
            });

            router.push('/');
        } catch (error) {
            console.error("AI Generation failed:", error);

            if (error instanceof Error) {
                if (error.message === "BLOCKED_USER") {
                    showToast("This account is blocked. Please contact an administrator for access.", "error");
                } else if (error.message === "NO_CREDITS") {
                    showToast("You're out of credits. Please upgrade your plan or ask an admin for more.", "error");
                } else {
                    showToast("AI generation failed (check API key).", "error", [
                        {
                            label: "Save as draft",
                            onClick: () => saveRawDraft(input),
                        },
                    ]);
                }
            } else {
                showToast("AI generation failed (check API key).", "error", [
                    {
                        label: "Save as draft",
                        onClick: () => saveRawDraft(input),
                    },
                ]);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-[var(--page-bg)] pt-14">
            <Navbar
                onSearch={() => { }}
                onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            />

            <div
                className="flex max-w-[1400px] mx-auto min-h-[calc(100vh-3.5rem)] relative"
                style={isDesktop ? { paddingLeft: sidebarWidth } : undefined}
            >
                <Sidebar
                    onWidthChange={setSidebarWidth}
                    onIsResizing={setIsResizing}
                    isOpenMobile={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                />

                <main className={`flex-1 p-3 sm:p-4 lg:p-6 ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}>
                    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-0">
                        <div className="flex justify-between items-center border-b border-[var(--border-soft)] pb-4 mb-6">
                            <h1 className="text-lg font-bold text-[var(--text-primary)]">Create a New AI Note</h1>
                            <button className="text-sm font-bold text-blue-600 hover:bg-blue-500/10 px-3 py-1 rounded">Drafts</button>
                        </div>

                        <div className="bg-[var(--panel-solid)] rounded-xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
                            {/* Type Selector Tabs */}
                            <div className="flex border-b border-[var(--border-soft)]">
                                <button
                                    onClick={() => setActiveTab('text')}
                                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'text' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)]'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                    Text / Transcript
                                </button>
                                <button
                                    onClick={() => setActiveTab('url')}
                                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'url' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)]'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    URL Import
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {activeTab === 'url' && (
                                    <div className="mb-4 space-y-3">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-semibold text-[var(--text-muted)]">Article URL</label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="url"
                                                    value={urlInput}
                                                    onChange={(e) => setUrlInput(e.target.value)}
                                                    placeholder="https://example.com/article"
                                                    className="flex-1 p-2 border border-[var(--border-soft)] rounded text-sm bg-[var(--panel-solid)] text-[var(--text-primary)]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleUrlExtract}
                                                    disabled={isUrlLoading}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 ${isUrlLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                >
                                                    {isUrlLoading && (
                                                        <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span>
                                                    )}
                                                    {isUrlLoading ? 'Fetching…' : 'Fetch content'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">We’ll pull the readable text from most blogs and articles.</p>
                                        </div>
                                        {urlMetadata && (
                                            <div className="border border-[var(--border-soft)] rounded-lg p-3 bg-[var(--panel-solid)]">
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">{urlMetadata.title}</p>
                                                {urlMetadata.preview && (
                                                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-3">{urlMetadata.preview}</p>
                                                )}
                                                <div className="text-[11px] text-blue-400 mt-2 flex flex-wrap gap-3">
                                                    {urlMetadata.author && <span>By {urlMetadata.author}</span>}
                                                    {urlMetadata.published && <span>Published {new Date(urlMetadata.published).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                        )}
                                        {input && (
                                            <div className="border border-[var(--border-soft)] rounded-xl p-4 bg-[var(--panel-solid)] shadow-sm">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div>
                                                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">What do you want to do with this content?</p>
                                                        <p className="text-sm text-[var(--text-muted)]">Select an action to guide the AI output.</p>
                                                    </div>
                                                    {selectedPurpose && (
                                                        <button
                                                            type="button"
                                                            className="text-xs font-bold text-blue-600 hover:underline"
                                                            onClick={() => setSelectedPurpose(null)}
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {PURPOSE_ACTIONS.map(action => (
                                                        <button
                                                            key={action.value}
                                                            type="button"
                                                            onClick={() => setSelectedPurpose(action.value)}
                                                            className={`text-left border rounded-lg px-3 py-2 text-sm transition-all ${selectedPurpose === action.value
                                                                ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm'
                                                                : 'border-[var(--border-soft)] hover:border-blue-500/30 hover:bg-[var(--input-bg)]'}`}
                                                        >
                                                            <div className="font-semibold">{action.label}</div>
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">{action.instructions}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="relative">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={activeTab === 'url'
                                                ? "Fetched article content appears here. You can edit before sending to AI."
                                                : "Paste meeting notes, random thoughts, or transcripts here..."}
                                        className="w-full min-h-[200px] sm:min-h-[250px] p-4 bg-[var(--input-bg)] border border-[var(--border-soft)] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-[var(--panel-solid)] transition-all text-sm leading-relaxed text-[var(--text-primary)] resize-y"
                                    />
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={toggleRecording}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--panel-solid)] text-[var(--text-muted)] border border-[var(--border-soft)] hover:text-blue-600 hover:border-blue-500/30'}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18a4 4 0 004-4V6a4 4 0 10-8 0v8a4 4 0 004 4zm0 0v3m0 0H9m3 0h3" />
                                            </svg>
                                            {isRecording ? 'Recording…' : 'Dictate'}
                                        </button>
                                    </div>
                                    <div className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)] font-medium">
                                        {input.length} characters
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2 border-t border-[var(--border-soft)]">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Tone</label>
                                        <div className="flex bg-[var(--input-bg)] rounded-lg p-1">
                                            {(['professional', 'creative', 'concise'] as const).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setConfig({ ...config, tone: t })}
                                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${config.tone === t ? 'bg-[var(--panel-solid)] text-blue-600 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Format</label>
                                        <div className="flex bg-[var(--input-bg)] rounded-lg p-1">
                                            {(['bullet_points', 'paragraph', 'flashcards'] as const).map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setConfig({ ...config, format: f })}
                                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${config.format === f ? 'bg-[var(--panel-solid)] text-blue-600 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    {f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-[var(--input-bg)] flex justify-end gap-3 border-t border-[var(--border-soft)]">
                                <button
                                    onClick={() => router.push('/')}
                                    className="px-6 py-1.5 rounded-full border border-[var(--border-soft)] text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--panel-solid)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !input.trim()}
                                    className={`px-6 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${isGenerating || !input.trim()
                                        ? 'bg-blue-300 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </>
                                    ) : 'Post to AI'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} actions={toast.actions} onDismiss={dismissToast} />}
        </>
    );
}
