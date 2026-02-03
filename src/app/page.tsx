"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import NoteCard from '@/components/NoteCard';
import UpgradeModal from '@/components/UpgradeModal';
import { CollectionDefinition, Note } from '@/types';

import NoteModal from '@/components/NoteModal';
import { getNotes, updateNote, deleteNote, createNote } from '@/actions/notes';
import { analyzeImageNote } from '@/services/geminiService';
import Toast, { ToastAction } from '@/components/Toast';
import { PlanDefinition, PlanTier } from '@/lib/plans';

const DEFAULT_COLLECTIONS: CollectionDefinition[] = [
  { label: 'Work Meeting', tag: 'meeting', readonly: true },
  { label: 'Personal Projects', tag: 'project', readonly: true },
  { label: 'Creative Writing', tag: 'creative', readonly: true },
  { label: 'Study Notes', tag: 'study', readonly: true },
];

const COLLECTION_STORAGE_KEY = 'notesgen-custom-collections';

const TRENDING_TAGS = [
  { label: '#productivity', query: 'productivity', helper: 'Structure deep work sessions' },
  { label: '#ai', query: 'ai', helper: 'See what AI assisted recently' },
  { label: '#meetings', query: 'meeting', helper: 'Follow-up ready recaps' },
  { label: '#studying', query: 'study', helper: 'Flashcard friendly breakdowns' },
  { label: '#creativity', query: 'creative', helper: 'Brainstorming sparks' }
];

type TrendingTag = typeof TRENDING_TAGS[number];

