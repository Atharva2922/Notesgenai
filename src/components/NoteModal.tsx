"use client";

import React, { useState, useRef } from 'react';
import { Note } from '@/types';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

type ToastLevel = "info" | "error" | "success";

interface NoteModalProps {
    note: Note;
    onClose: () => void;
    onUpdate: (updatedNote: Note) => void;
    notify?: (message: string, type?: ToastLevel) => void;
}

export default function NoteModal({ note, onClose, onUpdate, notify }: NoteModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);

    const imageAttachments = (note.attachments ?? []).filter(att => att?.type?.startsWith('image') && att?.data?.trim());
    const otherAttachments = (note.attachments ?? []).filter(att => !att?.type?.startsWith('image') && att?.data?.trim());

    const handleSave = () => {
        const updatedNote = {
            ...note,
            title,
            content,
        };
        onUpdate(updatedNote);
        setIsEditing(false);
    };

    const handleExport = async () => {
        if (!contentRef.current) return;
        setIsExporting(true);

        const sourceNode = contentRef.current;
        const clone = sourceNode.cloneNode(true) as HTMLElement;
        clone.style.width = '850px'; // approx full A4 width at 96dpi
        clone.style.maxWidth = '100%';
        clone.style.margin = '0 auto';
        clone.style.borderRadius = '0';
        clone.style.boxShadow = 'none';
        clone.style.background = '#ffffff';
        clone.style.padding = '48px';
        clone.style.position = 'relative';

        const tempWrapper = document.createElement('div');
        tempWrapper.style.position = 'fixed';
        tempWrapper.style.top = '-10000px';
        tempWrapper.style.left = '-10000px';
        tempWrapper.style.background = '#ffffff';
        tempWrapper.style.padding = '0';
        tempWrapper.style.margin = '0';
        tempWrapper.style.zIndex = '-1';
        tempWrapper.appendChild(clone);
        document.body.appendChild(tempWrapper);

        try {
            await new Promise(resolve => setTimeout(resolve, 80));

            const dataUrl = await toPng(clone, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#ffffff',
            });

            const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.width, height: img.height });
                img.onerror = reject;
                img.src = dataUrl;
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 5; // small margin so no large white gaps
            const usableWidth = pageWidth - margin * 2;
            const usableHeight = pageHeight - margin * 2;

            let renderWidth = usableWidth;
            let renderHeight = (imageDimensions.height * renderWidth) / imageDimensions.width;

            if (renderHeight > usableHeight) {
                renderHeight = usableHeight;
                renderWidth = (imageDimensions.width * renderHeight) / imageDimensions.height;
            }

            const offsetX = margin + (usableWidth - renderWidth) / 2;
            const offsetY = margin + (usableHeight - renderHeight) / 2;

            pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
            pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Export failed", error);
            const message = "Failed to export PDF. Please try again.";
            notify ? notify(message, "error") : console.error(message);
        } finally {
            document.body.removeChild(tempWrapper);
            setIsExporting(false);
        }
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-gray-900/70 to-indigo-900/70 backdrop-blur-[10px] z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="relative w-full max-w-5xl max-h-[92vh] rounded-[28px] overflow-hidden flex flex-col shadow-[0_30px_60px_-25px_rgba(0,0,0,0.65)] bg-gradient-to-br from-white via-[#f7f9fc] to-[#edf2ff] animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.2), transparent 35%)' }} />

                <div className="bg-white/80 backdrop-blur-sm border-b border-white/70 p-4 px-6 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-4 text-gray-500">
                        <div className="flex bg-gray-100/70 rounded-full px-3 py-1 items-center gap-2 text-xs font-bold shadow-inner">
                            <button className="hover:text-orange-500 transition-colors" aria-label="Upvote">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <span>12</span>
                            <button className="hover:text-blue-500 transition-colors" aria-label="Downvote">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
                            aria-label="Close modal"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-10" id="note-modal-content">
                    <div
                        ref={contentRef}
                        className={`relative bg-white/90 backdrop-blur rounded-[24px] p-10 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.6)] border border-white/70 min-h-full max-w-3xl mx-auto transition-all ${isExporting ? 'p-16' : ''}`}
                    >
                        <div className="absolute inset-0 rounded-[24px] pointer-events-none" style={{ backgroundImage: 'linear-gradient(120deg, rgba(59,130,246,0.08), transparent 55%)' }} />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-8 text-xs font-medium text-gray-500 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">
                                <span className="text-blue-700 font-semibold bg-blue-50 px-3 py-1 rounded-full shadow-inner">AI NOTE</span>
                                <span>•</span>
                                <span>{new Date(note.createdAt).toLocaleString()}</span>
                                <span>•</span>
                                <span className="tracking-[0.2em] capitalize">{note.type}</span>
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full text-3xl font-bold text-gray-900 border-b-2 border-transparent focus:border-blue-500 focus:outline-none placeholder-gray-300 pb-2"
                                        placeholder="Note Title"
                                    />
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full h-[60vh] p-4 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-mono text-sm leading-relaxed"
                                        placeholder="Markdown content..."
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="mb-8">
                                        <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.4em] block mb-3">Insight</span>
                                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight drop-shadow-sm">{title}</h1>
                                    </div>

                                    {imageAttachments.length > 0 && (
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.35em]">Photo Attachments</p>
                                                <span className="text-[11px] text-gray-400 font-semibold">{imageAttachments.length} files</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {imageAttachments.map((att, idx) => (
                                                    <button
                                                        key={`${att?.name}-${idx}`}
                                                        type="button"
                                                        className="group relative rounded-2xl overflow-hidden border border-gray-200/70 shadow-[0_20px_35px_-25px_rgba(15,23,42,0.7)] focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                        onClick={() => att?.data && setActiveImage({ src: att.data, alt: att?.name || `Image ${idx + 1}` })}
                                                        aria-label={`Open ${att?.name || `image ${idx + 1}`} in fullscreen`}
                                                    >
                                                        {att?.data ? (
                                                            <img
                                                                src={att.data}
                                                                alt={att?.name || `Image ${idx + 1}`}
                                                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                                                loading="lazy"
                                                            />
                                                        ) : null}
                                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold">
                                                            Tap to expand
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {note.tags?.length ? (
                                        <div className="mb-8 flex flex-wrap gap-2">
                                            {note.tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-100 shadow">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}

                                    {otherAttachments.length > 0 && (
                                        <div className="mb-8">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attachments</p>
                                            <div className="flex flex-wrap gap-2">
                                                {otherAttachments.map((att, idx) => (
                                                    <a
                                                        key={`${att?.name}-${idx}`}
                                                        href={att?.data}
                                                        download={att?.name || `attachment-${idx + 1}`}
                                                        className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-full text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                    >
                                                        {att?.name || `Attachment ${idx + 1}`}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-800 prose-p:text-gray-600 prose-li:text-gray-600 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:rounded-r">
                                        <ReactMarkdown>{content}</ReactMarkdown>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="max-w-3xl mx-auto flex flex-wrap gap-4 items-center justify-between">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setTitle(note.title);
                                        setContent(note.content);
                                    }}
                                    className="px-6 py-2.5 rounded-full font-bold text-gray-500 hover:bg-gray-100 transition-all text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 rounded-full font-bold bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="px-6 py-2.5 rounded-full font-bold bg-gray-900 text-white hover:bg-black transition-all shadow hover:shadow-lg hover:-translate-y-0.5 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    title="Export this note as a PDF file"
                                >
                                    {isExporting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating PDF...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Export to PDF
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleEditClick}
                                    className="px-6 py-2.5 rounded-full font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-sm flex items around gap-2 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Edit Note
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {activeImage?.src && (
                <div
                    className="fixed inset-0 bg-black/80 z-[70] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setActiveImage(null)}
                >
                    <button
                        className="self-end text-white/70 hover:text-white mb-4"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setActiveImage(null);
                        }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={activeImage.src}
                        alt={activeImage.alt}
                        className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <p className="text-white/80 mt-3 text-sm">{activeImage.alt || 'Attached image'}</p>
                </div>
            )}
        </div>
    );
}
