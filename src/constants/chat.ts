import { ChatMessage } from '@/types';

export const DEFAULT_CHAT_TITLE = 'New Chat';

export const DEFAULT_CHAT_GREETING: ChatMessage = {
    role: 'assistant',
    content: "Hello! I'm your AI Notes assistant. Ask me anything or request help with your notes."
};

export const MAX_CHAT_CONTEXT_MESSAGES = 10;