const ONBOARDING_TIP_KEY = 'notesgen-onboarding-tip';

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPrompt, setPhotoPrompt] = useState('');
  const [pendingPhotoData, setPendingPhotoData] = useState<{ file: File; dataUrl: string } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set<string>());
  const [isPerformingBulk, setIsPerformingBulk] = useState(false);
  const [isGroupNaming, setIsGroupNaming] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" | "success"; actions?: ToastAction[] } | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [planOptions, setPlanOptions] = useState<PlanDefinition[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanTier | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const bulkGroupInputRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showOnboardingTip, setShowOnboardingTip] = useState(false);
  const [activeTrendingTag, setActiveTrendingTag] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [customCollections, setCustomCollections] = useState<CollectionDefinition[]>([]);
  const [collections, setCollections] = useState<CollectionDefinition[]>(DEFAULT_COLLECTIONS);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionForm, setCollectionForm] = useState<{ label: string; tag: string }>({ label: '', tag: '' });
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [notePendingAssignment, setNotePendingAssignment] = useState<Note | null>(null);
  const [selectedAssignCollection, setSelectedAssignCollection] = useState<string>('');
  const [isAssigningNote, setIsAssigningNote] = useState(false);
  interface ChatBubble {
    id: string;
    sender: 'ai' | 'user';
    text: string;
    timestamp: string;
    pending?: boolean;
  }

  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([
    {
      id: 'intro-ai',
      sender: 'ai',
      text: "Hi! I'm your AI co-pilot. Ask me to polish, summarize, or brainstorm based on your notes.",
      timestamp: 'Just now',
    },
    {
      id: 'intro-user',
      sender: 'user',
      text: 'Can you highlight the key takeaways from my last meeting note?',
      timestamp: 'Just now',
    },
    {
      id: 'intro-ai-2',
      sender: 'ai',
      text: 'Absolutely. Here are the three critical decisions plus open questions. What should we refine next?',
      timestamp: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(COLLECTION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomCollections((parsed as CollectionDefinition[]).map((c) => ({
            label: c.label,
            tag: c.tag,
            readonly: !!c.readonly,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load collections', error);
    }
  }, []);

  useEffect(() => {
    setCollections([...DEFAULT_COLLECTIONS, ...customCollections]);
  }, [customCollections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(customCollections));
  }, [customCollections]);

  const computedNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    collections.forEach(({ label, tag }) => {
      counts[label] = notes.filter(note => note.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))).length;
    });
    return counts;
  }, [notes, collections]);

  const getCollectionByLabel = useCallback((label: string | null) => {
    if (!label) return null;
    return collections.find(c => c.label === label) ?? null;
  }, [collections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seenTip = localStorage.getItem(ONBOARDING_TIP_KEY);
    if (!seenTip) {
      setShowOnboardingTip(true);
    }
    setIsDesktop(window.innerWidth >= 1024);
    const handler = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Load User Profile
  useEffect(() => {
    try {
      const stored = localStorage.getItem("notesgenProfile");
      if (stored) {
        setUserProfile(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse profile", e);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  const showToast = useCallback((message: string, type: "info" | "error" | "success" = "info", actions: ToastAction[] = []) => {
    setToast({ message, type, actions });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const fetchPlans = useCallback(async () => {
    setIsPlansLoading(true);
    try {
      const response = await fetch("/api/plans", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load plans");
      }
      const data = await response.json();
      const plans = Array.isArray(data?.plans) ? (data.plans as PlanDefinition[]) : [];
      setPlanOptions(plans);
      const nextPlan =
        typeof data?.currentPlan === "string" && ["Free", "Pro", "Enterprise"].includes(data.currentPlan)
          ? (data.currentPlan as PlanTier)
          : null;
      setCurrentPlan(nextPlan);
      setSelectedPlan(nextPlan);
    } catch (error) {
      console.error("Failed to load subscription plans", error);
      showToast("Failed to load plans. Please try again.", "error");
    } finally {
      setIsPlansLoading(false);
    }
  }, [showToast]);

  const handleOpenUpgrade = useCallback(() => {
    setIsUpgradeModalOpen(true);
    void fetchPlans();
  }, [fetchPlans]);

  const handleCloseUpgrade = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  const handleRefreshPlans = useCallback(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const handlePlanSelect = useCallback((plan: PlanTier) => {
    setSelectedPlan(plan);
  }, []);

  const handleConfirmSubscription = useCallback(async () => {
    if (!selectedPlan) return;
    setIsSubscribing(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      if (!response.ok) {
        throw new Error("Failed to update subscription");
      }
      const data = await response.json();
      const updatedPlan =
        typeof data?.profile?.plan === "string" && ["Free", "Pro", "Enterprise"].includes(data.profile.plan)
          ? (data.profile.plan as PlanTier)
          : selectedPlan;
      setCurrentPlan(updatedPlan);
      setSelectedPlan(updatedPlan);
      setIsUpgradeModalOpen(false);
      showToast(`Subscription updated to ${updatedPlan}. Credits refreshed!`, "success");
    } catch (error) {
      console.error("Subscription update failed", error);
      showToast("Failed to update subscription. Please try again.", "error");
    } finally {
      setIsSubscribing(false);
    }
  }, [selectedPlan, showToast]);

  const handleDismissOnboardingTip = useCallback(() => {
    setShowOnboardingTip(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_TIP_KEY, 'true');
    }
  }, []);

  const handleTrendingTagClick = useCallback((tag: TrendingTag) => {
    setActiveTrendingTag(tag.label);
    setSearchQuery(tag.query);
    setActiveCollection(null);
    showToast(`Filtering notes by ${tag.label}`, 'info');
  }, [showToast]);

  const handleClearTrendingTag = useCallback(() => {
    setActiveTrendingTag(null);
    setSearchQuery('');
  }, []);

  const handleChatSend = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      showToast('Type a message for the chatbot.', 'info');
      return;
    }
    if (!notes.length) {
      showToast('Create at least one note so the bot has context.', 'info');
      return;
    }
    setIsChatSending(true);
    const userMessage: ChatBubble = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Just now',
    };
    const typingMessage: ChatBubble = {
      id: `typing-${Date.now()}`,
      sender: 'ai',
      text: 'Thinking…',
      timestamp: 'Typing',
      pending: true,
    };
    setChatMessages(prev => [...prev, userMessage, typingMessage]);
    setChatInput('');

    try {
      const latestMessages = [...chatMessages, userMessage].slice(-10);
      const noteContext = notes.slice(0, 5).map((note, index) => {
        const tags = (note.tags ?? []).slice(0, 5).map(tag => `#${tag}`).join(' ');
        return `Note ${index + 1}\nID: ${note.id}\nTitle: ${note.title}\nSummary: ${note.summary}\nTags: ${tags || 'none'}`;
      }).join('\n\n');

      const systemPrompt = noteContext
        ? `You are NotesGen's AI writing partner. Always reference the user's latest notes when helpful. Each note below lists its unique ID. Use that exact ID whenever you create noteId fields (especially for deletions). These are the freshest notes:\n\n${noteContext}\n\nOnly answer based on user questions and these notes. Be concise and never invent IDs.`
        : `You are NotesGen's AI assistant. Provide clear, practical responses and ask clarifying questions if the user request is vague. If you plan to delete a note, wait until you know its exact ID.`;

      const payload = [
        { role: 'system', content: systemPrompt },
        ...latestMessages.map((message) => ({
          role: message.sender === 'ai' ? 'assistant' : 'user',
          content: message.text,
        })),
      ];

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payload,
          userSlug: userProfile?.slug,
          userName: userProfile?.name,
          userEmail: userProfile?.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Chatbot failed');
      }

      setChatMessages(prev => [
        ...prev.filter(msg => msg.id !== typingMessage.id),
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: String(result.reply ?? 'I could not produce a response.'),
          timestamp: 'Moments ago',
        },
      ]);

      if (result.createdNote) {
        const normalizedCreated: Note = {
          ...(result.createdNote as Note),
          id: (result.createdNote.id ?? result.createdNote._id) as string,
          createdAt: typeof result.createdNote.createdAt === 'number'
            ? result.createdNote.createdAt
            : new Date(result.createdNote.createdAt ?? Date.now()).getTime(),
        };
        setNotes(prev => [normalizedCreated, ...prev]);
        showToast('AI added a new note to your workspace.', 'success');
      }

      if (result.deletedNoteId) {
        setNotes(prev => prev.filter(note => note.id !== result.deletedNoteId));
        showToast('AI removed the requested note.', 'success');
      }
    } catch (error) {
      console.error('Chatbot error', error);
      setChatMessages(prev => prev.filter(msg => msg.id !== typingMessage.id));
      showToast(error instanceof Error ? error.message : 'AI chatbot is unavailable.', 'error');
    } finally {
      setIsChatSending(false);
    }
  }, [chatInput, chatMessages, notes, showToast]);

  const handleCollectionSelect = useCallback((collection: CollectionDefinition) => {
    setActiveCollection(collection.label);
    setActiveTrendingTag(null);
    setSearchQuery(collection.tag);
    showToast(`Showing ${collection.label} notes`, 'info');
  }, [showToast]);

  const handleClearCollection = useCallback(() => {
    if (!activeCollection) return;
    setActiveCollection(null);
    setSearchQuery('');
    showToast('Cleared collection filter', 'info');
  }, [activeCollection, showToast]);

  const handleOpenCollectionModal = useCallback(() => {
    setCollectionForm({ label: '', tag: '' });
    setCollectionError(null);
    setIsCollectionModalOpen(true);
  }, []);

  const handleCloseCollectionModal = useCallback(() => {
    setIsCollectionModalOpen(false);
    setCollectionError(null);
  }, []);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

  const handleCollectionFormSubmit = useCallback(() => {
    const name = collectionForm.label.trim();
    if (!name) {
      setCollectionError('Collection name is required.');
      return;
    }
    if (collections.some(col => col.label.toLowerCase() === name.toLowerCase())) {
      setCollectionError('Collection name already exists.');
      return;
    }
    const tag = (collectionForm.tag.trim() || slugify(name)) || slugify(`${name}-${Date.now()}`);
    const newCollection: CollectionDefinition = { label: name, tag, readonly: false };
    setCustomCollections(prev => [...prev, newCollection]);
    setIsCollectionModalOpen(false);
    setCollectionForm({ label: '', tag: '' });
    setCollectionError(null);
    setTimeout(() => handleCollectionSelect(newCollection), 0);
  }, [collectionForm, collections, handleCollectionSelect]);

  const handleDeleteCollection = useCallback((collection: CollectionDefinition) => {
    if (collection.readonly) {
      showToast('Default collections cannot be removed.', 'error');
      return;
    }
    setCustomCollections(prev => prev.filter(c => c.label !== collection.label));
    if (activeCollection === collection.label) {
      setActiveCollection(null);
      setSearchQuery('');
    }
    showToast(`${collection.label} removed.`, 'success');
  }, [activeCollection, showToast]);

  const requestDeleteCollection = useCallback((collection: CollectionDefinition) => {
    if (collection.readonly) {
      showToast('Default collections cannot be removed.', 'error');
      return;
    }
    showToast(`Remove ${collection.label}?`, 'info', [
      { label: 'Cancel', onClick: dismissToast },
      {
        label: 'Delete',
        onClick: () => {
          dismissToast();
          handleDeleteCollection(collection);
        }
      }
    ]);
  }, [dismissToast, handleDeleteCollection, showToast]);

  const handleOpenAssignModal = useCallback((note: Note) => {
    if (!collections.length) {
      showToast('Create a collection first.', 'info');
      return;
    }
    setNotePendingAssignment(note);
    setSelectedAssignCollection(collections[0]?.label ?? '');
    setAssignError(null);
    setIsAssignModalOpen(true);
  }, [collections, showToast]);

  const handleCloseAssignModal = useCallback(() => {
    setIsAssignModalOpen(false);
    setAssignError(null);
    setNotePendingAssignment(null);
    setSelectedAssignCollection('');
  }, []);

  const activeCollectionTag = getCollectionByLabel(activeCollection)?.tag ?? null;

  useEffect(() => {
    if (!activeCollectionTag) return;
    if (searchQuery.toLowerCase() !== activeCollectionTag.toLowerCase()) {
      setActiveCollection(null);
    }
  }, [searchQuery, activeCollectionTag]);

  useEffect(() => {
    if (!activeTrendingTag) return;
    const activeTag = TRENDING_TAGS.find(tag => tag.label === activeTrendingTag);
    if (activeTag && !searchQuery.toLowerCase().includes(activeTag.query.toLowerCase())) {
      setActiveTrendingTag(null);
    }
  }, [activeTrendingTag, searchQuery]);

  const saveRawDraft = useCallback(
    async (content: string) => {
      if (!userProfile?.slug) {
        showToast("Please log in to save notes.", "error");
        return;
      }
      try {
        await createNote({
          title: "Draft Note",
          content,
          summary: "Raw draft (AI generation failed)",
          tags: ["draft"],
          type: 'text',
          userSlug: userProfile.slug,
          userName: userProfile.name, // optional, but good for completeness
          userEmail: userProfile.email
        });
        showToast("Draft saved to your notes.", "success");
        if (selectedNote) setSelectedNote(null);

        // Refresh notes
        const freshNotes = await getNotes(userProfile.slug);
        setNotes(freshNotes as unknown as Note[]);

      } catch (dbError) {
        if (dbError instanceof Error) {
          if (dbError.message === "BLOCKED_USER") {
            showToast("This account is blocked. Please contact an administrator for access.", "error");
            return;
          }
          if (dbError.message === "NO_CREDITS") {
            showToast("You're out of credits. Please ask an admin for more or upgrade your plan.", "error");
            return;
          }
        }
        showToast("Failed to save draft to database.", "error");
      }
    }, [selectedNote, showToast, userProfile]
  );

  // Load notes from DB
  useEffect(() => {
    const fetchNotes = async () => {
      if (!userProfile?.slug) {
        if (!isAuthChecking) {
          setNotes([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const fetchedNotes = await getNotes(userProfile.slug);
        // Cast the fetched data to Note[] as the server action returns a compatible shape
        setNotes(fetchedNotes as unknown as Note[]);
      } catch (error) {
        console.error("Failed to fetch notes", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, [userProfile, isAuthChecking]);

  const handleUpdateNote = async (updatedNote: Note) => {
    if (!userProfile?.slug) return;
    try {
      // Optimistic update
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);

      // Server update
      // Use 'updatedNote' data less the ID and immutable timestamps
      const { id, ...rest } = updatedNote;
      const { createdAt, ...data } = rest;
      await updateNote(id, data, userProfile.slug);
    } catch (error) {
      console.error("Failed to update note", error);
      // Revert on error? For now, we just log.
    }
  };

  const handleDeleteNote = useCallback(async (id: string) => {
    if (!userProfile?.slug) return;
    try {
      // Optimistic update
      setNotes(prev => prev.filter(n => n.id !== id));
      setSelectedNotes(prev => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }

      await deleteNote(id, userProfile.slug);
    } catch (error) {
      console.error("Failed to delete note", error);
    }
  }, [selectedNote, userProfile?.slug]);

  const handleConfirmAssign = useCallback(async () => {
    if (!notePendingAssignment) {
      setAssignError('Select a note to continue.');
      return;
    }
    if (!selectedAssignCollection) {
      setAssignError('Select a collection.');
      return;
    }
    if (!userProfile?.slug) {
      showToast('Please log in to organize notes.', 'error');
      return;
    }

    const targetCollection = getCollectionByLabel(selectedAssignCollection);
    if (!targetCollection) {
      setAssignError('Collection no longer exists.');
      return;
    }

    setIsAssigningNote(true);
    try {
      const mergedTags = Array.from(new Set([...(notePendingAssignment.tags ?? []), targetCollection.tag]));
      await createNote({
        title: notePendingAssignment.title,
        content: notePendingAssignment.content,
        summary: notePendingAssignment.summary,
        tags: mergedTags,
        type: notePendingAssignment.type,
        attachments: notePendingAssignment.attachments,
        userSlug: userProfile.slug,
        userName: userProfile.name,
        userEmail: userProfile.email,
      });

      const refreshed = await getNotes(userProfile.slug);
      setNotes(refreshed as unknown as Note[]);
      const originalId = notePendingAssignment.id;
      handleCloseAssignModal();

      showToast(`Copied to ${targetCollection.label}.`, 'success', [
        {
          label: 'Delete original',
          onClick: () => {
            dismissToast();
            void handleDeleteNote(originalId);
          }
        },
        {
          label: 'Keep note',
          onClick: dismissToast,
        }
      ]);
    } catch (error) {
      console.error('Failed to copy note', error);
      setAssignError('Unable to copy this note. Please try again.');
    } finally {
      setIsAssigningNote(false);
    }
  }, [createNote, dismissToast, getCollectionByLabel, getNotes, handleCloseAssignModal, handleDeleteNote, notePendingAssignment, selectedAssignCollection, showToast, userProfile?.email, userProfile?.name, userProfile?.slug]);

  const handlePinNote = async (id: string, isPinned: boolean) => {
    if (!userProfile?.slug) return;
    try {
      // Optimistic update
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned } : n));

      await updateNote(id, { isPinned }, userProfile.slug);

      // Re-fetch to respect server-side sorting (optional, but ensures consistency)
      const fetchedNotes = await getNotes(userProfile.slug);
      setNotes(fetchedNotes as unknown as Note[]);

    } catch (error) {
      console.error("Failed to pin note", error);
    }
  };

  const handleSelectToggle = (id: string) => {
    setSelectedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectedNotes(new Set<string>());
    setSelectionMode(false);
  };

  const selectedCount = selectedNotes.size;
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    if (isGroupNaming) {
      bulkGroupInputRef.current?.focus();
    }
  }, [isGroupNaming]);

  const confirmBulkDelete = () => {
    if (!selectedCount) return;
    showToast(
      `Delete ${selectedCount} selected note${selectedCount > 1 ? 's' : ''}?`,
      "info",
      [
        {
          label: "Cancel",
          onClick: dismissToast,
        },
        {
          label: "Delete",
          onClick: () => {
            dismissToast();
            void handleBulkDelete();
          },
        },
      ]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedCount || !userProfile?.slug) return;
    setIsPerformingBulk(true);
    const ids = Array.from(selectedNotes);
    try {
      setNotes(prev => prev.filter(n => !ids.includes(n.id)));
      if (selectedNote && ids.includes(selectedNote.id)) {
        setSelectedNote(null);
      }
      await Promise.all(ids.map(id => deleteNote(id, userProfile.slug)));
      exitSelectionMode();
      showToast(`Deleted ${selectedCount} note${selectedCount > 1 ? 's' : ''}.`, "success");
    } catch (error) {
      console.error("Bulk delete failed", error);
      showToast("Failed to delete selected notes. Please try again.", "error");
    } finally {
      setIsPerformingBulk(false);
    }
  };

  const handleBulkPin = async (isPinned: boolean) => {
    if (!selectedCount || !userProfile?.slug) return;
    setIsPerformingBulk(true);
    const ids = Array.from(selectedNotes);
    try {
      setNotes(prev => prev.map(n => ids.includes(n.id) ? { ...n, isPinned } : n));
      await Promise.all(ids.map(id => updateNote(id, { isPinned }, userProfile.slug)));
      const refreshed = await getNotes(userProfile.slug);
      setNotes(refreshed as unknown as Note[]);
      exitSelectionMode();
      showToast(isPinned ? "Pinned selected notes." : "Unpinned selected notes.", "success");
    } catch (error) {
      console.error("Bulk pin failed", error);
      showToast("Failed to update pin state for selected notes.", "error");
    } finally {
      setIsPerformingBulk(false);
    }
  };

  const handleBulkGroup = async () => {
    if (!selectedCount || !userProfile?.slug) return;
    const cleaned = groupNameInput.trim();
    if (!cleaned) {
      showToast("Label cannot be empty.", "error");
      return;
    }
    setIsPerformingBulk(true);
    const ids = Array.from(selectedNotes);
    try {
      const uniqueName = cleaned;
      setNotes(prev => prev.map(note => {
        if (!ids.includes(note.id)) return note;
        const existingTags = note.tags ?? [];
        if (existingTags.includes(uniqueName)) return note;
        return {
          ...note,
          tags: [...existingTags, uniqueName],
        };
      }));

      await Promise.all(ids.map(id => {
        const current = notes.find(n => n.id === id);
        const currentTags = current?.tags ?? [];
        const nextTags = currentTags.includes(uniqueName) ? currentTags : [...currentTags, uniqueName];
        return updateNote(id, { tags: nextTags }, userProfile.slug);
      }));

      exitSelectionMode();
      showToast(`Tagged selected notes as "${uniqueName}".`, "success");
    } catch (error) {
      console.error("Bulk group failed", error);
      showToast("Failed to apply group tag. Please try again.", "error");
    } finally {
      setIsPerformingBulk(false);
      setIsGroupNaming(false);
      setGroupNameInput('');
    }
  };

  const readFileAsDataURL = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAttachmentUpload = async (
    file: File,
    kind: 'photo' | 'file',
    existingDataUrl?: string,
    promptOverride?: string
  ) => {
    if (!userProfile?.slug) {
      showToast("Please log in to upload files.", "error");
      return;
    }
    setIsUploadingAttachment(true);
    try {
      const dataUrl = existingDataUrl || await readFileAsDataURL(file);
      let aiResult = null;

      if (kind === 'photo') {
        aiResult = await analyzeImageNote(
          dataUrl,
          file.type || 'image/png',
          promptOverride?.trim() || 'Describe this image in detail and extract any visible text.'
        );
      }

      const created = await createNote({
        title: aiResult?.title || file.name || (kind === 'photo' ? 'Image Upload' : 'File Upload'),
        content: kind === 'photo'
          ? (aiResult?.formattedContent || 'Image attachment uploaded.')
          : `Attached file: **${file.name || 'Untitled'}**`,
        summary: aiResult?.summary || (kind === 'photo' ? 'Uploaded image attachment' : 'Uploaded file attachment'),
        tags: aiResult?.tags || (kind === 'photo' ? ['photo', 'upload'] : ['attachment', 'upload']),
        type: 'media',
        userSlug: userProfile.slug,
        userName: userProfile.name,
        userEmail: userProfile.email,
        attachments: [
          {
            name: file.name || 'attachment',
            type: file.type || 'application/octet-stream',
            size: file.size,
            data: dataUrl,
          }
        ]
      });

      const normalized: Note = {
        ...(created as any),
        id: (created as any).id ?? (created as any)._id,
        createdAt: typeof (created as any).createdAt === 'number'
          ? (created as any).createdAt
          : new Date((created as any).createdAt).getTime(),
      };

      setNotes(prev => [normalized, ...prev]);
    } catch (error) {
      console.error("Attachment upload failed", error);
      if (error instanceof Error) {
        if (error.message === "BLOCKED_USER") {
          showToast("This account is blocked. Please contact an administrator for access.", "error");
          return;
        }
        if (error.message === "NO_CREDITS") {
          showToast("You're out of credits. Please ask an admin for more or upgrade your plan.", "error");
          return;
        }
      }
      showToast("Failed to upload attachment. Please try again.", "error");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, kind: 'photo' | 'file') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (kind === 'photo') {
      try {
        const dataUrl = await readFileAsDataURL(file);
        setPendingPhotoData({ file, dataUrl });
        setPhotoPrompt('');
      } catch (error) {
        console.error("Failed to read photo", error);
        showToast("Could not read the selected photo. Please try again.", "error");
      }
    } else {
      await handleAttachmentUpload(file, 'file');
    }

    event.target.value = '';
  };

  const handleCancelPhotoUpload = () => {
    setPendingPhotoData(null);
    setPhotoPrompt('');
  };

  const handleConfirmPhotoUpload = async () => {
    if (!pendingPhotoData) return;
    await handleAttachmentUpload(
      pendingPhotoData.file,
      'photo',
      pendingPhotoData.dataUrl,
      photoPrompt
    );
    setPendingPhotoData(null);
    setPhotoPrompt('');
  };

  const handleAttachmentButtonClick = (kind: 'photo' | 'file') => {
    if (kind === 'photo') {
      photoInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const filteredNotes = notes
    .filter(n =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      // Prioritize Pinned notes (treat undefined as false)
      const pinA = a.isPinned === true;
      const pinB = b.isPinned === true;

      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;

      // Then by Date (Newest first)
      return b.createdAt - a.createdAt;
    });

  return (
    <>
      <div className="min-h-screen bg-[#f0f2f5] pt-14">
        <Navbar
          onSearch={(value) => {
            setSearchQuery(value);
            if (value === '') {
              setActiveTrendingTag(null);
              setActiveCollection(null);
            } else if (activeCollectionTag && value.toLowerCase() !== activeCollectionTag.toLowerCase()) {
              setActiveCollection(null);
            }
          }}
          onUpgrade={handleOpenUpgrade}
          onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <div
          className="flex flex-col lg:flex-row max-w-[1400px] mx-auto min-h-[calc(100vh-3.5rem)] relative"
          style={isDesktop ? { paddingLeft: sidebarWidth } : undefined}
        >
          <Sidebar
            onWidthChange={setSidebarWidth}
            onIsResizing={setIsResizing}
            onUpgrade={handleOpenUpgrade}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            noteCounts={computedNoteCounts}
            collections={collections}
            activeCollection={activeCollection}
            onCollectionSelect={handleCollectionSelect}
            onClearCollection={handleClearCollection}
            onCollectionDelete={requestDeleteCollection}
            onRequestCreateCollection={handleOpenCollectionModal}
          />

          <main
            className={`flex-1 p-4 ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
          >
            <div className="max-w-3xl mx-auto py-4 px-4 sm:px-0">
              {/* Create Post Entry Box */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
                {showOnboardingTip && (
                  <div className="absolute -top-10 left-16 hidden sm:flex flex-col items-center">
                    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-3">
                      <span>Start here — your first AI note</span>
                      <button
                        type="button"
                        onClick={handleDismissOnboardingTip}
                        className="text-white/70 hover:text-white"
                        aria-label="Dismiss onboarding"
                      >
                        ×
                      </button>
                    </div>
                    <span className="w-3 h-3 bg-gray-900 rotate-45 -mt-1"></span>
                  </div>
                )}
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0">
                    <img src={userProfile?.picture || "https://picsum.photos/seed/user/40/40"} alt="avatar" className="rounded-full" />
                  </div>
                  <div className="flex-1">
                    <Link
                      href="/create"
                      onClick={handleDismissOnboardingTip}
                      className="block w-full bg-gradient-to-r from-gray-100/70 to-white hover:from-white hover:to-gray-50 rounded-xl border border-blue-200/70 hover:border-blue-400 px-4 py-3 transition-all cursor-pointer text-left group shadow-[0_10px_30px_rgba(59,130,246,0.08)]"
                    >
                      <span className="text-gray-900 font-semibold block mb-1 group-hover:text-blue-600 transition-colors">New idea or transcript?</span>
                      <span className="text-xs text-gray-500 block">Paste a transcript, meeting notes, or rough ideas — AI will structure it.</span>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-between pl-[3.25rem]">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAttachmentButtonClick('photo')}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
                      title="Upload Photo"
                      disabled={isUploadingAttachment}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h4l2-2h6l2 2h4v14H3V5zm6 4a3 3 0 106 0 3 3 0 00-6 0zm-3 9h12" />
                      </svg>
                      <span className="hidden sm:inline">Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachmentButtonClick('file')}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
                      title="Attach File"
                      disabled={isUploadingAttachment}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l6.364-6.364a2 2 0 10-2.828-2.828l-5.657 5.657" />
                      </svg>
                      <span className="hidden sm:inline">File</span>
                    </button>
                  </div>

                  <Link
                    href="/create"
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-500 text-white px-5 py-2 rounded-full text-sm font-bold shadow-[0_12px_30px_rgba(79,70,229,0.35)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.45)] transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate with AI
                  </Link>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'photo')}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'file')}
                />
              </div>

              {pendingPhotoData && (
                <div className="bg-white border border-blue-200 rounded-xl p-4 mb-4 shadow-md">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="sm:w-48 w-full">
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={pendingPhotoData.dataUrl}
                          alt={pendingPhotoData.file.name || 'Selected photo'}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {pendingPhotoData.file.name} &middot; {(pendingPhotoData.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                          Photo Instruction
                        </label>
                        <textarea
                          value={photoPrompt}
                          onChange={(e) => setPhotoPrompt(e.target.value)}
                          placeholder="Describe what you want the AI to extract from this photo..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleCancelPhotoUpload}
                          className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
                          disabled={isUploadingAttachment}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmPhotoUpload}
                          className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={isUploadingAttachment}
                        >
                          {isUploadingAttachment && (
                            <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span>
                          )}
                          Analyze & Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sort & Selection Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex gap-2">
                  {['Best', 'New', 'Top'].map((sortOption) => (
                    <button
                      key={sortOption}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${sortOption === 'New' ? 'bg-white border-gray-300 text-blue-600 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {sortOption}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${selectionMode ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {selectionMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  {selectionMode ? 'Done Selecting' : 'Select Notes'}
                </button>
              </div>

              {selectionMode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">{selectedCount} note{selectedCount === 1 ? '' : 's'} selected</p>
                    <p className="text-xs text-blue-600">Choose a bulk action below</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkPin(true)}
                      disabled={!hasSelection || isPerformingBulk}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${!hasSelection || isPerformingBulk ? 'bg-white text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100'}`}
                    >
                      Pin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkPin(false)}
                      disabled={!hasSelection || isPerformingBulk}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${!hasSelection || isPerformingBulk ? 'bg-white text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                    >
                      Unpin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasSelection || isPerformingBulk) return;
                        setIsGroupNaming(true);
                        setGroupNameInput('');
                      }}
                      disabled={!hasSelection || isPerformingBulk}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${!hasSelection || isPerformingBulk ? 'bg-white text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-violet-700 border border-violet-200 hover:bg-violet-100'}`}
                    >
                      Group
                    </button>
                    {isGroupNaming && (
                      <div className="flex items-center gap-2">
                        <input
                          ref={bulkGroupInputRef}
                          type="text"
                          value={groupNameInput}
                          onChange={(e) => setGroupNameInput(e.target.value)}
                          className="px-3 py-1 text-xs border border-violet-200 rounded-full focus:outline-none focus:border-violet-400"
                          placeholder="Label name"
                          disabled={isPerformingBulk}
                        />
                        <button
                          type="button"
                          onClick={() => setIsGroupNaming(false)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkGroup}
                          disabled={!groupNameInput.trim() || isPerformingBulk}
                          className={`px-3 py-1 text-xs font-bold rounded-full ${!groupNameInput.trim() || isPerformingBulk ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-violet-600 text-white border border-violet-600 hover:bg-violet-700'}`}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={!hasSelection || isPerformingBulk}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${!hasSelection || isPerformingBulk ? 'bg-white text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-red-500 text-white border border-red-500 hover:bg-red-600'}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Note List */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your notes...</p>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-600">No notes yet</h3>
                    <p className="text-gray-400 mb-6">Start by creating your first AI note!</p>
                    <Link
                      href="/create"
                      className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition-colors inline-block"
                    >
                      Create Note
                    </Link>
                  </div>
                ) : (
                  filteredNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => setSelectedNote(note)}
                      onPin={handlePinNote}
                      onAssign={handleOpenAssignModal}
                      onDelete={(id) => {
                        setSelectedNote(prev => (prev && prev.id === id ? null : prev));
                        showToast(
                          "Delete this note?",
                          "info",
                          [
                            {
                              label: "Cancel",
                              onClick: dismissToast,
                            },
                            {
                              label: "Delete",
                              onClick: () => {
                                dismissToast();
                                void handleDeleteNote(id);
                              },
                            },
                          ]
                        );
                      }}
                      selectionMode={selectionMode}
                      selected={selectedNotes.has(note.id)}
                      onSelectToggle={handleSelectToggle}
                      notify={(message, type) => showToast(message, type)}
                    />
                  ))
                )}
              </div>

              <div className="mt-8 xl:hidden">
                <TrendingTagsPanel
                  tags={TRENDING_TAGS}
                  activeTag={activeTrendingTag}
                  onTagSelect={handleTrendingTagClick}
                  onClear={handleClearTrendingTag}
                />
              </div>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="hidden xl:block w-80 p-4 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col h-[480px]">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">AI Chatbot</p>
                <h3 className="text-xl font-bold text-gray-900">Need a second brain?</h3>
                <p className="text-sm text-gray-500">Ask the bot to refine, summarize, or brainstorm using your notes.</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${message.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                      <span className={`block text-[10px] mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>{message.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleChatSend();
                }}
              >
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me to summarize, rephrase, or ideate..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                  disabled={isChatSending}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-gray-400">Uses latest note context</span>
                  <button
                    type="submit"
                    disabled={isChatSending}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow ${isChatSending ? 'bg-blue-200 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {isChatSending && <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span>}
                    {isChatSending ? 'Sending' : 'Send'}
                  </button>
                </div>
              </form>
            </div>

            <TrendingTagsPanel
              tags={TRENDING_TAGS}
              activeTag={activeTrendingTag}
              onTagSelect={handleTrendingTagClick}
              onClear={handleClearTrendingTag}
            />

            <div className="sticky top-20 text-[10px] text-gray-400 px-4">
              <div className="flex flex-wrap gap-x-2 gap-y-1 mb-2">
                <a href="#" className="hover:underline">User Agreement</a>
                <a href="#" className="hover:underline">Privacy Policy</a>
                <a href="#" className="hover:underline">Content Policy</a>
                <a href="#" className="hover:underline">Moderator Code of Conduct</a>
              </div>
              <div className="pt-2 border-t border-gray-200">
                AI Notes Gen Inc &copy; 2024. All rights reserved
              </div>
            </div>
          </aside>
        </div>

        {/* Note Modal Overlay */}
        {selectedNote && (
          <NoteModal
            note={selectedNote}
            onClose={() => setSelectedNote(null)}
            onUpdate={handleUpdateNote}
            notify={(message, type) => showToast(message, type)}
          />
        )}
      </div>
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">New Collection</h3>
                <p className="text-sm text-gray-500">Group notes with a custom label and tag.</p>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                onClick={handleCloseCollectionModal}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Collection name</label>
                <input
                  type="text"
                  value={collectionForm.label}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, label: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Marketing Reviews"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tag slug (optional)</label>
                <input
                  type="text"
                  value={collectionForm.tag}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, tag: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Used for filters, e.g. marketing"
                />
                <p className="text-[11px] text-gray-500 mt-1">Leave blank to auto-generate from the name.</p>
              </div>
            </div>

            {collectionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{collectionError}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                onClick={handleCloseCollectionModal}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 text-sm font-bold text-white rounded-full bg-blue-600 hover:bg-blue-700"
                onClick={handleCollectionFormSubmit}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Move to collection</h3>
                <p className="text-sm text-gray-500">Select where this note should live.</p>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                onClick={handleCloseAssignModal}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Collection</label>
              <select
                value={selectedAssignCollection}
                onChange={(e) => setSelectedAssignCollection(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {collections.map(collection => (
                  <option key={collection.label} value={collection.label}>{collection.label}</option>
                ))}
              </select>
            </div>

            {assignError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{assignError}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                onClick={handleCloseAssignModal}
                disabled={isAssigningNote}
              >
                Cancel
              </button>
              <button
                className={`px-5 py-2 text-sm font-bold text-white rounded-full ${isAssigningNote ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                onClick={handleConfirmAssign}
                disabled={isAssigningNote}
              >
                {isAssigningNote ? 'Moving…' : 'Move note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} actions={toast.actions} onDismiss={dismissToast} />}
      {isUpgradeModalOpen && (
        <UpgradeModal
          plans={planOptions}
          currentPlan={currentPlan}
          selectedPlan={selectedPlan}
          onSelect={handlePlanSelect}
          onClose={handleCloseUpgrade}
          onConfirm={handleConfirmSubscription}
          onRefresh={handleRefreshPlans}
          isLoading={isPlansLoading}
          isSubmitting={isSubscribing}
        />
      )}
    </>
  );
}

interface TrendingTagsPanelProps {
  className?: string;
  tags: TrendingTag[];
  activeTag: string | null;
  onTagSelect: (tag: TrendingTag) => void;
  onClear: () => void;
}

function TrendingTagsPanel({ className = '', tags, activeTag, onTagSelect, onClear }: TrendingTagsPanelProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Trending Tags</h4>
          <p className="text-xs text-gray-400 mt-1">Explore popular AI-generated notes</p>
        </div>
        {activeTag && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] uppercase font-bold text-blue-600 hover:text-blue-800"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-3">
        {tags.map((tag) => {
          const isActive = activeTag === tag.label;
          return (
            <button
              key={tag.label}
              type="button"
              onClick={() => onTagSelect(tag)}
              className={`w-full flex items-center justify-between group text-left px-2 py-1 rounded-lg transition-all ${isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
            >
              <div>
                <div className={`text-sm font-bold ${isActive ? 'text-blue-700' : 'text-gray-800'} group-hover:underline`}>{tag.label}</div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <HydrationSafeRandomCount />
                  <span>· {tag.helper}</span>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                {isActive ? 'Filtering' : 'View'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HydrationSafeRandomCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(Math.floor(Math.random() * 100) + 10);
  }, []);

  if (count === null) return <span>... notes generated</span>;

  return <span>{count} notes generated</span>;
}
