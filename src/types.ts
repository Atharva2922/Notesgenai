export interface Attachment {
    name: string;
    type: string;
    size: number;
    data: string;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    summary: string;
    tags: string[];
    createdAt: number;
    type: 'text' | 'voice' | 'link' | 'media';
    isPinned?: boolean;
    attachments?: Attachment[];
}

export interface GenerationConfig {
    tone: 'professional' | 'creative' | 'concise';
    format: 'bullet_points' | 'paragraph' | 'flashcards';
}

export type PurposeActionValue =
    | 'smart_notes'
    | 'summary'
    | 'key_points'
    | 'qa'
    | 'flashcards'
    | 'rewrite_social'
    | 'faqs'
    | 'meeting_notes';

export interface PurposeActionDefinition {
    value: PurposeActionValue;
    label: string;
    instructions: string;
}

export interface CollectionDefinition {
    label: string;
    tag: string;
    readonly?: boolean;
}

export interface ChatAttachment {
    id: string;
    name: string;
    type: string;
    size?: number;
    data: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: ChatAttachment[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
    isPinned?: boolean;
    contextPrompt?: string;
}

export interface UserFact {
    key: string;
    value: string;
    source?: string;
    updatedAt?: number;
}

export interface UserProfile {
    slug: string;
    name: string;
    email: string;
    plan: 'Free' | 'Pro' | 'Enterprise';
    creditsTotal: number;
    creditsUsed: number;
    status: 'Active' | 'Blocked';
    joinedAt?: number;
    lastActive?: number;
    facts: UserFact[];
    createdAt?: number;
    updatedAt?: number;
}
