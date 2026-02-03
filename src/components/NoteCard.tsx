"use client";

import React from 'react';
import { Note } from '@/types';

type ToastLevel = "info" | "error" | "success";

interface NoteCardProps {
    note: Note;
    onClick: () => void;
    onDelete?: (id: string) => void;
    onPin?: (id: string, isPinned: boolean) => void;
    onAssign?: (note: Note) => void;
    selectionMode?: boolean;
    selected?: boolean;
    onSelectToggle?: (id: string) => void;
    notify?: (message: string, type?: ToastLevel) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete, onPin, onAssign, selectionMode = false, selected = false, onSelectToggle, notify }) => {
    const imageAttachment = note.attachments?.find(att => att?.type?.startsWith('image') && att.data);
    const otherAttachments = (note.attachments ?? []).filter(att => !att?.type?.startsWith('image'));
    const noteTags = note.tags ?? [];

    const notifyUser = (message: string, type: ToastLevel = "info") => {
        if (notify) {
            notify(message, type);
        } else {
            console[type === "error" ? "error" : type === "success" ? "info" : "log"](message);
        }
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = note.content;

        const fallbackCopy = () => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand('copy');
                notifyUser("Note content copied!", "success");
            } catch (err) {
                console.error("Fallback copy failed", err);
                notifyUser("Copy failed. Please copy manually.", "error");
            } finally {
                document.body.removeChild(textarea);
            }
        };

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                notifyUser("Note content copied!", "success");
            } else {
                fallbackCopy();
            }
        } catch (err) {
            console.error("Clipboard copy failed", err);
            fallbackCopy();
        }
    };

    const handleCardClick = () => {
        if (selectionMode && onSelectToggle) {
            onSelectToggle(note.id);
            return;
        }
        onClick();
    };

    return (
        <div
            className={`relative bg-white border border-gray-200 hover:border-gray-400 rounded-xl transition-all cursor-pointer overflow-hidden group mb-3 shadow-sm ${selectionMode && selected ? 'ring-2 ring-blue-400 border-blue-300' : ''}`}
            onClick={handleCardClick}
        >
            {selectionMode && (
                <button
                    type="button"
                    className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors z-20 ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-transparent'}`}
                    aria-pressed={selected}
                    aria-label={selected ? 'Deselect note' : 'Select note'}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectToggle?.(note.id);
                    }}
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </button>
            )}
            <div className="flex">
                {/* Votes Section (Decorative for Theme) */}
                <div className="hidden sm:flex flex-col items-center p-2 bg-gray-50 w-12 gap-1 border-r border-gray-100">
                    <svg className="w-5 h-5 text-gray-400 hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    <span className="text-xs font-bold text-gray-700">AI</span>
                    <svg className="w-5 h-5 text-gray-400 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div className="flex-1 p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:underline">{note.title}</h3>

                    <p className="text-gray-600 text-sm line-clamp-3 mb-3 leading-relaxed">
                        {note.summary}
                    </p>

                    {imageAttachment?.data && (
                        <div className="mb-4 border border-gray-100 rounded-lg overflow-hidden">
                            <img
                                src={imageAttachment.data}
                                alt={imageAttachment.name || 'Uploaded image'}
                                className="w-full max-h-56 object-cover"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {otherAttachments.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {otherAttachments.map((att, idx) => (
                                <a
                                    key={`${att?.name}-${idx}`}
                                    href={att?.data?.startsWith('data:') ? att.data : undefined}
                                    download={att?.name || `attachment-${idx + 1}`}
                                    onClick={(e) => att?.data ? e.stopPropagation() : undefined}
                                    className="text-[11px] font-semibold px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
                                >
                                    {att?.name || `Attachment ${idx + 1}`}
                                </a>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                        {noteTags.map(tag => (
                            <span key={tag} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors text-xs font-bold"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            View Full Note
                        </button>

                        {/* Copy Action */}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors text-xs font-bold"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </button>

                        {onAssign && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAssign(note);
                                }}
                                className="flex items-center gap-1.5 text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors text-xs font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h10a2 2 0 012 2v12l-4-2-4 2-4-2V7z" />
                                </svg>
                                Add to collection
                            </button>
                        )}

                        {/* Pin Action */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPin && onPin(note.id, !note.isPinned);
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-bold ${note.isPinned ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <svg className="w-4 h-4" fill={note.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {note.isPinned ? 'Pinned' : 'Pin'}
                        </button>

                        {/* Delete Action */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete && onDelete(note.id);
                            }}
                            className="flex items-center gap-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 px-2 py-1 rounded transition-colors text-xs font-bold ml-auto"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteCard;
